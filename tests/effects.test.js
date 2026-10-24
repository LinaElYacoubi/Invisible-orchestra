import test from 'node:test';
import assert from 'node:assert/strict';
import { SoftSynth, brightnessCutoff, BRIGHTNESS_RANGES, ECHO_LIMITS } from '../src/audio.js';
test('brightness uses instrument-specific logarithmic ranges and neutral bypass',()=>{
 for(const instrument of ['piano','guitar','saxophone']){
  const [low,high]=BRIGHTNESS_RANGES[instrument];assert.equal(brightnessCutoff(instrument,0),low);assert.equal(brightnessCutoff(instrument,1),high);
  assert.ok(Math.abs(brightnessCutoff(instrument,.5)-Math.sqrt(low*high))<1e-8);assert.equal(brightnessCutoff(instrument,null),20000);
 }
 assert.ok(ECHO_LIMITS.feedback<=.25 && ECHO_LIMITS.wet<=.2 && ECHO_LIMITS.delay<.5);
});
test('effects reuse nodes, mute clears feedback, unmute drains old tails, stop and dispose clean up',async()=>{
 const param=()=>({value:0,setTargetAtTime(v){this.value=v;},setValueAtTime(v){this.value=v;},cancelScheduledValues(){}});
 const nodes=[];
 class Context{
  constructor(){this.currentTime=0;this.state='running';this.destination={};}
  node(){const n={gain:param(),frequency:param(),Q:param(),delayTime:param(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param(),playbackRate:param(),connect(){return this;},disconnect(){this.disconnected=true;},start(){},stop(){this.onended?.();}};nodes.push(n);return n;}
  createGain(){return this.node();}createBiquadFilter(){return this.node();}createDelay(){return this.node();}createDynamicsCompressor(){return this.node();}createBufferSource(){return this.node();}
  async resume(){}async close(){this.state='closed';}async decodeAudioData(){const data=new Float32Array(1000).fill(.2);return{numberOfChannels:1,length:1000,sampleRate:1000,duration:1,getChannelData:()=>data};}
 }
 const previousWindow=globalThis.window,previousFetch=globalThis.fetch;
 globalThis.window={AudioContext:Context};globalThis.fetch=async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});
 const synth=new SoftSynth();
 try{
  await synth.start();synth.context.currentTime=1;synth.setTracking(true);synth.setEffects({brightness:.5,echo:true});await new Promise(r=>setTimeout(r,65));
  const count=nodes.length,chain=[...synth.effectNodes];
  for(let i=0;i<100;i++)synth.setEffects({brightness:i/100,echo:true});
  assert.equal(nodes.length,count);assert.deepEqual(synth.effectNodes,chain);assert.equal(synth.feedback.gain.value,.22);assert.equal(synth.wet.gain.value,.16);assert.ok(synth.voice);
  synth.setMuted(true);assert.equal(synth.master.gain.value,0);assert.equal(synth.feedback.gain.value,0);assert.equal(synth.wet.gain.value,0);
  synth.setMasterLevel(.7);assert.equal(synth.master.gain.value,0);
  synth.context.currentTime=1.1;synth.setMuted(false);assert.equal(synth.wet.gain.value,0);
  synth.context.currentTime=1.4;synth.setEffects({echo:true});assert.equal(synth.feedback.gain.value,.22);
  synth.stopSound();assert.deepEqual(synth.effects,{brightness:null,echo:false});assert.equal(synth.wet.gain.value,0);assert.equal(synth.feedback.gain.value,0);
  const context=synth.context;await synth.dispose();assert.equal(context.state,'closed');assert.equal(synth.sources.size,0);assert.equal(synth.effectNodes.length,0);assert.ok(chain.every(node=>node.disconnected));assert.equal(synth.delay,null);
 }finally{await synth.dispose();globalThis.window=previousWindow;globalThis.fetch=previousFetch;}
});
