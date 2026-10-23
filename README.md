# The Invisible Orchestra

A local-first, webcam-controlled musical instrument for Experiment@CRX at uOttawa INNOVA. Move one hand in front of the camera to play soft pentatonic notes and paint a glowing trail. A mouse/touch mode uses the same controls when a camera is unavailable.

## Install and run

From this folder, run these exact commands:

```powershell
npm install
npm run assets:prepare
npm run dev
```

Open **http://localhost:5173** in your browser. `npm run assets:prepare` downloads Google's official `hand_landmarker.task` model into `public/assets/` and copies the WASM runtime from the pinned `@mediapipe/tasks-vision` package into `public/wasm/`. Both are served locally by Vite; the app does not load tracking code or model files from a CDN at runtime. If the model or WASM assets are missing, rerun `npm run assets:prepare`. The official model source is [Google's MediaPipe model storage](https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task).

To make a production bundle, run `npm run build`; the completed site is written to `dist/`. To serve that bundle locally, run `npm run preview`.

## Allow webcam access

Choose **Start experience** and allow camera access when the browser asks. The app requests **video only**; it does not request microphone access. Camera permissions work on `localhost` or an HTTPS site. If permission was denied, use your browser's site settings to allow the camera and reload. If tracking cannot start, choose **Continue without camera** or **Try without camera**.

## Controls

- **Hand left ↔ right:** play one of 11 notes in a C-major pentatonic scale, from C4 to C6.
- **Hand up ↕ down:** shape the sound's volume.
- **Show your hand:** starts a gentle fade-in; losing the hand fades sound out promptly.
- **Master volume:** sets the overall output level, capped conservatively. **Mute** silences without stopping; **Restart** restarts the current mode; **Stop** ends the experience and releases the camera.
- **Hide preview:** hides the mirrored live image while leaving tracking and sound active.
- **Try without camera:** move your mouse or finger across the performance area to play. Move off the area to let the note fade away.
- **EN / FR:** switches the interface between English and French.

The sound and visual mapping are the same in camera and fallback modes. The camera preview is mirrored, and left/right hand tracking follows what you see.

## One-minute showcase

1. Open the page, point out the on-device privacy note, and choose **Start experience**.
2. Allow camera access. Hold one open hand in view until **Hand detected** appears.
3. Sweep your hand left to right to explore the notes, then raise and lower it to change the volume.
4. Pause briefly or move your hand out of frame to hear the sound fade away; return your hand for a gentle fade-in.
5. Toggle the preview, change the master volume, mute/unmute, and switch to French.
6. Choose **Stop**. If the camera is unavailable, choose **Try without camera** and play by moving a mouse or finger over the stage.

## Privacy

Hand tracking runs in the browser on this device. Camera frames are not recorded, stored, or uploaded, and the app never asks for microphone access. The model and WASM runtime are downloaded once during setup and served from this project.

## Checks and live testing

Run the mapping tests and production build:

```powershell
npm test
npm run build
```

The automated tests cover mirrored coordinate mapping, note boundaries and scale, vertical volume mapping, and note hysteresis. Live webcam permissions, actual hand tracking, sound on the demonstration laptop, and camera cleanup should still be checked on the device and browser used for the event. `getUserMedia` requires `localhost` or HTTPS. The vision inference is synchronous on the main thread and intentionally limited to about 12 frames per second; lower-powered devices may feel less responsive. This first version tracks one hand and plays one sustained synthesizer voice; it does not classify gestures or record anything. Web fonts are requested from Google Fonts, so typography may differ when that service is unavailable.
