export const OUTPUT_PRESETS = {
 landscape: { width:3840, height:2160 },
 portrait: { width:2160, height:3840 }
};
export function outputConfig(width, height, background) {
  const dimension = value => Math.min(7680, Math.max(320, Math.round(Number(value) || 2160)));
  return { width:dimension(width), height:dimension(height), background:/^#[0-9a-f]{6}$/i.test(background) ? background : '#000000' };
}
export function containedRect(width, height, targetWidth, targetHeight) {
  const scale = Math.min(width / targetWidth, height / targetHeight);
  return { width:targetWidth*scale, height:targetHeight*scale, x:(width-targetWidth*scale)/2, y:(height-targetHeight*scale)/2 };
}

