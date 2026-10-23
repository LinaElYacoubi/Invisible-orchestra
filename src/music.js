export const NOTES = [
  { name: "C4", frequency: 261.63 },
  { name: "D4", frequency: 293.66 },
  { name: "E4", frequency: 329.63 },
  { name: "G4", frequency: 392.0 },
  { name: "A4", frequency: 440.0 },
  { name: "C5", frequency: 523.25 },
  { name: "D5", frequency: 587.33 },
  { name: "E5", frequency: 659.25 },
  { name: "G5", frequency: 783.99 },
  { name: "A5", frequency: 880.0 },
  { name: "C6", frequency: 1046.5 }
];

export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function mirroredX(rawX) {
  return clamp(1 - rawX);
}

export function noteIndexForX(x) {
  return Math.min(NOTES.length - 1, Math.floor(clamp(x) * NOTES.length));
}

export function stableNoteIndex(x, previousIndex, hysteresis = 0.12) {
  const position = clamp(x) * NOTES.length;
  const candidate = Math.min(NOTES.length - 1, Math.floor(position));

  if (previousIndex == null || candidate === previousIndex) return candidate;

  const boundary = candidate > previousIndex ? candidate : previousIndex;
  const margin = Math.min(0.45, Math.max(0, hysteresis)) * (boundary === NOTES.length ? 0 : 1);
  const threshold = candidate > previousIndex ? boundary + margin : boundary - margin;
  const crossed = candidate > previousIndex ? position >= threshold : position <= threshold;
  return crossed ? candidate : previousIndex;
}

export function volumeForY(y) {
  return 0.08 + (1 - clamp(y)) * 0.72;
}

export function palmCenter(landmarks) {
  const palm = [landmarks[0], landmarks[5], landmarks[9], landmarks[13], landmarks[17]];
  return {
    x: palm.reduce((sum, point) => sum + point.x, 0) / palm.length,
    y: palm.reduce((sum, point) => sum + point.y, 0) / palm.length
  };
}

export function trackingTimedOut(lastSeenAt, now, timeout = 180) {
  return now - lastSeenAt > timeout;
}

export function noteForIndex(index) {
  return NOTES[Math.min(NOTES.length - 1, Math.max(0, Math.round(index)))];
}

export function mapHandToControl(landmark, previousIndex = null) {
  const x = mirroredX(landmark.x);
  return {
    x,
    y: clamp(landmark.y),
    noteIndex: stableNoteIndex(x, previousIndex),
    volume: volumeForY(landmark.y)
  };
}
