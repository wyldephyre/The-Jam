"""Pitch-gate tests. Synthetic keypoints only; no OBS, webcam, or Hailo."""
from __future__ import annotations

import inspect
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from cutaway import (  # noqa: E402
    MIN_PITCH_SEPARATION,
    TRIGGER_PROGRESS,
    CutawayController,
    PitchGate,
    apply_runtime_mode,
    collect_pitch_samples,
    fit_pitch_gate,
    pitch_gate_from_mapping,
    pitch_proxy,
    pitch_proxy_from_person,
)
from test_cutaway import FakeObs, look_brio, look_c920, lens_gate, tick  # noqa: E402


def fast_ctrl() -> CutawayController:
    ctrl = CutawayController(
        c920_scene="C920",
        enter=0.45,
        stay=0.30,
        margin=0.15,
        dwell_to_c920=0.25,
        dwell_to_return=0.25,
        cooldown=0.6,
        ack_grace=1.0,
    )
    ctrl.pitch_gate = lens_gate()
    return ctrl


class PitchGeometryTests(unittest.TestCase):
    def test_proxy_is_roll_normalized_and_ignores_horizontal_shift(self):
        below = pitch_proxy((0, 20), (-10, 0), (10, 0))
        above = pitch_proxy((0, -20), (-10, 0), (10, 0))
        shifted = pitch_proxy((12, 20), (-10, 0), (10, 0))
        rolled = pitch_proxy((-20, 10), (0, 0), (0, 20))
        self.assertAlmostEqual(below, 1.0)
        self.assertAlmostEqual(above, -1.0)
        self.assertAlmostEqual(shifted, 1.0)
        self.assertAlmostEqual(rolled, 1.0)
        self.assertIsNone(pitch_proxy((0, 0), (0, 0), (0, 0)))

    def test_low_confidence_is_not_a_pitch(self):
        person = {"kpts": [[0, 20, 0.2], [-10, 0, 0.9], [10, 0, 0.9]]}
        self.assertIsNone(pitch_proxy_from_person(person, 0.5))
        confident = {"kpts": [[0, 20, 0.9], [-10, 0, 0.9], [10, 0, 0.9]]}
        self.assertAlmostEqual(pitch_proxy_from_person(confident, 0.5), 1.0)

    def test_frontal_score_does_not_measure_pitch(self):
        import numpy as np
        import gaze_switcher
        def score(nose_y):
            kpts = np.zeros((17, 3), dtype=float)
            kpts[0] = (100, nose_y, 0.9)
            kpts[1] = (80, 40, 0.9)
            kpts[2] = (120, 40, 0.9)
            kpts[3] = (70, 40, 0.9)
            kpts[4] = (130, 40, 0.9)
            box = np.array([50, 10, 150, 160], dtype=float)
            value, _why = gaze_switcher.frontal_score(
                {"box": box, "score": 0.9, "kpts": kpts}, 0.5, 0.6
            )
            return value
        self.assertAlmostEqual(score(40), score(80))


class PitchGateTests(unittest.TestCase):
    def test_chat_pose_does_not_cut_and_does_not_fill_dwell(self):
        ctrl = fast_ctrl()
        client = FakeObs("Desktop")
        chat = {"brio": 0.1, "c920": 0.95, "c920_pitch": 0.05}
        tick(ctrl, client, 0.0, chat)
        logs = tick(ctrl, client, 1.0, chat)
        self.assertEqual(client.writes, [], logs)
        self.assertIsNone(ctrl.pending)
        self.assertFalse(any("cutaway" in line for line in logs))
        tick(ctrl, client, 1.2, look_c920())
        self.assertEqual(client.writes, [])
        logs = tick(ctrl, client, 1.45, look_c920())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "Desktop")
        self.assertIn("pitch_progress=", logs[-1])

    def test_flipped_camera_uses_calibration_not_a_fixed_sign(self):
        ctrl = fast_ctrl()
        # On this camera the lens sample is the smaller number. Nose-above-eyes is not the rule.
        ctrl.pitch_gate = PitchGate(1.0, 0.0, True, "")
        client = FakeObs("BRB")
        chat = {"brio": 0.05, "c920": 0.92, "c920_pitch": 1.0}
        tick(ctrl, client, 0.0, chat)
        tick(ctrl, client, 0.5, chat)
        self.assertEqual(client.writes, [])
        lens = {"brio": 0.05, "c920": 0.92, "c920_pitch": 0.0}
        tick(ctrl, client, 0.6, lens)
        logs = tick(ctrl, client, 0.85, lens)
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertEqual(ctrl.return_scene, "BRB")

    def test_midway_and_low_confidence_fail_safe(self):
        ctrl = fast_ctrl()
        client = FakeObs("Ending")
        midway = {"brio": 0.05, "c920": 0.92, "c920_pitch": 0.50}
        tick(ctrl, client, 0.0, midway)
        tick(ctrl, client, 1.0, midway)
        self.assertEqual(client.writes, [])
        unknown = {"brio": 0.05, "c920": 0.92, "c920_pitch": None}
        tick(ctrl, client, 1.2, unknown)
        tick(ctrl, client, 2.0, unknown)
        self.assertEqual(client.writes, [])
        self.assertIsNone(ctrl.pending)

    def test_missing_and_invalid_calibration_block_cutaway_only(self):
        ctrl = fast_ctrl()
        ctrl.pitch_gate = None
        client = FakeObs("Chatting")
        logs = tick(ctrl, client, 0.0, look_c920())
        self.assertEqual(client.writes, [])
        self.assertTrue(any("Calibrate" in line for line in logs), logs)
        again = tick(ctrl, client, 1.0, look_c920())
        self.assertFalse(any("Calibrate" in line for line in again))

        weak = fit_pitch_gate([0.40] * 6, [0.48] * 6)
        self.assertFalse(weak.valid)
        self.assertLess(abs(0.48 - 0.40), MIN_PITCH_SEPARATION)
        ctrl = fast_ctrl()
        ctrl.pitch_gate = weak
        logs = tick(ctrl, FakeObs("Desktop"), 0.0, look_c920())
        self.assertTrue(any("too similar" in line or "differ" in line for line in logs), logs)

        short = fit_pitch_gate([0.1, 0.1], [0.8] * 6)
        self.assertFalse(short.valid)
        self.assertIn("Chat pose", short.reason)

    def test_saved_file_cannot_lower_the_trigger(self):
        loaded = pitch_gate_from_mapping({
            "version": 1,
            "feature": "eye_line_pitch_proxy",
            "chat_pitch": 0.0,
            "lens_pitch": 1.0,
            "trigger_progress": 0.0,
        })
        self.assertTrue(loaded.valid)
        self.assertEqual(loaded.trigger_progress, TRIGGER_PROGRESS)
        self.assertFalse(loaded.allows(0.2))
        self.assertTrue(loaded.allows(1.0))
        broken = pitch_gate_from_mapping({
            "version": 1,
            "feature": "eye_line_pitch_proxy",
            "chat_pitch": 0.4,
            "lens_pitch": 0.45,
        })
        self.assertFalse(broken.valid)
        self.assertFalse(pitch_gate_from_mapping({"version": 2}).valid)
        self.assertFalse(pitch_gate_from_mapping(None).valid)

    def test_return_ignores_pitch_and_manual_change_still_clears_memory(self):
        ctrl = fast_ctrl()
        client = FakeObs("Starting Soon")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.25, look_c920())
        self.assertEqual(ctrl.return_scene, "Starting Soon")
        # Back to the BRIO even if the C920 pitch value is the chat pose or missing.
        back = {"brio": 0.93, "c920": 0.05, "c920_pitch": 0.0}
        tick(ctrl, client, 0.90, back)
        logs = tick(ctrl, client, 1.15, back)
        self.assertEqual(client.writes, ["C920", "Starting Soon"], logs)

        ctrl = fast_ctrl()
        client = FakeObs("Chatting")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.25, look_c920())
        client.scene = "Desktop"
        logs = tick(ctrl, client, 2.0, look_brio())
        self.assertEqual(client.writes, ["C920"], logs)
        self.assertIsNone(ctrl.return_scene)
        self.assertEqual(ctrl.logical_scene, "Desktop")

    def test_fast_cooldown_holds(self):
        ctrl = fast_ctrl()
        client = FakeObs("BRB")
        tick(ctrl, client, 0.0, look_c920())
        tick(ctrl, client, 0.25, look_c920())
        tick(ctrl, client, 0.50, look_brio())
        tick(ctrl, client, 0.75, look_brio())
        self.assertEqual(client.writes, ["C920"])
        logs = tick(ctrl, client, 0.85, look_brio())
        self.assertEqual(client.writes, ["C920", "BRB"], logs)

    def test_dry_run_while_flag_off_still_logs_and_does_not_write(self):
        ctrl = fast_ctrl()
        ctrl.set_enabled(False)
        message = apply_runtime_mode(ctrl, False, True)
        self.assertTrue(ctrl.enabled)
        self.assertIn("OFF", message)
        self.assertIn("Dry-run", message)
        self.assertIn("No scene change", message)
        client = FakeObs("Ending")
        tick(ctrl, client, 0.0, look_c920(), dry=True)
        logs = tick(ctrl, client, 0.25, look_c920(), dry=True)
        self.assertEqual(client.writes, [])
        self.assertEqual(client.scene, "Ending")
        self.assertTrue(any(line.startswith("DRY-RUN cutaway") for line in logs), logs)
        self.assertEqual(ctrl.return_scene, "Ending")
        live = fast_ctrl()
        apply_runtime_mode(live, False, False)
        self.assertFalse(live.enabled)
        blocked = tick(live, FakeObs("Ending"), 0.0, look_c920(), dry=False)
        self.assertTrue(any("off" in line.lower() for line in blocked), blocked)

    def test_countdown_is_three_one_second_beats_then_a_one_second_capture(self):
        sleeps = []
        logs = []
        samples = collect_pitch_samples(
            measure=lambda: 0.33,
            sleep=sleeps.append,
            log=logs.append,
            label="1 of 2 CHAT",
            instructions="Turn toward chat. Do not look up into the C920.",
            countdown=(3, 2, 1),
            capture_s=1.0,
            period=0.125,
            min_frames=5,
        )
        self.assertEqual(sleeps[:3], [1.0, 1.0, 1.0])
        self.assertEqual(len(sleeps), 11)
        self.assertTrue(all(item == 0.125 for item in sleeps[3:]))
        self.assertEqual(logs[2:5], ["3", "2", "1"])
        self.assertTrue(any(line.startswith("Capturing now") for line in logs))
        self.assertEqual(len(samples), 8)
        sparse = iter([None, None, None, 0.2, 0.2, 0.2, 0.2, 0.2])
        kept = collect_pitch_samples(
            measure=lambda: next(sparse),
            sleep=lambda _s: None,
            log=lambda _m: None,
            label="2 of 2 LENS",
            instructions="Look into the lens.",
            period=0.125,
        )
        self.assertEqual(kept, [0.2, 0.2, 0.2, 0.2, 0.2])

    def test_calibration_round_trip_and_calibrate_never_switches(self):
        import gaze_switcher
        source = inspect.getsource(gaze_switcher.calibrate)
        self.assertNotIn("set_current_program_scene", source)
        self.assertIn("grab(", source)
        gate = fit_pitch_gate([0.10] * 8, [0.70] * 8)
        self.assertTrue(gate.valid)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "calibration.yaml"
            gaze_switcher.save_pitch_gate(path, gate, 8, 8)
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("password", text.lower())
            loaded = gaze_switcher.load_pitch_gate({"calibration": str(path)})
            self.assertTrue(loaded.valid)
            self.assertAlmostEqual(loaded.chat_pitch, gate.chat_pitch, places=3)
            self.assertFalse(loaded.allows(gate.chat_pitch))
            self.assertTrue(loaded.allows(gate.lens_pitch))
            missing = gaze_switcher.load_pitch_gate({"calibration": str(Path(tmp) / "nope.yaml")})
            self.assertFalse(missing.valid)
            self.assertIn("Calibrate", missing.reason)
        with self.assertRaises(RuntimeError):
            gaze_switcher.save_pitch_gate(Path("ignored.yaml"), fit_pitch_gate([0.2], [0.9]), 1, 1)


if __name__ == "__main__":
    unittest.main()
