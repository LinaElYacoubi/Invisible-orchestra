import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { clamp, mapHandToControl, noteForIndex, noteIndexForX, palmCenter, trackingTimedOut, volumeForY } from "./music.js";
import { SoftSynth } from "./audio.js";
import { stopMediaTracks } from "./resources.js";
import "./style.css";

const $ = (selector) => document.querySelector(selector);
const elements = {
  stage: $("#stage"),
  video: $("#cameraVideo"),
  canvas: $("#visualCanvas"),
  statePill: $("#statePill"),
  stateLabel: $("#stateLabel"),
  welcome: $("#welcomePanel"),
  resume: $("#resumePanel"),
  loading: $("#loadingPanel"),
  error: $("#errorPanel"),
  errorMessage: $("#errorMessage"),
  feedback: $("#stageFeedback"),
  feedbackText: $("#feedbackText"),
  noteFloat: $("#noteFloat"),
  noteName: $("#noteName"),
  noteFrequency: $("#noteFrequency"),
  panelNote: $("#panelNote"),
  stageHint: $("#stageHint"),
  modeLabel: $("#modeLabel"),
  handStatusDot: $("#handStatusDot"),
  handStatusLabel: $("#handStatusLabel"),
  handStatusHint: $("#handStatusHint"),
  start: $("#startButton"),
  fallback: $("#fallbackButton"),
  errorFallback: $("#errorFallbackButton"),
  resumeButton: $("#resumeButton"),
  stop: $("#stopButton"),
  mute: $("#muteButton"),
  restart: $("#restartButton"),
  volume: $("#masterVolume"),
  volumeValue: $("#volumeValue"),
  previewToggle: $("#previewToggle"),
  languageToggle: $("#languageToggle")
};

const strings = {
  en: {
    privacyShort: "On-device · private", eyebrow: "A gesture-powered sound experiment", title: "The Invisible<br class=\"mobile-break\" /> Orchestra", intro: "An instrument you can’t see.<br />Move your hand. Hear what happens.",
    stateWelcome: "READY WHEN YOU ARE", stateLoading: "GETTING THINGS READY", statePlaying: "THE ORCHESTRA IS PLAYING", stateReady: "READY WHEN YOU ARE", stateError: "CAMERA NEEDS A HAND",
    hidePreview: "Hide preview", showPreview: "Show preview", welcomeKicker: "YOUR HAND IS THE INSTRUMENT", welcomeTitle: "Make a little<br />room for wonder.", welcomeCopy: "Lift one hand into view. Move across to change the note, then float up and down to shape its volume.",
    start: "Start experience", tryMouse: "Try without camera <span aria-hidden=\"true\">→</span>", welcomeFootnote: "No microphone. No recordings. Just you and sound.",
    pausedKicker: "A MOMENT OF QUIET", pausedTitle: "The orchestra<br />is taking a breath.", pausedCopy: "The page was in the background, so the camera and sound have paused.", resume: "Resume experience",
    loadingKicker: "TUNING THE ORCHESTRA", loadingCopy: "Waking up the sound and finding the camera…", errorKicker: "A SMALL INTERRUPTION", errorFallback: "Continue without camera <span aria-hidden=\"true\">→</span>",
    showHand: "Show your hand", handDetected: "Hand detected", nowPlaying: "NOW PLAYING", stageHint: "Your left ↔ right · and up ↕ down", instrumentLabel: "YOUR INSTRUMENT", scaleBadge: "C MAJOR PENTATONIC",
    currentNote: "CURRENT NOTE", leftRight: "Move left / right", leftRightHint: "Explore 11 gentle notes", upDown: "Move up / down", upDownHint: "Shape the volume",
    masterVolume: "MASTER VOLUME", quieter: "QUIETER", louder: "LOUDER", mute: "Mute", unmute: "Unmute", stop: "Stop", restart: "Restart",
    handWaiting: "Waiting for your hand", handHint: "Lift one hand into the frame", handQuiet: "Show your hand", handQuietHint: "Your sound will fade in gently",
    privacyNote: "Your camera stays on this device. Video is never recorded or uploaded.", footer: "A little music, made together.", footerCredit: "AN EXPERIMENT IN HUMAN-COMPUTER CONNECTION",
    modeCamera: "CAMERA", modeMouse: "MOUSE / TOUCH", fallbackFailed: "Camera tracking could not start. Try the mouse or touch instrument instead.",
    errors: {
      unsupported: "This browser is missing a feature the experience needs. Try the latest Chrome or Edge, then reload the page.",
      secure: "Camera access needs a secure connection. Open the app at http://localhost:5173 (or HTTPS), then try again.",
      denied: "Camera permission was blocked. Allow camera access for this site in your browser settings, then try again—or use the camera-free mode.",
      missing: "No camera was found. Connect a webcam and try again, or use the camera-free mode.",
      busy: "The camera is unavailable or in use by another app. Close that app and retry, or use the camera-free mode.",
      model: "Hand tracking could not load. Run npm run assets:prepare in the project folder and reload. You can still try without the camera.",
      generic: "The camera could not start. Check that it is connected and permitted, then try again or continue without it."
    }
  },
  fr: {
    privacyShort: "Sur l’appareil · privé", eyebrow: "Une expérience sonore par le geste", title: "L’orchestre<br class=\"mobile-break\" /> invisible", intro: "Un instrument qu’on ne voit pas.<br />Bougez la main. Écoutez.",
    stateWelcome: "PRÊT QUAND VOUS L’ÊTES", stateLoading: "PRÉPARATION EN COURS", statePlaying: "L’ORCHESTRE JOUE", stateReady: "PRÊT QUAND VOUS L’ÊTES", stateError: "CAMÉRA INDISPONIBLE",
    hidePreview: "Masquer l’aperçu", showPreview: "Afficher l’aperçu", welcomeKicker: "VOTRE MAIN EST L’INSTRUMENT", welcomeTitle: "Faites place<br />à l’émerveillement.", welcomeCopy: "Levez une main dans le champ. Déplacez-la pour changer de note, puis de haut en bas pour régler le volume.",
    start: "Commencer l’expérience", tryMouse: "Essayer sans caméra <span aria-hidden=\"true\">→</span>", welcomeFootnote: "Pas de micro. Aucun enregistrement. Juste vous et le son.",
    pausedKicker: "UN MOMENT DE CALME", pausedTitle: "L’orchestre<br />reprend son souffle.", pausedCopy: "La page était en arrière-plan : la caméra et le son sont en pause.", resume: "Reprendre l’expérience",
    loadingKicker: "ACCORD DE L’ORCHESTRE", loadingCopy: "Le son s’éveille et la caméra se prépare…", errorKicker: "UNE PETITE INTERRUPTION", errorFallback: "Continuer sans caméra <span aria-hidden=\"true\">→</span>",
    showHand: "Montrez votre main", handDetected: "Main détectée", nowPlaying: "EN CE MOMENT", stageHint: "De gauche ↔ à droite · de haut ↕ en bas", instrumentLabel: "VOTRE INSTRUMENT", scaleBadge: "PENTATONIQUE DE DO MAJEUR",
    currentNote: "NOTE ACTUELLE", leftRight: "Bougez à gauche / droite", leftRightHint: "Explorez 11 notes douces", upDown: "Bougez en haut / bas", upDownHint: "Réglez le volume",
    masterVolume: "VOLUME PRINCIPAL", quieter: "PLUS DOUX", louder: "PLUS FORT", mute: "Couper le son", unmute: "Rétablir le son", stop: "Arrêter", restart: "Recommencer",
    handWaiting: "En attente de votre main", handHint: "Levez une main dans le cadre", handQuiet: "Montrez votre main", handQuietHint: "Le son reviendra en douceur",
    privacyNote: "Votre caméra reste sur cet appareil. La vidéo n’est jamais enregistrée ni téléversée.", footer: "Un peu de musique, ensemble.", footerCredit: "UNE EXPÉRIENCE DE CONNEXION HUMAIN-ORDINATEUR",
    modeCamera: "CAMÉRA", modeMouse: "SOURIS / TACTILE", fallbackFailed: "Le suivi par caméra n’a pas démarré. Essayez plutôt la souris ou l’écran tactile.",
    errors: {
      unsupported: "Ce navigateur ne possède pas une fonction nécessaire. Essayez la dernière version de Chrome ou Edge, puis rechargez.",
      secure: "L’accès caméra nécessite une connexion sécurisée. Ouvrez l’application sur http://localhost:5173 (ou HTTPS), puis réessayez.",
      denied: "L’autorisation caméra a été refusée. Autorisez l’accès caméra pour ce site dans les réglages du navigateur, ou utilisez le mode sans caméra.",
      missing: "Aucune caméra détectée. Branchez une webcam et réessayez, ou utilisez le mode sans caméra.",
      busy: "La caméra est indisponible ou utilisée par une autre application. Fermez-la puis réessayez, ou utilisez le mode sans caméra.",
      model: "Le suivi de la main n’a pas pu se charger. Exécutez npm run assets:prepare dans le dossier du projet et rechargez. Le mode sans caméra reste disponible.",
      generic: "La caméra n’a pas démarré. Vérifiez qu’elle est connectée et autorisée, puis réessayez ou continuez sans caméra."
    }
  }
};

const synth = new SoftSynth();
const state = {
  language: "en",
  mode: "idle",
  landmarker: null,
  stream: null,
  running: false,
  tracking: false,
  muted: false,
  errorText: "",
  errorKey: "",
  lastMode: "camera",
  previewVisible: true,
  lastVideoTime: -1,
  lastInferenceAt: 0,
  lastSeenAt: 0,
  noteIndex: 0,
  handPoint: null,
  trail: [],
  pointerActive: false,
  animationId: 0,
  resizeObserver: null
};

const context = elements.canvas.getContext("2d", { alpha: true });
const translations = () => strings[state.language];

function translatePage() {
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations()[key]) element.innerHTML = translations()[key];
  });
  elements.languageToggle.textContent = state.language === "en" ? "FR" : "EN";
  elements.languageToggle.setAttribute("aria-label", state.language === "en" ? "Passer en français" : "Switch to English");
  elements.previewToggle.querySelector("[data-i18n]").textContent = translations()[state.previewVisible ? "hidePreview" : "showPreview"];
  elements.mute.querySelector("[data-i18n]").textContent = translations()[state.muted ? "unmute" : "mute"];
  setHandStatus(state.tracking);
  if (state.noteIndex != null && state.mode !== "idle") updateNote(state.noteIndex);
}

function setPanel(panel) {
  for (const name of ["welcome", "resume", "loading", "error"]) elements[name].classList.toggle("is-hidden", name !== panel);
  elements.feedback.classList.toggle("is-hidden", panel !== null || state.mode === "idle");
  elements.noteFloat.classList.toggle("is-hidden", panel !== null || state.mode === "idle");
  elements.statePill.classList.toggle("is-error", panel === "error");
  elements.stateLabel.dataset.i18n = panel === "loading" ? "stateLoading" : panel === "error" ? "stateError" : state.tracking ? "statePlaying" : state.running ? "stateReady" : "stateWelcome";
  elements.stateLabel.textContent = translations()[elements.stateLabel.dataset.i18n];
}

function setHandStatus(detected) {
  elements.handStatusDot.classList.toggle("is-active", detected);
  elements.feedback.classList.toggle("is-detected", detected);
  elements.feedbackText.dataset.i18n = detected ? "handDetected" : "showHand";
  elements.feedbackText.textContent = translations()[detected ? "handDetected" : "showHand"];
  elements.handStatusLabel.dataset.i18n = detected ? "handDetected" : state.mode === "idle" ? "handWaiting" : "handQuiet";
  elements.handStatusLabel.textContent = translations()[elements.handStatusLabel.dataset.i18n];
  elements.handStatusHint.dataset.i18n = state.mode === "idle" ? "handHint" : detected ? "handHint" : "handQuietHint";
  elements.handStatusHint.textContent = translations()[elements.handStatusHint.dataset.i18n];
}

function updateNote(index) {
  const note = noteForIndex(index);
  elements.noteName.textContent = note.name;
  elements.noteFrequency.textContent = `${Math.round(note.frequency)} Hz`;
  elements.panelNote.textContent = note.name;
  elements.stage.style.setProperty("--pitch-hue", `${195 + (index / 10) * 125}deg`);
  synth.playNote(index);
}

function setTracking(detected, control = null, landmarks = null) {
  if (detected) {
    state.lastSeenAt = performance.now();
    state.noteIndex = control.noteIndex;
    state.handPoint = control;
    state.tracking = true;
    elements.stateLabel.dataset.i18n = "statePlaying";
    elements.stateLabel.textContent = translations().statePlaying;
    updateNote(control.noteIndex);
    synth.setPerformanceVolume(control.volume);
    synth.setTracking(true);
    setHandStatus(true);
    if (landmarks) {
      const now = performance.now();
      state.trail.push({ x: control.x, y: control.y, time: now, landmarks: landmarks.map(({ x, y }) => ({ x, y })) });
    } else {
      state.trail.push({ x: control.x, y: control.y, time: performance.now(), landmarks: null });
    }
    if (state.trail.length > 32) state.trail.shift();
  } else if (state.tracking) {
    state.tracking = false;
    state.handPoint = null;
    elements.stateLabel.dataset.i18n = "stateReady";
    elements.stateLabel.textContent = translations().stateReady;
    synth.setTracking(false);
    setHandStatus(false);
  }
}

function messageForCameraError(error) {
  const text = `${error?.name ?? ""} ${error?.message ?? ""}`.toLowerCase();
  if (!window.isSecureContext) return "secure";
  if (!navigator.mediaDevices?.getUserMedia) return "unsupported";
  if (text.includes("notallowed") || text.includes("permission") || text.includes("denied")) return "denied";
  if (text.includes("notfound") || text.includes("devicesnotfound")) return "missing";
  if (text.includes("notreadable") || text.includes("trackstart")) return "busy";
  if (!state.landmarker && /model|wasm|fetch|network|hand_landmarker/i.test(error?.message ?? "")) return "model";
  return "generic";
}

async function createLandmarker() {
  if (state.landmarker) return state.landmarker;
  const modelUrl = "/assets/hand_landmarker.task";
  const response = await fetch(modelUrl, { method: "HEAD" });
  if (!response.ok) throw new Error("Tracking model file is unavailable. Run npm run assets:prepare.");
  const vision = await FilesetResolver.forVisionTasks("/wasm");
  state.landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  return state.landmarker;
}

function ensureSupported() {
  if (!window.isSecureContext) throw new Error("secure-context");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
  if (!window.AudioContext && !window.webkitAudioContext) throw new Error("unsupported");
  if (!HTMLCanvasElement.prototype.getContext) throw new Error("unsupported");
}

function getUserFacingError(error) {
  if (error?.message === "unsupported") return "unsupported";
  return messageForCameraError(error);
}

async function startCameraExperience() {
  if (state.running || state.mode === "loading") return;
  state.mode = "camera";
  state.running = true;
  state.tracking = false;
  state.noteIndex = 0;
  state.trail.length = 0;
  state.pointerActive = false;
  updateNote(state.noteIndex);
  elements.video.classList.toggle("is-hidden", !state.previewVisible);
  elements.modeLabel.textContent = translations().modeCamera;
  elements.modeLabel.classList.remove("is-hidden");
  setPanel("loading");
  elements.stop.disabled = false;
  elements.mute.disabled = false;
  elements.restart.disabled = true;
  try {
    ensureSupported();
    await synth.start();
    await createLandmarker();
    if (!state.running || state.mode !== "camera") return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 } }
    });
    if (!state.running || state.mode !== "camera") {
      stopMediaTracks(stream);
      return;
    }
    state.stream = stream;
    elements.video.srcObject = stream;
    await elements.video.play();
    state.lastVideoTime = -1;
    state.lastInferenceAt = 0;
    state.lastSeenAt = performance.now();
    setPanel(null);
    setHandStatus(false);
    elements.restart.disabled = false;
  } catch (error) {
    if (!state.running) return;
    state.running = false;
    state.mode = "error";
    await releaseCamera();
    await synth.dispose();
    elements.stop.disabled = true;
    elements.mute.disabled = true;
    elements.restart.disabled = true;
    state.errorKey = getUserFacingError(error);
    state.errorText = translations().errors[state.errorKey];
    elements.errorMessage.textContent = state.errorText;
    setPanel("error");
  }
}

async function startFallback() {
  if (state.running) return;
  state.mode = "mouse";
  state.running = true;
  state.tracking = false;
  state.trail.length = 0;
  state.noteIndex = 0;
  state.pointerActive = false;
  updateNote(state.noteIndex);
  elements.video.classList.add("is-hidden");
  elements.modeLabel.textContent = translations().modeMouse;
  elements.stop.disabled = false;
  elements.mute.disabled = false;
  elements.restart.disabled = true;
  setPanel(null);
  setHandStatus(false);
  try {
    if (!window.AudioContext && !window.webkitAudioContext) throw new Error("unsupported");
    await synth.start();
    if (!state.running) return;
    elements.stage.classList.add("is-interactive");
    elements.restart.disabled = false;
  } catch (error) {
    state.running = false;
    state.mode = "error";
    elements.stop.disabled = true;
    elements.mute.disabled = true;
    elements.restart.disabled = true;
    elements.errorMessage.textContent = error?.message === "unsupported" ? translations().errors.unsupported : translations().errors.generic;
    state.errorKey = error?.message === "unsupported" ? "unsupported" : "generic";
    state.errorText = translations().errors[state.errorKey];
    elements.errorMessage.textContent = state.errorText;
    setPanel("error");
  }
}

async function releaseCamera() {
  if (state.stream) {
    stopMediaTracks(state.stream);
    state.stream = null;
  }
  elements.video.pause();
  elements.video.srcObject = null;
  elements.video.classList.add("is-hidden");
  if (state.landmarker) {
    state.landmarker.close();
    state.landmarker = null;
  }
}

async function stopExperience({ paused = false } = {}) {
  const previousMode = state.mode;
  if (paused && previousMode !== "idle") state.lastMode = previousMode;
  state.running = false;
  state.pointerActive = false;
  state.mode = "idle";
  state.tracking = false;
  state.handPoint = null;
  state.trail.length = 0;
  state.animationId = 0;
  elements.panelNote.textContent = "—";
  synth.stopSound();
  await releaseCamera();
  await synth.dispose();
  elements.stage.classList.remove("is-interactive");
  elements.modeLabel.textContent = "";
  elements.stop.disabled = true;
  elements.mute.disabled = true;
  elements.restart.disabled = true;
  elements.mute.setAttribute("aria-pressed", "false");
  state.muted = false;
  translatePage();
  setPanel(paused ? "resume" : "welcome");
}

function stageCoordinates(clientX, clientY) {
  const rect = elements.stage.getBoundingClientRect();
  return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) };
}

function handlePointer(event) {
  if (!state.running || state.mode !== "mouse") return;
  const point = stageCoordinates(event.clientX, event.clientY);
  state.pointerActive = event.type !== "pointerleave";
  if (!state.pointerActive) {
    setTracking(false);
    return;
  }
  const index = noteIndexForX(point.x);
  setTracking(true, { ...point, noteIndex: index, volume: volumeForY(point.y) });
}

function resizeCanvas() {
  const bounds = elements.stage.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  elements.canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
  elements.canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function videoCoordinates(point, width, height) {
  const videoWidth = elements.video.videoWidth || width;
  const videoHeight = elements.video.videoHeight || height;
  const fit = Math.min(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * fit;
  const drawHeight = videoHeight * fit;
  return { x: (width - drawWidth) / 2 + (1 - point.x) * drawWidth, y: (height - drawHeight) / 2 + point.y * drawHeight };
}

function drawHandSkeleton(landmarks, width, height) {
  const connections = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17]];
  const points = landmarks.map((point) => videoCoordinates(point, width, height));
  context.save();
  context.lineWidth = 1.1;
  context.lineCap = "round";
  context.strokeStyle = "rgba(142, 250, 241, 0.55)";
  for (const [a, b] of connections) {
    context.beginPath();
    context.moveTo(points[a].x, points[a].y);
    context.lineTo(points[b].x, points[b].y);
    context.stroke();
  }
  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, 2.1, 0, Math.PI * 2);
    context.fillStyle = "rgba(205, 255, 248, 0.9)";
    context.fill();
  }
  context.restore();
}

function drawVisuals(now) {
  const bounds = elements.stage.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  context.clearRect(0, 0, width, height);
  const hue = 195 + (state.noteIndex / 10) * 125;

  if (state.mode === "idle" || state.mode === "loading" || state.mode === "error") {
    const pulse = 0.5 + Math.sin(now * 0.00045) * 0.14;
    const glow = context.createRadialGradient(width * 0.52, height * 0.48, 4, width * 0.52, height * 0.48, width * 0.48);
    glow.addColorStop(0, `hsla(${hue}, 88%, 62%, ${pulse * 0.09})`);
    glow.addColorStop(1, `hsla(${hue}, 88%, 62%, 0)`);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  }

  state.trail = state.trail.filter((point) => now - point.time < 1250);
  if (state.trail.length > 1) {
    for (let index = 1; index < state.trail.length; index += 1) {
      const previous = state.trail[index - 1];
      const current = state.trail[index];
      const age = (now - current.time) / 1250;
      const alpha = Math.max(0, 1 - age);
      const from = state.mode === "camera" ? videoCoordinates(previous, width, height) : { x: previous.x * width, y: previous.y * height };
      const to = state.mode === "camera" ? videoCoordinates(current, width, height) : { x: current.x * width, y: current.y * height };
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.lineCap = "round";
      context.lineWidth = 2 + alpha * 7;
      context.strokeStyle = `hsla(${hue}, 94%, ${67 + (state.handPoint ? state.handPoint.volume * 12 : 0)}%, ${alpha * 0.55})`;
      context.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha * 0.9})`;
      context.shadowBlur = 12 + alpha * 20;
      context.stroke();
      context.shadowBlur = 0;
    }
  }

  const latest = state.trail[state.trail.length - 1];
  if (latest && now - latest.time < 300) {
    const point = state.mode === "camera" ? videoCoordinates(latest, width, height) : { x: latest.x * width, y: latest.y * height };
    const intensity = state.handPoint?.volume ?? 0.2;
    const radius = 9 + intensity * 15;
    const glow = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius * 3);
    glow.addColorStop(0, `hsla(${hue}, 100%, 78%, ${0.82 * intensity + 0.18})`);
    glow.addColorStop(0.18, `hsla(${hue}, 100%, 67%, ${0.5 * intensity + 0.1})`);
    glow.addColorStop(1, `hsla(${hue}, 100%, 62%, 0)`);
    context.fillStyle = glow;
    context.beginPath();
    context.arc(point.x, point.y, radius * 3, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.arc(point.x, point.y, 3.5 + intensity * 2, 0, Math.PI * 2);
    context.fillStyle = `hsla(${hue}, 100%, 85%, ${0.5 + intensity * 0.5})`;
    context.fill();
    if (state.mode === "camera" && latest.landmarks && state.previewVisible) drawHandSkeleton(latest.landmarks, width, height);
  }

  if (state.running && state.mode === "camera" && elements.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    const last = performance.now();
    if (elements.video.currentTime !== state.lastVideoTime && last - state.lastInferenceAt >= 80) {
      state.lastVideoTime = elements.video.currentTime;
      state.lastInferenceAt = last;
      try {
        const results = state.landmarker.detectForVideo(elements.video, Math.round(last));
        const landmarks = results.landmarks?.[0];
        if (landmarks?.length) {
          const control = mapHandToControl(palmCenter(landmarks), state.noteIndex);
          setTracking(true, control, landmarks);
        } else if (trackingTimedOut(state.lastSeenAt, last, 180)) {
          setTracking(false);
        }
      } catch (error) {
        console.error("Hand tracking frame failed:", error);
        if (last - state.lastSeenAt > 500) {
          state.running = false;
          state.mode = "error";
          synth.stopSound();
          state.errorKey = "model";
          state.errorText = translations().errors.model;
          elements.errorMessage.textContent = state.errorText;
          void releaseCamera().then(() => synth.dispose()).then(() => {
            elements.stop.disabled = true;
            elements.mute.disabled = true;
            elements.restart.disabled = true;
            setPanel("error");
          });
        }
      }
    }
    if (state.tracking && trackingTimedOut(state.lastSeenAt, last, 250)) setTracking(false);
  }
  state.animationId = requestAnimationFrame(drawVisuals);
}

function animate() {
  if (!state.animationId) state.animationId = requestAnimationFrame(drawVisuals);
}

elements.start.addEventListener("click", startCameraExperience);
elements.resumeButton.addEventListener("click", () => state.lastMode === "mouse" ? startFallback() : startCameraExperience());
elements.fallback.addEventListener("click", startFallback);
elements.errorFallback.addEventListener("click", startFallback);
elements.stop.addEventListener("click", () => stopExperience());
elements.restart.addEventListener("click", async () => {
  const previousMode = state.mode;
  await stopExperience();
  if (previousMode === "mouse") await startFallback();
  else await startCameraExperience();
});
elements.mute.addEventListener("click", () => {
  state.muted = !state.muted;
  synth.setMuted(state.muted);
  elements.mute.setAttribute("aria-pressed", String(state.muted));
  elements.mute.querySelector("[data-i18n]").textContent = translations()[state.muted ? "unmute" : "mute"];
});
elements.volume.addEventListener("input", (event) => {
  const level = Number(event.target.value);
  synth.setMasterLevel(level / 100);
  elements.volumeValue.textContent = `${level}%`;
});
elements.previewToggle.addEventListener("click", () => {
  state.previewVisible = !state.previewVisible;
  elements.video.classList.toggle("is-hidden", !state.previewVisible || state.mode !== "camera");
  elements.previewToggle.setAttribute("aria-pressed", String(state.previewVisible));
  elements.previewToggle.querySelector("[data-i18n]").textContent = translations()[state.previewVisible ? "hidePreview" : "showPreview"];
});
elements.languageToggle.addEventListener("click", () => {
  state.language = state.language === "en" ? "fr" : "en";
  translatePage();
  elements.modeLabel.textContent = state.mode === "camera" ? translations().modeCamera : state.mode === "mouse" ? translations().modeMouse : "";
  if (state.mode === "error" && state.errorKey) {
    state.errorText = translations().errors[state.errorKey];
    elements.errorMessage.textContent = state.errorText;
  }
});
elements.stage.addEventListener("pointermove", handlePointer);
elements.stage.addEventListener("pointerleave", handlePointer);
elements.stage.addEventListener("pointerdown", (event) => {
  if (state.mode === "mouse" && event.pointerType !== "mouse") handlePointer(event);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state.running) stopExperience({ paused: true });
});
window.addEventListener("beforeunload", () => {
  stopMediaTracks(state.stream);
  synth.stopSound();
});
if (window.ResizeObserver) {
  state.resizeObserver = new ResizeObserver(resizeCanvas);
  state.resizeObserver.observe(elements.stage);
} else {
  window.addEventListener("resize", resizeCanvas);
}
resizeCanvas();
translatePage();
animate();
