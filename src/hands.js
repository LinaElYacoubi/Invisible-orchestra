import { palmCenter, mapHandToControl } from './music.js';

// Current MediaPipe Tasks: unmirrored input labels the subject's physical hands.
// CSS preview mirroring does not alter inference input. Do not apply legacy Hands' swap.
export function physicalHand(category, inputMirrored = false) {
 const label=category?.categoryName;
 if(label!=='Left' && label!=='Right')return null;
 return inputMirrored?(label==='Left'?'Right':'Left'):label;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export class HandRoles {
 constructor({confidence=.75,settleMs=180,retainMs=1200}={}){
  Object.assign(this,{confidence,settleMs,retainMs});this.reset();
 }
 reset(){this.tracks=new Map();}
 update(result,now){
  let observations=(result.landmarks||[]).map((landmarks,i)=>({
   side:physicalHand((result.handedness||result.handednesses)?.[i]?.[0]),
   score:(result.handedness||result.handednesses)?.[i]?.[0]?.score||0,
   landmarks,point:landmarks.length>=21?palmCenter(landmarks):null
  })).filter(o=>o.point && o.side && o.score>=this.confidence);
  const duplicate=observations.length>1 && observations[0].side===observations[1].side;
  const crossing=observations.length>1 && distance(observations[0].point,observations[1].point)<.09;
  if(duplicate || crossing) observations=[]; // Ambiguous: withhold, never choose by array order.
  const previousTracks=new Map([...this.tracks].map(([side,track])=>[side,{point:{...track.point},seen:track.seen}]));
  const visible=new Map();
  for(const o of observations){
   let track=this.tracks.get(o.side);
   if(!track || now-track.seen>this.retainMs){track={point:o.point,seen:now,since:now,stable:false};this.tracks.set(o.side,track);}
   const elapsed=now-track.seen;
   const other=previousTracks.get(o.side==='Left'?'Right':'Left');
   if(other && elapsed<400 && now-other.seen<400 && distance(track.point,o.point)>.12 && distance(other.point,o.point)+.04<distance(track.point,o.point))continue;
   if(elapsed<400 && distance(track.point,o.point)>.3){continue;}
   // A fresh candidate must remain consistent; a brief gap retains an established identity.
   if(!track.stable && elapsed>250)track.since=now;
   const alpha=1-Math.exp(-Math.max(1,elapsed)/75);
   track.point={x:track.point.x+(o.point.x-track.point.x)*alpha,y:track.point.y+(o.point.y-track.point.y)*alpha};
   track.seen=now;track.landmarks=o.landmarks;
   if(now-track.since>=this.settleMs)track.stable=true;
   if(track.stable)visible.set(o.side,{side:o.side,point:track.point,landmarks:o.landmarks});
  }
  const melody=visible.get('Right')||null;
  const volume=visible.get('Left')||null;
  return {melody,volume,ready:!!melody && !!volume,ambiguous:duplicate||crossing};
 }
}

// Axes stay independent: right x selects pitch; left y sets level.
// The marker's visual y follows the right hand, without changing its volume.
export function mapTwoHandsToControl(hands,previousIndex=null){
 if(!hands?.melody || !hands?.volume)return null;
 const control=mapHandToControl({x:hands.melody.point.x,y:hands.volume.point.y},previousIndex);
 return {...control,y:hands.melody.point.y};
}
