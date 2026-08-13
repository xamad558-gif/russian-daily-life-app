#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Map(process.argv.slice(2).map(arg => {
  const [k, v = true] = arg.replace(/^--/, '').split('=');
  return [k, v];
}));

const audioMode = args.get('audio') || 'warn'; // warn | strict | ignore
const fileRel = args.get('file') || 'data/units/home.json';
const dataPath = path.join(root, fileRel);
const allowedLevels = new Set(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
const allowedAudioModes = new Set(['warn', 'strict', 'ignore']);

if (!allowedAudioModes.has(audioMode)) {
  console.error(`Invalid --audio mode: ${audioMode}. Use warn, strict, or ignore.`);
  process.exit(2);
}

const required = [
  'id', 'unitId', 'category', 'subCategory', 'russian', 'transliteration', 'transliterationAr',
  'englishTransliterationAr', 'englishTransliterationRu', 'arabicTransliterationEn',
  'arabic', 'english', 'level', 'frequency', 'type',
  'exampleRu', 'exampleTransliterationAr', 'exampleTransliterationEn', 'exampleArTransliterationRu',
  'exampleAr', 'exampleEn', 'imagePath', 'grammar'
];

const audioFields = [
  'audioWordAr', 'audioWordRu', 'audioWordEn',
  'audioSentenceAr', 'audioSentenceRu', 'audioSentenceEn'
];
const arabicScript = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u;
const cyrillicScript = /[\u0400-\u04ff]/u;
const latinScript = /[A-Za-z]/u;
const requiredExampleFields = ['ru', 'ar', 'en', 'arVocalized', 'arTransliterationRu', 'arTransliterationEn'];
const exampleScriptRules = {
  arVocalized: arabicScript,
  arTransliterationRu: cyrillicScript,
  arTransliterationEn: latinScript,
  ruTransliterationAr: arabicScript,
  ruTransliterationEn: latinScript,
  enTransliterationAr: arabicScript,
  enTransliterationRu: cyrillicScript
};

function existsRel(rel) {
  if (!rel || typeof rel !== 'string') return false;
  return fs.existsSync(path.join(root, rel));
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

let unitFile;
try {
  unitFile = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
} catch (err) {
  console.error(`FAIL: Cannot read or parse ${dataPath}`);
  console.error(err.message);
  process.exit(1);
}

const words = unitFile?.words;
if (!Array.isArray(words)) {
  console.error(`FAIL: ${fileRel} must be a unit file with a "words" array.`);
  process.exit(1);
}

const errors = [];
const warnings = [];
const ids = new Map();

for (const [index, word] of words.entries()) {
  const label = word?.id || `index:${index}`;

  if (!word || typeof word !== 'object' || Array.isArray(word)) {
    errors.push(`${label}: item must be an object.`);
    continue;
  }

  for (const field of required) {
    if (isEmpty(word[field])) errors.push(`${label}: missing required field "${field}".`);
  }

  if (word.transliterationAr && !arabicScript.test(word.transliterationAr)) {
    errors.push(`${label}: transliterationAr must contain Arabic-script characters.`);
  }
  if (word.exampleTransliterationAr && !arabicScript.test(word.exampleTransliterationAr)) {
    errors.push(`${label}: exampleTransliterationAr must contain Arabic-script characters.`);
  }
  if (word.exampleTransliterationEn && cyrillicScript.test(word.exampleTransliterationEn)) {
    errors.push(`${label}: exampleTransliterationEn must not contain Cyrillic characters.`);
  }
  if (word.exampleArTransliterationRu && !cyrillicScript.test(word.exampleArTransliterationRu)) {
    errors.push(`${label}: exampleArTransliterationRu must contain Cyrillic characters.`);
  }
  if (word.englishTransliterationAr && !arabicScript.test(word.englishTransliterationAr)) {
    errors.push(`${label}: englishTransliterationAr must contain Arabic-script characters.`);
  }
  if (word.englishTransliterationRu && !cyrillicScript.test(word.englishTransliterationRu)) {
    errors.push(`${label}: englishTransliterationRu must contain Cyrillic characters.`);
  }
  if (word.arabicTransliterationEn && !latinScript.test(word.arabicTransliterationEn)) {
    errors.push(`${label}: arabicTransliterationEn must contain Latin characters.`);
  }

  if (word.id) {
    if (ids.has(word.id)) errors.push(`${label}: duplicate id also used at index ${ids.get(word.id)}.`);
    else ids.set(word.id, index);
  }

  if (word.level && !allowedLevels.has(word.level)) {
    warnings.push(`${label}: unusual level "${word.level}".`);
  }

  if (typeof word.frequency !== 'number') {
    warnings.push(`${label}: frequency should be a number.`);
  }

  if (word.imagePath && !existsRel(word.imagePath)) {
    errors.push(`${label}: missing image file "${word.imagePath}".`);
  }

  if (word.grammar && typeof word.grammar === 'object') {
    for (const lang of ['ru', 'ar', 'en']) {
      if (!word.grammar[lang]) warnings.push(`${label}: missing grammar.${lang} block.`);
    }

    if (word.type === 'noun' && word.grammar.ru) {
      const ru = word.grammar.ru;
      if (isEmpty(ru.gender)) warnings.push(`${label}: Russian noun missing grammar.ru.gender.`);
      if (isEmpty(ru.singular)) warnings.push(`${label}: Russian noun missing grammar.ru.singular.`);
      if (isEmpty(ru.plural)) warnings.push(`${label}: Russian noun missing grammar.ru.plural.`);
    }
  }

  if (!Array.isArray(word.examples) || word.examples.length < 3) {
    errors.push(`${label}: examples must contain at least three entries.`);
  } else {
    word.examples.slice(0, 3).forEach((example, exampleIndex) => {
      for (const field of requiredExampleFields) {
        if (isEmpty(example?.[field])) errors.push(`${label}: examples[${exampleIndex}] is missing required field "${field}".`);
      }
      for (const [field, pattern] of Object.entries(exampleScriptRules)) {
        if (!isEmpty(example?.[field]) && !pattern.test(example[field])) {
          errors.push(`${label}: examples[${exampleIndex}].${field} has an unexpected script.`);
        }
      }
    });
  }

  if (audioMode !== 'ignore') {
    for (const field of audioFields) {
      const rel = word[field];
      if (!rel) continue;
      if (!existsRel(rel)) {
        const message = `${label}: missing audio file in ${field}: "${rel}".`;
        if (audioMode === 'strict') errors.push(message);
        else warnings.push(message);
      }
    }
  }
}

const report = {
  status: errors.length ? 'FAIL' : warnings.length ? 'WARNING' : 'PASS',
  wordsChecked: words.length,
  uniqueIds: ids.size,
  audioMode,
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings
};

console.log(JSON.stringify(report, null, 2));

if (errors.length) process.exit(1);
