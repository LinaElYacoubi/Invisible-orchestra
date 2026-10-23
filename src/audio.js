import { clamp, noteForIndex } from "./music.js";

export class SoftSynth {
  constructor() {
    this.context = null;
    this.master = null;
    this.voice = null;
    this.muted = false;
    this.masterLevel = 0.35;
    this.performanceVolume = 0.5;
    this.tracking = false;
  }

  async start() {
    if (this.context && this.context.state !== "closed") {
      await this.context.resume();
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("Web Audio is not supported in this browser.");

    const context = new AudioContext();
    this.context = context;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.24;

    this.master = context.createGain();
    this.master.gain.value = this.masterLevel;
    this.master.connect(compressor);
    compressor.connect(context.destination);

    const voiceGain = context.createGain();
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3600;
    filter.Q.value = 0.55;

    const fundamental = context.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = 261.63;
    const overtone = context.createOscillator();
    overtone.type = "triangle";
    overtone.frequency.value = 261.63;

    const fundamentalGain = context.createGain();
    fundamentalGain.gain.value = 0.79;
    const overtoneGain = context.createGain();
    overtoneGain.gain.value = 0.095;
    fundamental.connect(fundamentalGain).connect(filter);
    overtone.connect(overtoneGain).connect(filter);
    filter.connect(voiceGain).connect(this.master);
    voiceGain.gain.value = 0;
    fundamental.start();
    overtone.start();
    this.voice = { fundamental, overtone, voiceGain };
    await context.resume();
  }

  setMasterLevel(level) {
    this.masterLevel = clamp(level, 0, 0.7);
    if (this.master && this.context?.state !== "closed") {
      this.master.gain.setTargetAtTime(this.masterLevel, this.context.currentTime, 0.035);
    }
  }

  setMuted(muted) {
    this.muted = muted;
    this.updateGain();
  }

  setTracking(tracking) {
    this.tracking = tracking;
    this.updateGain();
  }

  setPerformanceVolume(volume) {
    this.performanceVolume = clamp(volume);
    this.updateGain();
  }

  updateGain() {
    if (!this.voice || !this.context || this.context.state === "closed") return;
    const target = this.tracking && !this.muted ? 0.2 * this.performanceVolume : 0;
    this.voice.voiceGain.gain.setTargetAtTime(target, this.context.currentTime, target ? 0.12 : 0.045);
  }

  playNote(index) {
    if (!this.voice || !this.context || this.context.state === "closed") return;
    const frequency = noteForIndex(index).frequency;
    const now = this.context.currentTime;
    this.voice.fundamental.frequency.setTargetAtTime(frequency, now, 0.045);
    this.voice.overtone.frequency.setTargetAtTime(frequency * 2, now, 0.045);
  }

  stopSound() {
    this.tracking = false;
    if (this.voice && this.context && this.context.state !== "closed") {
      this.voice.voiceGain.gain.cancelScheduledValues(this.context.currentTime);
      this.voice.voiceGain.gain.setTargetAtTime(0, this.context.currentTime, 0.025);
    }
  }

  async dispose() {
    this.stopSound();
    const context = this.context;
    this.context = null;
    this.master = null;
    this.voice = null;
    if (context && context.state !== "closed") await context.close();
  }
}
