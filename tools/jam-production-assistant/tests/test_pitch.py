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
    CAL_CYCLES,
    CAL_SETTLE_S,
    MIN_PITCH_SEPARATION,
    SAY_AGAIN,
    SAY_CHAT,
    SAY_FRONT,
    SAY_LENS,
    SAY_VOICE_CHECK,
    TRIGGER_PROGRESS,
    CutawayController,
    PitchGate,
    apply_runtime_mode,
    calibration_brief,
    fit_multicam_gate,
    fit_pitch_gate,
    fit_pose_gate,
    pitch_gate_from_mapping,
    pitch_proxy,
    pitch_proxy_from_person,
    prepare_calibration_voice,
    run_calibration_timer,
    yaw_proxy,
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
        self.assertAlmostEqual(yaw_proxy((0, 20), (-10, 0), (10, 0)), 0.0)
        self.assertAlmostEqual(yaw_proxy((12, 20), (-10, 0), (10, 0)), 0.6)
        self.assertAlmostEqual(pitch_proxy((12, 20), (-10, 0), (10, 0)), below)

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
            "version": 2,
            "feature": "pitch_and_yaw",
            "front_pitch": 0.0, "front_yaw": 0.0,
            "chat_pitch": 0.05, "chat_yaw": 0.8,
            "lens_pitch": 0.9, "lens_yaw": 0.8,
            "trigger_progress": 0.0,
        })
        self.assertTrue(loaded.valid)
        self.assertEqual(loaded.trigger_progress, TRIGGER_PROGRESS)
        self.assertFalse(loaded.allows(0.05, 0.8))
        self.assertFalse(loaded.allows(0.0, 0.0))
        self.assertTrue(loaded.allows(0.9, 0.8))
        self.assertFalse(loaded.allows(0.9))
        old = pitch_gate_from_mapping({
            "version": 1, "feature": "eye_line_pitch_proxy",
            "chat_pitch": 0.0, "lens_pitch": 1.0,
        })
        self.assertFalse(old.valid)
        self.assertIn("straight-ahead", old.reason)
        self.assertFalse(pitch_gate_from_mapping(None).valid)

    def test_front_and_chat_both_block_and_pitch_gap_can_fail_closed(self):
        gate = fit_pose_gate([(0.0, 0.0)] * 6, [(0.05, 0.9)] * 6, [(0.8, 0.85)] * 6)
        self.assertTrue(gate.valid)
        self.assertFalse(gate.allows(0.0, 0.0))
        self.assertFalse(gate.allows(0.05, 0.9))
        self.assertTrue(gate.allows(0.8, 0.85))
        # Same up/down number as the lens, but the sideways offset is still straight ahead.
        self.assertFalse(gate.allows(0.8, 0.0))
        ctrl = fast_ctrl()
        ctrl.pitch_gate = gate
        client = FakeObs("Desktop")
        for pose in ((0.0, 0.0), (0.05, 0.9)):
            scores = {"brio": 0.1, "c920": 0.95, "c920_pitch": pose[0], "c920_yaw": pose[1]}
            tick(ctrl, client, 0.0, scores)
            tick(ctrl, client, 1.0, scores)
            self.assertEqual(client.writes, [])
        lens = {"brio": 0.1, "c920": 0.95, "c920_pitch": 0.8, "c920_yaw": 0.85}
        tick(ctrl, client, 2.0, lens)
        tick(ctrl, client, 2.25, lens)
        self.assertEqual(client.writes, ["C920"])

        # Chat sits on the lens pitch. Sideways offset still separates them.
        yaw_saved = fit_pose_gate([(0.2, 0.0)] * 6, [(0.70, 0.1)] * 6, [(0.75, 1.0)] * 6)
        self.assertTrue(yaw_saved.valid)
        self.assertIn("Pitch alone does not separate", yaw_saved.axis_note)
        self.assertIn("chat", yaw_saved.axis_note)
        self.assertFalse(yaw_saved.allows(0.70, 0.1))
        self.assertFalse(yaw_saved.allows(0.2, 0.0))
        self.assertTrue(yaw_saved.allows(0.75, 1.0))

        # Neither axis separates. Do not write a gate.
        overlap = fit_pose_gate([(0.50, 0.50)] * 6, [(0.52, 0.55)] * 6, [(0.55, 0.58)] * 6)
        self.assertFalse(overlap.valid)
        self.assertIn("Pitch alone", overlap.reason)
        self.assertIn("chat", overlap.reason)
        self.assertIn("not written", overlap.reason)

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

    def test_spoken_holds_start_after_the_cue_and_repeat(self):
        events = []

        def speak(text):
            events.append(("speak", text))

        def sleep(seconds):
            events.append(("sleep", seconds))

        def measure():
            events.append(("measure",))
            return (0.2, 0.1)

        front, chat, lens = run_calibration_timer(
            measure, sleep, lambda message: events.append(("log", message)), speak,
            period=0.125, hold_s=3.0, settle_s=CAL_SETTLE_S, trim_s=0.5, cycles=2,
        )
        speaks = [item[1] for item in events if item[0] == "speak"]
        self.assertEqual(speaks[0], SAY_FRONT)
        self.assertEqual(speaks.count(SAY_FRONT), CAL_CYCLES)
        self.assertEqual(speaks.count(SAY_CHAT), CAL_CYCLES)
        self.assertEqual(speaks.count(SAY_LENS), CAL_CYCLES)
        self.assertEqual(speaks.count(SAY_AGAIN), 1)
        self.assertLess(events.index(("speak", SAY_FRONT)), events.index(("measure",)))
        # After each pose sentence, the next thing is the unsampled settle, then capture.
        for phrase in (SAY_FRONT, SAY_CHAT, SAY_LENS):
            start = events.index(("speak", phrase))
            self.assertEqual(events[start + 1][0], "log")
            self.assertEqual(events[start + 2], ("sleep", CAL_SETTLE_S))
            self.assertEqual(events[start + 3], ("measure",))
        # 3s at 8 fps is 24 frames; 0.5s trimmed off each end leaves 16 per hold.
        self.assertEqual(len(front), CAL_CYCLES * 16)
        self.assertEqual(len(chat), CAL_CYCLES * 16)
        self.assertEqual(len(lens), CAL_CYCLES * 16)
        self.assertIn(SAY_CHAT, calibration_brief())
        self.assertIn("does not replace the chat sample", calibration_brief())

    def test_voice_check_failure_does_not_start(self):
        heard = []

        def speak(text):
            heard.append(text)
            raise RuntimeError("no sapi")

        logs = []
        self.assertFalse(prepare_calibration_voice(speak, logs.append))
        self.assertEqual(heard, [SAY_VOICE_CHECK])
        self.assertIn("timer was not started", logs[0])
        self.assertIn("No calibration file", logs[0])

    def test_calibration_round_trip_and_speech_command_is_offline(self):
        import gaze_switcher
        source = inspect.getsource(gaze_switcher.calibrate)
        self.assertNotIn("set_current_program_scene", source)
        self.assertIn("grab(", source)
        self.assertIn("prepare_calibration_voice", source)
        gate = fit_pose_gate([(0.0, 0.0)] * 8, [(0.1, 0.8)] * 8, [(0.7, 0.75)] * 8)
        self.assertTrue(gate.valid)
        command = " ".join(gaze_switcher.windows_speech_command(SAY_CHAT))
        self.assertIn("System.Speech", command)
        self.assertIn("Speak(", command)
        for banned in ("mute", "AudioEndpoint", "Set-Volume", "http", "Invoke-Web"):
            self.assertNotIn(banned.lower(), command.lower())
        with self.assertRaises(gaze_switcher.SpeechError) as caught:
            gaze_switcher.windows_speak("hello", runner=lambda *args, **kwargs: type("R", (), {"returncode": 1})())
        self.assertIn("timer was not started", str(caught.exception))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "calibration.yaml"
            gaze_switcher.save_pitch_gate(
                path, gate, front_frames=8, chat_frames=8, lens_frames=8,
            )
            text = path.read_text(encoding="utf-8")
            self.assertNotIn("password", text.lower())
            self.assertIn("version: 2", text)
            loaded = gaze_switcher.load_pitch_gate({"calibration": str(path)})
            self.assertTrue(loaded.valid)
            self.assertFalse(loaded.allows(gate.chat_pitch, gate.chat_yaw))
            self.assertFalse(loaded.allows(gate.front_pitch, gate.front_yaw))
            self.assertTrue(loaded.allows(gate.lens_pitch, gate.lens_yaw))
            missing = gaze_switcher.load_pitch_gate({"calibration": str(Path(tmp) / "nope.yaml")})
            self.assertFalse(missing.valid)
            self.assertIn("Calibrate", missing.reason)
        with self.assertRaises(RuntimeError):
            gaze_switcher.save_pitch_gate(
                Path("ignored.yaml"), fit_pose_gate([(0.2, 0.0)], [(0.2, 0.2)], [(0.2, 0.4)]),
                front_frames=1, chat_frames=1, lens_frames=1,
            )


class MulticamAndLightTests(unittest.TestCase):
    def _pose(self, pitch, yaw, frontal, n=8, noise=0.01):
        frames = []
        for i in range(n):
            jitter = (i - (n - 1) / 2) * noise
            frames.append({
                "brio_pitch": pitch + jitter,
                "brio_yaw": yaw + jitter * 0.2,
                "c920_frontal": frontal,
                "c920_pitch": 0.50,
                "c920_yaw": 0.50,
            })
        return frames

    def test_brio_separates_when_c920_pose_does_not(self):
        gate = fit_multicam_gate({
            "front": self._pose(0.05, 0.00, 0.10),
            "chat": self._pose(0.10, 0.70, 0.20),
            "lens": self._pose(0.80, 0.55, 0.85),
        })
        self.assertTrue(gate.valid, gate.reason)
        self.assertIn("brio_pitch", gate.kept)
        self.assertNotIn("c920_pitch", gate.kept)
        self.assertIn("brio_pitch", gate.report)
        self.assertIn("front mean=", gate.report)
        self.assertIn("chat-lens separation", gate.report)
        self.assertFalse(gate.allows_pose(gate.means["front"]))
        self.assertFalse(gate.allows_pose(gate.means["chat"]))
        self.assertTrue(gate.allows_pose(gate.means["lens"]))
        ctrl = fast_ctrl()
        ctrl.pitch_gate = gate
        client = FakeObs("Desktop")
        chat = {"brio": 0.1, "c920": 0.9, "pose": dict(gate.means["chat"])}
        tick(ctrl, client, 0.0, chat)
        tick(ctrl, client, 1.0, chat)
        self.assertEqual(client.writes, [])
        lens = {"brio": 0.1, "c920": 0.9, "pose": dict(gate.means["lens"])}
        tick(ctrl, client, 2.0, lens)
        tick(ctrl, client, 2.25, lens)
        self.assertEqual(client.writes, ["C920"])

    def test_adaptive_threshold_uses_within_pose_noise(self):
        # Absolute gap is under the old 0.15 eye-distance floor, but the clusters are tight.
        tight = fit_multicam_gate({
            "front": self._pose(0.00, 0.00, 0.1, noise=0.002),
            "chat": self._pose(0.02, 0.40, 0.1, noise=0.002),
            "lens": self._pose(0.08, 0.35, 0.9, noise=0.002),
        })
        self.assertTrue(tight.valid, tight.reason)
        self.assertGreaterEqual(tight.sep_chat, 2.0)
        # Same small gap drowned in noise. Chat overlaps the lens.
        noisy = self._pose(0.70, 0.40, 0.2, noise=0.05)
        lens = self._pose(0.74, 0.42, 0.25, noise=0.05)
        front = self._pose(0.00, 0.00, 0.1, noise=0.01)
        overlap = fit_multicam_gate({"front": front, "chat": noisy, "lens": lens})
        self.assertFalse(overlap.valid)
        self.assertIn("Chat and camera looked the same", overlap.spoken)
        self.assertIn("chin", overlap.spoken)
        self.assertNotIn("Straight ahead and the camera looked the same", overlap.spoken)

    def test_front_overlap_message_is_separate(self):
        overlap = fit_multicam_gate({
            "front": self._pose(0.80, 0.50, 0.4, noise=0.04),
            "chat": self._pose(0.05, -0.60, 0.1, noise=0.01),
            "lens": self._pose(0.84, 0.52, 0.45, noise=0.04),
        })
        self.assertFalse(overlap.valid)
        self.assertIn("Straight ahead and the camera looked the same", overlap.spoken)
        self.assertNotIn("Chat and camera looked the same", overlap.spoken)

    def test_preprocess_stretches_dark_and_red_and_leaves_bright_frames(self):
        import numpy as np
        from PIL import Image
        import gaze_switcher
        bright = Image.fromarray(np.full((40, 40, 3), 180, np.uint8), "RGB")
        same = gaze_switcher.prepare_frame(bright, "auto")
        self.assertTrue(np.array_equal(np.asarray(bright), np.asarray(same)))
        dark_arr = np.full((40, 40, 3), 8, np.uint8)
        dark_arr[10:20, 10:20] = 22
        dark = Image.fromarray(dark_arr, "RGB")
        dark_out = np.asarray(gaze_switcher.prepare_frame(dark, "auto"))
        self.assertGreater(float(dark_out.max()) - float(dark_out.min()), 100)
        red = np.zeros((40, 40, 3), np.uint8)
        red[:, :, 0] = 40
        red[5:15, 5:15, 0] = 110
        red[:, :, 1] = 6
        red[:, :, 2] = 5
        red_out = np.asarray(gaze_switcher.prepare_frame(Image.fromarray(red, "RGB"), "auto"))
        self.assertTrue(np.all(red_out[:, :, 0] == red_out[:, :, 1]))
        self.assertGreater(float(red_out.max()), 200)
        self.assertIn(
            "PowerShell is not muted",
            inspect.getsource(gaze_switcher.calibrate),
        )


if __name__ == "__main__":
    unittest.main()
