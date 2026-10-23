import test from "node:test";
import assert from "node:assert/strict";
import { NOTES, mapHandToControl, mirroredX, noteForIndex, noteIndexForX, palmCenter, stableNoteIndex, trackingTimedOut, volumeForY } from "../src/music.js";
import { stopMediaTracks } from "../src/resources.js";

test("mirrored camera coordinates align with the preview and clamp to its edges", () => {
  assert.equal(mirroredX(0), 1);
  assert.equal(mirroredX(1), 0);
  assert.equal(mirroredX(0.25), 0.75);
  assert.equal(mirroredX(-1), 1);
  assert.equal(mirroredX(2), 0);
});

test("horizontal mapping covers every note and handles both stage boundaries", () => {
  assert.equal(NOTES.length, 11);
  assert.equal(noteIndexForX(0), 0);
  assert.equal(noteIndexForX(1), 10);
  assert.equal(noteIndexForX(0.5), 5);
  assert.equal(noteIndexForX(-2), 0);
  assert.equal(noteIndexForX(2), 10);
  assert.equal(noteForIndex(-20).name, "C4");
  assert.equal(noteForIndex(99).name, "C6");
});

test("vertical mapping is louder at the top and remains safely bounded", () => {
  assert.ok(Math.abs(volumeForY(0) - 0.8) < 1e-12);
  assert.ok(Math.abs(volumeForY(1) - 0.08) < 1e-12);
  assert.ok(Math.abs(volumeForY(-1) - 0.8) < 1e-12);
  assert.ok(Math.abs(volumeForY(2) - 0.08) < 1e-12);
});

test("note hysteresis keeps the selected pitch until a neighboring boundary is crossed", () => {
  const boundary = 5 / NOTES.length;
  assert.equal(stableNoteIndex(boundary + 0.002, 4), 4);
  assert.equal(stableNoteIndex(boundary + 0.02, 4), 5);
  assert.equal(stableNoteIndex(boundary - 0.002, 5), 5);
  assert.equal(stableNoteIndex(boundary - 0.02, 5), 4);
  assert.equal(stableNoteIndex(0.9, 2), 9);
});

test("camera hand mapping mirrors x, preserves y and shares note/volume mappings", () => {
  const control = mapHandToControl({ x: 0.2, y: 0.25 });
  assert.equal(control.x, 0.8);
  assert.equal(control.y, 0.25);
  assert.equal(control.noteIndex, noteIndexForX(0.8));
  assert.equal(control.volume, volumeForY(0.25));
});

test("palm center averages the wrist and four palm-base landmarks", () => {
  const landmarks = Array.from({ length: 21 }, () => ({ x: 0.9, y: 0.9 }));
  landmarks[0] = { x: 0, y: 0 };
  landmarks[5] = { x: 0.2, y: 0.2 };
  landmarks[9] = { x: 0.4, y: 0.4 };
  landmarks[13] = { x: 0.6, y: 0.6 };
  landmarks[17] = { x: 0.8, y: 0.8 };
  assert.deepEqual(palmCenter(landmarks), { x: 0.4, y: 0.4 });
});

test("tracking loss fades after a short detection grace period", () => {
  assert.equal(trackingTimedOut(1000, 1180), false);
  assert.equal(trackingTimedOut(1000, 1181), true);
  assert.equal(trackingTimedOut(1000, 1251, 250), true);
});

test("camera cleanup stops every stream track and accepts an already released stream", () => {
  let stopped = 0;
  stopMediaTracks({ getTracks: () => [{ stop: () => { stopped += 1; } }, { stop: () => { stopped += 1; } }] });
  stopMediaTracks(null);
  assert.equal(stopped, 2);
});

test("the scale is pentatonic and bounded to two octaves", () => {
  assert.deepEqual(NOTES.map(({ name }) => name), ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5", "C6"]);
  assert.ok(Math.abs(NOTES[10].frequency / NOTES[0].frequency - 4) < 0.001);
});
