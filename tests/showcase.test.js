import test from 'node:test';
import assert from 'node:assert/strict';
import { ShowcaseSession } from '../src/showcase.js';
test('inactivity warns, resumes on input, then resets only after its grace period',()=>{
 const s=new ShowcaseSession({idleMs:1000,warningMs:500});s.start(0);
 assert.equal(s.tick(999).kind,'none');assert.deepEqual(s.tick(1000),{kind:'idle',seconds:1});
 s.activity(1100);assert.equal(s.tick(1100).kind,'none');assert.equal(s.tick(2599).kind,'idle');assert.equal(s.tick(2600).kind,'reset');
 s.stop();assert.equal(s.tick(99999).kind,'none');
});
test('continuous hand activity and challenge demonstrations cannot trigger inactivity reset',()=>{
 const s=new ShowcaseSession({idleMs:1000,warningMs:500});s.start(0);
 for(let now=0;now<5000;now+=100){s.activity(now);assert.equal(s.tick(now).kind,'none');}
 assert.equal(s.tick(10000,{demonstrating:true}).kind,'none');assert.equal(s.tick(10500).kind,'none');
});
test('short turns are optional, warn before ending, and pause during demonstrations',()=>{
 const s=new ShowcaseSession({idleMs:100000,warningMs:500});s.start(0);assert.equal(s.tick(5000).kind,'none');
 s.limitMs=2000;s.start(0);assert.equal(s.tick(1000).kind,'none');assert.equal(s.tick(2000,{demonstrating:true}).kind,'none');
 assert.equal(s.tick(2500).kind,'turn');assert.equal(s.tick(3000).kind,'reset');
});
