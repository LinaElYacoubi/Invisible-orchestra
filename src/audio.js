import { clamp, noteForIndex } from './music.js';

export const INSTRUMENTS = {
  piano: { folder: 'piano', notes: ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6'], level: .85 },
  guitar: { folder: 'guitar-acoustic', notes: ['C4','D4','E4','G4','A4','C5','D5'], level: .9 },
  saxophone: { folder: 'saxophone', notes: ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5'], level: .65 }
};
const semitone = name => ({ C:0, D:2, E:4, G:7, A:9 }[name[0]] + 12 * (Number(name.slice(1)) + 1));
export function sampleForNote(instrument, index) {
  const target = semitone(noteForIndex(index).name);
  const note = INSTRUMENTS[instrument].notes.reduce((best, candidate) =>
    Math.abs(semitone(candidate) - target) < Math.abs(semitone(best) - target) ? candidate : best);
  return { note, rate: 2 ** ((target - semitone(note)) / 12) };
}

// Normalise sample energy with a peak ceiling; retain the original attack and decay.
export function prepareSample(buffer, sustain = false) {
  let peak = 0, energy = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    for (const value of buffer.getChannelData(channel)) { peak = Math.max(peak, Math.abs(value)); energy += value * value; }
  }
  const rms = Math.sqrt(energy / (buffer.length * buffer.numberOfChannels));
  const scale = Math.min(.8 / (peak || 1), .14 / (rms || 1));
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    for (let i = 0; i < data.length; i++) data[i] *= scale;
  }
  const start = Math.floor(buffer.sampleRate * .35);
  const end = Math.floor((buffer.duration - .15) * buffer.sampleRate);
  const fade = Math.floor(buffer.sampleRate * .04);
  if (sustain && end > start + fade * 3) {
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < fade; i++) {
        const mix = i / fade;
        data[end - fade + i] = data[end - fade + i] * (1 - mix) + data[start + i] * mix;
      }
    }
    return { buffer, loop: true, loopStart: (start + fade) / buffer.sampleRate, loopEnd: end / buffer.sampleRate };
  }
  return { buffer, loop: false };
}

export const ECHO_LIMITS = Object.freeze({feedback:.22,wet:.16,delay:.24});
export const BRIGHTNESS_RANGES = {piano:[450,10000],guitar:[350,9000],saxophone:[450,8000]};
export function brightnessCutoff(instrument,brightness) {
 if(brightness==null)return 20000;
 const [low,high]=BRIGHTNESS_RANGES[instrument];return low*(high/low)**clamp(brightness);
}
export class SoftSynth {
  constructor() {
    this.context = null; this.master = null; this.voice = null;
    this.muted = false; this.masterLevel = .35; this.performanceVolume = .5;
    this.tracking = false; this.instrument = 'piano'; this.noteIndex = 0;
    this.effects={brightness:null,echo:false};this.echoReadyAt=0;this.effectNodes=[];
    this.ready = false; this.buffers = new Map(); this.sources = new Set(); this.latched = null;
  }
  async start() {
    if (this.context && this.context.state !== 'closed') { await this.context.resume(); return; }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Web Audio is not supported in this browser.');
    const context = new AudioContext(); this.context = context;this.nextVoiceAt=0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18; compressor.knee.value = 18; compressor.ratio.value = 4;
    compressor.attack.value = .012; compressor.release.value = .24;
    this.master = context.createGain(); this.master.gain.value = this.masterLevel;
    this.master.connect(compressor); compressor.connect(context.destination);
    this.tone=context.createBiquadFilter();this.tone.type='lowpass';this.tone.Q.value=.5;
    this.send=context.createGain();this.delay=context.createDelay(.5);this.delay.delayTime.value=ECHO_LIMITS.delay;
    this.feedback=context.createGain();this.wet=context.createGain();
    this.tone.connect(this.master); // The dry signal remains audible at every echo setting.
    this.tone.connect(this.send).connect(this.delay);
    this.delay.connect(this.feedback).connect(this.delay);this.delay.connect(this.wet).connect(this.master);
    this.effectNodes=[this.tone,this.send,this.delay,this.feedback,this.wet];
    this.clearEcho();this.applyEffects();
    // Resume within the start-button gesture, before awaiting file downloads.
    await context.resume();
    try {
      await Promise.all(Object.entries(INSTRUMENTS).flatMap(([id, profile]) => profile.notes.map(async note => {
        const response = await fetch(`/samples/${profile.folder}/${note}.mp3`);
        if (!response.ok) throw new Error('Instrument samples could not load. Reload and try again.');
        const buffer = await context.decodeAudioData(await response.arrayBuffer());
        if (this.context === context) this.buffers.set(`${id}:${note}`, prepareSample(buffer, id === 'saxophone'));
      })));
      if (this.context === context) this.ready = true;
    } catch (error) {
      if (this.context === context) await this.dispose();
      throw error;
    }
  }
  setInstrument(instrument) {
    if (!INSTRUMENTS[instrument] || instrument === this.instrument) return;
    this.clearEcho();this.instrument = instrument;this.applyEffects(); this.latched = null; this.retireVoice(); this.syncVoice();
  }
  setMasterLevel(level) {
    this.masterLevel = clamp(level, 0, .7);
    this.master?.gain.setTargetAtTime(this.muted?0:this.masterLevel, this.context.currentTime, .035);
  }
  setMuted(muted) {
    this.muted=muted;if(muted)this.clearEcho();
    if(this.master)this.master.gain.setTargetAtTime(muted?0:this.masterLevel,this.context.currentTime,.008);
    this.updateGain();this.applyEffects();
  }
  setEffects({brightness=null,echo=false}={}) {
    this.effects={brightness:brightness==null?null:clamp(brightness),echo:!!echo};this.applyEffects();
  }
  clearEcho() {
    if(!this.context || !this.send)return;
    const now=this.context.currentTime;this.echoReadyAt=now+.3;
    for(const node of [this.send,this.feedback,this.wet]){node.gain.cancelScheduledValues(now);node.gain.setValueAtTime(0,now);}
  }
  applyEffects() {
    if(!this.context || !this.tone)return;
    const now=this.context.currentTime;
    this.tone.frequency.setTargetAtTime(brightnessCutoff(this.instrument,this.effects.brightness),now,.09);
    const enabled=this.effects.echo && this.tracking && !this.muted && now>=this.echoReadyAt;
    this.send.gain.setTargetAtTime(enabled?1:0,now,.04);
    this.feedback.gain.setTargetAtTime(enabled?ECHO_LIMITS.feedback:0,now,.04);
    this.wet.gain.setTargetAtTime(enabled?ECHO_LIMITS.wet:0,now,.04);
  }
  setPerformanceVolume(volume) { this.performanceVolume = clamp(volume); this.updateGain(); }
  setTracking(tracking, smooth = false) {
    this.voiceAttack=smooth?.05:.015;
    if (!tracking && this.tracking) { this.clearEcho(); this.latched = null; clearTimeout(this.noteTimer); this.retireVoice(smooth?.16:.04); }
    this.tracking = tracking; this.syncVoice();this.applyEffects();
  }
  playNote(index) {
    if (this.noteIndex !== index) { this.noteIndex = index; this.latched = null; }
    this.syncVoice();
  }
  syncVoice() {
    if (!this.ready || !this.tracking || !this.context || this.context.state !== 'running') return;
    const key = `${this.instrument}:${this.noteIndex}`;
    if (key === this.latched) return;
    clearTimeout(this.noteTimer); this.latched = key;
    this.retireVoice();
    // Release the previous note completely before starting the next one.
    this.noteTimer = setTimeout(() => {
      if (!this.tracking || this.latched !== key || !this.context) return;
      const { note, rate } = sampleForNote(this.instrument, this.noteIndex);
      const sample = this.buffers.get(`${this.instrument}:${note}`);
      if (!sample) { this.latched = null; return; }
      const source = this.context.createBufferSource();
      source.buffer = sample.buffer; source.playbackRate.value = rate;
      source.loop = sample.loop;
      if (sample.loop) { source.loopStart = sample.loopStart; source.loopEnd = sample.loopEnd; }
      const voiceGain = this.context.createGain(); voiceGain.gain.value = 0;
      source.connect(voiceGain).connect(this.tone);
      this.voice = { source, voiceGain }; this.sources.add(this.voice);
      const voice = this.voice;
      source.onended = () => {
        source.disconnect(); voiceGain.disconnect(); this.sources.delete(voice);
        if (this.voice === voice) this.voice = null;
      };
      source.start(); this.updateGain();
    }, Math.max(45,Math.ceil(((this.nextVoiceAt||0)-this.context.currentTime)*1000)));
  }
  updateGain() {
    if (!this.voice || !this.context) return;
    const target = this.tracking && !this.muted ? this.performanceVolume * INSTRUMENTS[this.instrument].level : 0;
    this.voice.voiceGain.gain.setTargetAtTime(target, this.context.currentTime, target ? (this.voiceAttack??.015) : .012);
  }
  retireVoice(release = .04) {
    if (!this.voice || !this.context) return;
    const voice = this.voice; this.voice = null;
    voice.voiceGain.gain.cancelScheduledValues(this.context.currentTime);
    voice.voiceGain.gain.setTargetAtTime(0, this.context.currentTime, release/8);
    this.nextVoiceAt=this.context.currentTime+release;
    voice.source.stop(this.nextVoiceAt);
  }
  stopSound() {
    this.setEffects();this.clearEcho();
    clearTimeout(this.noteTimer); this.tracking = false; this.latched = null; this.retireVoice();
  }
  async dispose() {
    this.stopSound(); const context = this.context;
    this.ready = false; this.context = null; this.master = null; this.buffers.clear();
    for (const voice of this.sources) { voice.source.onended = null; voice.source.disconnect(); voice.voiceGain.disconnect(); }
    this.sources.clear();
    for(const node of this.effectNodes)node.disconnect();this.effectNodes=[];
    this.tone=this.send=this.delay=this.feedback=this.wet=null;
    if (context && context.state !== 'closed') await context.close();
  }
}
