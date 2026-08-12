#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const args = new Map(process.argv.slice(2).map(arg => {
  const [k, v = true] = arg.replace(/^--/, '').split('=');
  return [k, v];
}));

const registryRel = args.get('registry') || 'data/units.json';
const registryPath = path.join(root, registryRel);

const requiredLangs = ['ar', 'en', 'ru'];
const requiredRegistryEntryFields = ['id', 'dataPath', 'title', 'description', 'coverImage', 'icon', 'order'];
const requiredUnitFileFields = ['schemaVersion', 'unitId', 'contentVersion', 'rooms', 'words'];
const requiredRoomFields = ['id', 'title', 'image', 'icon', 'tone', 'order'];
const requiredWordFields = ['id', 'unitId', 'subCategory'];

function isEmpty(value) {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0);
}

function existsRel(rel) {
  if (!rel || typeof rel !== 'string') return false;
  return fs.existsSync(path.join(root, rel));
}

function readJson(rel, errors) {
  if (!existsRel(rel)) {
    errors.push(`Cannot find file "${rel}".`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  } catch (err) {
    errors.push(`Cannot parse "${rel}": ${err.message}`);
    return null;
  }
}

function checkLocalizedText(value, label, field, errors) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    errors.push(`${label}: "${field}" must be an object with ar/en/ru text.`);
    return;
  }
  for (const lang of requiredLangs) {
    if (isEmpty(value[lang])) errors.push(`${label}: "${field}.${lang}" is missing.`);
  }
}

function validateRooms(rooms, label, errors) {
  const roomIds = new Set();
  (Array.isArray(rooms) ? rooms : []).forEach((room, index) => {
    const roomLabel = `${label} room[${index}]`;
    for (const field of requiredRoomFields) {
      if (isEmpty(room?.[field])) errors.push(`${roomLabel}: missing required field "${field}".`);
    }
    if (room?.title) checkLocalizedText(room.title, roomLabel, 'title', errors);
    if (room?.image && !existsRel(room.image)) errors.push(`${roomLabel}: missing image "${room.image}".`);
    if (room?.id) {
      if (roomIds.has(room.id)) errors.push(`${roomLabel}: duplicate room id "${room.id}" in this scope.`);
      else roomIds.add(room.id);
    }
  });
  return roomIds;
}

function validateRegistry(registry, errors, warnings) {
  if (!registry || typeof registry !== 'object' || !Array.isArray(registry.units)) {
    errors.push('Registry must be an object with a "units" array.');
    return [];
  }
  if (!registry.units.length) {
    errors.push('Registry "units" array must not be empty.');
    return [];
  }
  if (registry.schemaVersion !== 1) warnings.push(`Registry schemaVersion is "${registry.schemaVersion}", expected 1.`);

  const seenIds = new Set();
  registry.units.forEach((entry, index) => {
    const label = entry?.id ? `unit "${entry.id}"` : `registry.units[${index}]`;
    for (const field of requiredRegistryEntryFields) {
      if (isEmpty(entry?.[field])) errors.push(`${label}: missing required field "${field}".`);
    }
    if (entry?.id) {
      if (seenIds.has(entry.id)) errors.push(`${label}: duplicate unit id in registry.`);
      seenIds.add(entry.id);
    }
    if (entry?.title) checkLocalizedText(entry.title, label, 'title', errors);
    if (entry?.description) checkLocalizedText(entry.description, label, 'description', errors);
    if (entry?.coverImage && !existsRel(entry.coverImage)) errors.push(`${label}: missing cover image "${entry.coverImage}".`);
    if (entry?.dataPath && !existsRel(entry.dataPath)) errors.push(`${label}: dataPath "${entry.dataPath}" does not exist.`);
    if (entry?.order !== undefined && typeof entry.order !== 'number') warnings.push(`${label}: "order" should be a number.`);
  });
  return registry.units;
}

function registerWordId(word, wordLabel, errors, globalWordIds, globalWordLocations) {
  if (!word?.id) return;
  if (globalWordIds.has(word.id)) {
    errors.push(`${wordLabel}: id "${word.id}" is already used by ${globalWordLocations.get(word.id)}.`);
  } else {
    globalWordIds.add(word.id);
    globalWordLocations.set(word.id, wordLabel);
  }
}

function validateUnitFile(entry, errors, warnings, globalWordIds, globalWordLocations) {
  const label = `unit "${entry.id}"`;
  if (!entry?.dataPath || !existsRel(entry.dataPath)) return;

  const payload = readJson(entry.dataPath, errors);
  if (!payload) return;

  const unit = payload;
  for (const field of requiredUnitFileFields) {
    if (isEmpty(unit[field])) errors.push(`${label}: unit file missing required field "${field}".`);
  }
  if (unit.unitId && unit.unitId !== entry.id) {
    errors.push(`${label}: unit file unitId "${unit.unitId}" does not match registry id "${entry.id}".`);
  }

  const roomIds = validateRooms(unit.rooms, label, errors);

  if (!Array.isArray(unit.words) || unit.words.length === 0) {
    errors.push(`${label}: unit file has no words.`);
    return;
  }

  unit.words.forEach((word, index) => {
    const wordLabel = `${label} words[${index}]`;
    for (const field of requiredWordFields) {
      if (isEmpty(word?.[field])) errors.push(`${wordLabel}: missing required field "${field}".`);
    }
    if (word?.unitId && word.unitId !== entry.id) {
      errors.push(`${wordLabel}: word unitId "${word.unitId}" does not match unit "${entry.id}".`);
    }
    if (word?.subCategory && roomIds.size && !roomIds.has(word.subCategory)) {
      errors.push(`${wordLabel}: subCategory "${word.subCategory}" is not a room defined in this unit.`);
    }
    registerWordId(word, wordLabel, errors, globalWordIds, globalWordLocations);
  });
}

const errors = [];
const warnings = [];

if (!fs.existsSync(registryPath)) {
  console.log(JSON.stringify({
    status: 'SKIPPED',
    registry: registryRel,
    reason: `No unit registry found at "${registryRel}". Expected before Phase 1 of the unit migration (see docs/UNIT_ARCHITECTURE.md).`
  }, null, 2));
  process.exit(0);
}

const registry = readJson(registryRel, errors);
const unitEntries = registry ? validateRegistry(registry, errors, warnings) : [];

const globalWordIds = new Set();
const globalWordLocations = new Map();
for (const entry of unitEntries) {
  validateUnitFile(entry, errors, warnings, globalWordIds, globalWordLocations);
}

const report = {
  status: errors.length ? 'FAIL' : warnings.length ? 'WARNING' : 'PASS',
  registry: registryRel,
  unitsChecked: unitEntries.length,
  wordsChecked: globalWordIds.size,
  errorCount: errors.length,
  warningCount: warnings.length,
  errors,
  warnings
};

console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exit(1);
