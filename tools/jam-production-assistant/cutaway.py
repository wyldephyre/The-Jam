"""Look-up cutaway decisions for the Jam production assistant.

Pure state machine: no OBS, Hailo, or camera handles. The caller supplies the
current program scene and frontal scores for the BRIO and the C920.

Looking at the C920 cuts to the C920 scene from whatever is on program and
remembers that scene. Looking back at the BRIO returns there. The remembered
scene is never the C920 scene, and a manual scene change clears it so a later
look cannot jump back to somewhere stale.
"""
from __future__ import annotations

from dataclasses import dataclass


BRIO = "brio"
C920 = "c920"


@dataclass
class Decision:
    kind: str  # "cutaway" or "return"
    to_scene: str
    remember: str | None


@dataclass
class Plan:
    write_scene: str | None
    message: str
    commit: bool


# Nose offset perpendicular to the eye line, in units of eye distance.
# This is a 2D image measurement with roll removed. It is not world pitch
# and not eye gaze. The sign depends on where the camera sits, so only a
# calibration of the chat pose against the lens pose may use it as a gate.
MIN_PITCH_SEPARATION = 0.15
TRIGGER_PROGRESS = 0.65
MIN_CALIBRATION_FRAMES = 5


@dataclass
class PitchGate:
    chat_pitch: float
    lens_pitch: float
    valid: bool
    reason: str
    trigger_progress: float = TRIGGER_PROGRESS
    min_separation: float = MIN_PITCH_SEPARATION

    def progress(self, pitch: float) -> float | None:
        number = _finite(pitch)
        if number is None or not self.valid:
            return None
        span = self.lens_pitch - self.chat_pitch
        if abs(span) < 1e-9:
            return None
        return (number - self.chat_pitch) / span

    def allows(self, pitch) -> bool:
        prog = self.progress(pitch) if self.valid else None
        if prog is None:
            return False
        return prog >= self.trigger_progress - 1e-9


def pitch_proxy(nose, left_eye, right_eye) -> float | None:
    """Component of (nose - eye midpoint) along the chin side of the eye line.

    Positive means the nose sits to the chin side of the eyes in the image
    after in-plane roll is removed. A horizontal nose shift does not change it.
    Callers must not treat the sign as "looking up" until calibration says so.
    """
    try:
        nx, ny = float(nose[0]), float(nose[1])
        lx, ly = float(left_eye[0]), float(left_eye[1])
        rx, ry = float(right_eye[0]), float(right_eye[1])
    except (TypeError, ValueError, IndexError):
        return None
    ex, ey = rx - lx, ry - ly
    eye_dist_sq = ex * ex + ey * ey
    if eye_dist_sq < 1e-6:
        return None
    # Map the left-to-right eye vector onto the image-down side of that line.
    px, py = -ey, ex
    vx, vy = nx - (lx + rx) / 2.0, ny - (ly + ry) / 2.0
    return (vx * px + vy * py) / eye_dist_sq


def pitch_proxy_from_person(person, min_conf: float) -> float | None:
    if not person:
        return None
    try:
        kpts = person["kpts"]
        nose = kpts[0]
        left_eye = kpts[1]
        right_eye = kpts[2]
        confs = (float(nose[2]), float(left_eye[2]), float(right_eye[2]))
    except (KeyError, TypeError, ValueError, IndexError):
        return None
    if min(confs) < float(min_conf):
        return None
    return pitch_proxy(nose, left_eye, right_eye)


def fit_pitch_gate(
    chat_samples,
    lens_samples,
    *,
    min_frames: int = MIN_CALIBRATION_FRAMES,
    min_separation: float = MIN_PITCH_SEPARATION,
    trigger_progress: float = TRIGGER_PROGRESS,
) -> PitchGate:
    chat = [v for v in chat_samples if _finite(v) is not None]
    lens = [v for v in lens_samples if _finite(v) is not None]
    if len(chat) < min_frames:
        return _invalid_gate(
            f"Chat pose kept {len(chat)} confident frames; need at least {min_frames}. "
            "Hold the chat-reading head turn during the one-second capture and run "
            "-Calibrate again. calibration.yaml was not written. Automatic cutaways "
            "stay off. No scene change was made."
        )
    if len(lens) < min_frames:
        return _invalid_gate(
            f"Lens pose kept {len(lens)} confident frames; need at least {min_frames}. "
            "Look up into the C920 and hold through the capture. calibration.yaml was "
            "not written. Automatic cutaways stay off. No scene change was made."
        )
    chat_pitch = _median(chat)
    lens_pitch = _median(lens)
    separation = abs(lens_pitch - chat_pitch)
    if separation < min_separation:
        return _invalid_gate(
            f"Chat pitch_proxy {chat_pitch:.2f} and lens pitch_proxy {lens_pitch:.2f} "
            f"differ by {separation:.2f} (need at least {min_separation:.2f} eye-distances). "
            "Those two poses look too similar on this camera, so a gate would not separate "
            "reading chat from looking into the lens. calibration.yaml was not written. "
            "Redo calibration with a normal chat turn, then a clear look up into the C920. "
            "Automatic cutaways stay off. No scene change was made."
        )
    return PitchGate(
        chat_pitch,
        lens_pitch,
        True,
        "",
        float(trigger_progress),
        float(min_separation),
    )


def pitch_gate_from_mapping(data) -> PitchGate:
    if not isinstance(data, dict) or data.get("version") != 1:
        return _invalid_gate(
            "calibration.yaml is missing or is not version 1. Run .\\run.ps1 -Calibrate. "
            "Automatic cutaways stay off. No scene change was made."
        )
    if data.get("feature") not in (None, "eye_line_pitch_proxy"):
        return _invalid_gate(
            "calibration.yaml uses an unknown feature. Run .\\run.ps1 -Calibrate. "
            "Automatic cutaways stay off. No scene change was made."
        )
    if data.get("feature") is None:
        return _invalid_gate(
            "calibration.yaml has no feature: eye_line_pitch_proxy entry. "
            "Run .\\run.ps1 -Calibrate. Automatic cutaways stay off. No scene change was made."
        )
    chat = _finite(data.get("chat_pitch"))
    lens = _finite(data.get("lens_pitch"))
    if chat is None or lens is None:
        return _invalid_gate(
            "calibration.yaml is missing numeric chat_pitch or lens_pitch. "
            "Run .\\run.ps1 -Calibrate. Automatic cutaways stay off. No scene change was made."
        )
    # Ignore any trigger_progress stored in the file. A hand edit must not lower the bar.
    separation = abs(lens - chat)
    if separation < MIN_PITCH_SEPARATION:
        return _invalid_gate(
            f"Saved calibration separates chat ({chat:.2f}) and lens ({lens:.2f}) by only "
            f"{separation:.2f}, under {MIN_PITCH_SEPARATION:.2f}. Automatic cutaways stay off. "
            "Run .\\run.ps1 -Calibrate again. No scene change was made."
        )
    return PitchGate(chat, lens, True, "", TRIGGER_PROGRESS, MIN_PITCH_SEPARATION)


def missing_calibration_gate() -> PitchGate:
    return _invalid_gate(
        "No C920 pitch calibration file. Automatic cutaways to C920 are off. "
        "Run .\\run.ps1 -Calibrate with the switcher off. It screenshots the C920 source "
        "only and does not change scenes. No scene change was made."
    )


def collect_pitch_samples(
    measure,
    sleep,
    log,
    label: str,
    instructions: str,
    *,
    countdown=(3, 2, 1),
    capture_s: float = 1.0,
    period: float = 0.125,
    min_frames: int = MIN_CALIBRATION_FRAMES,
) -> list[float]:
    """Countdown, then screenshot samples. `measure` returns a pitch or None.

    The callable must not switch scenes. Sleep is injected so tests can record
    the countdown without waiting.
    """
    log(f"Pose {label}. {instructions}")
    log("Get into that pose. Countdown:")
    for sec in countdown:
        log(str(sec))
        sleep(1.0)
    log("Capturing now. Hold still.")
    frames = max(int(min_frames), int(round(float(capture_s) / float(period))))
    samples: list[float] = []
    for _ in range(frames):
        value = measure()
        number = _finite(value)
        if number is not None:
            samples.append(number)
        sleep(float(period))
    log(f"{label}: {len(samples)} confident frames out of {frames}.")
    return samples


def detection_active(flag_on: bool, dry: bool) -> bool:
    """The off flag skips live detection. Dry-run still scores and logs."""
    return bool(dry) or bool(flag_on)


def apply_runtime_mode(ctrl: "CutawayController", flag_on: bool, dry: bool) -> str:
    ctrl.set_enabled(detection_active(flag_on, dry))
    if dry and not flag_on:
        return (
            "switcher flag is OFF. Dry-run will still log detections and decisions. "
            "No scene change will be made."
        )
    if dry:
        return "Dry-run will log decisions and will not change scenes."
    if flag_on:
        return "switcher ON"
    return "switcher OFF. Pending detections reset. No scene changes while off."


def _median(values: list[float]) -> float:
    ordered = sorted(values)
    count = len(ordered)
    mid = count // 2
    if count % 2:
        return float(ordered[mid])
    return float(ordered[mid - 1] + ordered[mid]) / 2.0


def _invalid_gate(reason: str) -> PitchGate:
    return PitchGate(0.0, 0.0, False, reason)


class CutawayController:
    def __init__(
        self,
        c920_scene: str,
        enter: float,
        stay: float,
        margin: float,
        dwell_to_c920: float,
        dwell_to_return: float,
        cooldown: float,
        ack_grace: float = 1.0,
    ):
        self.c920_scene = c920_scene
        self.enter = float(enter)
        self.stay = float(stay)
        self.margin = float(margin)
        self.dwell_to_c920 = float(dwell_to_c920)
        self.dwell_to_return = float(dwell_to_return)
        self.cooldown = float(cooldown)
        self.ack_grace = float(ack_grace)

        self.enabled = True
        self.logical_scene: str | None = None
        self.return_scene: str | None = None
        self.cutaway_active = False
        self.pending: str | None = None
        self.pending_since = 0.0
        self.last_switch: float | None = None
        self.last_external: str | None = None
        self.expect_scene: str | None = None
        self.expect_until = 0.0
        self.retry_after: float | None = None
        self.defer_decisions = False
        self.pitch_gate: PitchGate | None = None
        self.pitch_notice: str | None = None
        self._pitch_block_logged: str | None = None
        self.last_pitch: float | None = None
        self.last_pitch_progress: float | None = None

    def set_enabled(self, on: bool) -> None:
        on = bool(on)
        if on == self.enabled:
            return
        self.enabled = on
        self._clear_pending()
        self.retry_after = None

    def on_disconnect(self) -> None:
        """Drop in-flight detections. Keep the remembered scene for reconnect."""
        self._clear_pending()
        self.expect_scene = None
        self.defer_decisions = False
        self.last_external = None
        self.retry_after = None
        self._sanitize()

    def drop_pending(self) -> None:
        self._clear_pending()

    def silence(self, now: float, seconds: float = 2.0) -> None:
        self._clear_pending()
        later = now + seconds
        if self.retry_after is None or later > self.retry_after:
            self.retry_after = later

    def observe_scene(self, scene: str) -> str | None:
        """Apply a real program-scene change. Resets pending detections."""
        self._sanitize()
        if scene == self.logical_scene:
            return None
        prev = self.logical_scene
        self.logical_scene = scene
        self._clear_pending()
        self.expect_scene = None
        self.retry_after = None
        if scene == self.c920_scene:
            if prev and prev != self.c920_scene:
                self.return_scene = prev
                self.cutaway_active = True
                return (
                    f"Program scene changed from '{prev}' to '{self.c920_scene}'. "
                    f"Remembered '{prev}' for look-back. Pending detections reset."
                )
            if self.return_scene == self.c920_scene:
                self.return_scene = None
            self.cutaway_active = self.return_scene not in (None, self.c920_scene)
            if not self.return_scene:
                return (
                    f"Program scene is '{self.c920_scene}' but no previous scene was seen. "
                    "Looking at the BRIO will not auto-return. No scene change was made."
                )
            return None
        if prev == self.c920_scene or self.cutaway_active:
            self.cutaway_active = False
            self.return_scene = None
            shown = prev if prev else "unknown"
            return (
                f"Program scene is '{scene}' (left '{shown}'). "
                "Cleared the remembered scene so look-back cannot return somewhere stale. "
                "Pending detections reset."
            )
        self.cutaway_active = False
        if self.return_scene == self.c920_scene:
            self.return_scene = None
        if prev is None:
            return None
        return (
            f"Program scene changed from '{prev}' to '{scene}'. Pending detections reset."
        )

    def ingest_program_scene(
        self, external: str | None, now: float, dry: bool
    ) -> tuple[str | None, str | None]:
        """Pick the scene decisions should use.

        Dry-run keeps a simulated scene until OBS itself changes. Live mode waits
        briefly for a switch we just sent so a slow ack is not treated as a manual
        change, and it does not act on scores during that wait.
        """
        self.defer_decisions = False
        if external is None or not str(external).strip():
            self._clear_pending()
            return None, "OBS returned an empty program scene. No scene change was made."
        external = str(external)

        if dry and self.last_external is not None and self.logical_scene is not None:
            if external == self.last_external:
                return self.logical_scene, None
            note = self.observe_scene(external)
            self.last_external = external
            self.expect_scene = None
            return self.logical_scene, note

        if (not dry) and self.expect_scene and now <= self.expect_until:
            if external == self.expect_scene:
                self.logical_scene = external
                self.last_external = external
                self.expect_scene = None
                return self.logical_scene, None
            self.defer_decisions = True
            return self.logical_scene, None

        note = self.observe_scene(external)
        self.last_external = external
        return self.logical_scene, note

    def decide(
        self,
        brio_score: float,
        c920_score: float,
        now: float,
        c920_pitch=None,
    ) -> Decision | None:
        self._sanitize()
        self.last_pitch = _finite(c920_pitch)
        self.last_pitch_progress = None
        gate = self.pitch_gate
        if gate is not None and gate.valid and self.last_pitch is not None:
            self.last_pitch_progress = gate.progress(self.last_pitch)
        if not self.enabled or self.defer_decisions:
            self._clear_pending()
            return None
        if self.retry_after is not None and now < self.retry_after:
            return None
        brio = _finite(brio_score)
        c920 = _finite(c920_score)
        if brio is None or c920 is None:
            self._clear_pending()
            return None
        scene = self.logical_scene
        if not scene:
            self._clear_pending()
            return None
        if scene == self.c920_scene:
            return self._decide_return(brio, c920, now)
        return self._decide_cutaway(brio, c920, now, scene, c920_pitch)

    def commit(self, decision: Decision, now: float) -> bool:
        if decision.kind == "cutaway":
            remember = decision.remember
            if not remember or remember == self.c920_scene:
                return False
            self.return_scene = remember
            self.cutaway_active = True
            self.logical_scene = self.c920_scene
            self.expect_scene = self.c920_scene
        elif decision.kind == "return":
            dest = decision.to_scene
            if not dest or dest == self.c920_scene:
                return False
            self.logical_scene = dest
            self.expect_scene = dest
            self.cutaway_active = False
            self.return_scene = None
        else:
            return False
        self.expect_until = now + self.ack_grace
        self.last_switch = now
        self.retry_after = None
        self._clear_pending()
        self._sanitize()
        return True

    def _decide_cutaway(
        self, brio: float, c920: float, now: float, scene: str, pitch
    ) -> Decision | None:
        if scene == self.c920_scene or not self._looking_at_c920(brio, c920):
            if self.pending == "to_c920":
                self._clear_pending()
            return None
        if not self._pitch_allows(pitch):
            # Chat can look frontal on the C920. Do not let that time count as a look-up.
            if self.pending == "to_c920":
                self._clear_pending()
            return None
        if not self._held("to_c920", now, self.dwell_to_c920):
            return None
        if not self._cooled(now):
            return None
        return Decision("cutaway", self.c920_scene, scene)

    def _decide_return(self, brio: float, c920: float, now: float) -> Decision | None:
        dest = self.return_scene
        if dest in (None, "", self.c920_scene):
            if self.pending == "to_return":
                self._clear_pending()
            return None
        if not self._looking_at_brio(brio, c920):
            if self.pending == "to_return":
                self._clear_pending()
            return None
        if not self._held("to_return", now, self.dwell_to_return):
            return None
        if not self._cooled(now):
            return None
        return Decision("return", dest, None)

    def _pitch_allows(self, pitch) -> bool:
        gate = self.pitch_gate
        if gate is None or not gate.valid:
            reason = gate.reason if gate is not None else missing_calibration_gate().reason
            if reason != self._pitch_block_logged:
                self._pitch_block_logged = reason
                self.pitch_notice = reason
            return False
        return gate.allows(pitch)

    def _looking_at_c920(self, brio: float, c920: float) -> bool:
        if c920 < self.enter:
            return False
        # Active view still reads as frontal and the C920 is not clearly ahead.
        if brio >= self.stay and c920 < brio + self.margin:
            return False
        return True

    def _looking_at_brio(self, brio: float, c920: float) -> bool:
        if brio < self.enter:
            return False
        if c920 >= self.stay and brio < c920 + self.margin:
            return False
        return True

    def _held(self, key: str, now: float, dwell: float) -> bool:
        if self.pending != key:
            self.pending = key
            self.pending_since = now
            return False
        # 1 microsecond of slack so a dwell of exactly 0.4s is not lost to binary float error.
        return (now - self.pending_since) >= dwell - 1e-6

    def _cooled(self, now: float) -> bool:
        if self.last_switch is None:
            return True
        return (now - self.last_switch) >= self.cooldown - 1e-6

    def _clear_pending(self) -> None:
        self.pending = None
        self.pending_since = 0.0

    def _sanitize(self) -> None:
        if self.return_scene == self.c920_scene:
            self.return_scene = None
            self.cutaway_active = False


def controller_from_config(cfg: dict, pitch_gate: PitchGate | None = None) -> CutawayController:
    detect = cfg["detect"]
    cams = cfg["cameras"]
    ctrl = CutawayController(
        c920_scene=str(cams["c920"]["scene"]),
        enter=float(detect["enter"]),
        stay=float(detect["stay"]),
        margin=float(detect["margin"]),
        dwell_to_c920=float(cams["c920"].get("dwell_s", 0.5)),
        dwell_to_return=float(cams["brio"].get("dwell_s", 0.4)),
        cooldown=float(detect["cooldown_s"]),
        ack_grace=float(cfg.get("ack_grace_s", 1.0)),
    )
    ctrl.pitch_gate = pitch_gate
    if pitch_gate is not None and not pitch_gate.valid:
        ctrl._pitch_block_logged = pitch_gate.reason
    return ctrl


def validate_config(cfg: dict) -> list[str]:
    """Return actionable problems. Empty means the switcher may run."""
    if not isinstance(cfg, dict):
        return ["config.yaml did not load as a mapping. No scene change was made."]
    cams = cfg.get("cameras")
    if not isinstance(cams, dict) or "brio" not in cams or "c920" not in cams:
        return [
            "config.yaml is missing cameras.brio and cameras.c920. The v1 keys "
            "cameras.main and cameras.bit are not used. Set brio source to "
            "'Video Capture Device', c920 source to the live name (currently "
            "'C920 Source'), and c920 scene to 'C920' (see config.yaml.example). "
            "The OBS websocket "
            "password is not stored in this file. No scene change was made."
        ]
    errors: list[str] = []
    brio = cams.get("brio") or {}
    c920 = cams.get("c920") or {}
    if not isinstance(brio, dict) or not str(brio.get("source", "")).strip():
        errors.append("cameras.brio.source is empty. No scene change was made.")
    if not isinstance(c920, dict) or not str(c920.get("source", "")).strip():
        errors.append("cameras.c920.source is empty. No scene change was made.")
    scene = str(c920.get("scene", "")).strip() if isinstance(c920, dict) else ""
    if not scene:
        errors.append(
            "cameras.c920.scene is empty. Set it to C920. No scene was created."
        )
    blob = " ".join(
        [
            str(brio.get("source", "")) if isinstance(brio, dict) else "",
            str(c920.get("source", "")) if isinstance(c920, dict) else "",
            scene,
        ]
    )
    if "REPLACE_ME" in blob:
        errors.append(
            "config.yaml still contains REPLACE_ME placeholders. Put the exact OBS "
            "names in cameras.brio.source, cameras.c920.source, and cameras.c920.scene. "
            "No scene change was made."
        )
    detect = cfg.get("detect")
    if not isinstance(detect, dict):
        errors.append("detect: block is missing. No scene change was made.")
    else:
        for key in ("enter", "stay", "margin", "cooldown_s", "keypoint_conf", "max_yaw"):
            if key not in detect:
                errors.append(f"detect.{key} is missing. No scene change was made.")
    return errors


def inventory_problems(
    input_names: set[str],
    scene_names: set[str],
    brio_source: str,
    c920_source: str,
    c920_scene: str,
) -> list[str]:
    problems = []
    if brio_source not in input_names:
        problems.append(
            f"OBS source '{brio_source}' (BRIO) was not found. The name has to match "
            "the Video Capture Device source exactly. No scene change was made."
        )
    if c920_source not in input_names:
        problems.append(
            f"OBS source '{c920_source}' (C920) was not found. The upper-right camera "
            f"source has to be named exactly '{c920_source}'. No scene change was made."
        )
    if c920_scene not in scene_names:
        problems.append(
            f"OBS scene '{c920_scene}' was not found. Create a scene named exactly "
            f"{c920_scene}, or fix cameras.c920.scene. No scene was created and no "
            "switch was made."
        )
    return problems


def plan_switch(ctrl: CutawayController, decision: Decision | None, known_scenes: set[str]) -> Plan | None:
    if decision is None:
        return None
    if not ctrl.enabled:
        return Plan(None, "Switcher is off. No scene change was made.", False)
    ctrl._sanitize()
    known = set(known_scenes)
    if decision.kind == "cutaway":
        if ctrl.logical_scene == ctrl.c920_scene:
            return Plan(
                None,
                "Already on C920. Remembered scene was not overwritten. No scene change was made.",
                False,
            )
        if decision.remember in (None, "", ctrl.c920_scene):
            return Plan(
                None,
                "Refusing to remember the C920 scene or an empty scene. No scene change was made.",
                False,
            )
        if decision.remember != ctrl.logical_scene:
            return Plan(
                None,
                f"Program scene is '{ctrl.logical_scene}', not '{decision.remember}'. "
                "Pending detections reset. No scene change was made.",
                False,
            )
        if decision.to_scene != ctrl.c920_scene or decision.to_scene not in known:
            return Plan(
                None,
                f"OBS scene '{ctrl.c920_scene}' was not found. No scene was created and no switch was made.",
                False,
            )
        return Plan(
            ctrl.c920_scene,
            f"cutaway '{decision.remember}' -> '{ctrl.c920_scene}' "
            f"(will return to '{decision.remember}')",
            True,
        )
    if decision.kind == "return":
        dest = decision.to_scene
        if ctrl.logical_scene != ctrl.c920_scene:
            return Plan(
                None,
                f"Program scene is '{ctrl.logical_scene}', not '{ctrl.c920_scene}'. "
                "Cancelled auto-return. No scene change was made.",
                False,
            )
        if dest in (None, "", ctrl.c920_scene):
            return Plan(
                None,
                "No safe remembered scene. Not switching. No scene change was made.",
                False,
            )
        if dest not in known:
            return Plan(
                None,
                f"Remembered scene '{dest}' is not in OBS. Not switching and not "
                "substituting another scene. No scene change was made.",
                False,
            )
        return Plan(dest, f"return '{ctrl.c920_scene}' -> '{dest}'", True)
    return Plan(None, "Unknown decision. No scene change was made.", False)


def run_once(
    ctrl: CutawayController,
    client,
    *,
    dry: bool,
    now: float,
    scores: dict | None,
) -> list[str]:
    """One decision tick against a duck-typed OBS client. Never touches mute, sources, or stream state."""
    logs: list[str] = []
    if not ctrl.enabled:
        return ["Switcher is off. No scene change was made."]
    try:
        external = client.get_current_program_scene()
    except Exception as exc:
        ctrl.on_disconnect()
        return [
            f"OBS unreachable ({type(exc).__name__}). Start OBS and enable "
            "Tools > WebSocket Server Settings > Enable WebSocket server. "
            "No scene change was made."
        ]
    scene, note = ctrl.ingest_program_scene(external, now, dry)
    if note:
        logs.append(note)
    if scene is None or ctrl.defer_decisions or scores is None:
        if scores is None and scene is not None and not ctrl.defer_decisions:
            ctrl._clear_pending()
            logs.append("No pose scores this tick. No scene change was made.")
        return logs
    try:
        brio = scores["brio"]
        c920 = scores["c920"]
    except (KeyError, TypeError):
        ctrl._clear_pending()
        logs.append("Pose scores were incomplete. No scene change was made.")
        return logs
    decision = ctrl.decide(brio, c920, now, c920_pitch=scores.get("c920_pitch"))
    if ctrl.pitch_notice:
        logs.append(ctrl.pitch_notice)
        ctrl.pitch_notice = None
    if decision is None:
        return logs
    try:
        known = set(client.get_scene_names())
    except Exception as exc:
        ctrl.on_disconnect()
        logs.append(
            f"OBS unreachable while reading scenes ({type(exc).__name__}). "
            "No scene change was made."
        )
        return logs
    plan = plan_switch(ctrl, decision, known)
    if plan is None:
        return logs
    if not plan.commit or plan.write_scene is None:
        if plan.message:
            logs.append(plan.message)
        ctrl.silence(now)
        return logs
    if not dry:
        try:
            external_now = client.get_current_program_scene()
        except Exception as exc:
            ctrl.on_disconnect()
            logs.append(
                f"OBS unreachable before switch ({type(exc).__name__}). "
                "No scene change was made."
            )
            return logs
        changed = (
            decision.kind == "cutaway" and external_now != decision.remember
        ) or (
            decision.kind == "return" and external_now != ctrl.c920_scene
        )
        if changed:
            _, changed_note = ctrl.ingest_program_scene(external_now, now, False)
            if changed_note:
                logs.append(changed_note)
            logs.append(
                "Program scene changed before the switch was sent. No scene change was made."
            )
            ctrl.silence(now)
            return logs
        try:
            client.set_current_program_scene(plan.write_scene)
        except Exception as exc:
            name = type(exc).__name__
            if name in ("ConnectionError", "TimeoutError", "OSError", "BrokenPipeError") or "connect" in name.lower() or "timeout" in name.lower():
                ctrl.on_disconnect()
                logs.append(
                    f"OBS unreachable during switch ({name}). No scene change was made."
                )
            else:
                ctrl.silence(now)
                logs.append(
                    f"Scene change failed ({name}). No mute, source, recording, or "
                    "streaming setting was changed."
                )
            return logs
    if not ctrl.commit(decision, now):
        logs.append("Refused to commit a C920 nested return. No scene change was made.")
        ctrl.silence(now)
        return logs
    prefix = "DRY-RUN " if dry else "SWITCH "
    suffix = " (no OBS write)" if dry else ""
    extra = ""
    if decision.kind == "cutaway" and ctrl.last_pitch_progress is not None:
        extra = f" pitch_progress={ctrl.last_pitch_progress:.2f}"
    logs.append(prefix + plan.message + extra + suffix)
    return logs


def screenshot_failure_message(source: str, exc_type: str) -> str:
    return (
        f"Could not screenshot OBS source '{source}' ({exc_type}). "
        "If this camera is off program, open its source properties and uncheck "
        "'Deactivate when not showing' so OBS keeps delivering frames for screenshots. "
        "No scene change was made."
    )


def _finite(value) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number in (float("inf"), float("-inf")):
        return None
    return number
