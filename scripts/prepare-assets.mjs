import { cp, mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageWasm = resolve(root, "node_modules/@mediapipe/tasks-vision/wasm");
const publicWasm = resolve(root, "public/wasm");
const modelPath = resolve(root, "public/assets/hand_landmarker.task");
const modelUrl = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

await mkdir(dirname(modelPath), { recursive: true });
await mkdir(publicWasm, { recursive: true });
try {
  await stat(resolve(packageWasm, "vision_wasm_internal.js"));
} catch {
  throw new Error("MediaPipe WASM files are missing. Run npm install first.");
}

await cp(packageWasm, publicWasm, { recursive: true, force: true });

try {
  const existingModel = await stat(modelPath);
  if (existingModel.size > 0) {
    console.log("Hand tracking model already present; keeping the existing download.");
    console.log("Copied MediaPipe WASM files into public/wasm.");
    process.exit(0);
  }
} catch {
  // Download the model on first setup.
}

console.log("Downloading the official MediaPipe Hand Landmarker model…");
const response = await fetch(modelUrl);
if (!response.ok || !response.body) {
  throw new Error(`Model download failed (${response.status}). Check your connection and rerun npm run assets:prepare.`);
}
const temporaryPath = `${modelPath}.download`;
try {
  await pipeline(Readable.fromWeb(response.body), createWriteStream(temporaryPath));
  const downloaded = await stat(temporaryPath);
  if (downloaded.size < 100_000) throw new Error("Downloaded model file is unexpectedly small.");
  const { rename } = await import("node:fs/promises");
  await rename(temporaryPath, modelPath);
} catch (error) {
  const { rm } = await import("node:fs/promises");
  await rm(temporaryPath, { force: true });
  throw error;
}

console.log("Local model and WASM assets are ready under public/.");
