"""Jam Production Assistant - look-up cutaway to the C920 scene.

Pulls frames from OBS (obs-websocket v5 GetSourceScreenshot), runs YOLOv8 pose
on the Hailo-10H (ASUS UGen300), and switches the OBS program scene. Looking
at the upper-right C920 cuts to the scene named C920 from any other program
scene and remembers that scene. Looking back at the BRIO returns to it.

The script never opens the cameras itself and never creates or edits scenes,
sources, mute, audio, recording, or streaming. The only OBS write is
SetCurrentProgramScene.

Usage:
  python gaze_switcher.py                 # live (switches scenes)
  python gaze_switcher.py --dry-run       # log decisions only; works while the flag is off
  python gaze_switcher.py --calibrate     # record chat vs lens pitch; never switches scenes
  python gaze_switcher.py --bench         # Hailo model load + inference fps, no OBS
  python gaze_switcher.py --image x.jpg   # run pose on one image, print face keypoints
  python gaze_switcher.py --list-obs      # list OBS scenes + video capture inputs
"""
from __future__ import annotations

import argparse
import base64
import io
import json
import logging
import logging.handlers
import os
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import yaml
from PIL import Image

from cutaway import (
    MIN_PITCH_SEPARATION,
    SAY_DONE,
    SAY_ENTER,
    SAY_RETRY,
    TRIGGER_PROGRESS,
    apply_runtime_mode,
    calibration_brief,
    controller_from_config,
    fit_pose_gate,
    inventory_problems,
    missing_calibration_gate,
    pitch_gate_from_mapping,
    pose_features_from_person,
    prepare_calibration_voice,
    run_calibration_timer,
    run_once,
    screenshot_failure_message,
    validate_config,
)

ROOT = Path(__file__).resolve().parent
log = logging.getLogger("jam")

# COCO keypoint indices
NOSE, L_EYE, R_EYE, L_EAR, R_EAR = 0, 1, 2, 3, 4


# ----------------------------------------------------------------------------- config
def load_config(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def obs_connection(cfg: dict) -> tuple[str, int, str | None, bool]:
    """Host/port/password. Password is read from OBS's own config at runtime and
    never logged. Returns (host, port, password, server_enabled)."""
    o = cfg.get("obs", {})
    host = o.get("host", "localhost")
    port = o.get("port")
    password = None
    enabled = True
    ws_cfg = Path(os.path.expandvars(o.get(
        "websocket_config", r"%APPDATA%\obs-studio\plugin_config\obs-websocket\config.json")))
    if ws_cfg.exists():
        data = json.loads(ws_cfg.read_text(encoding="utf-8"))
        enabled = bool(data.get("server_enabled", False))
        port = port or data.get("server_port", 4455)
        if data.get("auth_required", True):
            password = data.get("server_password") or None
    return host, int(port or 4455), password, enabled


# ----------------------------------------------------------------------------- pose model
class PoseModel:
    def __init__(self, hef_path: Path, conf: float = 0.5, iou: float = 0.45):
        from hailo_platform import VDevice, FormatType  # noqa
        self.conf, self.iou = conf, iou
        params = VDevice.create_params()
        self.vdevice = VDevice(params)
        self.im = self.vdevice.create_infer_model(str(hef_path))
        self.im.input().set_format_type(FormatType.UINT8)
        for o in self.im.outputs:
            o.set_format_type(FormatType.FLOAT32)
        self.in_shape = tuple(self.im.input().shape)  # (H, W, 3)
        self.cim = self.im.configure()
        self.configured = self.cim.__enter__()
        self.out_names = [o.name for o in self.im.outputs]
        self.out_shapes = {o.name: tuple(o.shape) for o in self.im.outputs}
        # group outputs by grid size -> (box64, cls1, kpt51)
        branches: dict[int, dict] = {}
        for n, s in self.out_shapes.items():
            b = branches.setdefault(s[0], {})
            b[{64: "box", 1: "cls", 51: "kpt"}[s[2]]] = n
        self.branches = sorted(branches.items(), key=lambda kv: -kv[0])
        self.size = self.in_shape[0]

    def close(self):
        try:
            self.cim.__exit__(None, None, None)
        finally:
            self.vdevice.release()

    def letterbox(self, img: Image.Image):
        w, h = img.size
        s = self.size / max(w, h)
        nw, nh = int(round(w * s)), int(round(h * s))
        canvas = np.full((self.size, self.size, 3), 114, np.uint8)
        px, py = (self.size - nw) // 2, (self.size - nh) // 2
        canvas[py:py + nh, px:px + nw] = np.asarray(img.convert("RGB").resize((nw, nh), Image.BILINEAR))
        return canvas, s, px, py

    def infer_raw(self, arr: np.ndarray) -> dict:
        bindings = self.configured.create_bindings()
        bindings.input().set_buffer(np.ascontiguousarray(arr))
        outs = {n: np.empty(self.out_shapes[n], np.float32) for n in self.out_names}
        for n, buf in outs.items():
            bindings.output(n).set_buffer(buf)
        self.configured.run([bindings], 5000)
        return outs

    def __call__(self, img: Image.Image) -> list[dict]:
        arr, s, px, py = self.letterbox(img)
        outs = self.infer_raw(arr)
        return self.decode(outs, s, px, py)

    def decode(self, outs, s, px, py) -> list[dict]:
        boxes, scores, kpts = [], [], []
        for grid, b in self.branches:
            stride = self.size / grid
            cls = outs[b["cls"]].reshape(-1)
            idx = np.nonzero(cls > self.conf)[0]
            if idx.size == 0:
                continue
            gy, gx = np.divmod(idx, grid)
            box = outs[b["box"]].reshape(-1, 4, 16)[idx]
            box = np.exp(box - box.max(-1, keepdims=True))
            box /= box.sum(-1, keepdims=True)
            dist = (box * np.arange(16, dtype=np.float32)).sum(-1) * stride  # l,t,r,b
            cx, cy = (gx + 0.5) * stride, (gy + 0.5) * stride
            boxes.append(np.stack([cx - dist[:, 0], cy - dist[:, 1], cx + dist[:, 2], cy + dist[:, 3]], 1))
            scores.append(cls[idx])
            k = outs[b["kpt"]].reshape(-1, 17, 3)[idx]
            kx = (k[..., 0] * 2.0 + gx[:, None]) * stride
            ky = (k[..., 1] * 2.0 + gy[:, None]) * stride
            kc = 1.0 / (1.0 + np.exp(-k[..., 2]))
            kpts.append(np.stack([kx, ky, kc], -1))
        if not boxes:
            return []
        boxes, scores, kpts = np.concatenate(boxes), np.concatenate(scores), np.concatenate(kpts)
        keep = nms(boxes, scores, self.iou)
        dets = []
        for i in keep:
            bx = boxes[i].copy()
            bx[[0, 2]] = (bx[[0, 2]] - px) / s
            bx[[1, 3]] = (bx[[1, 3]] - py) / s
            kp = kpts[i].copy()
            kp[:, 0] = (kp[:, 0] - px) / s
            kp[:, 1] = (kp[:, 1] - py) / s
            dets.append({"box": bx, "score": float(scores[i]), "kpts": kp})
        return dets


def nms(boxes, scores, thr):
    order = scores.argsort()[::-1]
    keep = []
    area = (boxes[:, 2] - boxes[:, 0]).clip(0) * (boxes[:, 3] - boxes[:, 1]).clip(0)
    while order.size:
        i = order[0]
        keep.append(i)
        xx1 = np.maximum(boxes[i, 0], boxes[order[1:], 0]); yy1 = np.maximum(boxes[i, 1], boxes[order[1:], 1])
        xx2 = np.minimum(boxes[i, 2], boxes[order[1:], 2]); yy2 = np.minimum(boxes[i, 3], boxes[order[1:], 3])
        inter = (xx2 - xx1).clip(0) * (yy2 - yy1).clip(0)
        iou = inter / (area[i] + area[order[1:]] - inter + 1e-9)
        order = order[1:][iou < thr]
    return keep


# ----------------------------------------------------------------------------- facing score
def frontal_score(det: dict | None, kp_thr: float, max_yaw: float) -> tuple[float, str]:
    """0..1, how squarely the face points at this camera.
    Needs nose + both eyes. Yaw estimated from nose offset vs. eye midpoint
    (normalised by inter-eye distance) and, when both ears are visible, from
    nose position between the ears. One ear only => head is turned => penalty."""
    if det is None:
        return 0.0, "no person"
    k = det["kpts"]
    c = k[:, 2]
    if c[NOSE] < kp_thr or c[L_EYE] < kp_thr or c[R_EYE] < kp_thr:
        return 0.0, f"face not visible (nose {c[NOSE]:.2f} eyes {c[L_EYE]:.2f}/{c[R_EYE]:.2f})"
    eye_d = abs(k[L_EYE, 0] - k[R_EYE, 0])
    face_w = max(det["box"][2] - det["box"][0], 1.0)
    if eye_d < 1e-3:
        return 0.0, "eyes collapsed"
    mid = (k[L_EYE, 0] + k[R_EYE, 0]) / 2
    yaw = abs(k[NOSE, 0] - mid) / eye_d          # 0 = frontal, ~0.5+ = strongly turned
    s_eye = max(0.0, 1.0 - yaw / max_yaw)
    ears = c[L_EAR] >= kp_thr, c[R_EAR] >= kp_thr
    if all(ears):
        span = k[R_EAR, 0] - k[L_EAR, 0]
        r = (k[NOSE, 0] - k[L_EAR, 0]) / span if abs(span) > 1e-3 else 0.5
        s_ear = max(0.0, 1.0 - 2.0 * abs(r - 0.5))
    elif any(ears):
        s_ear = 0.6
    else:
        s_ear = 0.8  # ears hidden by hair/headset: neutral-ish
    conf = float(np.mean(c[[NOSE, L_EYE, R_EYE]]))
    score = float(s_eye * (0.5 + 0.5 * s_ear) * conf)
    return score, f"yaw={yaw:.2f} ears={int(ears[0])}{int(ears[1])} conf={conf:.2f} eyeD/boxW={eye_d / face_w:.2f}"


def main_person(dets: list[dict]) -> dict | None:
    if not dets:
        return None
    return max(dets, key=lambda d: (d["box"][2] - d["box"][0]) * (d["box"][3] - d["box"][1]) * d["score"])


# ----------------------------------------------------------------------------- OBS
class GrabError(Exception):
    def __init__(self, message: str, disconnect: bool = False):
        super().__init__(message)
        self.disconnect = disconnect


def _is_disconnect(exc: BaseException) -> bool:
    if isinstance(exc, (ConnectionError, TimeoutError, BrokenPipeError)):
        return True
    name = type(exc).__name__.lower()
    return any(token in name for token in ("connect", "timeout", "socket", "closed"))


class ObsAdapter:
    """Narrow OBS client. The only mutating call is set_current_program_scene."""

    def __init__(self, client):
        self.client = client

    def get_current_program_scene(self) -> str:
        name = self.client.get_current_program_scene().current_program_scene_name
        return name or ""

    def get_scene_names(self) -> set[str]:
        listed = self.client.get_scene_list()
        return {s["sceneName"] for s in listed.scenes}

    def get_input_names(self) -> set[str]:
        return {i["inputName"] for i in self.client.get_input_list().inputs}

    def set_current_program_scene(self, name: str) -> None:
        self.client.set_current_program_scene(name)


def connect_obs(cfg) -> ObsAdapter:
    import obsws_python as obs
    host, port, _password, enabled = obs_connection(cfg)
    if not enabled:
        raise SystemExit(
            "OBS WebSocket server is disabled. In OBS: Tools > WebSocket Server Settings > "
            "tick 'Enable WebSocket server', then Apply. No scene change was made."
        )
    logging.getLogger("obsws_python").setLevel(logging.WARNING)
    log.info("connecting to OBS WebSocket at %s:%s", host, port)
    client = obs.ReqClient(host=host, port=port, password=_password or "", timeout=5)
    return ObsAdapter(client)


def grab(cl, source: str, width: int, height: int, quality: int) -> Image.Image:
    try:
        shot = cl.get_source_screenshot(source, "jpg", width, height, quality)
        payload = shot.image_data.split(",", 1)[1]
        return Image.open(io.BytesIO(base64.b64decode(payload)))
    except Exception as exc:
        if _is_disconnect(exc):
            raise GrabError(
                f"OBS unreachable while screenshotting '{source}' ({type(exc).__name__}). "
                "No scene change was made.",
                disconnect=True,
            ) from exc
        raise GrabError(screenshot_failure_message(source, type(exc).__name__)) from exc


def score_cameras(cl, model, cfg, brio_source: str, c920_source: str):
    detect = cfg["detect"]
    cap = cfg["capture"]
    scores, notes = {}, {}
    for key, source in (("brio", brio_source), ("c920", c920_source)):
        img = grab(cl, source, cap["width"], cap["height"], cap["quality"])
        person = main_person(model(img))
        score, why = frontal_score(person, detect["keypoint_conf"], detect["max_yaw"])
        scores[key] = score
        notes[key] = why
        if key == "c920":
            features = pose_features_from_person(person, detect["keypoint_conf"])
            if features is None:
                scores["c920_pitch"] = None
                scores["c920_yaw"] = None
            else:
                scores["c920_pitch"], scores["c920_yaw"] = features
    return scores, notes


def calibration_path(cfg) -> Path:
    return ROOT / str(cfg.get("calibration", "calibration.yaml"))


def load_pitch_gate(cfg):
    path = calibration_path(cfg)
    if not path.exists():
        return missing_calibration_gate()
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception as exc:
        gate = missing_calibration_gate()
        gate.reason = (
            f"Could not read {path.name} ({type(exc).__name__}). Automatic cutaways stay off. "
            "Run .\\run.ps1 -Calibrate. No scene change was made."
        )
        return gate
    return pitch_gate_from_mapping(data)


class SpeechError(Exception):
    pass


def windows_speech_command(text: str) -> list[str]:
    """Offline SAPI on the default playback device. Does not change mute or the mixer."""
    safe = str(text).replace("'", "''")
    script = (
        "Add-Type -AssemblyName System.Speech; "
        "$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
        f"$synth.Speak('{safe}')"
    )
    return ["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script]


def windows_speak(text: str, runner=None) -> None:
    """Block until Windows finishes speaking. Raise SpeechError instead of continuing silently."""
    run = runner or subprocess.run
    try:
        completed = run(
            windows_speech_command(text),
            capture_output=True,
            text=True,
            timeout=60,
        )
    except Exception as exc:
        raise SpeechError(
            "Windows offline speech failed (" + type(exc).__name__ + "). "
            "The timer was not started. No calibration file was written. "
            "No scene change was made."
        ) from exc
    if getattr(completed, "returncode", 1) != 0:
        raise SpeechError(
            "Windows offline speech failed (exit " + str(getattr(completed, "returncode", "unknown")) + "). "
            "The timer was not started. No calibration file was written. "
            "No scene change was made. Speech uses the normal Windows playback device."
        )


def save_pitch_gate(path: Path, gate, *, front_frames: int, chat_frames: int, lens_frames: int) -> None:
    if not gate.valid or not gate.uses_yaw:
        raise RuntimeError("refusing to write a calibration that does not separate straight-ahead, chat, and lens")
    document = {
        "version": 2,
        "feature": "pitch_and_yaw",
        "front_pitch": round(float(gate.front_pitch), 4),
        "front_yaw": round(float(gate.front_yaw), 4),
        "chat_pitch": round(float(gate.chat_pitch), 4),
        "chat_yaw": round(float(gate.chat_yaw), 4),
        "lens_pitch": round(float(gate.lens_pitch), 4),
        "lens_yaw": round(float(gate.lens_yaw), 4),
        "front_frames": int(front_frames),
        "chat_frames": int(chat_frames),
        "lens_frames": int(lens_frames),
        "trigger_progress": TRIGGER_PROGRESS,
        "min_separation": MIN_PITCH_SEPARATION,
        "note": gate.axis_note,
    }
    path.write_text(yaml.safe_dump(document, sort_keys=False), encoding="utf-8")


def _speak_and_log(message: str) -> None:
    log.info("%s", message)
    windows_speak(message)


def calibrate(cfg) -> int:
    """Three spoken poses from C920 screenshots. Never changes the program scene."""
    errors = validate_config(cfg)
    if errors:
        for err in errors:
            log.error("%s", err)
        return 2
    log.info("%s", calibration_brief())
    if not prepare_calibration_voice(_speak_and_log, log.error):
        return 2
    log.info(
        "Voice check passed. Screenshotting the C920 source. "
        "No scene, mute, audio routing, recording, or streaming change will be made."
    )
    try:
        model = PoseModel(ROOT / cfg["model"]["hef"], cfg["model"]["conf"])
    except Exception as exc:
        log.error(
            "Could not load the Hailo pose model (%s). No scene change was made.",
            type(exc).__name__,
        )
        return 2
    try:
        try:
            adapter = connect_obs(cfg)
        except SystemExit:
            raise
        except Exception as exc:
            log.error(
                "OBS not reachable (%s). Start OBS and enable the WebSocket server. "
                "No scene change was made.",
                type(exc).__name__,
            )
            return 2
        source = str(cfg["cameras"]["c920"]["source"])
        scenes = adapter.get_scene_names()
        inputs = adapter.get_input_names()
        for problem in inventory_problems(
            inputs, scenes, str(cfg["cameras"]["brio"]["source"]), source, str(cfg["cameras"]["c920"]["scene"])
        ):
            if source in problem or str(cfg["cameras"]["c920"]["scene"]) in problem:
                log.error("%s", problem)
                return 2
        cap = cfg["capture"]
        period = 1.0 / float(cap["fps"])
        min_conf = float(cfg["detect"]["keypoint_conf"])

        def measure():
            image = grab(adapter.client, source, cap["width"], cap["height"], cap["quality"])
            return pose_features_from_person(main_person(model(image)), min_conf)

        try:
            _speak_and_log(SAY_ENTER)
        except SpeechError as exc:
            log.error("%s", exc)
            return 2
        if sys.stdin is not None and sys.stdin.isatty():
            try:
                input()
            except EOFError:
                log.info("Starting the poses now.")
        else:
            log.info("Starting the poses now.")
        try:
            front_samples, chat_samples, lens_samples = run_calibration_timer(
                measure, time.sleep, lambda message: log.info("%s", message), windows_speak,
                period=period,
            )
        except SpeechError as exc:
            log.error(
                "Speech failed during the poses (%s). The timer stopped. "
                "No calibration file was written. No scene change was made.",
                exc,
            )
            return 2
    except GrabError as exc:
        log.error("%s", exc)
        return 2
    finally:
        model.close()
    gate = fit_pose_gate(front_samples, chat_samples, lens_samples)
    if not gate.valid:
        log.error("%s", gate.reason)
        try:
            _speak_and_log(SAY_RETRY)
        except SpeechError as exc:
            log.error("Could not speak the retry cue (%s).", exc)
        return 2
    path = calibration_path(cfg)
    save_pitch_gate(
        path, gate,
        front_frames=len(front_samples),
        chat_frames=len(chat_samples),
        lens_frames=len(lens_samples),
    )
    log.info("%s", gate.axis_note)
    log.info(
        "Saved %s. Front (%.2f, %.2f) %d frames. Chat (%.2f, %.2f) %d frames. "
        "Lens (%.2f, %.2f) %d frames. A cutaway must be nearer the lens than both other poses.",
        path.name,
        gate.front_pitch, gate.front_yaw, len(front_samples),
        gate.chat_pitch, gate.chat_yaw, len(chat_samples),
        gate.lens_pitch, gate.lens_yaw, len(lens_samples),
    )
    try:
        _speak_and_log(SAY_DONE)
    except SpeechError as exc:
        log.error("Saved the file, then speech failed on the done cue (%s).", exc)
    log.info(
        "This is not eye tracking. The Hailo model is unchanged. "
        "Move the C920 and this file is wrong until you calibrate again. "
        "Next, with the switcher still off: .\\run.ps1 -DryRun -Verbose"
    )
    return 0


def list_obs(cfg):
    adapter = connect_obs(cfg)
    cl = adapter.client
    sl = cl.get_scene_list()
    print("Current program scene:", sl.current_program_scene_name)
    print("Scenes:")
    for s in reversed(sl.scenes):
        print("  -", s["sceneName"])
    print("Video capture inputs:")
    for i in cl.get_input_list().inputs:
        if i["inputKind"] in ("dshow_input", "av_capture_input", "v4l2_input"):
            dev = ""
            try:
                st = cl.get_input_settings(i["inputName"]).input_settings
                dev = str(st.get("video_device_id", "")).split(":")[0]
            except Exception:
                pass
            print(f"  - {i['inputName']}  [{i['inputKind']}]  device: {dev}")


def _log_decision(line: str) -> None:
    warning = (
        "No scene change" in line
        or "not found" in line
        or "unreachable" in line
        or "failed" in line
        or line.startswith("Refused")
        or "Cancelled" in line
        or "Refusing" in line
    )
    if warning:
        log.warning("%s", line)
    else:
        log.info("%s", line)


# ----------------------------------------------------------------------------- run modes
def setup_logging(cfg, dry):
    for handler in list(log.handlers):
        handler.close()
        log.removeHandler(handler)
    d = ROOT / cfg.get("log_dir", "logs")
    d.mkdir(exist_ok=True)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    fh = logging.handlers.RotatingFileHandler(
        d / ("dry-run.log" if dry else "switcher.log"),
        maxBytes=2_000_000, backupCount=3, encoding="utf-8")
    fh.setFormatter(fmt)
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    log.handlers[:] = [fh, sh]
    log.setLevel(logging.INFO)
    log.propagate = False


def bench(cfg, n=200):
    t0 = time.perf_counter()
    m = PoseModel(ROOT / cfg["model"]["hef"], cfg["model"]["conf"])
    try:
        log.info("model loaded on Hailo in %.2fs; input %s; outputs %d",
                 time.perf_counter() - t0, m.in_shape, len(m.out_names))
        img = Image.new("RGB", (640, 360), (90, 90, 90))
        arr, *_ = m.letterbox(img)
        for _ in range(10):
            m.infer_raw(arr)
        t = time.perf_counter()
        for _ in range(n):
            m.infer_raw(arr)
        raw = n / (time.perf_counter() - t)
        t = time.perf_counter()
        for _ in range(n):
            m(img)
        e2e = n / (time.perf_counter() - t)
        log.info("inference: %.1f fps raw (sync, 1 frame at a time); %.1f fps incl. letterbox+decode", raw, e2e)
    finally:
        m.close()


def image_test(cfg, path):
    m = PoseModel(ROOT / cfg["model"]["hef"], cfg["model"]["conf"])
    try:
        dets = m(Image.open(path))
        print(f"{len(dets)} person(s)")
        for d in dets:
            k = d["kpts"]
            sc, why = frontal_score(d, cfg["detect"]["keypoint_conf"], cfg["detect"]["max_yaw"])
            print(f" score={d['score']:.2f} box={np.round(d['box']).astype(int).tolist()} "
                  f"nose={np.round(k[0]).tolist()} eyes={np.round(k[1]).tolist()},{np.round(k[2]).tolist()} "
                  f"frontal={sc:.2f} ({why})")
    finally:
        m.close()


def flag_on(cfg) -> bool:
    return (ROOT / cfg.get("enable_flag", "switcher.on")).exists()


def run(cfg, dry: bool, duration: float | None) -> int:
    errors = validate_config(cfg)
    if errors:
        for err in errors:
            log.error("%s", err)
        return 2
    if "only_from_managed_scenes" in cfg:
        log.info(
            "only_from_managed_scenes is ignored. Looking at the C920 cuts away from any "
            "program scene, including Starting Soon, Chatting, BRB, Desktop, and Ending."
        )
    cams = cfg["cameras"]
    brio_source = str(cams["brio"]["source"])
    c920_source = str(cams["c920"]["source"])
    pitch_gate = load_pitch_gate(cfg)
    ctrl = controller_from_config(cfg, pitch_gate)
    try:
        model = PoseModel(ROOT / cfg["model"]["hef"], cfg["model"]["conf"])
    except Exception as exc:
        log.error(
            "Could not load the Hailo pose model (%s). Check %s and the Hailo SDK in .venv. "
            "No scene change was made.",
            type(exc).__name__, cfg["model"].get("hef", "models/yolov8s_pose.hef"),
        )
        return 2
    log.info(
        "pose model ready (%s)%s",
        cfg["model"]["hef"],
        "  [DRY RUN - no scene switching]" if dry else "",
    )
    log.info(
        "BRIO source '%s'; C920 source '%s'; cutaway scene '%s'. "
        "Look up into the C920 to cut away from any scene; look at the BRIO to return.",
        brio_source, c920_source, ctrl.c920_scene,
    )
    if pitch_gate.valid:
        log.info(
            "Pitch gate on: chat %.2f, lens %.2f, trigger progress %.2f. "
            "Frontal score alone does not cut to C920.",
            pitch_gate.chat_pitch, pitch_gate.lens_pitch, pitch_gate.trigger_progress,
        )
    else:
        log.warning("%s", pitch_gate.reason)
    period = 1.0 / float(cfg["capture"]["fps"])
    start = time.monotonic()
    adapter = None
    was_on = None
    last_status = 0.0
    last_grab_warn = 0.0
    flag_name = cfg.get("enable_flag", "switcher.on")
    try:
        while duration is None or time.monotonic() - start < duration:
            on = flag_on(cfg)
            if was_on is None or on != was_on:
                log.info("%s (flag file %s)", apply_runtime_mode(ctrl, on, dry), flag_name)
                was_on = on
            if not ctrl.enabled:
                time.sleep(0.5)
                continue
            if adapter is None:
                try:
                    adapter = connect_obs(cfg)
                    problems = inventory_problems(
                        adapter.get_input_names(),
                        adapter.get_scene_names(),
                        brio_source,
                        c920_source,
                        ctrl.c920_scene,
                    )
                    for problem in problems:
                        log.warning("%s", problem)
                    if problems:
                        log.warning(
                            "The assistant will not create those names and will not change the "
                            "program scene until the C920 scene and both camera sources exist."
                        )
                    log.info(
                        "connected to OBS; program scene '%s'",
                        adapter.get_current_program_scene(),
                    )
                except SystemExit:
                    raise
                except Exception as exc:
                    log.warning(
                        "OBS not reachable (%s). Start OBS and enable Tools > WebSocket Server "
                        "Settings > Enable WebSocket server. Retrying in 5s. No scene change was made.",
                        type(exc).__name__,
                    )
                    adapter = None
                    ctrl.on_disconnect()
                    time.sleep(5)
                    continue
            t0 = time.monotonic()
            scores = None
            notes = None
            try:
                scores, notes = score_cameras(
                    adapter.client, model, cfg, brio_source, c920_source
                )
            except GrabError as exc:
                if exc.disconnect:
                    log.warning("%s", exc)
                    adapter = None
                    ctrl.on_disconnect()
                    time.sleep(2)
                    continue
                now_warn = time.monotonic()
                if now_warn - last_grab_warn > 5:
                    log.warning("%s", exc)
                    last_grab_warn = now_warn
                try:
                    _scene, note = ctrl.ingest_program_scene(
                        adapter.get_current_program_scene(), time.monotonic(), dry
                    )
                    if note:
                        log.info("%s", note)
                    ctrl.drop_pending()
                except Exception as exc2:
                    log.warning(
                        "OBS unreachable after a failed screenshot (%s). No scene change was made.",
                        type(exc2).__name__,
                    )
                    adapter = None
                    ctrl.on_disconnect()
                    time.sleep(2)
                continue
            except Exception as exc:
                log.warning(
                    "Frame grab failed (%s). No scene change was made.", type(exc).__name__
                )
                adapter = None
                ctrl.on_disconnect()
                time.sleep(2)
                continue
            now = time.monotonic()
            try:
                lines = run_once(ctrl, adapter, dry=dry, now=now, scores=scores)
            except Exception as exc:
                log.warning(
                    "Decision tick failed (%s). No scene change was made.", type(exc).__name__
                )
                adapter = None
                ctrl.on_disconnect()
                time.sleep(2)
                continue
            for line in lines:
                _log_decision(line)
            if notes and (cfg.get("verbose") or now - last_status > float(cfg.get("status_every_s", 5))):
                pitch = scores.get("c920_pitch")
                yaw = scores.get("c920_yaw")
                progress = ctrl.last_pitch_progress
                log.info(
                    "scores brio=%.2f (%s)  c920=%.2f (%s)  c920_pitch=%s  c920_yaw=%s  progress=%s  "
                    "scene=%s  remembered=%s",
                    scores["brio"], notes["brio"], scores["c920"], notes["c920"],
                    "none" if pitch is None else f"{pitch:.2f}",
                    "none" if yaw is None else f"{yaw:.2f}",
                    "none" if progress is None else f"{progress:.2f}",
                    ctrl.logical_scene, ctrl.return_scene,
                )
                last_status = now
            time.sleep(max(0.0, period - (time.monotonic() - t0)))
    except KeyboardInterrupt:
        pass
    finally:
        model.close()
        log.info("stopped")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=str(ROOT / "config.yaml"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--calibrate", action="store_true",
                    help="record chat vs C920-lens pitch; never switches scenes")
    ap.add_argument("--duration", type=float, default=None, help="stop after N seconds")
    ap.add_argument("--bench", action="store_true")
    ap.add_argument("--image")
    ap.add_argument("--list-obs", action="store_true")
    ap.add_argument("--verbose", action="store_true", help="log scores every tick")
    args = ap.parse_args(argv)
    try:
        cfg = load_config(Path(args.config))
    except Exception as exc:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
        log.error(
            "Could not read %s (%s). No scene change was made.", args.config, type(exc).__name__
        )
        return 2
    if not isinstance(cfg, dict):
        logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
        log.error("Config %s is empty. No scene change was made.", args.config)
        return 2
    if args.verbose:
        cfg["verbose"] = True
    dry = bool(args.dry_run or cfg.get("dry_run", False))
    setup_logging(cfg, dry)
    try:
        if args.calibrate:
            return calibrate(cfg)
        if args.bench:
            bench(cfg)
            return 0
        if args.image:
            image_test(cfg, args.image)
            return 0
        if args.list_obs:
            list_obs(cfg)
            return 0
        return run(cfg, dry, args.duration)
    finally:
        for handler in list(log.handlers):
            handler.close()
            log.removeHandler(handler)


if __name__ == "__main__":
    sys.exit(main())
