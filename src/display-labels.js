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
