import test from 'node:test';
import assert from 'node:assert/strict';
import { HandRoles, physicalHand, mapTwoHandsToControl } from '../src/hands.js';
function hand(side,x,y=.5,score=.98){const points=Array.from({length:21},()=>({x,y}));points[5]={x:x-.05,y};points[17]={x:x+.05,y};points[9]={x,y:y-.1};return{side,score,points};}
const result=(...hands)=>({landmarks:hands.map(h=>h.points),handedness:hands.map(h=>[{categoryName:h.side,score:h.score}])});
function settle(tracker,hands,start=0){let value;for(let t=start;t<=start+240;t+=80)value=tracker.update(result(...hands),t);return value;}
test('physical handedness stays independent of mirrored preview and detection order',()=>{
 assert.equal(physicalHand({categoryName:'Right'}),'Right');assert.equal(physicalHand({categoryName:'Left'}),'Left');assert.equal(physicalHand({categoryName:'Right'},true),'Left');
 const roles=new HandRoles();let value=settle(roles,[hand('Right',.2),hand('Left',.8)]);assert.equal(value.melody.side,'Right');assert.equal(value.volume.side,'Left');
 value=roles.update(result(hand('Left',.79),hand('Right',.21)),320);assert.equal(value.melody.side,'Right');assert.equal(value.volume.side,'Left');
});
test('either missing hand withholds control from entry and through disappearance/recovery',()=>{
 const roles=new HandRoles();let value=settle(roles,[hand('Left',.8)]);assert.equal(value.melody,null);assert.equal(value.ready,false);assert.equal(mapTwoHandsToControl(value),null);
 value=settle(roles,[hand('Right',.2),hand('Left',.8)],320);assert.ok(value.ready);
 value=roles.update(result(hand('Left',.8)),640);assert.equal(value.melody,null);assert.equal(mapTwoHandsToControl(value),null);
 value=roles.update(result(hand('Right',.2)),720);assert.equal(value.volume,null);assert.equal(mapTwoHandsToControl(value),null);
 value=roles.update(result(),800);assert.equal(value.ready,false);
 value=roles.update(result(hand('Left',.8),hand('Right',.2)),880);assert.ok(value.ready);assert.equal(value.melody.side,'Right');
});
test('crossings, duplicate identities and low confidence withhold controls without swapping',()=>{
 const roles=new HandRoles();settle(roles,[hand('Right',.35),hand('Left',.65)]);
 let value=roles.update(result(hand('Right',.49),hand('Left',.51)),320);assert.ok(value.ambiguous);assert.equal(mapTwoHandsToControl(value),null);
 value=roles.update(result(hand('Right',.42),hand('Right',.65)),400);assert.ok(value.ambiguous);
 value=roles.update(result(hand('Right',.4,.5,.6),hand('Left',.6)),480);assert.equal(value.melody,null);
 value=settle(roles,[hand('Right',.65),hand('Left',.35)],600);assert.equal(value.melody.side,'Right');assert.equal(value.volume.side,'Left');
});
test('right height and left horizontal movement cannot change volume or pitch',()=>{
 const roles=(rx,ry,lx,ly)=>({melody:{point:{x:rx,y:ry}},volume:{point:{x:lx,y:ly}}});
 const base=mapTwoHandsToControl(roles(.2,.2,.8,.4));
 const rightUp=mapTwoHandsToControl(roles(.2,.9,.8,.4));assert.equal(rightUp.noteIndex,base.noteIndex);assert.equal(rightUp.volume,base.volume);
 const leftAcross=mapTwoHandsToControl(roles(.2,.2,.4,.4));assert.equal(leftAcross.noteIndex,base.noteIndex);assert.equal(leftAcross.volume,base.volume);
 const leftUp=mapTwoHandsToControl(roles(.2,.2,.8,.1));assert.equal(leftUp.noteIndex,base.noteIndex);assert.ok(leftUp.volume>base.volume);
 const rightAcross=mapTwoHandsToControl(roles(.8,.2,.8,.4));assert.notEqual(rightAcross.noteIndex,base.noteIndex);assert.equal(rightAcross.volume,base.volume);
});
