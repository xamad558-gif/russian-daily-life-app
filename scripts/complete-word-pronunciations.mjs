#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data", "units", "home.json");

const englishWordAr = {
  "house / home": "هاوس / هوم",
  apartment: "أبارتمنت",
  room: "روم",
  "living room": "ليفِنغ روم",
  sofa: "صوفا",
  armchair: "آرم تشير",
  television: "تِلِفِجِن",
  lamp: "لامب",
  "rug / carpet": "رَغ / كارپِت",
  shelf: "شِلف",
  "picture / painting": "بِكتشر / پينتِنغ",
  plant: "پلانت",
  bedroom: "بِدروم",
  bed: "بِد",
  pillow: "پِلو",
  wardrobe: "ووردروب",
  blanket: "بلانكِت",
  "bedside table": "بِدسايد تيبل",
  curtain: "كِرتِن",
  kitchen: "كِتشن",
  table: "تيبل",
  chair: "تشير",
  refrigerator: "رِفريجِرِيتَر",
  stove: "ستوف",
  "cup": "كَب",
  glass: "غلاس",
  spoon: "سبون",
  fork: "فورك",
  knife: "نايف",
  plate: "پليت",
  sink: "سِنك",
  "tap / faucet": "تاب / فوسِت",
  pot: "پوت",
  bathroom: "باث روم",
  bathtub: "باث تَب",
  shower: "شاوَر",
  mirror: "مِرَر",
  towel: "تاوِل",
  soap: "صوب",
  toothbrush: "توث برَش",
  toothpaste: "توث پِست",
  toilet: "تويلِت",
  door: "دور",
  window: "وِندو",
  key: "كي",
  lock: "لوك",
  wall: "وول",
  floor: "فلور",
  ceiling: "سيلِنغ",
  balcony: "بالكني",
  "remote control": "رِموت كنترول",
  clock: "كلوك",
  book: "بُك",
  phone: "فون",
  charger: "تشارجر",
  "socket / outlet": "سوكِت / آوتلِت",
  "light switch": "لايت سويتش",
  hanger: "هانجر",
  mattress: "ماترِس",
  sheet: "شيت",
  clothes: "كلوْذز",
  bag: "باغ",
  box: "بوكس",
  microwave: "مايكرُوويف",
  oven: "أَفِن",
  kettle: "كِتِل",
  trash: "تراش",
  "washing machine": "واشِنغ ماشين",
  "vacuum cleaner": "ڤاكيوم كلينَر",
  iron: "آيرَن",
  "air conditioner": "إير كنِدِشِنَر",
  heater: "هيتَر",
  broom: "بروم",
  desk: "دِسك",
  "chest of drawers": "تشِست أَف درورز"
};

const englishWordRu = {
  "house / home": "хаус / хоум",
  apartment: "эпартмент",
  room: "рум",
  "living room": "ливинг рум",
  sofa: "соуфа",
  armchair: "армчэр",
  television: "телевижн",
  lamp: "лэмп",
  "rug / carpet": "раг / карпит",
  shelf: "шэлф",
  "picture / painting": "пикчер / пэйнтинг",
  plant: "плант",
  bedroom: "бэдрум",
  bed: "бэд",
  pillow: "пилоу",
  wardrobe: "вордроуб",
  blanket: "блэнкит",
  "bedside table": "бэдсайд тэйбл",
  curtain: "кёртин",
  kitchen: "китчин",
  table: "тэйбл",
  chair: "чэр",
  refrigerator: "рифриджэрэйтор",
  stove: "стоув",
  cup: "кап",
  glass: "глас",
  spoon: "спун",
  fork: "форк",
  knife: "найф",
  plate: "плэйт",
  sink: "синк",
  "tap / faucet": "тэп / фосит",
  pot: "пот",
  bathroom: "бас рум",
  bathtub: "бас таб",
  shower: "шауэр",
  mirror: "мирэр",
  towel: "тауэл",
  soap: "соуп",
  toothbrush: "тусбраш",
  toothpaste: "туспэйст",
  toilet: "тойлит",
  door: "дор",
  window: "виндоу",
  key: "ки",
  lock: "лок",
  wall: "вол",
  floor: "флор",
  ceiling: "силинг",
  balcony: "балкони",
  "remote control": "римоут контрол",
  clock: "клок",
  book: "бук",
  phone: "фоун",
  charger: "чарджэр",
  "socket / outlet": "сокит / аутлет",
  "light switch": "лайт свич",
  hanger: "хэнгэр",
  mattress: "мэтрис",
  sheet: "шит",
  clothes: "клоуз",
  bag: "бэг",
  box: "бокс",
  microwave: "майкровэйв",
  oven: "авэн",
  kettle: "кетл",
  trash: "трэш",
  "washing machine": "вошинг машин",
  "vacuum cleaner": "вэкьюм клинэр",
  iron: "айэрн",
  "air conditioner": "эр кондишэнэр",
  heater: "хитэр",
  broom: "брум",
  desk: "деск",
  "chest of drawers": "чест ов дроорз"
};

for (const [shortKey, sourceKey] of Object.entries({
  house: "house / home",
  rug: "rug / carpet",
  picture: "picture / painting",
  tap: "tap / faucet",
  socket: "socket / outlet"
})) {
  englishWordAr[shortKey] = englishWordAr[sourceKey].split(" / ")[0];
  englishWordRu[shortKey] = englishWordRu[sourceKey].split(" / ")[0];
}

const cyrillicToLatin = new Map(Object.entries({
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i",
  й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
  у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y",
  ь: "'", э: "e", ю: "yu", я: "ya"
}));

function toLatin(value) {
  return String(value || "").split("").map((char) => cyrillicToLatin.get(char.toLowerCase()) || char).join("");
}

const unitFile = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const words = unitFile.words;
const missing = [];
for (const word of words) {
  word.englishTransliterationAr = englishWordAr[word.english] || "";
  word.englishTransliterationRu = englishWordRu[word.english] || "";
  word.arabicTransliterationEn = toLatin(word.arabicTransliterationRu);
  word.exampleArTransliterationEn = toLatin(word.exampleArTransliterationRu);
  for (const example of word.examples || []) example.arTransliterationEn = toLatin(example.arTransliterationRu);
  for (const phrase of word.phrases || []) phrase.arTransliterationEn = toLatin(phrase.arTransliterationRu);
  if (!word.englishTransliterationAr || !word.englishTransliterationRu || !word.arabicTransliterationEn) missing.push(word.id);
}

if (missing.length) {
  console.error(JSON.stringify({ status: "FAIL", missingIds: missing }, null, 2));
  process.exit(1);
}

fs.writeFileSync(dataPath, `${JSON.stringify(unitFile, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", wordsUpdated: words.length, fieldsAdded: words.length * 3 }, null, 2));
