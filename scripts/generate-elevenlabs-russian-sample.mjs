import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'data', 'units', 'home.json');
const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim();
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';
const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || 'mp3_44100_128';
const dryRun = process.argv.includes('--dry-run');
const listVoices = process.argv.includes('--list-voices');

const sampleIds = [
  'home50_001',
  'home50_020',
  'home50_023',
  'home50_014',
  'home75_069'
];

function outputPath(relativePath) {
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Refusing to write outside the project: ${relativePath}`);
  }
  return absolutePath;
}

function requireApiKey() {
  if (!apiKey) throw new Error('Set ELEVENLABS_API_KEY in the current terminal first.');
}

async function listAvailableVoices() {
  requireApiKey();
  const response = await fetch('https://api.elevenlabs.io/v2/voices?page_size=100', {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'russian-daily-life-audio/1.0',
      'xi-api-key': apiKey
    }
  });
  if (!response.ok) throw new Error(await apiError('ElevenLabs voices', response));
  const payload = await response.json();
  for (const voice of payload.voices || []) {
    const labels = Object.entries(voice.labels || {}).map(([key, value]) => `${key}=${value}`).join(', ');
    console.log(`${voice.voice_id}\t${voice.name}${labels ? `\t${labels}` : ''}`);
  }
}

async function synthesize(text) {
  const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${encodeURIComponent(outputFormat)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'User-Agent': 'russian-daily-life-audio/1.0'
    },
    body: JSON.stringify({ text, model_id: modelId })
  });
  if (!response.ok) throw new Error(await apiError('ElevenLabs speech', response));
  return Buffer.from(await response.arrayBuffer());
}

async function apiError(operation, response) {
  const details = (await response.text()).slice(0, 300);
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 403 && contentType.includes('text/html')) {
    return `${operation} returned 403 HTML from Cloudflare before the API response. Check the API key, network/VPN, and run --list-voices to isolate the issue.`;
  }
  return `${operation} returned ${response.status}: ${details}`;
}

if (listVoices) {
  await listAvailableVoices();
  process.exit(0);
}

if (!dryRun) {
  requireApiKey();
  if (!voiceId) throw new Error('Set ELEVENLABS_VOICE_ID first, or run with --dry-run.');
}

const words = JSON.parse(await fs.readFile(dataPath, 'utf8')).words;
const selectedWords = sampleIds.map(id => words.find(word => word.id === id));
const missingIds = sampleIds.filter((id, index) => !selectedWords[index]);
if (missingIds.length) throw new Error(`Missing sample ids: ${missingIds.join(', ')}`);

console.log(`ElevenLabs Russian sample: ${selectedWords.length} words, model ${modelId}`);
for (const word of selectedWords) {
  const text = String(word.russian || '').trim();
  const target = outputPath(word.audioWordRu);
  console.log(`${dryRun ? '[dry-run] ' : ''}${word.id}: ${text} -> ${path.relative(root, target)}`);
  if (dryRun) continue;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, await synthesize(text));
}

if (!dryRun) console.log('Generated the five Russian word files with ElevenLabs.');
