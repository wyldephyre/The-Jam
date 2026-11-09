# Jam Production Assistant

Look up at the upper-right Logitech C920 and hold it for about half a second. OBS cuts to the scene named exactly `C920`, from whatever is on program: Starting Soon, Chatting, BRB, Desktop, Ending, or anything else. Look back at the Logitech BRIO and OBS returns to the scene you were on. It does not always return to Chatting.

Pose detection runs on the ASUS UGen300 (Hailo-10H). Frames come from OBS source screenshots (`GetSourceScreenshot`), so this program never opens the webcams. The only OBS change it can make is `SetCurrentProgramScene`. It does not create scenes, edit sources, change mute or audio routing, or start and stop recording or streaming.

There is no sound file in this package. A sting, if you want one, is an OBS Media Source you add on the C920 scene yourself. A per-scene transition is also set in OBS (scene transition override), not by this script.

The assistant was not part of the The-Jam website. It lives here so the site stays as it is. On the streaming PC the install path is `D:\TheForge\Dev\jam-production-assistant`.

## OBS names

These strings have to match OBS character for character.

| Role | OBS name |
|---|---|
| BRIO source | `Video Capture Device` |
| C920 source | `Video Capture Device 2` |
| Cutaway scene | `C920` |

In both Video Capture Device sources, open Properties and uncheck **Deactivate when not showing**. The C920 source can live only on the C920 scene, and the BRIO source can live on the other scenes. Screenshots still have to work while that source is off program, which they will not do if OBS deactivates it.

`.\run.ps1 -ListObs` prints the scene list and the video-capture source names.

## One-time OBS setup

1. Tools > WebSocket Server Settings > enable the server, leave authentication on, Apply. The script reads the port and password from OBS's own websocket config when it runs. They are not stored in `config.yaml` and are not written to the log.
2. Confirm the two source names and the `C920` scene above.
3. Uncheck **Deactivate when not showing** on both sources.
4. Optional: set a transition override on the C920 scene, and add your own Media Source if you want a sting.

## Update the existing D: folder

Extract this update somewhere other than the install folder (Downloads is fine). Then:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1 -UpdateConfig
```

`-UpdateConfig` is the right switch for the Oct 31 snapshot, whose `config.yaml` still has `REPLACE_ME` placeholders and the old `main` / `bit` keys. The script copies that file into `rollback\<timestamp>\` and then writes the C920 names. There is no websocket password in the file. `.venv`, `models\` (including `yolov8s_pose.hef`), `logs\`, and `switcher.on` are not replaced.

Leave `-UpdateConfig` off only when `config.yaml` already has `cameras.brio` and `cameras.c920` and you want to keep your dwell numbers. The new template is still written to `config.yaml.example`.

Roll back the code (and the config, if that snapshot replaced it):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1 -Rollback
```

Run the rollback command from the extracted update folder. It restores the newest `rollback\<timestamp>\` and does not delete `.venv`, `models`, or `logs`.

## Run

From `D:\TheForge\Dev\jam-production-assistant`:

```powershell
.\toggle.ps1 -Off
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\toggle.ps1 -On
.\run.ps1 -DryRun -Verbose -Seconds 20
.\run.ps1
```

`toggle.ps1` still creates or removes `switcher.on`. While that file is absent the loop stays idle and does not change scenes. `-DryRun` logs `DRY-RUN cutaway` / `DRY-RUN return` and does not call OBS to switch. Stream Deck actions that already launch `toggle.ps1` or `run.ps1` keep the same parameters (`-DryRun`, `-Verbose`, `-Seconds`, `-Bench`, `-ListObs`, `-On`, `-Off`).

Logs: `logs\switcher.log` and `logs\dry-run.log`.

If a source or the C920 scene is missing, or OBS disconnects, the log says what to fix and the program scene is left alone. A manual scene change while the cutaway is up clears the remembered scene, so looking at the BRIO afterward cannot jump back to a stale scene. The next look-up remembers the scene you are on then. If the assistant starts while OBS is already on `C920`, it will not guess a return scene.

## Tuning

`config.yaml` → `detect` and the per-camera `dwell_s` values:

| Knob | Effect |
|---|---|
| `cameras.c920.dwell_s` | How long the C920 must see the more frontal face before the cut (default 0.5 s) |
| `cameras.brio.dwell_s` | How long the BRIO must win before returning (default 0.4 s) |
| `enter` | Frontal score required before a look can win |
| `stay` / `margin` | The current camera keeps the shot unless the other one drops it under `stay` or beats it by `margin` |
| `cooldown_s` | Minimum time between cuts |
| `max_yaw` | How far the nose can sit off the eye midpoint and still count as facing that camera |
| `keypoint_conf` | Confidence required for the nose and both eyes |

The score is the same v1 face score: a centered nose between the eyes (and the ears, when both are visible). Whichever camera sees the more frontal face wins. Looking up-right at the C920 is that camera winning, held for the dwell. No person, or neither camera clearly ahead, means no cut. `-DryRun -Verbose` prints `yaw=` so you can tune.

## Tests

Mock tests do not open OBS, the webcams, or the Hailo:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

They cover a cut from Starting Soon, Chatting, BRB, Desktop, and Ending; return to that same scene; no nested C920 memory; a manual scene change during the cutaway; the off flag; and a dropped websocket. `python -m unittest` from a checkout of this folder is the same suite.

## Not run on the streaming PC

This change was not pointed at the live OBS or the UGen300. After you install it, still check:

- `.\run.ps1 -ListObs` shows scene `C920` and sources `Video Capture Device` and `Video Capture Device 2`.
- Both sources have **Deactivate when not showing** unchecked, and a source screenshot still works while that source is off program.
- `.\run.ps1 -DryRun -Verbose`: look up, confirm `DRY-RUN cutaway '<the scene you were on>' -> 'C920'`; look back, confirm `DRY-RUN return 'C920' -> '<that same scene>'`.
- Live, once: from Starting Soon or BRB, look up and back. Then while the C920 scene is up, click another scene yourself and look at the BRIO. The program scene should stay where you put it.
- Mute, desktop audio, recording, and the stream do not change across a cut.
- Optional Hailo check: `.\run.ps1 -Bench`.

## Out of scope

Gestures, away/BRB detection, captions, chat, and clip markers are not in this switcher. The website in the rest of The-Jam is not part of this tool.
