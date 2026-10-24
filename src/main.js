import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { NOTES, stableNoteIndex, clamp, mapHandToControl, noteForIndex, noteIndexForX, palmCenter, trackingTimedOut, volumeForY } from "./music.js";
import { SoftSynth } from "./audio.js";
import { stopMediaTracks } from "./resources.js";
import "./style.css";

import { noteLabel, demoFrame } from "./display-labels.js";
import { OUTPUT_PRESETS, outputConfig } from "./presentation.js";
import { ShowcaseSession } from "./showcase.js";
import { MelodyChallenge, generateMelody } from "./challenge.js";

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

const session = new ShowcaseSession();
let lifecycle = 0;
let stopping = false;
const synth = new SoftSynth();
const challenge = new MelodyChallenge();
let playMode = 'free';
let challengeMessage = 'readyChallenge';
let guideVisible = true;
let showOctaves = false;
const extras = document.createElement('div');
extras.className = 'extra-controls';
extras.innerHTML = `<label><span data-i18n="soundChoice"></span><select id="instrumentChoice"><option value="piano" data-i18n="piano"></option><option value="guitar" data-i18n="guitar"></option><option value="saxophone" data-i18n="saxophone"></option></select></label>
<p data-i18n="soundDescription"></p><a class="sample-credits" href="/samples/CREDITS.txt" target="_blank" rel="noopener" data-i18n="sampleCredits"></a>
<label><span data-i18n="playMode"></span><select id="playMode"><option value="free" data-i18n="freePlay"></option><option value="challenge" data-i18n="melodyChallenge"></option></select></label>
<label class="guide-control"><input id="guideToggle" type="checkbox" checked><span data-i18n="showGuide"></span></label>
<div id="challengeControls" hidden><label><span data-i18n="holdDuration"></span><input id="holdDuration" type="number" min="100" max="1500" step="50" value="250"> ms</label><p id="challengeStatus" role="status" aria-live="polite"></p><div class="challenge-actions"><button id="replayMelody" data-i18n="replay"></button><button id="retryMelody" data-i18n="tryAgain"></button><button id="nextMelody" data-i18n="nextMelody"></button></div></div>`;
document.querySelector('.mapping-card').replaceWith(extras);
const instructions = document.createElement('details');
instructions.className = 'how-to-play';
instructions.open = false;
instructions.innerHTML = `<summary data-i18n="howToPlay"></summary><ol>
<li data-i18n="helpStart"></li><li data-i18n="helpMove"></li><li data-i18n="helpVolume"></li><li data-i18n="helpSound"></li><li data-i18n="helpChallenge"></li><li data-i18n="helpRetry"></li>
</ol><p data-i18n="helpQuiet"></p>`;
document.querySelector('.stage-column').append(instructions);
if (!document.querySelector('.privacy-note')) {
 const privacy=document.createElement('p');privacy.className='privacy-note';privacy.dataset.i18n='privacyNote';
 elements.stage.after(privacy);
}
// Keep the first visit focused on playing; optional tuning stays one click away.
const settings = document.createElement('details');
settings.className = 'play-settings';
settings.innerHTML = '<summary data-i18n="moreOptions"></summary><div class="settings-content"></div>';
const settingsContent = settings.querySelector('div');
const holdLabel = $('#holdDuration').closest('label');
settingsContent.append(extras.querySelector('.guide-control'), elements.previewToggle, holdLabel, elements.restart, extras.querySelector('[data-i18n="soundDescription"]'), extras.querySelector('.sample-credits'));
document.querySelector('.topbar-actions').prepend(settings);
$('#retryMelody').hidden = true;
const nextStep = document.createElement('p'); nextStep.className = 'next-step'; nextStep.id = 'nextStep';
extras.prepend(nextStep);

Object.assign(strings.en, {
 howToPlay: 'Need help? How to play',
 helpStart: '<strong>Get ready.</strong> Choose Start playing and allow the camera, then hold one hand in view. Or choose Try with mouse and move your mouse or finger across the stage.',
 helpMove: '<strong>Find a note.</strong> Move left or right through the coloured bands. Each label names a note; the highlighted band shows your current note. Turn on Show note guide if the bands are hidden.',
 helpVolume: '<strong>Shape the sound.</strong> Move up for louder notes and down for softer notes. Use Master volume to set the overall level.',
 helpSound: '<strong>Explore.</strong> Choose Make your own music, then choose Piano, Guitar or Saxophone from Sound and make your own melody.',
 helpChallenge: '<strong>Repeat a melody.</strong> Choose Repeat a melody, then Play melody. First listen and watch the highlighted bands. When it says Your turn, repeat the notes in order. Hold each note for the Steady hold duration (250 ms to start), then move out of that band before returning. There is no time limit.',
 helpRetry: '<strong>Keep trying.</strong> A wrong note keeps your progress: leave its band and try the expected note. Listen again starts the same melody over. After success, choose Next challenge.',
 helpQuiet: 'Need a break? Mute silences the sound. Stop ends the experience. Returning from another tab requires Resume experience.'
});
Object.assign(strings.fr, {
 howToPlay: 'Comment jouer',
 helpStart: '<strong>Pr\u00e9parez-vous.</strong> Choisissez Commencer l\u2019exp\u00e9rience, autorisez la cam\u00e9ra et levez une main dans le cadre. Ou choisissez Essayer sans cam\u00e9ra et d\u00e9placez la souris ou le doigt sur la sc\u00e8ne.',
 helpMove: '<strong>Trouvez une note.</strong> Bougez de gauche \u00e0 droite dans les bandes color\u00e9es. Chaque \u00e9tiquette nomme une note ; la bande surlign\u00e9e indique la note actuelle. Activez Afficher le guide des notes si les bandes sont masqu\u00e9es.',
 helpVolume: '<strong>Modulez le son.</strong> Montez pour jouer plus fort et descendez pour jouer plus doucement. Le volume principal r\u00e8gle le niveau global.',
 helpSound: '<strong>Explorez.</strong> En Jeu libre, choisissez Piano, Guitare ou Saxophone dans Son et inventez votre m\u00e9lodie.',
 helpChallenge: '<strong>R\u00e9p\u00e9tez une m\u00e9lodie.</strong> Choisissez R\u00e9p\u00e9ter une m\u00e9lodie, puis Jouer la m\u00e9lodie. \u00c9coutez et regardez les bandes surlign\u00e9es. Au message \u00c0 vous, reproduisez les notes dans l\u2019ordre. Maintenez chaque note pendant la dur\u00e9e indiqu\u00e9e (250 ms au d\u00e9part), puis quittez sa bande avant d\u2019y revenir. Aucune limite de temps.',
 helpRetry: '<strong>Continuez !</strong> Une erreur conserve votre progression : quittez la bande et essayez la note attendue. R\u00e9\u00e9couter reprend la m\u00eame m\u00e9lodie au d\u00e9but. Apr\u00e8s une r\u00e9ussite, choisissez D\u00e9fi suivant.',
 helpQuiet: 'Une pause ? Couper le son rend le jeu silencieux. Arr\u00eater termine l\u2019exp\u00e9rience. Apr\u00e8s un changement d\u2019onglet, choisissez Reprendre l\u2019exp\u00e9rience.'
});
const zones = document.createElement('div');
zones.className = 'note-zones'; zones.setAttribute('aria-hidden', 'true');
zones.innerHTML = NOTES.map((note, i) => `<div style="--zone-hue: ${195+i*12.5}"><span>${note.name}</span></div>`).join('');
elements.stage.insertBefore(zones, elements.canvas);
Object.assign(strings.en, {
 sampleCredits:'Instrument sample credits', soundChoice:'Sound', piano:'Piano', guitar:'Guitar', saxophone:'Saxophone',
 soundDescription:'Piano and guitar strike once per zone entry; saxophone sustains while you hold.', playMode:'Play mode', freePlay:'Free Play', melodyChallenge:'Melody Challenge', showGuide:'Show note guide', holdDuration:'Steady hold', replay:'Replay', tryAgain:'Try Again', nextMelody:'Next melody', readyChallenge:'Start the experience, then choose Replay to listen.', listening:'Listen to the melody...', yourTurn:'Your turn: hold each note steadily. No time limit.', wrong:'Almost! Leave this zone and try the expected note again.', correct:'Lovely! Keep going.', success:'You did it! Choose Next melody to continue.', progress:'Notes'
});
Object.assign(strings.fr, {
 sampleCredits:'Cr\u00e9dits des sons', soundChoice:'Son', piano:'Piano', guitar:'Guitare', saxophone:'Saxophone',
 soundDescription:'Piano et guitare : une attaque par entr\u00e9e dans une zone. Saxophone : son maintenu.', playMode:'Mode de jeu', freePlay:'Jeu libre', melodyChallenge:'D\u00e9fi m\u00e9lodique', showGuide:'Afficher le guide des notes', holdDuration:'Maintien stable', replay:'R\u00e9\u00e9couter', tryAgain:'R\u00e9essayer', nextMelody:'M\u00e9lodie suivante', readyChallenge:'Commencez, puis choisissez R\u00e9\u00e9couter.', listening:'\u00c9coutez la m\u00e9lodie...', yourTurn:'\u00c0 vous : maintenez chaque note. Aucune limite de temps.', wrong:'Presque ! Quittez cette zone et r\u00e9essayez la note attendue.', correct:'Bravo ! Continuez.', success:'R\u00e9ussi ! Choisissez M\u00e9lodie suivante pour continuer.', progress:'Notes'
});
Object.assign(strings.en, {
 quickTitle:'Make your first note', quickStart:'Start with the camera, or choose mouse / touch.', quickMove:'Move left and right to choose a note.', quickVolume:'Move up for louder. Down for softer.', moreOptions:'More options',
 start:'Play with camera', tryMouse:'Use mouse / touch', soundChoice:'Instrument', playMode:'What would you like to do?', freePlay:'Make your own music', melodyChallenge:'Repeat a melody',
 welcomeKicker:'LET\u2019S PLAY', welcomeTitle:'Move your hand.<br />Make music.', welcomeCopy:'Choose how to play below. No musical experience needed.',
 instrumentLabel:'MAKE IT YOURS', currentNote:'YOUR NOTE', readyChallenge:'Start playing, then choose Play melody. Listen first, then repeat.',
 replay:'Listen again', playMelody:'Play melody', nextMelody:'Next challenge', nextFree:'Choose an instrument, then start playing.', nextCamera:'Move one hand through the coloured bands.', nextMouse:'Move your mouse or finger through the coloured bands.',
 yourTurn:'Your turn! Repeat the notes. Pause briefly on each one, then move to the next. Take your time.', handWaiting:'Ready to play', handHint:'Choose camera or mouse / touch to begin', handQuietHint:'Bring your hand back to keep playing'
});
Object.assign(strings.fr, {
 quickTitle:'Jouez votre premi\u00e8re note', quickStart:'Commencez avec la cam\u00e9ra, ou choisissez souris / tactile.', quickMove:'Bougez de gauche \u00e0 droite pour choisir une note.', quickVolume:'Montez pour jouer plus fort. Descendez pour adoucir.', moreOptions:'Plus d\u2019options',
 start:'Jouer avec la cam\u00e9ra', tryMouse:'Utiliser souris / tactile', soundChoice:'Instrument', playMode:'Que voulez-vous faire ?', freePlay:'Inventer votre musique', melodyChallenge:'R\u00e9p\u00e9ter une m\u00e9lodie',
 welcomeKicker:'\u00c0 VOUS DE JOUER', welcomeTitle:'Bougez la main.<br />Cr\u00e9ez de la musique.', welcomeCopy:'Choisissez comment jouer. Aucune exp\u00e9rience musicale requise.',
 instrumentLabel:'\u00c0 VOTRE FA\u00c7ON', currentNote:'VOTRE NOTE', readyChallenge:'Commencez, puis choisissez Jouer la m\u00e9lodie. \u00c9coutez, puis r\u00e9p\u00e9tez.',
 replay:'R\u00e9\u00e9couter', playMelody:'Jouer la m\u00e9lodie', nextMelody:'D\u00e9fi suivant', nextFree:'Choisissez un instrument, puis commencez.', nextCamera:'D\u00e9placez une main dans les bandes color\u00e9es.', nextMouse:'D\u00e9placez la souris ou le doigt dans les bandes color\u00e9es.',
 yourTurn:'\u00c0 vous ! R\u00e9p\u00e9tez les notes. Marquez une courte pause sur chacune, puis passez \u00e0 la suivante. Prenez votre temps.', handWaiting:'Pr\u00eat \u00e0 jouer', handHint:'Choisissez cam\u00e9ra ou souris / tactile', handQuietHint:'Ramenez votre main pour continuer'
});

Object.assign(strings.en, {
 welcomeTitle:'Your hands.<br />Your orchestra.', welcomeCopy:'Move your hand in front of the camera to play.', start:'Start playing', tryMouse:'Try with mouse',
 welcomeKicker:'NO MUSICAL EXPERIENCE NEEDED', demoLabel:'ANIMATED DEMO · NOT A LIVE CAMERA', demoNotes:'Left / right = change notes', demoVolume:'Up / down = change volume',
 loadingKicker:'Getting ready', loadingCopy:'When your browser asks, choose Allow camera. We only use video, never your microphone.',
 errorKicker:'Let’s try another way', showHand:'No hand detected', handQuiet:'No hand detected', handQuietHint:'Stand where the camera can see your hand', handHint:'Stand where the camera can see your hand',
 placement:'Place your hand here to begin', placementHint:'Hold one open hand inside the outline. Move gently to begin.',
 stageHint:'Left / right: notes | Up / down: volume', stop:'Finish / Next player', masterVolume:'Volume', help:'Help', moreOptions:'Settings',
 idleSetting:'Inactivity delay (seconds)', shortSession:'Short turns', noLimit:'Off · no turn limit', twoMinutes:'2 minutes', threeMinutes:'3 minutes', fiveMinutes:'5 minutes',
 idlePrompt:'Still playing? Move your hand or mouse to continue.', turnPrompt:'Your turn is nearly over. Thank you for making music!', secondsLeft:'seconds remaining', stay:'Keep playing',
 screenMode:'Screen mode', fullscreen:'Full screen', exitFullscreen:'Exit full screen', modeFree:'Free Play', modeChallenge:'Melody Challenge'
});
Object.assign(strings.fr, {
 title:'Faites de la musique avec vos mains', intro:'Bougez la main devant la caméra pour jouer.',
 welcomeTitle:'Vos mains.<br />Votre orchestre.', welcomeCopy:'Bougez la main devant la caméra pour jouer.', start:'Commencer à jouer', tryMouse:'Essayer avec la souris',
 welcomeKicker:'AUCUNE EXPÉRIENCE MUSICALE REQUISE', demoLabel:'DÉMONSTRATION ANIMÉE · PAS UNE CAMÉRA EN DIRECT', demoNotes:'Gauche / droite = changer de note', demoVolume:'Haut / bas = régler le volume',
 loadingKicker:'Préparation', loadingCopy:'Quand le navigateur le demande, choisissez Autoriser la caméra. Vidéo seulement, jamais de micro.',
 errorKicker:'Essayons autrement', showHand:'Aucune main détectée', handQuiet:'Aucune main détectée', handQuietHint:'Placez-vous pour que la caméra voie votre main', handHint:'Placez-vous pour que la caméra voie votre main',
 placement:'Placez votre main ici pour commencer', placementHint:'Gardez une main ouverte dans le contour. Bougez doucement pour commencer.',
 stageHint:'Gauche / droite : notes | Haut / bas : volume', stop:'Terminer / Joueur suivant', masterVolume:'Volume', help:'Aide', moreOptions:'Réglages',
 idleSetting:'Délai d’inactivité (secondes)', shortSession:'Tours courts', noLimit:'Désactivé · sans limite', twoMinutes:'2 minutes', threeMinutes:'3 minutes', fiveMinutes:'5 minutes',
 idlePrompt:'Vous jouez encore ? Bougez la main ou la souris pour continuer.', turnPrompt:'Votre tour se termine bientôt. Merci pour la musique !', secondsLeft:'secondes restantes', stay:'Continuer à jouer',
 screenMode:'Affichage', fullscreen:'Plein écran', exitFullscreen:'Quitter le plein écran', modeFree:'Jeu libre', modeChallenge:'Défi mélodique'
});
strings.en.errors.denied = 'Camera blocked. Allow camera access in your browser settings, or choose Try with mouse.';
strings.fr.errors.denied = 'Caméra bloquée. Autorisez-la dans les réglages du navigateur, ou essayez avec la souris.';
const handOutline = `
  <svg viewBox="0 0 100 120" fill="none" stroke="currentColor"
    stroke-width="4" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M30 105 C20 90 10 75 10 65 C10 58 17 56 22 63
      L30 74 V30 C30 19 42 19 42 30 V55
      V15 C42 4 54 4 54 15 V54
      V22 C54 11 66 11 66 22 V57
      V34 C66 23 78 23 78 34 V76 C78 91 72 100 66 105 Z" />
  </svg>`;
if (!elements.welcome.querySelector('.welcome-support')) {
 const support=document.createElement('p');support.className='welcome-support';support.dataset.i18n='welcomeKicker';
 elements.welcome.querySelector('.welcome-copy').before(support);
}
const demo = document.createElement('div'); demo.className = 'control-demo';
demo.innerHTML = `<p class="demo-label" data-i18n="demoLabel"></p>
<div class="demo-visual" aria-hidden="true"><div class="demo-path">
 <div class="demo-zones">${NOTES.map((note,i)=>`<span style="--demo-hue:${195+i*12.5}"><b>${note.name}</b></span>`).join('')}</div>
 <svg class="demo-trail" viewBox="0 0 500 220" preserveAspectRatio="none"><defs><linearGradient id="demoTrailGradient" gradientUnits="userSpaceOnUse" x1="65" y1="125" x2="405" y2="125"><stop stop-color="#9bf1dd" stop-opacity="0"/><stop offset="1" stop-color="#9bf1dd" stop-opacity=".85"/></linearGradient></defs><path d="M65 125 H405" stroke="url(#demoTrailGradient)" stroke-width="5" fill="none" stroke-linecap="round"/></svg>
 <span class="demo-hand">${handOutline}</span>
</div><div class="demo-volume"><span data-i18n="demoLoud"></span><div class="demo-volume-track"><div class="demo-volume-fill"></div><i class="demo-volume-marker"></i></div><span data-i18n="demoQuiet"></span></div></div>
<div class="demo-captions"><span data-i18n="demoNotes"></span><span data-i18n="demoVolume"></span></div>`;
elements.welcome.append(demo);
Object.assign(strings.en,{showOctaves:'Show octave numbers',demoQuiet:'Quiet',demoLoud:'Loud'});
Object.assign(strings.fr,{showOctaves:'Afficher les octaves',demoQuiet:'Doux',demoLoud:'Fort'});
settingsContent.insertAdjacentHTML('afterbegin','<label class="guide-control"><input id="octaveToggle" type="checkbox"><span data-i18n="showOctaves"></span></label>');
function updateNoteLabels(){
 [...zones.children].forEach((zone,i)=>zone.querySelector('span').textContent=noteLabel(i,state.language,showOctaves));
 demo.querySelectorAll('.demo-zones b').forEach((label,i)=>label.textContent=noteLabel(i,state.language,showOctaves));
 if(state.mode!=='idle'){
  const index=challenge.phase==='playback' && challenge.highlight!=null?challenge.highlight:state.noteIndex;
  elements.noteName.textContent=elements.panelNote.textContent=noteLabel(index,state.language,showOctaves);
 }
}
$('#octaveToggle').addEventListener('change',event=>{showOctaves=event.target.checked;updateNoteLabels();});
const demoMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
let demoTrail=[];
function updateDemo(now){
 if(elements.welcome.classList.contains('is-hidden'))return;
 const frame=demoFrame(now,demoMotion.matches);
 const hand=demo.querySelector('.demo-hand');hand.style.left=frame.x*100+'%';hand.style.top=frame.y*100+'%';
 demo.querySelectorAll('.demo-zones > span').forEach((zone,i)=>zone.classList.toggle('is-active',i===frame.noteIndex));
 demo.querySelector('.demo-volume-fill').style.height=frame.volume*100+'%';
 demo.querySelector('.demo-volume-marker').style.bottom=frame.volume*100+'%';
 demo.dataset.note=String(frame.noteIndex);demo.dataset.volume=frame.volume.toFixed(3);
 demoTrail=demoMotion.matches?[{x:.35,y:.5,time:now},frame]:demoTrail.filter(point=>now-point.time<850);
 if(!demoMotion.matches)demoTrail.push({...frame,time:now});
 const path=demo.querySelector('.demo-trail path');
 path.setAttribute('d',demoTrail.map((point,i)=>(i?'L':'M')+(point.x*500).toFixed(1)+' '+(point.y*220).toFixed(1)).join(' '));
}

const placement = document.createElement('div'); placement.className = 'hand-placement'; placement.hidden = true;
placement.innerHTML = `<span class="hand-outline" aria-hidden="true">${handOutline}</span><strong data-i18n="placement"></strong><p data-i18n="placementHint"></p>`;
elements.stage.append(placement);
const spectator = document.createElement('p'); spectator.className = 'spectator-label';
elements.stage.querySelector('.stage-topline').append(spectator);
const prompt = document.createElement('aside'); prompt.className = 'session-prompt'; prompt.hidden = true;
prompt.setAttribute('role','status'); prompt.setAttribute('aria-live','polite');
prompt.innerHTML = '<p></p><button type="button" data-i18n="stay"></button>';
document.querySelector('.experience-grid').before(prompt);
prompt.querySelector('button').addEventListener('click', () => { session.activity(performance.now()); prompt.hidden = true; });
settingsContent.insertAdjacentHTML('beforeend', '<label><span data-i18n="idleSetting"></span><input id="idleDelay" type="number" min="15" max="600" step="15" value="90"></label><label><span data-i18n="shortSession"></span><select id="turnLimit"><option value="0" data-i18n="noLimit"></option><option value="120" data-i18n="twoMinutes"></option><option value="180" data-i18n="threeMinutes"></option><option value="300" data-i18n="fiveMinutes"></option></select></label>');
$('#idleDelay').addEventListener('change', e => { session.idleMs = clamp(Number(e.target.value) || 90,15,600)*1000; e.target.value=session.idleMs/1000; session.activity(performance.now()); });
$('#turnLimit').addEventListener('change', e => { session.limitMs = Number(e.target.value)*1000; if (session.running) session.start(performance.now()); });
const help = document.createElement('button'); help.type='button'; help.className='transport-button'; help.dataset.i18n='help';
document.querySelector('.transport-controls').prepend(help);
help.addEventListener('click', () => { instructions.open=!instructions.open; help.setAttribute('aria-expanded',String(instructions.open)); if(instructions.open) instructions.scrollIntoView({block:'nearest',behavior:'instant'}); });
help.setAttribute('aria-expanded','false');
const fullscreen = document.createElement('button'); fullscreen.type='button'; fullscreen.className='transport-button'; fullscreen.dataset.i18n='fullscreen';
document.querySelector('.topbar-actions').prepend(fullscreen);
fullscreen.addEventListener('click', async () => { try { if(document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { fullscreen.hidden=true; } });
document.addEventListener('fullscreenchange',()=>{ fullscreen.dataset.i18n=document.fullscreenElement?'exitFullscreen':'fullscreen'; fullscreen.textContent=translations()[fullscreen.dataset.i18n]; });

Object.assign(strings.en, {display:'Display', laptop:'Laptop', hologram:'Hologram', outputSettings:'Display resolution', landscapeUhd:'Landscape UHD (3840 × 2160)', portraitUhd:'Portrait UHD (2160 × 3840)', customOutput:'Custom dimensions', outputWidth:'Width (pixels)', outputHeight:'Height (pixels)', background:'Background'});
Object.assign(strings.fr, {display:'Affichage', laptop:'Ordinateur', hologram:'Hologramme', outputSettings:'Sortie de présentation', landscapeUhd:'UHD paysage (3840 × 2160)', portraitUhd:'UHD portrait (2160 × 3840)', customOutput:'Dimensions personnalisées', outputWidth:'Largeur (pixels)', outputHeight:'Hauteur (pixels)', background:'Arrière-plan'});
const displayControl=document.createElement('label');displayControl.className='display-control';
displayControl.innerHTML='<span data-i18n="display"></span><select id="displayMode"><option value="laptop" data-i18n="laptop"></option><option value="hologram" data-i18n="hologram"></option></select>';
document.querySelector('.topbar-actions').prepend(displayControl);
const outputPanel=document.createElement('details');outputPanel.className='output-settings';
outputPanel.innerHTML='<summary data-i18n="outputSettings"></summary><div><select id="outputPreset" aria-label="Output preset"><option value="landscape" data-i18n="landscapeUhd"></option><option value="portrait" data-i18n="portraitUhd"></option><option value="custom" data-i18n="customOutput"></option></select><label><span data-i18n="outputWidth"></span><input id="outputWidth" type="number" min="320" max="7680" value="3840"></label><label><span data-i18n="outputHeight"></span><input id="outputHeight" type="number" min="320" max="7680" value="2160"></label></div>';
const displaySettings=document.createElement('details');displaySettings.className='display-settings';
displaySettings.innerHTML='<summary data-i18n="display"></summary><div class="display-settings-content"></div>';
displaySettings.querySelector('div').append(displayControl,outputPanel);
document.querySelector('.topbar-actions').prepend(displaySettings);
for(const menu of [settings,displaySettings]) menu.addEventListener('toggle',()=>{if(menu.open){const other=menu===settings?displaySettings:settings;other.open=false;}});
document.addEventListener('pointerdown',event=>{for(const menu of [settings,displaySettings])if(!menu.contains(event.target))menu.open=false;});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){for(const menu of [settings,displaySettings])if(menu.open){menu.open=false;menu.querySelector('summary').focus();}}});
Object.assign(strings.en,{title:'Make music with your hands.',welcomeKicker:'No musical experience needed',demoLabel:'Demo preview',demoNotes:'Left / right \u2192 change notes',demoVolume:'Up / down \u2192 change volume',privacyNote:'Camera video stays on your device. It is never recorded or uploaded.'});
Object.assign(strings.fr,{title:'Faites de la musique avec vos mains.',welcomeKicker:'Aucune exp\u00e9rience musicale requise',demoLabel:'Aper\u00e7u de d\u00e9monstration',demoNotes:'Gauche / droite \u2192 changer de note',demoVolume:'Haut / bas \u2192 r\u00e9gler le volume',privacyNote:'La vid\u00e9o reste sur votre appareil. Elle n\u2019est jamais enregistr\u00e9e ni t\u00e9l\u00e9vers\u00e9e.'});
let displayMode='laptop', output=outputConfig(3840,2160,'#000000');
function configureOutput(){
 output=outputConfig($('#outputWidth').value,$('#outputHeight').value,'#000000');
 $('#outputWidth').value=output.width;$('#outputHeight').value=output.height;
 resizeCanvas();
}
$('#displayMode').addEventListener('change',event=>{
 displayMode=event.target.value;document.body.classList.toggle('display-hologram',displayMode==='hologram');

 displaySettings.open=false;
 resizeCanvas();
 // Both modes share the same interface and camera-preview preference.
});
$('#outputPreset').addEventListener('change',event=>{const preset=OUTPUT_PRESETS[event.target.value];if(preset){$('#outputWidth').value=preset.width;$('#outputHeight').value=preset.height;configureOutput();}});
for(const id of ['outputWidth','outputHeight']) $('#'+id).addEventListener('change',()=>{$('#outputPreset').value='custom';configureOutput();});
function updateShowcase(now) {
 document.body.classList.toggle('welcome-visible', !elements.welcome.classList.contains('is-hidden'));
 document.body.classList.toggle('session-active', state.running);
 document.body.classList.toggle('session-idle', !state.running);
 document.body.classList.toggle('session-error', state.mode === 'error');
 placement.hidden = !state.running || state.mode !== 'camera' || state.tracking || !elements.loading.classList.contains('is-hidden');
 const instrument = translations()[$('#instrumentChoice').value];
 spectator.textContent = state.running ? (translations()[playMode === 'free' ? 'modeFree' : 'modeChallenge'] + ' · ' + instrument) : '';
 const status = session.tick(now, { demonstrating: challenge.phase === 'playback' });
 prompt.hidden = !state.running || status.kind === 'none' || status.kind === 'reset';
 if (!prompt.hidden) {
  prompt.querySelector('p').textContent = translations()[status.kind === 'idle' ? 'idlePrompt' : 'turnPrompt'] + ' ' + status.seconds + ' ' + translations().secondsLeft;
  prompt.querySelector('button').hidden = status.kind !== 'idle';
 }
 if (status.kind === 'reset' && state.running) void stopExperience();
}
function renderChallenge() {
 $('#challengeControls').hidden = playMode !== 'challenge';
 $('#challengeStatus').textContent = translations()[challengeMessage] + (challenge.sequence.length ? ` (${translations().progress} : ${challenge.progress}/${challenge.sequence.length})` : '');
 $('#replayMelody').disabled = !state.running || !synth.ready || challenge.phase === 'playback';
 $('#replayMelody').textContent = translations()[challenge.sequence.length ? 'replay' : 'playMelody'];
 nextStep.textContent = translations()[!state.running ? 'nextFree' : state.mode === 'mouse' ? 'nextMouse' : 'nextCamera'];
 $('#retryMelody').disabled = !state.running || !challenge.sequence.length;
 $('#nextMelody').hidden = challenge.phase !== 'success';
}
function resetChallenge() {
 challenge.reset(); challengeMessage = 'readyChallenge'; synth.stopSound(); renderChallenge();
}
function beginMelody(sequence) {
 if (!state.running || !synth.ready || document.hidden) return;
 synth.stopSound(); challenge.play(sequence, performance.now()); challengeMessage = 'listening'; renderChallenge();
}
$('#instrumentChoice').addEventListener('change', e => synth.setInstrument(e.target.value));
$('#playMode').addEventListener('change', e => { playMode = e.target.value; resetChallenge(); if (playMode === 'challenge' && state.running) beginMelody(generateMelody()); });
$('#guideToggle').addEventListener('change', e => { guideVisible = e.target.checked; });
$('#holdDuration').addEventListener('change', e => { challenge.holdMs = clamp(Number(e.target.value) || 250, 100, 1500); e.target.value = challenge.holdMs; challenge.leave(); });
$('#replayMelody').addEventListener('click', () => beginMelody(challenge.sequence.length ? challenge.sequence : generateMelody()));
$('#retryMelody').addEventListener('click', () => beginMelody(challenge.sequence));
$('#nextMelody').addEventListener('click', () => beginMelody(generateMelody(Math.min(6, challenge.sequence.length + 1))));
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
  updateNoteLabels();
  document.documentElement.lang = state.language;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.dataset.i18n;
    if (translations()[key]) element.innerHTML = translations()[key];
  });
  elements.languageToggle.textContent = state.language === "en" ? "Fran\u00e7ais" : "English";
  elements.languageToggle.setAttribute("aria-label", state.language === "en" ? "Passer en français" : "Switch to English");
  elements.previewToggle.querySelector("[data-i18n]").textContent = translations()[state.previewVisible ? "hidePreview" : "showPreview"];
  elements.mute.querySelector("[data-i18n]").textContent = translations()[state.muted ? "unmute" : "mute"];
  renderChallenge();
  setHandStatus(state.tracking);
  if (state.noteIndex != null && state.mode !== "idle") updateNote(state.noteIndex);
}

function setPanel(panel) {
  document.body.classList.toggle('welcome-visible', panel === 'welcome');
  renderChallenge();
  if (panel === 'error') elements.stop.disabled=false;
  if (panel === 'loading') {
    elements.loading.querySelector('.loading-copy').textContent = state.mode === 'mouse' ? (state.language === 'en' ? 'Loading your instruments...' : 'Chargement des instruments...') : translations().loadingCopy;
  }
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
  if (state.mode === 'mouse') {
    elements.feedbackText.textContent = translations().modeMouse;
    elements.handStatusLabel.textContent = translations().modeMouse;
    elements.handStatusHint.textContent = translations().nextMouse;
  }
}

function updateNote(index) {
  const note = noteForIndex(index);
  elements.noteName.textContent = noteLabel(index,state.language,showOctaves);
  elements.noteFrequency.textContent = `${Math.round(note.frequency)} Hz`;
  elements.panelNote.textContent = noteLabel(index,state.language,showOctaves);
  elements.stage.style.setProperty("--pitch-hue", `${195 + (index / 10) * 125}deg`);
  if (playMode === "free" || challenge.phase === "answer") synth.playNote(index);
}

function setTracking(detected, control = null, landmarks = null) {
  if (detected) {
    session.activity(performance.now());
    state.lastSeenAt = performance.now();
    state.noteIndex = control.noteIndex;
    state.handPoint = control;
    state.tracking = true;
    elements.stateLabel.dataset.i18n = "statePlaying";
    elements.stateLabel.textContent = translations().statePlaying;
    updateNote(control.noteIndex);
    if (playMode === "free" || challenge.phase === "answer") {
      synth.setPerformanceVolume(control.volume); synth.setTracking(true);
    }
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
    if (challenge.phase !== "playback") synth.setTracking(false);
    challenge.input(null, performance.now());
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

async function createLandmarker(token) {
  if (state.landmarker) return state.landmarker;
  const modelUrl = "/assets/hand_landmarker.task";
  const response = await fetch(modelUrl, { method: "HEAD" });
  if (!response.ok) throw new Error("Tracking model file is unavailable. Run npm run assets:prepare.");
  const vision = await FilesetResolver.forVisionTasks("/wasm");
  const landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelUrl },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: 0.55,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  if (token !== lifecycle) { landmarker.close(); return null; }
  state.landmarker = landmarker;
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
  if (state.running || stopping) return;
  const token = ++lifecycle;
  session.start(performance.now());
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
    if (token !== lifecycle) return;
    await createLandmarker(token);
    if (token !== lifecycle || !state.running || state.mode !== "camera") return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: "user", width: { ideal: 640, max: 640 }, height: { ideal: 480, max: 480 }, frameRate: { ideal: 24, max: 30 } }
    });
    if (token !== lifecycle || !state.running || state.mode !== "camera") {
      stopMediaTracks(stream);
      return;
    }
    state.stream = stream;
    elements.video.srcObject = stream;
    await elements.video.play();
    if (token !== lifecycle) return;
    state.lastVideoTime = -1;
    state.lastInferenceAt = 0;
    state.lastSeenAt = performance.now();
    setPanel(null);
    setHandStatus(false);
    elements.restart.disabled = false;
    renderChallenge();
  } catch (error) {
    if (token !== lifecycle || !state.running) return;
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
  if (state.running || stopping) return;
  const token = ++lifecycle;
  session.start(performance.now());
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
  setPanel("loading");
  setHandStatus(false);
  try {
    if (!window.AudioContext && !window.webkitAudioContext) throw new Error("unsupported");
    await synth.start();
    if (token !== lifecycle || !state.running) return;
    setPanel(null);
    elements.stage.classList.add("is-interactive");
    elements.restart.disabled = false;
  } catch (error) {
    if (token !== lifecycle) return;
    await synth.dispose();
    session.stop();
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
  if (stopping) return;
  stopping = true; ++lifecycle; session.stop(); prompt.hidden = true;
  resetChallenge();
  const previousMode = state.mode;
  if (paused && previousMode !== "idle") state.lastMode = previousMode;
  state.running = false;
  state.pointerActive = false;
  state.mode = "idle";
  state.tracking = false;
  state.handPoint = null;
  state.trail.length = 0;
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
  synth.setMuted(false);
  translatePage();
  state.errorKey=''; state.errorText=''; state.noteIndex=0; state.lastSeenAt=0;
  playMode = 'free'; $('#playMode').value = 'free';
  synth.setInstrument('piano'); $('#instrumentChoice').value = 'piano';
  synth.setMasterLevel(.35); elements.volume.value=35; elements.volumeValue.textContent='35%';
  state.previewVisible=true; elements.previewToggle.setAttribute('aria-pressed','true');
  guideVisible=true; $('#guideToggle').checked=true;
  challenge.holdMs=250; $('#holdDuration').value=250;
  instructions.open=false; help.setAttribute('aria-expanded','false'); settings.open=false;
  elements.start.disabled=false; elements.fallback.disabled=false;
  stopping=false; translatePage();
  setPanel(paused ? "resume" : "welcome");
  if (!paused) elements.start.focus({preventScroll:true});
}

function stageCoordinates(clientX, clientY) {
  const rect = elements.stage.getBoundingClientRect();
  return { x: clamp((clientX - rect.left) / rect.width), y: clamp((clientY - rect.top) / rect.height) };
}

function handlePointer(event) {
  if (!state.running || !synth.ready || state.mode !== "mouse" || event.target.closest("button, input, select, a")) return;
  const point = stageCoordinates(event.clientX, event.clientY);
  state.pointerActive = event.type !== "pointerleave";
  if (!state.pointerActive) {
    setTracking(false);
    return;
  }
  const index = stableNoteIndex(point.x, state.tracking ? state.noteIndex : null);
  setTracking(true, { ...point, noteIndex: index, volume: volumeForY(point.y) });
}

function resizeCanvas() {
  const bounds = elements.stage.getBoundingClientRect();
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  elements.canvas.width = displayMode==='hologram' ? output.width : Math.max(1, Math.round(bounds.width * pixelRatio));
  elements.canvas.height = displayMode==='hologram' ? output.height : Math.max(1, Math.round(bounds.height * pixelRatio));
  context.setTransform(elements.canvas.width / Math.max(1,bounds.width), 0, 0, elements.canvas.height / Math.max(1,bounds.height), 0, 0);
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

function drawVisuals(now, backgroundFrame = false) {
  updateDemo(now);
  updateShowcase(now);
  const bounds = elements.stage.getBoundingClientRect();
  const width = bounds.width;
  const height = bounds.height;
  context.clearRect(0, 0, width, height);
  const fit = Math.min(width / (elements.video.videoWidth || width), height / (elements.video.videoHeight || height));
  const guideWidth = state.mode === 'camera' ? (elements.video.videoWidth || width) * fit : width;
  zones.style.left = (width - guideWidth) / 2 + 'px'; zones.style.width = guideWidth + 'px';
  zones.hidden = !guideVisible || !state.running;
  if (playMode === 'challenge' && state.running) {
    const wasPlaying = challenge.phase === 'playback';
    challenge.tick(now);
    if (wasPlaying) {
      if (challenge.highlight != null) { synth.playNote(challenge.highlight); synth.setPerformanceVolume(.6); }
      synth.setTracking(challenge.highlight != null);
      if (challenge.phase === 'answer') { challengeMessage = 'yourTurn'; renderChallenge(); }
    } else {
      if (challenge.phase === 'answer') {
        if (state.tracking) { synth.playNote(state.noteIndex); synth.setPerformanceVolume(state.handPoint.volume); }
        synth.setTracking(state.tracking);
      }
      const result = challenge.input(state.tracking ? state.noteIndex : null, now);
      if (result) { challengeMessage = result; renderChallenge(); if (result === 'success') synth.stopSound(); }
    }
  }
  const active = challenge.phase === 'playback' ? challenge.highlight : state.tracking ? state.noteIndex : null;
  [...zones.children].forEach((zone, i) => zone.classList.toggle('active', i === active));
  if (challenge.phase === 'playback' && active != null) { elements.noteName.textContent=noteLabel(active,state.language,showOctaves); elements.panelNote.textContent=noteLabel(active,state.language,showOctaves); }
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
      const from = state.mode === "camera" ? videoCoordinates({ ...previous, x: 1 - previous.x }, width, height) : { x: previous.x * width, y: previous.y * height };
      const to = state.mode === "camera" ? videoCoordinates({ ...current, x: 1 - current.x }, width, height) : { x: current.x * width, y: current.y * height };
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
    const point = state.mode === "camera" ? videoCoordinates({ ...latest, x: 1 - latest.x }, width, height) : { x: latest.x * width, y: latest.y * height };
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
          resetChallenge();
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
  if (!backgroundFrame) state.animationId = requestAnimationFrame(drawVisuals);
}

function animate() {
  if (!state.animationId) state.animationId = requestAnimationFrame(drawVisuals);
}

document.querySelector('.control-panel').addEventListener('pointerdown',()=>session.activity(performance.now()));
document.addEventListener('keydown',()=>session.activity(performance.now()));
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
elements.stage.addEventListener("pointerup", e => { if (e.pointerType !== "mouse") setTracking(false); });
elements.stage.addEventListener("pointercancel", () => setTracking(false));
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
