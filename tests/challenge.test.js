import test from 'node:test';
import assert from 'node:assert/strict';
import { MelodyChallenge, generateMelody } from '../src/challenge.js';
import { NOTES, mapHandToControl, stableNoteIndex } from '../src/music.js';
import { SoftSynth, sampleForNote, prepareSample } from '../src/audio.js';

test('each guide centre maps to the same camera and pointer note', () => {
  NOTES.forEach((_, i) => {
    const x = (i + .5) / NOTES.length;
    assert.equal(stableNoteIndex(x, null), i);
    assert.equal(mapHandToControl({ x: 1-x, y: .5 }).noteIndex, i);
  });
});
test('melodies stay in the scale, avoid repeats and cap length', () => {
  for (let k=0;k<100;k++) {
    const melody=generateMelody(20);
    assert.equal(melody.length,6);
    melody.forEach((n,i)=> { assert.ok(n>=0 && n<11); if(i) assert.notEqual(n,melody[i-1]); });
  }
});
test('playback ignores input and has silent gaps before the answer phase', () => {
  const c=new MelodyChallenge(); c.play([1,3,5],0);
  c.tick(200); assert.equal(c.highlight,1);
  assert.equal(c.input(1,500),null); assert.equal(c.progress,0);
  c.tick(650); assert.equal(c.highlight,null);
  c.tick(2550); assert.equal(c.phase,'answer'); assert.equal(c.highlight,null);
  c.input(1,2550); assert.equal(c.input(1,2799),null);
  assert.equal(c.input(1,2800),'correct');
});
test('wrong answers allow retry, steady holds latch, leaving permits re-entry', () => {
  const c=new MelodyChallenge(250); c.play([1,3,5],0); c.tick(2550);
  c.input(2,2600); assert.equal(c.input(2,2850),'wrong');
  assert.equal(c.progress,0); assert.equal(c.input(2,4000),null);
  c.input(null,4100); c.input(1,4200); assert.equal(c.input(1,4450),'correct');
  assert.equal(c.input(1,5000),null);
  c.input(3,5100); c.input(3,5350); c.input(5,5400);
  assert.equal(c.input(5,5650),'success'); assert.equal(c.progress,3);
  c.play(c.sequence,6000); assert.equal(c.progress,0); assert.equal(c.phase,'playback');
  c.reset(); c.tick(99999); assert.equal(c.phase,'idle'); assert.equal(c.highlight,null);
});
test('changing candidate restarts dwell and custom duration is respected', () => {
 const c=new MelodyChallenge(400); c.play([1,2,3],0); c.tick(3000);
 c.input(1,3100); c.input(2,3300); c.input(1,3400);
 assert.equal(c.input(1,3799),null); assert.equal(c.input(1,3800),'correct');
});


function fakeBuffer() {
 const data = new Float32Array(2000).fill(.25);
 return { numberOfChannels:1, length:data.length, sampleRate:1000, duration:2, getChannelData:()=>data };
}
function fakeAudio() {
 const sources=[];
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},cancelScheduledValues(){}});
 class Context {
  constructor(){this.currentTime=0;this.state='running';this.destination={};}
  node(){ return {gain:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),connect(){return this;},disconnect(){this.disconnected=true;}}; }
  createGain(){return this.node();} createDynamicsCompressor(){return this.node();}
  createBufferSource(){const n=this.node();n.playbackRate=param();n.start=()=>{n.started=true;};n.stop=()=>{n.stopped=true;setTimeout(()=>n.onended?.(),40);};sources.push(n);return n;}
  async decodeAudioData(){return fakeBuffer();}
  async resume(){} async close(){this.state='closed';}
 }
 return {Context,sources};
}
const wait=()=>new Promise(resolve=>setTimeout(resolve,65));
test('sample selection covers every scale note and pitch-shifts only when needed', () => {
 assert.deepEqual(sampleForNote('piano',10),{note:'C6',rate:1});
 assert.equal(sampleForNote('guitar',10).note,'D5');
 assert.ok(sampleForNote('saxophone',10).rate>1);
 for(const instrument of ['piano','guitar','saxophone']) for(let i=0;i<11;i++) assert.ok(sampleForNote(instrument,i).rate>0);
});
test('sample normalisation is bounded and sax sustain has a crossfaded loop',()=>{
 const sample=prepareSample(fakeBuffer(),true);
 assert.ok(sample.loop); assert.ok(sample.loopEnd>sample.loopStart);
 assert.ok(sample.buffer.getChannelData(0).every(value=>Math.abs(value)<=.8));
 assert.equal(prepareSample(fakeBuffer()).loop,false);
});
test('sample voices strike once per entry, switch cleanly, sustain sax and cancel on stop', async () => {
 const {Context,sources}=fakeAudio(); const previousWindow=globalThis.window; const previousFetch=globalThis.fetch;
 globalThis.window={AudioContext:Context}; globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 const s=new SoftSynth();
 try {
  await s.start(); assert.equal(s.buffers.size,28);
  s.playNote(0);s.setTracking(true);await wait();
  assert.equal(sources.length,1); assert.equal(sources[0].loop,false);
  for(let i=0;i<10;i++){s.playNote(0);s.setTracking(true);}
  await wait(); assert.equal(sources.length,1);
  s.playNote(1);await wait(); assert.equal(sources.length,2);assert.ok(sources[0].stopped);assert.ok(sources[0].disconnected);
  s.setInstrument('saxophone');await wait();assert.equal(sources.length,3); assert.ok(sources[2].loop);assert.ok(sources[1].stopped);
  s.setMuted(true);assert.equal(s.voice.voiceGain.gain.value,0);
  s.setMasterLevel(.6);assert.equal(s.master.gain.value,.6);
  s.setTracking(false);await wait();assert.equal(s.sources.size,0);
  s.setTracking(true);await wait();assert.equal(sources.length,4);
  s.setInstrument('guitar');s.stopSound();await wait();assert.equal(sources.length,4);
  s.setTracking(true);const ctx=s.context;await s.dispose();await wait();
  assert.equal(ctx.state,'closed');assert.equal(s.context,null);assert.equal(s.voice,null);assert.equal(s.sources.size,0);assert.equal(s.buffers.size,0);assert.equal(sources.length,4);
 } finally {await s.dispose();globalThis.window=previousWindow;globalThis.fetch=previousFetch;}
});
