"""Mock tests for the C920 cutaway. No OBS, webcam, or Hailo."""
from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cutaway import (  # noqa: E402
    CutawayController,
    Decision,
    controller_from_config,
    inventory_problems,
    run_once,
    screenshot_failure_message,
    validate_config,
)

SCENES = ["Starting Soon", "Chatting", "BRB", "Desktop", "Ending"]


def make() -> CutawayController:
    return CutawayController(
        c920_scene="C920",
        enter=0.45,
        stay=0.30,
        margin=0.15,
        dwell_to_c920=0.5,
        dwell_to_return=0.4,
        cooldown=1.5,
        ack_grace=1.0,
    )


def look_c920():
    return {"brio": 0.05, "c920": 0.92}


def look_brio():
    return {"brio": 0.92, "c920": 0.05}


class FakeObs:
    def __init__(self, scene, scenes=None):
        self.scene = scene
        self.scenes = set(scenes or (set(SCENES) | {"C920"}))
        self.writes = []
        self.fail_read = False
        self.fail_write = False

    def get_current_program_scene(self):
        if self.fail_read:
            raise ConnectionError("refused")
        return self.scene

    def get_scene_names(self):
        if self.fail_read:
            raise ConnectionError("refused")
        return set(self.scenes)

    def set_current_program_scene(self, name):
        if self.fail_write:
            raise ConnectionError("dropped")
        if name not in self.scenes:
            raise RuntimeError(f"missing scene {name}")
        self.writes.append(name)
        self.scene = name


class ChangeBeforeWrite:
    """Second program-scene read of the firing tick reports a manual change."""

    def __init__(self):
        self.scene = "Desktop"
        self.reads = 0
        self.writes = []
        self.scenes = set(SCENES) | {"C920"}

    def get_current_program_scene(self):
        self.reads += 1
        if self.reads >= 3:
            return "Ending"
        return "Desktop"

    def get_scene_names(self):
        return set(self.scenes)

    def set_current_program_scene(self, name):
        self.writes.append(name)
        raise AssertionError(f"wrote {name} after the program scene changed")


class Boom:
    def get_current_program_scene(self):
        raise AssertionError("polled OBS while off")

    def get_scene_names(self):
        raise AssertionError("listed scenes while off")

    def set_current_program_scene(self, name):
        raise AssertionError(f"wrote {name} while off")


def tick(ctrl, client, now, scores, dry=False):
    return run_once(ctrl, client, dry=dry, now=now, scores=scores)


class CutawayTests(unittest.TestCase):
    def test_from_each_scene_returns_to_that_scene(self):
        for scene in SCENES:
            with self.subTest(scene=scene):
                ctrl = make()
                client = FakeObs(scene)
                tick(ctrl, client, 0.0, look_c920())
                self.assertEqual(client.writes, [])
                logs = tick(ctrl, client, 0.5, look_c920())
                self.assertEqual(client.writes, ["C920"], logs)
                self.assertEqual(ctrl.return_scene, scene)
                self.assertNotEqual(ctrl.return_scene, "C920")
                self.assertTrue(any(line.startswith("SWITCH cutaway") for line in logs), logs)
                # Still looking at the C920 must not nest another cutaway.
                tick(ctrl, client, 1.0, look_c920())
                self.assertEqual(client.writes, ["C920"])
                self.assertEqual(ctrl.return_scene, scene)
                tick(ctrl, client, 2.2, look_brio())
                self.assertEqual(client.writes, ["C920"])
                logs = tick(ctrl, client, 2.7, look_brio())
                self.assertEqual(client.writes, ["C920", scene], logs)
                self.assertEqual(client.scene, scene)
                self.assertTrue(any(line.startswith("SWITCH return") for line in logs), logs)
                self.assertNotIn("C920", client.writes[1:])

    def test_manual_change_clears_stale_return(self):
        ctrl = make()
        client = FakeObs("Chatting")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(ctrl.return_scene, "Chatting")
        client.scene = "BRB"
        logs = tick(ctrl, client, 2.0, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertIsNone(ctrl.return_scene)
        self.assertEqual(ctrl.logical_scene, "BRB")
        self.assertTrue(any("stale" in line for line in logs), logs)
        tick(ctrl, client, 3.0, look_c920())
        logs = tick(ctrl, client, 3.5, look_c920())
        self.assertEqual(client.writes, ["C920", "C920"], logs)
        self.assertEqual(ctrl.return_scene, "BRB")
        tick(ctrl, client, 5.2, look_brio())
        tick(ctrl, client, 5.6, look_brio())
        self.assertEqual(client.writes, ["C920", "C920", "BRB"])
        self.assertNotIn("Chatting", client.writes)

    def test_scene_change_resets_pending_dwell(self):
        ctrl = make()
        client = FakeObs("Starting Soon")
        tick(ctrl, client, 0.0, look_c920())
        self.assertEqual(ctrl.pending, "to_c920")
        client.scene = "Ending"
        logs = tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, [], logs)
        self.assertEqual(ctrl.pending_since, 0.5)
        logs = tick(ctrl, client, 1.0, look_c920())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "Ending")

    def test_disabled_does_not_touch_obs_or_keep_dwell(self):
        ctrl = make()
        ctrl.set_enabled(False)
        logs = tick(ctrl, Boom(), 5.0, look_c920())
        self.assertEqual(logs, ["Switcher is off. No scene change was made."])

        ctrl = make()
        client = FakeObs("Ending")
        tick(ctrl, client, 0.0, look_c920())
        self.assertEqual(ctrl.pending, "to_c920")
        ctrl.set_enabled(False)
        self.assertIsNone(ctrl.pending)
        logs = tick(ctrl, client, 10.0, look_c920())
        self.assertEqual(client.writes, [])
        self.assertTrue(any("off" in line for line in logs))
        ctrl.set_enabled(True)
        tick(ctrl, client, 10.1, look_c920())
        self.assertEqual(client.writes, [])
        logs = tick(ctrl, client, 10.6, look_c920())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "Ending")

    def test_manual_change_while_off_is_not_a_stale_return(self):
        ctrl = make()
        client = FakeObs("Chatting")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(ctrl.return_scene, "Chatting")
        ctrl.set_enabled(False)
        client.scene = "Desktop"
        tick(ctrl, client, 2.0, look_brio())
        ctrl.set_enabled(True)
        logs = tick(ctrl, client, 2.1, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(client.scene, "Desktop")
        self.assertIsNone(ctrl.return_scene)

    def test_disconnect_does_not_write_or_replace_memory_with_c920(self):
        ctrl = make()
        client = FakeObs("BRB")
        tick(ctrl, client, 0.0, {"brio": 0.1, "c920": 0.1})
        ctrl.return_scene = "BRB"
        client.fail_read = True
        logs = tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, [])
        self.assertEqual(ctrl.return_scene, "BRB")
        self.assertIsNone(ctrl.pending)
        self.assertTrue(any("unreachable" in line for line in logs), logs)

        client.fail_read = False
        tick(ctrl, client, 1.0, look_c920())
        self.assertEqual(client.writes, [])
        logs = tick(ctrl, client, 1.5, look_c920())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "BRB")

    def test_failed_write_does_not_commit(self):
        ctrl = make()
        client = FakeObs("Ending")
        tick(ctrl, client, 0.0, look_c920())
        client.fail_write = True
        logs = tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, [])
        self.assertEqual(ctrl.logical_scene, "Ending")
        self.assertIsNone(ctrl.return_scene)
        self.assertTrue(any("unreachable" in line for line in logs), logs)

    def test_missing_c920_scene_does_not_write(self):
        ctrl = make()
        client = FakeObs("Desktop", scenes=set(SCENES))
        tick(ctrl, client, 0.0, look_c920())
        logs = tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, [])
        self.assertTrue(any("was not found" in line for line in logs), logs)
        self.assertIsNone(ctrl.return_scene)
        again = tick(ctrl, client, 0.7, look_c920())
        self.assertFalse(any("was not found" in line for line in again), again)

    def test_missing_return_scene_is_not_replaced(self):
        ctrl = make()
        client = FakeObs("Desktop")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(ctrl.return_scene, "Desktop")
        client.scenes.discard("Desktop")
        tick(ctrl, client, 2.2, look_brio())
        logs = tick(ctrl, client, 2.7, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(client.scene, "C920")
        self.assertTrue(any("not substituting" in line for line in logs), logs)
        self.assertEqual(ctrl.return_scene, "Desktop")

    def test_started_on_c920_does_not_invent_a_return(self):
        ctrl = make()
        client = FakeObs("C920")
        logs = tick(ctrl, client, 0.0, look_brio())
        self.assertEqual(client.writes, [])
        self.assertTrue(any("no previous scene" in line for line in logs), logs)
        logs = tick(ctrl, client, 3.0, look_brio())
        self.assertEqual(client.writes, [])
        self.assertFalse(any("no previous scene" in line for line in logs))
        self.assertIsNone(ctrl.return_scene)

    def test_corrupt_memory_cannot_return_to_c920(self):
        ctrl = make()
        ctrl.observe_scene("C920")
        ctrl.return_scene = "C920"
        ctrl.logical_scene = "C920"
        decision = ctrl.decide(0.95, 0.05, 5.0)
        self.assertIsNone(decision)
        self.assertIsNone(ctrl.return_scene)
        self.assertFalse(ctrl.commit(Decision("cutaway", "C920", "C920"), 6.0))
        self.assertFalse(ctrl.commit(Decision("return", "C920", None), 6.0))
        self.assertNotEqual(ctrl.return_scene, "C920")

    def test_dry_run_remembers_without_writing(self):
        ctrl = make()
        client = FakeObs("Desktop")
        tick(ctrl, client, 0.0, look_c920(), dry=True)
        logs = tick(ctrl, client, 0.5, look_c920(), dry=True)
        self.assertEqual(client.writes, [])
        self.assertEqual(client.scene, "Desktop")
        self.assertEqual(ctrl.logical_scene, "C920")
        self.assertEqual(ctrl.return_scene, "Desktop")
        self.assertTrue(any(line.startswith("DRY-RUN cutaway") for line in logs), logs)
        tick(ctrl, client, 2.2, look_brio(), dry=True)
        logs = tick(ctrl, client, 2.7, look_brio(), dry=True)
        self.assertEqual(client.writes, [])
        self.assertEqual(client.scene, "Desktop")
        self.assertEqual(ctrl.logical_scene, "Desktop")
        self.assertTrue(any(line.startswith("DRY-RUN return") and "Desktop" in line for line in logs), logs)

    def test_dry_run_manual_scene_change_wins(self):
        ctrl = make()
        client = FakeObs("Chatting")
        tick(ctrl, client, 0.0, look_c920(), dry=True)
        tick(ctrl, client, 0.5, look_c920(), dry=True)
        self.assertEqual(ctrl.return_scene, "Chatting")
        client.scene = "Ending"
        logs = tick(ctrl, client, 0.8, look_brio(), dry=True)
        self.assertEqual(client.writes, [])
        self.assertIsNone(ctrl.return_scene)
        self.assertEqual(ctrl.logical_scene, "Ending")
        self.assertTrue(any("stale" in line for line in logs), logs)

    def test_ack_lag_does_not_auto_return_early(self):
        ctrl = make()
        client = FakeObs("Chatting")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, ["C920"])
        client.scene = "Chatting"  # websocket ack has not caught up
        logs = tick(ctrl, client, 0.8, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "Chatting")
        self.assertEqual(ctrl.logical_scene, "C920")
        logs = tick(ctrl, client, 2.0, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.logical_scene, "Chatting")
        self.assertIsNone(ctrl.return_scene)

    def test_program_scene_change_blocks_the_write(self):
        ctrl = make()
        client = ChangeBeforeWrite()
        tick(ctrl, client, 0.0, look_c920())
        logs = tick(ctrl, client, 0.5, look_c920())
        self.assertEqual(client.writes, [], logs)
        self.assertEqual(ctrl.logical_scene, "Ending")
        self.assertTrue(any("before the switch" in line for line in logs), logs)

    def test_hysteresis_and_empty_scores(self):
        ctrl = make()
        ctrl.observe_scene("Desktop")
        self.assertIsNone(ctrl.decide(0.8, 0.5, 1.0))
        self.assertIsNone(ctrl.decide(0.8, 0.5, 10.0))
        self.assertIsNone(ctrl.pending)
        self.assertIsNone(ctrl.decide(0.2, 0.9, 11.0))
        decision = ctrl.decide(0.2, 0.9, 11.5)
        self.assertIsNotNone(decision)
        self.assertEqual(decision.kind, "cutaway")
        self.assertEqual(decision.remember, "Desktop")

        ctrl = make()
        ctrl.observe_scene("Desktop")
        self.assertIsNone(ctrl.decide(0.1, 0.9, 0.3))
        # One 0.5s dwell later. 0.8 - 0.3 is a hair under 0.5 in binary floats.
        decision = ctrl.decide(0.1, 0.9, 0.8)
        self.assertIsNotNone(decision)
        self.assertEqual(decision.remember, "Desktop")

        ctrl = make()
        ctrl.observe_scene("Ending")
        self.assertIsNone(ctrl.decide(0.0, 0.0, 5.0))
        self.assertIsNone(ctrl.pending)
        self.assertIsNone(ctrl.decide(float("nan"), 0.9, 6.0))
        self.assertIsNone(ctrl.pending)

    def test_context_change_resets_direct_dwell(self):
        ctrl = make()
        ctrl.observe_scene("Desktop")
        self.assertIsNone(ctrl.decide(0.1, 0.9, 1.0))
        note = ctrl.observe_scene("BRB")
        self.assertIsNone(ctrl.pending)
        self.assertIn("Pending detections reset", note)
        self.assertIsNone(ctrl.decide(0.1, 0.9, 1.4))
        self.assertEqual(ctrl.pending_since, 1.4)
        self.assertIsNone(ctrl.decide(0.1, 0.9, 1.7))
        decision = ctrl.decide(0.1, 0.9, 1.9)
        self.assertEqual(decision.remember, "BRB")

    def test_no_scores_does_not_switch(self):
        ctrl = make()
        client = FakeObs("Ending")
        logs = tick(ctrl, client, 4.0, None)
        self.assertEqual(client.writes, [])
        self.assertEqual(ctrl.logical_scene, "Ending")
        self.assertTrue(any("No pose scores" in line for line in logs), logs)

    def test_inventory_and_screenshot_messages(self):
        problems = inventory_problems(
            {"Video Capture Device"},
            {"Chatting"},
            "Video Capture Device",
            "Video Capture Device 2",
            "C920",
        )
        self.assertEqual(len(problems), 2)
        self.assertIn("Video Capture Device 2", problems[0])
        self.assertIn("C920", problems[1])
        self.assertTrue(all("No scene" in line for line in problems))
        message = screenshot_failure_message("Video Capture Device 2", "OBSSDKRequestError")
        self.assertIn("Video Capture Device 2", message)
        self.assertIn("Deactivate when not showing", message)
        self.assertIn("No scene change was made", message)

    def test_old_config_is_rejected(self):
        errors = validate_config({
            "cameras": {
                "main": {"source": "Camera", "scene": "REPLACE_ME Main scene"},
                "bit": {"source": "REPLACE_ME Upper-right cam", "scene": "REPLACE_ME Bit scene"},
            }
        })
        self.assertTrue(errors)
        self.assertIn("No scene change was made", errors[0])
        good = {
            "cameras": {
                "brio": {"source": "Video Capture Device", "dwell_s": 0.4},
                "c920": {
                    "source": "Video Capture Device 2",
                    "scene": "C920",
                    "dwell_s": 0.5,
                },
            },
            "detect": {
                "enter": 0.45,
                "stay": 0.30,
                "margin": 0.15,
                "cooldown_s": 1.5,
                "keypoint_conf": 0.5,
                "max_yaw": 0.6,
            },
        }
        self.assertEqual(validate_config(good), [])
        ctrl = controller_from_config(good)
        self.assertEqual(ctrl.c920_scene, "C920")
        self.assertEqual(ctrl.dwell_to_c920, 0.5)
        self.assertEqual(ctrl.dwell_to_return, 0.4)


class PackageTests(unittest.TestCase):
    def test_config_names_and_no_secret(self):
        text = (ROOT / "config.yaml").read_text(encoding="utf-8")
        example = (ROOT / "config.yaml.example").read_text(encoding="utf-8")
        self.assertEqual(text, example)
        self.assertIn('source: "Video Capture Device"', text)
        self.assertIn('source: "Video Capture Device 2"', text)
        self.assertIn('scene: "C920"', text)
        self.assertNotIn("REPLACE_ME", text)
        self.assertNotIn("server_password", text)
        self.assertNotIn("only_from_managed_scenes", text)
        for banned in (".mp3", ".wav", ".ogg"):
            self.assertNotIn(banned, text)

    def test_launchers_keep_flags(self):
        run_ps1 = (ROOT / "run.ps1").read_text(encoding="utf-8")
        toggle = (ROOT / "toggle.ps1").read_text(encoding="utf-8")
        for flag in ("--dry-run", "--bench", "--list-obs", "--verbose", "--duration", "gaze_switcher.py"):
            self.assertIn(flag, run_ps1)
        self.assertIn(r".venv\Scripts\python.exe", run_ps1)
        self.assertIn("switcher.on", toggle)

    def test_installer_keeps_personal_files(self):
        script = (ROOT / "install-update.ps1").read_text(encoding="utf-8")
        for kept in (".venv", "models", "logs", "switcher.on", "config.yaml"):
            self.assertIn(kept, script)
        self.assertIn("-UpdateConfig", script)
        self.assertIn("-Rollback", script)
        self.assertIn(r"D:\TheForge\Dev\jam-production-assistant", script)
        self.assertNotIn("Remove-Item $Target", script)

    def test_python_sources_only_switch_program_scene(self):
        import re
        allowed = {
            ".set_current_program_scene(",
            ".set_format_type(",
            ".set_buffer(",
            ".set_enabled(",
        }
        for name in ("gaze_switcher.py", "cutaway.py"):
            text = (ROOT / name).read_text(encoding="utf-8")
            found = set(re.findall(r"\.set_[a-z0-9_]+\(", text))
            self.assertTrue(found <= allowed, (name, found - allowed))
            for banned in (
                "set_input_mute",
                "toggle_input_mute",
                "set_input_volume",
                "set_input_settings",
                "create_scene",
                "remove_scene",
                "start_record",
                "stop_record",
                "start_stream",
                "stop_stream",
                "VideoCapture",
                "cv2",
                "winsound",
                "playsound",
                ".mp3",
                ".wav",
            ):
                self.assertNotIn(banned, text, name)
        switcher = (ROOT / "gaze_switcher.py").read_text(encoding="utf-8")
        self.assertIn(".set_current_program_scene(", switcher)
        for line in switcher.splitlines():
            if "log." in line or "print(" in line:
                self.assertNotIn("password", line.lower(), line)

    def test_no_audio_assets(self):
        for path in ROOT.rglob("*"):
            if path.is_file():
                self.assertNotIn(path.suffix.lower(), {".mp3", ".wav", ".ogg", ".flac"})

    def test_gaze_switcher_imports_and_flag_file(self):
        import gaze_switcher
        self.assertTrue(hasattr(gaze_switcher, "run"))
        with tempfile.TemporaryDirectory() as tmp:
            flag = Path(tmp) / "switcher.on"
            cfg = {"enable_flag": str(flag)}
            self.assertFalse(gaze_switcher.flag_on(cfg))
            flag.write_text("", encoding="utf-8")
            self.assertTrue(gaze_switcher.flag_on(cfg))
            flag.unlink()
            self.assertFalse(gaze_switcher.flag_on(cfg))

    def test_frontal_score_still_prefers_a_centered_nose(self):
        import numpy as np
        import gaze_switcher
        kpts = np.zeros((17, 3), dtype=float)
        kpts[0] = (100, 40, 0.9)
        kpts[1] = (80, 40, 0.9)
        kpts[2] = (120, 40, 0.9)
        kpts[3] = (70, 40, 0.9)
        kpts[4] = (130, 40, 0.9)
        box = np.array([50, 10, 150, 120], dtype=float)
        straight, why = gaze_switcher.frontal_score(
            {"box": box, "score": 0.9, "kpts": kpts}, 0.5, 0.6
        )
        self.assertGreater(straight, 0.5, why)
        turned_kpts = kpts.copy()
        turned_kpts[0, 0] = 145
        turned, _why = gaze_switcher.frontal_score(
            {"box": box, "score": 0.9, "kpts": turned_kpts}, 0.5, 0.6
        )
        self.assertLess(turned, straight)

    def test_placeholder_config_stops_before_hailo_and_obs(self):
        import gaze_switcher
        with tempfile.TemporaryDirectory() as tmp:
            cfg_path = Path(tmp) / "config.yaml"
            cfg_path.write_text(
                "cameras:\n"
                "  main:\n"
                "    source: Camera\n"
                "    scene: 'REPLACE_ME Main'\n"
                "  bit:\n"
                "    source: 'REPLACE_ME cam'\n"
                "    scene: 'REPLACE_ME bit'\n"
                f"log_dir: {Path(tmp).as_posix()}/logs\n",
                encoding="utf-8",
            )
            code = gaze_switcher.main(["--config", str(cfg_path), "--dry-run", "--duration", "5"])
            self.assertEqual(code, 2)
            log_text = (Path(tmp) / "logs" / "dry-run.log").read_text(encoding="utf-8")
            self.assertIn("No scene change was made", log_text)
            self.assertNotIn("connecting to OBS", log_text)
            self.assertNotIn("SWITCH", log_text)

    def test_without_hailo_valid_config_stops_before_obs(self):
        import importlib.util
        if importlib.util.find_spec("hailo_platform") is not None:
            self.skipTest("Hailo is installed; unit tests must not open OBS")
        import gaze_switcher
        with tempfile.TemporaryDirectory() as tmp:
            text = (ROOT / "config.yaml").read_text(encoding="utf-8")
            text += f"\nlog_dir: {Path(tmp).as_posix()}/logs\n"
            cfg_path = Path(tmp) / "config.yaml"
            cfg_path.write_text(text, encoding="utf-8")
            code = gaze_switcher.main(["--config", str(cfg_path), "--dry-run", "--duration", "3"])
            self.assertEqual(code, 2)
            log_text = (Path(tmp) / "logs" / "dry-run.log").read_text(encoding="utf-8")
            self.assertIn("Hailo", log_text)
            self.assertIn("No scene change was made", log_text)
            self.assertNotIn("connecting to OBS", log_text)
            self.assertNotIn("SWITCH", log_text)


if __name__ == "__main__":
    unittest.main()
