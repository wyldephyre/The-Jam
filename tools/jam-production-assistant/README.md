# Jam Production Assistant

Look up into the upper-right Logitech C920 and hold it. OBS cuts to the scene named exactly `C920`, from whatever is on program: Starting Soon, Chatting, BRB, Desktop, Ending, or anything else. Look back at the Logitech BRIO and OBS returns to the scene that was actually on program. A manual scene change during the cutaway clears that memory.

Turning your head right to read chat is not a look into the lens. The face score used for "which camera is in front of me" is horizontal only (nose centered between the eyes). After the C920 was moved high and to the right, that score treats chat-reading as a C920 look. A second measurement, calibrated on your two poses, has to agree before a cutaway.

Frames come from OBS source screenshots (`GetSourceScreenshot`). This program does not open the webcams. The only OBS write it can make is `SetCurrentProgramScene`. It does not create scenes, edit sources, change mute or audio routing, or start and stop recording or streaming. The Hailo model file is unchanged.

There is no sound file in this package. A sting or a per-scene transition is something you add in OBS.

The website in the rest of The-Jam is not part of this tool. On the streaming PC the install path is `D:\TheForge\Dev\jam-production-assistant`.

## What the pitch gate is, and what it is not

The gate is the nose's position perpendicular to the line between the eyes, in units of eye distance, after in-plane head roll is removed. A sideways nose shift does not move it. Low confidence on the nose or either eye makes the value unavailable, and an unavailable value does not cut.

It is not eye tracking, not a 3D head angle, and not a universal "nose above the eyes means looking up." Camera placement decides which direction of that number means "into this lens." Calibration records your chat-reading pose and your look into the C920, then requires the live value to be at least 65% of the way from the chat sample to the lens sample. The two samples must differ by at least 0.15 eye-distances or the file is rejected.

If `calibration.yaml` is missing or invalid, automatic cutaways stay off. Returns from a C920 you switched to yourself still use the BRIO face score. Moving the camera makes the file wrong until you calibrate again.

These checks use synthetic keypoints. They do not show that your face on the Forge cameras separates chat from a look-up. That is only known after the calibration and dry-run below.

## OBS names in the current template

| Role | OBS name |
|---|---|
| BRIO source | `Video Capture Device` |
| C920 source | `C920 Source` |
| Cutaway scene | `C920` |

The running install keeps whatever is already in its own `config.yaml`. The template uses dwell 0.25 s on both cameras and cooldown 0.6 s. Both capture sources need **Deactivate when not showing** unchecked so a screenshot still works when that source is off program.

## Update the existing D: folder

Stop the running assistant with Ctrl+C first so the old process is not still switching. Extract the zip somewhere other than the install folder. Do not pass `-UpdateConfig` on Forge. Your `config.yaml` stays as it is, including source names and the 0.25 / 0.25 / 0.6 timings. `calibration.yaml`, `.venv`, `models\`, `logs\`, and `switcher.on` are not replaced. Code files are backed up under `rollback\<timestamp>\` first.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1
```

Rollback, from that same extracted folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-update.ps1 -Rollback
```

`-UpdateConfig` replaces `config.yaml` with the template. Use it only for a leftover v1 file that still contains `REPLACE_ME`. It is the wrong switch once Forge already has a working config.

## Calibrate while you are on stream

The flag is already off. One command. The computer talks. Cap does not read the screen. Live cuts stay at 0.25 s. The three-second holds are calibration only.

Head pitch and yaw are measured on the front BRIO (`Video Capture Device`). The C920 is only an extra signal for whether that lens sees a frontal face. The side camera barely sees a head tilt, which is why a C920-only calibration overlapped. Each feature is divided by its within-pose noise. A pose pair has to be at least 2 of those standard deviations apart. Features that do not move are ignored. If the lens still overlaps straight-ahead or chat, no file is written.

Prompts use the normal Windows speakers through PowerShell. Nothing here changes mute, the mixer, or the stream. If desktop audio is on the stream, viewers will hear the prompts. If the voice check is silent, PowerShell may be muted in the Windows volume mixer.

```powershell
cd D:\TheForge\Dev\jam-production-assistant
.\run.ps1 -Calibrate
```

What he hears, in order:

1. Voice check, including the stream warning. If that sentence does not play, the program stops. The timer does not start and no file is written.
2. The plan: straight ahead, then chat, then the lens, two rounds, three seconds after each sentence.
3. "Press Enter when he is ready to look straight ahead." Parent presses Enter once. That is the ready signal.
4. Round one, then "Same three poses again," then round two. Each pose is: the sentence finishes, 1.5 seconds of quiet, then a 3 second hold. The first and last 0.5 seconds of the hold are dropped.
   - "Look straight ahead at your main screen. Do not look at chat and do not look up."
   - "Read your chat normally. Do not look up."
   - "Look up into the right camera lens."
5. "Done. You can relax." only if the file was saved.
6. If the poses overlap or a pose has fewer than 5 confident frames: "That did not work. No file was saved. Run calibrate again."

Then leave the flag off and dry-run.

## Dry-run while the flag is off

`-Off` used to skip the loop, so this sequence logged nothing. Dry-run now scores and logs with the flag absent, and it still does not change the program scene.

```powershell
.\toggle.ps1 -Off
.\run.ps1 -DryRun -Verbose
```

Read chat the way you normally do, and also look straight ahead at the main screen. You should see pitch, sideways yaw, and progress, and you should not see `DRY-RUN cutaway`.

Look up into the C920 and hold past 0.25 s. The log should show one `DRY-RUN cutaway '<scene you are on>' -> 'C920'`.

Look back at the BRIO and hold past 0.25 s (and past the 0.6 s cooldown). The log should show `DRY-RUN return 'C920' -> '<that same scene>'`.

Stop the dry-run with Ctrl+C. Only if those three checks match what you see:

```powershell
.\toggle.ps1 -On
.\run.ps1
```

`toggle.ps1` still creates or removes `switcher.on`. With the flag absent and without `-DryRun` or `-Calibrate`, the process idles and does not grab frames. Stream Deck actions that launch `toggle.ps1` or `run.ps1` keep the same parameters, plus `-Calibrate`.

Logs: `logs\switcher.log` and `logs\dry-run.log`.

A manual scene change while the cutaway is up clears the remembered scene. The next look-up remembers the scene you are on then. If the assistant starts while OBS is already on `C920`, it will not guess a return scene.

## Tuning

`config.yaml` is yours. This update does not rewrite it.

| Knob | Effect |
|---|---|
| `cameras.c920.dwell_s` | How long the lens pose must hold before the cut (live setting 0.25 s) |
| `cameras.brio.dwell_s` | How long the BRIO must win before returning (live setting 0.25 s) |
| `cooldown_s` | Minimum time between cuts (live setting 0.6 s) |
| `enter` / `stay` / `margin` | Frontal-score hysteresis. The pitch gate is applied on top of this for cutaways only |
| `keypoint_conf` | Confidence required for the nose and both eyes. Below this, pitch is missing and there is no cutaway |

The 0.65 progress bar and the 0.15 separation floor are in the program, not in `config.yaml`. A `trigger_progress` value written into `calibration.yaml` is ignored so the bar cannot be edited down into the chat pose.

## Tests

Mock tests do not open OBS, the webcams, or the Hailo. A customized `config.yaml` does not have to match `config.yaml.example`.

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

They cover cutaway from Starting Soon, Chatting, BRB, Desktop, and Ending; return to that scene; no nested C920; manual scene changes; the off flag; dry-run with the flag off; disconnect; a chat-like frontal score versus a calibrated lens pose; a camera whose lens sample is the opposite sign from "nose above eyes"; low confidence; missing and invalid calibration; and the spoken straight-ahead, chat, and lens holds.

## Not verified on the streaming PC

No run here watched you read chat or look into the C920. The earlier dry-run (9 cutaways and 9 returns, no warnings) was before this gate and was matching the horizontal score, including chat. After you install this build, the calibration and the dry-run above are the check. Do not treat cutaways as fixed until that dry-run stays quiet while you read chat and fires once when you look into the lens.

Also confirm mute, desktop audio, recording, and the stream do not change across a later live cut. Optional: `.\run.ps1 -Bench` for the Hailo.
