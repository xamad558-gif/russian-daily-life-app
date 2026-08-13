import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data', 'units', 'home.json');
const dryRun = process.argv.includes('--dry-run');
const voice = process.env.AZURE_SPEECH_VOICE || 'ru-RU-DmitryNeural';
const region = process.env.AZURE_SPEECH_REGION?.trim();
const key = process.env.AZURE_SPEECH_KEY?.trim();

const sampleIds = [
  'home50_001',
  'home50_020',
  'home50_023',
  'home50_014',
  'home75_069'
];

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function outputPath(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside the project: ${relativePath}`);
  }
  return absolutePath;
}

function buildSsml(text) {
  const locale = voice.split('-').slice(0, 2).join('-');
  return `<speak version="1.0" xml:lang="${locale}"><voice name="${escapeXml(voice)}"><prosody rate="-8%">${escapeXml(text)}</prosody></voice></speak>`;
}

async function synthesize(text) {
  const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'russian-daily-life-russian-audio-sample'
    },
    body: buildSsml(text)
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Azure Speech returned ${response.status}: ${details.slice(0, 300)}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

const words = JSON.parse(await fs.readFile(dataPath, 'utf8')).words;
const selected = sampleIds.map(id => words.find(word => word.id === id));
const missing = sampleIds.filter((id, index) => !selected[index]);
if (missing.length) throw new Error(`Missing sample ids: ${missing.join(', ')}`);

if (!dryRun && (!key || !region)) {
  throw new Error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION first, or run with --dry-run.');
}

console.log(`Azure Russian sample: ${selected.length} words, voice ${voice}`);
for (const word of selected) {
  const text = word.russian;
  const target = outputPath(word.audioWordRu);
  console.log(`${dryRun ? '[dry-run] ' : ''}${word.id}: ${text} -> ${path.relative(root, target)}`);
  if (dryRun) continue;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, await synthesize(text));
}

if (!dryRun) console.log('Generated the five Russian word files.');
