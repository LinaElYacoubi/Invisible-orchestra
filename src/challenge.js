export function generateMelody(length = 3, random = Math.random) {
  const notes = [];
  while (notes.length < Math.min(6, Math.max(3, length))) {
    const previous = notes.at(-1);
    let next = Math.floor(random() * (previous == null ? 11 : 10));
    if (previous != null && next >= previous) next++;
    notes.push(next);
  }
  return notes;
}

export class MelodyChallenge {
  constructor(holdMs = 250) { this.holdMs = holdMs; this.reset(); }
  reset() { this.phase = 'idle'; this.sequence = []; this.progress = 0; this.highlight = null; this.leave(); }
  leave() { this.candidate = null; this.since = null; this.latched = null; }
  play(sequence, now) {
    this.sequence = [...sequence]; this.progress = 0; this.phase = 'playback';
    this.started = now; this.highlight = null; this.leave();
  }
  tick(now) {
    if (this.phase !== 'playback') return;
    const elapsed = now - this.started;
    const slot = Math.floor(elapsed / 850);
    if (slot >= this.sequence.length) { this.phase = 'answer'; this.highlight = null; this.leave(); return; }
    this.highlight = elapsed % 850 < 600 ? this.sequence[slot] : null;
  }
  input(index, now) {
    if (this.phase !== 'answer') return null;
    if (index == null) { this.leave(); return null; }
    if (index !== this.candidate) { this.candidate = index; this.since = now; this.latched = null; }
    if (this.latched === index || now - this.since < this.holdMs) return null;
    this.latched = index;
    if (index !== this.sequence[this.progress]) return 'wrong';
    this.progress++;
    if (this.progress === this.sequence.length) this.phase = 'success';
    return this.phase === 'success' ? 'success' : 'correct';
  }
}
