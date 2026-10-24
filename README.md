<<<<<<< HEAD
﻿# The Invisible Orchestra
=======
# The Invisible Orchestra
link : https://airchestra.netlify.app/
>>>>>>> 5d47dccb1e0f19f686d9a98e992085961f06d91a

A local-first, hand-controlled music experience for the INNOVA drop-in showcase. Visitors can make music immediately, or listen to a short melody and repeat it. Camera frames stay on the device and are never recorded or uploaded. No microphone, accounts, names, leaderboard or queue.

<<<<<<< HEAD
## Install and launch

Use Node.js 20.19+ (or 22.12+) and a current Chrome or Edge browser. From the project folder in Windows PowerShell:
=======
## Install and run

From this folder, run these exact commands:
>>>>>>> 5d47dccb1e0f19f686d9a98e992085961f06d91a

```powershell
npm.cmd install
npm.cmd run assets:prepare
npm.cmd run dev
```

Open **http://localhost:5173**. Use `npm` instead of `npm.cmd` on macOS/Linux. The Windows form avoids PowerShell script-policy errors. GitHub does not install packages when you push or clone; `node_modules/` stays excluded from Git.

`assets:prepare` downloads Google's official Hand Landmarker model once and copies the MediaPipe WASM runtime into `public/`. Tracking code, model and instrument samples are then served locally. Camera access requires localhost or HTTPS.

For a production bundle, run `npm.cmd run build`. Output is in `dist/`; preview with `npm.cmd run preview`. Nothing is deployed automatically.

## Public showcase flow

1. The welcome screen says **Make music with your hands** and explains that moving a hand in front of the camera plays music. A silent **Demo preview** shows left/right for notes and up/down for volume. The demo makes no sound and does not access the camera. The language button is labelled Francais / English; all visitor controls have English and French text.
2. Choose **Start playing**. The loading panel explains that the browser needs camera permission: choose Allow; only video is requested. Once ready, an open-hand outline and **Stand where the camera can see your hand** guide placement. No input means no sound. Blocked or missing cameras show a friendly error with a mouse alternative.
3. Sessions begin in **Free Play**, with Piano, 35% master volume and the note guide visible. Move left/right through labelled bands to choose notes and up/down to shape volume. White borders, bold underlined labels and a large current-note display identify the active note in addition to colour. The stage shows the current mode and instrument for spectators.
4. Use **Mute**, **Volume**, **Help** and **Finish / Next player** beside the stage. **Full screen** is in the header. Hand tracking only controls music and visuals: it never clicks buttons. Mouse/touch music input is confined to the stage.
5. **Finish / Next player** immediately stops input and pending melodies, stops all camera tracks, closes the landmarker and audio context, and returns to welcome. A camera permission request that finishes after Finish has been pressed cannot revive the session: its returned tracks are stopped. Instrument, volume, mute, challenge, preview, guide and hold duration return to defaults. Language and operator timer settings persist.

## Instruments and challenge

**Piano**, **Guitar** and **Saxophone** use locally bundled samples. Piano and guitar strike once on entry to a note zone and decay naturally; leave and return to strike again. Saxophone sustains while held. Instrument changes release the previous voice before starting the next. Master volume and mute apply in both modes.

Choose **Repeat a melody** to try the implemented Melody Challenge. Listen and watch the highlighted bands, then repeat the notes. **Play melody / Listen again** plays or replays the sequence; it is disabled during playback. Visitor audio and answer input are ignored during the demonstration. A wrong note keeps progress; leave that zone and try the expected note. After success, **Next challenge** increases length from three notes to a maximum of six. Generated melodies avoid consecutive repeated notes. There is no answer time limit unless an operator enables a short showcase turn.

A note counts after a steady hold, initially 250 ms. Leaving a zone is required before that same zone can submit again. For visitors accidentally submitting notes while crossing the stage, increase **Steady hold** in Settings, for example to 500 ms. Both webcam and mouse/touch use stable note boundaries and the same challenge mechanics.

## Settings and player turnover

The clearly labelled **Settings** panel contains note-guide and camera-preview toggles, steady-hold duration (100-1500 ms), Restart, instrument credits and operator timing options. Restart resets the current experience. Help opens the detailed instructions below the stage.

- **Inactivity delay:** defaults to 90 seconds, configurable from 15 to 600 seconds. After that delay, a visible prompt gives 15 additional seconds before returning to welcome. Hand detections, stage pointer movement and control interaction clear the warning. The **Keep playing** button also clears it. A stationary camera hand counts as active; a mouse left motionless eventually times out.
- **Short turns:** off by default. Optional 2-, 3- or 5-minute turns show a gentle warning during the final 15 seconds, then finish even if the visitor is playing. This is the operator's explicit busy-showcase setting, separate from inactivity. Changing it starts a fresh timer.
- Challenge demonstrations pause both timers so playback cannot be interrupted by automatic turnover. Ordinary ongoing activity prevents an inactivity reset.
- Automatic turnover uses the same camera/audio cleanup as Finish. It returns to welcome and always requires a new Start action. It never reopens the camera or audio automatically.
- Hiding the page stops camera and sound and clears challenge state. Returning requires the explicit **Resume experience** action.

## Validation

```powershell
npm.cmd test
npm.cmd run build
```

The Node checks cover note mapping, mirrored guide alignment, hysteresis, steady entry, melody generation, playback/input separation, retries/reset, sample selection and normalisation, saxophone looping, voice cleanup, camera track cleanup, inactivity warnings/resume/reset and optional turn limits.

`scripts/check-showcase.cjs` additionally runs local Chrome checks using Playwright and simulated camera streams/denials. It checks bilingual welcome, silent startup, mouse sound triggering, permission-error fallback, placement guidance, Finish, track release, late permission completion, full-screen controls, reduced motion, inactivity warnings/cancellation/reset and no automatic restart. It starts its own local Vite server. To run on this Windows setup without changing application dependencies:

```powershell
npm.cmd install --prefix "$env:TEMP/invisible-orchestra-qa" --no-save --no-package-lock playwright
node scripts/check-showcase.cjs
```

The script expects Chrome at its standard Windows path. `PLAYWRIGHT_MODULE_PATH` can select another Playwright module installation. Screenshots go to the temporary QA folder.

Browser verification uses synthetic input, not a real webcam or human listening. Before the showcase, test actual browser permission prompts, webcam placement/lighting, hand jitter, audio balance on the event speakers, touchscreen input, French text, projector readability from a few steps away, and a complete handoff between two people. Check the chosen short-turn setting with the event team. Desktop and narrow layouts have been visually inspected; actual full-screen projector output still needs an on-site check.

## Limitations and credits

Two hands is the default: physical Right selects notes and physical Left sets volume. One hand remains available in Settings. Inference runs synchronously on the main thread at about 12 frames per second; lower-powered devices may be less responsive. Camera notes align with the mirrored letterboxed preview; mouse notes span the stage. Two hands uses physical Right for notes and Left for volume; nothing is recorded. Web fonts may require internet; system fonts work when unavailable.

The highest guitar and saxophone notes are shifted from nearby recordings. Saxophone sustain uses a crossfaded loop, which can sound less natural on long holds. Loudness is approximately balanced with sample normalisation, per-instrument levels and a compressor; listening is still needed.

Samples in `public/samples/` come from the pinned tonejs-instruments collection under CC BY 3.0, with original sources Versilian Studios/VSO2, University of Iowa and Karoryfer. The in-app credits link opens `public/samples/CREDITS.txt`. Keep these credits with redistributed builds. `node scripts/download-instruments.mjs` restores the selected samples; normal installation does not require this download.

## Laptop and Hologram resolution

Both display modes now use exactly the same interface, controls, note zones, input mapping and optional camera preview. Changing mode does not hide the camera, instrument selector, game modes or Settings. There is no separate window.

- **Laptop:** uses the visible stage size and device pixel ratio for the visual canvas.
- **Hologram:** uses the configured visual canvas pixel dimensions. Choose **Display ? Display resolution** for landscape UHD (3840 ? 2160), portrait UHD (2160 ? 3840) or custom dimensions. These change rendering resolution only; the responsive interface still follows the actual browser viewport. Drawing coordinates compensate for canvas scaling so circles and hand movements retain their on-screen geometry.

Use Start playing and allow camera access to track a hand in either mode. Try with mouse uses no camera. Show/hide preview in Settings works identically in both modes. Tracking still requests at most 640 ? 480 and runs at about 12 fps, independently of the output resolution. Full screen applies to the current window.

The app cannot change a display's physical resolution or rotation. For the Capsule, confirm the accepted signal resolution, physical orientation, OS rotation/scaling, browser viewport, zoom, GPU/cable support and audio route on site. Set the display in the OS, move the current browser window to it and enter full screen. Do not infer device settings from a 4K label. Test live hand alignment, preview visibility, note transitions, sound and Finish on the actual hardware. Hiding the page pauses camera/audio until Resume.

Run `node scripts/check-presentation.cjs` with the temporary Playwright installation described above. It verifies camera preview and controls remain available in both modes, both UHD canvas sizes, language, one camera/audio instance, and Finish cleanup using a synthetic camera. It cannot certify actual Capsule output or speaker quality.

## Welcome layout

The welcome screen uses one headline and a balanced two-column card: introduction and both start buttons on the left, a silent **Demo preview** over coloured note bands on the right. The two labelled hands show Right moving sideways for notes and Left moving vertically for volume, with a highlighted note and a Quiet/Loud meter (Doux/Fort in French). Two readable captions explain notes and volume. Reduced-motion preferences freeze the animation. This preview never starts a camera or creates an audio context.

**Settings** is now a header menu. **Display** contains the Laptop/Hologram selector and the nested **Presentation output** controls; there is no settings sidebar or separate presentation-settings row on the welcome screen. Header menus can be closed with Escape or by clicking outside. Their contents scroll when needed so all options remain reachable at smaller sizes. The essential welcome card fits 1366 × 768 and 1920 × 1080 at 100% zoom; narrower screens and increased zoom can scroll naturally. One readable privacy line appears below the card.

Run `node scripts/check-welcome.cjs` using the temporary Playwright setup above for layout checks and screenshots at 1366 × 768, 1920 × 1080, 3840 × 2160, 2160 × 3840 and a narrow phone viewport. It checks English/French actions, no horizontal overflow, silent/no-camera welcome behaviour, header menu access, 200% CSS zoom/reflow and reduced motion. The 200% check is a browser CSS zoom simulation; native browser/OS text scaling and the physical Capsule still need on-site checks. Hologram mode retains its UHD presets in the current browser window.

Note display names are beginner-friendly by default: C, D, E, G, A in English and Do, Ré, Mi, Sol, La in French. **Settings → Show octave numbers** optionally adds octaves (for example C4 or Do4), including in the demo, note zones, current-note display and Hologram mode. This changes labels only: the original C4–C6 pitches, scale indices, sample selection and challenge matching remain unchanged. The preference lasts until page reload. Display and Settings use quieter header styling, while language switching stays visible and Start playing remains the strongest action.

## Two hands mode (default)

Two hands is selected when the app opens and after Finish. Just choose **Start playing** and show both hands. The silent welcome demo now shows both roles: Right moves horizontally for notes, Left moves vertically for volume. For the original controls, choose **Settings → Hand controls → One hand**.

- **Physical RIGHT hand — Notes (mint trail):** move left/right to select notes. Its height only moves the visual marker; it never changes volume.
- **Physical LEFT hand — Volume (lavender trail):** move up for louder, down for quieter. Its horizontal movement never selects notes.

Both hands are required. A single hand cannot play or take over the other role, including on first entry. If either hand disappears or becomes uncertain, the visitor instrument fades out over about 160 ms. Messages name the missing hand and the volume meter falls to zero. Returning both hands resumes smoothly, with a short attack and stable note entry. There is no hand-role swap setting, pinch echo or hand-controlled brightness in Two hands mode. Existing instruments and master volume/mute controls work normally.

The per-hand filters smooth position with a 75 ms time constant. The role tracker uses current MediaPipe Tasks physical handedness labels, at least 0.75 confidence, 180 ms initial settling, recent palm positions and a 1200 ms anchor-retention window. It never assigns by detection-array order. Close crossings, duplicate labels and implausible jumps temporarily withhold controls rather than guess. Roles stay Right/Left on recovery. These thresholds are code defaults in `src/hands.js`.

The camera input is unmirrored; only its preview and horizontal note controls are mirrored. The current Tasks label convention was checked against the [upstream label change](https://github.com/google-ai-edge/mediapipe/commit/ed0c8d8d8bbd466eac1e483ab62a42dd7d486e96). Legacy Hands documentation uses a different convention. Do not swap physical Right/Left just because the preview is mirrored. Unusual camera drivers that already mirror their captured frames require an on-site check.

Free Play uses the fixed roles continuously. Melody Challenge keeps its existing sequence and hold-based scoring: only Right chooses an answer, and both hands must be present to submit it. The example melody still plays independently of visitor input, with neutral brightness/echo. Changing hand mode stops the visitor sound and resets the current challenge. Finish returns to the Two hands default. Mouse/touch fallback keeps its original controls; it does not require two touch points. The optional mouse effects-test panel remains available only in One hand mode and does not affect Two hands mode.

The app still uses one window and one camera/audio instance. Both labelled hands and the volume readout use the same interface in Laptop and UHD/Hologram modes. No recording, multiplayer or musical looping feature is added.

### Checks and live testing

`npm.cmd test` checks fixed physical roles, reordered detections, crossing/loss/recovery, no single-hand promotion, and independent note/volume axes using simulated landmarks. Audio checks cover bounded effects, mute, reset and cleanup. Run the build with `npm.cmd run build`.

With the temporary Playwright setup above, run:

```powershell
node scripts/check-two-hands.cjs
node scripts/check-welcome.cjs
node scripts/check-showcase.cjs
node scripts/check-presentation.cjs
```

The two-hand browser check injects synthetic detections into a simulated camera stream. It checks silence with either missing hand, fixed Right/Left labels, axis independence, fade/recovery, absence of pinch/brightness effects, challenge playback, French, UHD, mouse fallback and camera/audio cleanup. These are not live webcam reliability or listening tests.

Before the showcase:

1. Confirm physical Right and Left labels separately using the actual webcam and mirrored preview. No visitor sound should play with only one hand visible.
2. With both present, move Right horizontally: notes should change. Move Right vertically: volume must stay fixed. Move Left horizontally: notes and volume must stay fixed. Move Left vertically: only volume should change.
3. Hide each hand in turn and then both: listen for a clean fade and verify the missing-hand message. Restore both and confirm smooth recovery with the same roles.
4. Reverse entry order, cross slowly/quickly, overlap briefly and separate. A brief pause during uncertainty is expected; roles must recover without switching.
5. Pinch either hand: no echo or brightness change should occur. Try each instrument, mute, volume, Restart, Finish, page hiding and inactivity reset.
6. Try a full Melody Challenge. Examples should play normally; answers require both hands. Verify One hand and mouse/touch still work as before, then check EN/FR and both UHD presets.

Low light, occlusion, fast crossings and unusual camera drivers can still reduce tracking confidence. Actual handedness, crossing reliability, fade quality, sound balance and performance on the event laptop/Capsule remain live-testing requirements.

The play controls now focus on Instrument, Play, Speaker volume, Help, Mute and Finish. Repeated headings/instructions are removed from the sidebar. A compact readout below the stage identifies each hand and shows Hand volume. When either required hand is missing, the stale current-note display is hidden and a two-hand placement guide names what is needed. Optional One hand, timing and output adjustments stay in Settings/Display.
