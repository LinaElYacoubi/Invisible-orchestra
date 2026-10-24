import { noteForIndex, noteIndexForX } from './music.js';
const FRENCH = {C:'Do',D:'Ré',E:'Mi',G:'Sol',A:'La'};
// Display only: audio and note matching continue to use the original scale indices.
export function noteLabel(index, language='en', octaves=false) {
 const name=noteForIndex(index).name;
 return (language==='fr'?FRENCH[name[0]]:name[0])+(octaves?name.slice(1):'');
}
export function demoFrame(now, reducedMotion=false) {
 const x=reducedMotion?.5:.5+.35*Math.sin(now/8000*Math.PI*2);
 const y=reducedMotion?.5:.5+.27*Math.sin(now/6000*Math.PI*2);
 return {x,y,noteIndex:noteIndexForX(x),volume:1-y};
}

export function welcomeDemoFrame(now, twoHands=true, reducedMotion=false){
 const base=demoFrame(now,reducedMotion);
 if(!twoHands)return {...base,left:null};
 const x=.62+(base.x-.5)*.65;
 const left={x:.17,y:.5+(base.y-.5)*.74};
 return {x,y:.56,left,noteIndex:noteIndexForX(x),volume:1-left.y};
}
