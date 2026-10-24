import test from 'node:test';
import assert from 'node:assert/strict';
import { noteLabel, demoFrame, welcomeDemoFrame } from '../src/display-labels.js';
import { NOTES, noteIndexForX } from '../src/music.js';
test('beginner labels translate without changing scale or octave identity',()=>{
 const original=NOTES.map(note=>({...note}));
 assert.deepEqual(NOTES.map((_,i)=>noteLabel(i)),['C','D','E','G','A','C','D','E','G','A','C']);
 assert.deepEqual(NOTES.slice(0,5).map((_,i)=>noteLabel(i,'fr')),['Do','Ré','Mi','Sol','La']);
 assert.equal(noteLabel(0,'en',true),'C4');assert.equal(noteLabel(3,'fr',true),'Sol4');assert.equal(noteLabel(10,'fr',true),'Do6');
 assert.deepEqual(NOTES,original);
});
test('silent demo motion drives the matching note zone and vertical volume',()=>{
 const start=demoFrame(0),later=demoFrame(1000);assert.notEqual(start.x,later.x);assert.notEqual(start.y,later.y);
 for(let now=0;now<24000;now+=200){const frame=demoFrame(now);assert.equal(frame.noteIndex,noteIndexForX(frame.x));assert.ok(frame.x>=.15 && frame.x<=.85);assert.ok(frame.y>=.23-.00001 && frame.y<=.77+.00001);assert.equal(frame.volume,1-frame.y);}
 assert.ok(demoFrame(1500).volume<demoFrame(4500).volume);
 assert.deepEqual(demoFrame(0,true),demoFrame(7000,true));
});

test('two-hand welcome default demonstrates fixed independent roles, with one-hand alternative',()=>{
 const a=welcomeDemoFrame(0),b=welcomeDemoFrame(1000);
 assert.equal(a.y,b.y);assert.notEqual(a.x,b.x);assert.equal(a.left.x,b.left.x);assert.notEqual(a.left.y,b.left.y);assert.equal(b.volume,1-b.left.y);
 assert.equal(welcomeDemoFrame(0,false).left,null);
 assert.deepEqual(welcomeDemoFrame(0,true,true),welcomeDemoFrame(9000,true,true));
});
