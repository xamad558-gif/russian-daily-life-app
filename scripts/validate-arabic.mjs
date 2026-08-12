#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, value = true] = arg.replace(/^--/, '').split('=');
  return [key, value];
}));

const edition = args.get('edition') || 'base';
const strict = args.has('strict');
const fileRel = args.get('file') || 'data/units/home.json';
const dataPath = path.join(root, fileRel);
const arabicPattern = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
const latinPattern = /[A-Za-z]/u;
const cyrillicPattern = /[\u0400-\u04ff]/u;
const tashkeelPattern = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/u;
const arabicTokenPattern = /(?:[\u0621-\u064a\u0671-\u06d3][\u064b-\u065f\u0670]*)+/gu;
const validEditions = new Set(['base', 'ru-ar']);
const sampleLimit = 8;

if (!validEditions.has(edition)) {
  console.error(`Invalid --edition: ${edition}. Use base or ru-ar.`);
  process.exit(2);
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

let unitFile;
try {
  unitFile = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (error) {
  console.error(`FAIL: Cannot read or parse ${dataPath}`);
  console.error(error.message);
  process.exit(1);
}

const words = unitFile?.words;
if (!Array.isArray(words)) {
  console.error(`FAIL: ${fileRel} must be a unit file with a "words" array.`);
  process.exit(1);
}

const findings = new Map();
let errorCount = 0;
let warningCount = 0;

function addFinding(level, code, message) {
  if (level === 'error') errorCount += 1;
  else warningCount += 1;

  const existing = findings.get(code) || { level, count: 0, samples: [] };
  existing.count += 1;
  if (existing.samples.length < sampleLimit) existing.samples.push(message);
  findings.set(code, existing);
}

function requiredLevel() {
  return strict || edition === 'ru-ar' ? 'error' : 'warning';
}

function checkArabicText(value, id, fieldPath) {
  if (isEmpty(value)) {
    addFinding('error', 'missing-arabic', `${id}: ${fieldPath} is empty.`);
    return false;
  }

  if (typeof value !== 'string') {
    addFinding('error', 'invalid-arabic-value', `${id}: ${fieldPath} must be a string.`);
    return false;
  }

  if (!arabicPattern.test(value)) {
    addFinding('error', 'arabic-characters-missing', `${id}: ${fieldPath} has no Arabic characters.`);
  }

  if (latinPattern.test(value)) {
    addFinding('error', 'latin-leak-in-arabic', `${id}: ${fieldPath} contains Latin letters.`);
  }

  return true;
}

function checkVocalized(value, id, fieldPath) {
  const level = requiredLevel();
  if (isEmpty(value)) {
    addFinding(level, 'missing-vocalization', `${id}: ${fieldPath} is missing.`);
    return;
  }

  if (typeof value !== 'string' || !arabicPattern.test(value)) {
    addFinding('error', 'invalid-vocalization', `${id}: ${fieldPath} must contain Arabic text.`);
    return;
  }

  if (latinPattern.test(value)) {
    addFinding('error', 'latin-leak-in-vocalization', `${id}: ${fieldPath} contains Latin letters.`);
  }

  if (!tashkeelPattern.test(value)) {
    addFinding(level, 'diacritics-missing', `${id}: ${fieldPath} contains no tashkīl marks.`);
  }

  const unmarkedTokens = (value.match(arabicTokenPattern) || []).filter((token) => !tashkeelPattern.test(token));
  if (unmarkedTokens.length) {
    addFinding(level, 'partial-vocalization', `${id}: ${fieldPath} contains ${unmarkedTokens.length} Arabic token(s) without tashkīl.`);
  }
}

function checkCyrillic(value, id, fieldPath) {
  const level = requiredLevel();
  if (isEmpty(value)) {
    addFinding(level, 'missing-cyrillic-pronunciation', `${id}: ${fieldPath} is missing.`);
    return;
  }

  if (typeof value !== 'string' || !cyrillicPattern.test(value)) {
    addFinding('error', 'cyrillic-pronunciation-invalid', `${id}: ${fieldPath} must contain Cyrillic letters.`);
  }

  if (latinPattern.test(value)) {
    addFinding('error', 'latin-leak-in-cyrillic-pronunciation', `${id}: ${fieldPath} contains Latin letters.`);
  }
}

function checkArabicPair(item, id, valuePath, vocalizedPath, transliterationPath) {
  const value = valuePath.split('.').reduce((current, key) => current?.[key], item);
  const vocalized = vocalizedPath.split('.').reduce((current, key) => current?.[key], item);
  const transliteration = transliterationPath.split('.').reduce((current, key) => current?.[key], item);

  checkArabicText(value, id, valuePath);
  checkVocalized(vocalized, id, vocalizedPath);
  checkCyrillic(transliteration, id, transliterationPath);
}

for (const [index, word] of words.entries()) {
  const id = word?.id || `index:${index}`;
  if (!word || typeof word !== 'object' || Array.isArray(word)) {
    addFinding('error', 'invalid-word', `${id}: item must be an object.`);
    continue;
  }

  checkArabicPair(word, id, 'arabic', 'arabicVocalized', 'arabicTransliterationRu');
  checkArabicPair(word, id, 'exampleAr', 'exampleArVocalized', 'exampleArTransliterationRu');

  const arabicGrammar = word.grammar?.ar;
  if (!arabicGrammar || typeof arabicGrammar !== 'object') {
    addFinding('error', 'arabic-grammar-missing', `${id}: grammar.ar is missing.`);
  } else {
    for (const field of ['word', 'singular', 'plural']) {
      if (!isEmpty(arabicGrammar[field])) checkArabicText(arabicGrammar[field], id, `grammar.ar.${field}`);
    }
  }

  for (const collectionName of ['examples', 'phrases']) {
    const collection = word[collectionName];
    if (!Array.isArray(collection)) {
      addFinding('warning', 'arabic-collection-missing', `${id}: ${collectionName} is missing or not an array.`);
      continue;
    }

    collection.forEach((entry, entryIndex) => {
      const prefix = `${collectionName}.${entryIndex}`;
      checkArabicPair(word, id, `${prefix}.ar`, `${prefix}.arVocalized`, `${prefix}.arTransliterationRu`);
    });
  }
}

const summary = [...findings.entries()].map(([code, value]) => ({ code, ...value }));
const report = {
  status: errorCount ? 'FAIL' : warningCount ? 'WARNING' : 'PASS',
  edition,
  strict,
  wordsChecked: words.length,
  errorCount,
  warningCount,
  findings: summary
};

console.log(JSON.stringify(report, null, 2));

if (errorCount) process.exit(1);
