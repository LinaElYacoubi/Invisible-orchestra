// Clock-driven policy, independent of the camera and DOM for deterministic checks.
export class ShowcaseSession {
  constructor({ idleMs = 90000, warningMs = 15000, limitMs = 0 } = {}) {
    this.idleMs = idleMs; this.warningMs = warningMs; this.limitMs = limitMs; this.running = false;
  }
  start(now) { this.running = true; this.started = this.lastActivity = this.lastTick = now; }
  stop() { this.running = false; }
  activity(now) { this.lastActivity = now; }
  tick(now, { demonstrating = false } = {}) {
    if (!this.running) return { kind: 'none' };
    if (demonstrating) {
      this.started += now - this.lastTick; this.lastActivity = now;
      this.lastTick = now; return { kind: 'none' };
    }
    this.lastTick = now;
    const idleLeft = this.idleMs + this.warningMs - (now - this.lastActivity);
    const turnLeft = this.limitMs ? this.limitMs - (now - this.started) : Infinity;
    if (turnLeft <= 0 || idleLeft <= 0) return { kind: 'reset' };
    if (turnLeft <= this.warningMs) return { kind: 'turn', seconds: Math.ceil(turnLeft / 1000) };
    if (now - this.lastActivity >= this.idleMs) return { kind: 'idle', seconds: Math.ceil(idleLeft / 1000) };
    return { kind: 'none' };
  }
}
