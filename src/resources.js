export function stopMediaTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
