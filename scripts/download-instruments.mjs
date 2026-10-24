import { mkdir, writeFile } from 'node:fs/promises';
const revision = '622c2f1c32c8cfce4158ddc3eb26e518ddef37e5';
const base = `https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/${revision}`;
const files = {
 piano: ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5','C6'],
 'guitar-acoustic': ['C4','D4','E4','G4','A4','C5','D5'],
 saxophone: ['C4','D4','E4','G4','A4','C5','D5','E5','G5','A5']
};
for (const [instrument, notes] of Object.entries(files)) {
 await mkdir(`public/samples/${instrument}`, { recursive:true });
 await Promise.all(notes.map(async note => {
  const response = await fetch(`${base}/samples/${instrument}/${note}.mp3`);
  if (!response.ok) throw new Error(`${instrument}/${note}: ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  if (data.length < 1000) throw new Error('Invalid sample');
  await writeFile(`public/samples/${instrument}/${note}.mp3`, data);
 }));
 console.log(`Downloaded ${instrument}: ${notes.length} samples`);
}
for (const name of ['sample-source-info.txt', 'README.md', 'LICENSE.md']) {
 const response = await fetch(`${base}/${name}`);
 if (!response.ok) throw new Error(name);
 await writeFile(`public/samples/upstream-${name}`, await response.text());
}
