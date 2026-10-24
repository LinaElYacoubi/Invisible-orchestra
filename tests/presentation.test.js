import test from 'node:test';
import assert from 'node:assert/strict';
import { OUTPUT_PRESETS, outputConfig, containedRect } from '../src/presentation.js';
test('UHD presets specify exact canvas pixels, independently of a hardware 4K label',()=>{
 assert.deepEqual(OUTPUT_PRESETS.landscape,{width:3840,height:2160});
 assert.deepEqual(OUTPUT_PRESETS.portrait,{width:2160,height:3840});
 assert.deepEqual(outputConfig(1000,2000,'#123456'),{width:1000,height:2000,background:'#123456'});
});
test('presentation content fits portrait and landscape viewports without stretch or clipping',()=>{
 for(const target of Object.values(OUTPUT_PRESETS)) for(const [w,h] of [[1366,768],[1920,1080],[1080,1920],[3840,2160],[700,950]]){
  const rect=containedRect(w,h,target.width,target.height);
  assert.ok(rect.width<=w+.001 && rect.height<=h+.001);
  assert.ok(rect.x>=0 && rect.y>=0);
  assert.ok(Math.abs(rect.width/rect.height-target.width/target.height)<1e-10);
 }
});
test('custom dimensions and backgrounds reject unsafe or unbounded values',()=>{
 assert.deepEqual(outputConfig(99999,-10,'red'),{width:7680,height:320,background:'#000000'});
 assert.equal(outputConfig('invalid',null,'#ffffff').width,2160);
});
