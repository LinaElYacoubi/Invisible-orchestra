# Airchestra

Play music with your hands in the air. No touching, no instrument, just a webcam.

Airchestra tracks your hands through the webcam and turns your movements into music: **move your hand to change the note, and move [the other hand / up and down] to change the volume.**

Built with **JavaScript, MediaPipe, the Web Audio API, HTML Canvas and Vite**. Everything runs in the browser.

## Features

- **Hand tracking:** MediaPipe follows your hands live through the webcam.
- **Two-hand control:** one hand plays the notes, the other controls the volume.
- **Live sound:** notes are synthesized in real time with the Web Audio API (no audio files).
- **Visual feedback:** Canvas draws your hands and the notes as you play.
- **Mouse fallback:** no webcam? Play with your mouse instead.
- **English / French** instructions.
- Demoed on the INNOVA holographic display at the University of Ottawa.

---

## Run it

Requires **Node.js**, a recent **Chrome or Edge**, and a **webcam**.

```bash
npm install     # install packages
npm run dev     # start the local server
npm run build   # production build in dist/
```

Open the link shown in the terminal and allow camera access.

> The camera only works on `localhost` or `https://`, not when opening `index.html` directly.

---

## How to play

1. Allow the camera when the browser asks.
2. Raise your hands in front of the webcam.
3. **[Describe the movement for notes, e.g. "Move your right hand left and right to change the note."]**
4. **[Describe the movement for volume, e.g. "Raise your left hand to play louder."]**

---

## How it works

- **MediaPipe** finds the points of each hand in every webcam frame.
- The hand position is mapped to a **note** and a **volume** level.
- The **Web Audio API** generates the sound live.
- **Canvas** draws the visual feedback on screen.

---

## Privacy

The video stays in your browser. Nothing is recorded or uploaded.
