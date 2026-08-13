#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dataPath = path.join(root, "data", "units", "home.json");
const diacritics = /[\u064b-\u065f\u0670]/gu;
const arabicToken = /(?:[\u0621-\u064a\u0671-\u06d3][\u064b-\u065f\u0670]*)+/gu;
const cyrillicPattern = /[\u0400-\u04ff]/u;

const overrides = new Map(Object.entries({
  "هذا": "хаза",
  "هذه": "хазихи",
  "أنا": "ана",
  "نحن": "нахну",
  "أين": "айн",
  "في": "фи",
  "إلى": "иля",
  "على": "аля",
  "تحت": "тахт",
  "بجانب": "биджаниб",
  "أعيش": "аиш",
  "أجلس": "аджлис",
  "نجلس": "наджлис",
  "أشاهد": "ушахид",
  "أعمل": "аамаль",
  "أحتاج": "ахтадж",
  "أغلق": "углик",
  "افتح": "ифтах",
  "اضغط": "идгат",
  "أعطني": "аатыни",
  "شغّل": "шаггил",
  "سخّن": "саххин",
  "خذ": "хуз",
  "ضع": "да",
  "ارمِ": "ирми",
  "يعمل": "иамаль",
  "تعمل": "таамаль",
  "ذاهب": "захиб",
  "مستلقٍ": "мусталькин",
  "بيت": "бейт",
  "بيتنا": "бейтуна",
  "منزل": "манзиль",
  "شقة": "шакка",
  "غرفة": "гурфа",
  "غرفتي": "гурфати",
  "المعيشة": "аль-маиша",
  "كنبة": "канаба",
  "أريكة": "арика",
  "كرسي": "курси",
  "مريح": "мурих",
  "تلفزيون": "тилфизьон",
  "مصباح": "мисбах",
  "سجادة": "саджада",
  "أرض": "ард",
  "رف": "рафф",
  "كتاب": "китаб",
  "لوحة": "лавха",
  "صورة": "сура",
  "حائط": "хаит",
  "نبات": "набат",
  "نافذة": "нафиза",
  "ساعة": "саа",
  "أريكة": "арика",
  "طاولة": "тавиля",
  "كرسي": "курси",
  "مطبخ": "матбах",
  "حمام": "хаммам",
  "غسالة": "гассаля",
  "ثلاجة": "салладжа",
  "فرن": "фурн",
  "موقد": "маукид",
  "غلاية": "галляйя",
  "ملعقة": "милъака",
  "شوكة": "шаука",
  "سكين": "сиккин",
  "طبق": "табак",
  "كوب": "куб",
  "فنجان": "финджан",
  "ماء": "маа",
  "حليب": "халиб",
  "مكتب": "мактаб",
  "سرير": "сарир",
  "وسادة": "висада",
  "بطانية": "баттания",
  "ملاءة": "милаа",
  "خزانة": "хизана",
  "دولاب": "дулаб",
  "ملابس": "малябис",
  "شماعة": "шаммаа",
  "حمامًا": "хаммаман",
  "دُش": "душ",
  "مغسلة": "магсаля",
  "مرآة": "миръа",
  "مرحاض": "мирхад",
  "صابون": "сабун",
  "منشفة": "миншафа",
  "مقشة": "микашша",
  "مكنسة": "микнаса",
  "مكواة": "миква",
  "مكيّف": "мукаййиф",
  "مدفأة": "мидфаа",
  "باب": "баб",
  "نافذة": "нафиза",
  "مفتاح": "мифтах",
  "قفل": "куфль",
  "مقبس": "мабс",
  "كهرباء": "кахраба",
  "هاتف": "хатиф",
  "شاحن": "шахин",
  "ريموت": "римут",
  "صندوق": "сандук",
  "حقيبة": "хакиба",
  "جاكيت": "джакит",
  "مرآة": "миръа",
  "نوم": "наум",
  "نور": "нур",
  "أبيض": "абьяд",
  "جديد": "джадид",
  "جديدة": "джадида",
  "نظيفة": "назифа",
  "ناعمة": "нааима",
  "ساخنة": "сахина",
  "مشغول": "машгуль",
  "مفتاحي": "мифтахи",
  "كوبي": "куби"
}));

function normalize(value) {
  return String(value || "").normalize("NFC").replace(diacritics, "");
}

function phraseKey(value) {
  return normalize(value).replace(/[.,!?؟،؛:]/gu, "").replace(/\s+/gu, " ").trim();
}

function genericToken(token, tokenMap = new Map()) {
  const bare = String(token || "").normalize("NFC");
  if (normalize(bare).startsWith("ال")) {
    const remainder = bare.replace(/^الْ?/u, "");
    const remainderKey = normalize(remainder);
    const mapped = tokenMap.get(remainderKey) || overrides.get(remainderKey) || genericToken(remainder, tokenMap);
    return `аль-${mapped}`;
  }
  const output = [];
  const letters = {
    "ا": "а", "أ": "а", "إ": "и", "آ": "а", "ب": "б", "ت": "т", "ث": "с",
    "ج": "дж", "ح": "х", "خ": "х", "د": "д", "ذ": "з", "ر": "р", "ز": "з",
    "س": "с", "ش": "ш", "ص": "с", "ض": "д", "ط": "т", "ظ": "з", "ع": "а",
    "غ": "г", "ف": "ф", "ق": "к", "ك": "к", "ل": "л", "م": "м", "ن": "н",
    "ه": "х", "و": "в", "ي": "й", "ى": "а", "ة": "а", "ء": "ъ"
  };
  const vowels = { "َ": "а", "ُ": "у", "ِ": "и", "ً": "ан", "ٌ": "ун", "ٍ": "ин" };
  for (const char of bare) {
    if (vowels[char]) {
      output.push(vowels[char]);
      continue;
    }
    if (char === "ّ") {
      const previous = output.at(-1);
      if (previous) output.push(previous);
      continue;
    }
    if (char === "ْ") continue;
    if (letters[char]) output.push(letters[char]);
  }
  return output.join("").replace(/аа/gu, "а").replace(/ии/gu, "и").replace(/уу/gu, "у");
}

function transliterateToken(token, tokenMap) {
  const key = normalize(token);
  return tokenMap.get(key) || overrides.get(key) || genericToken(token, tokenMap);
}

function transliterateText(value, tokenMap, phraseMap) {
  const exact = phraseMap.get(phraseKey(value));
  if (exact) return exact;
  return String(value || "").replace(arabicToken, token => transliterateToken(token, tokenMap));
}

const unitFile = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const words = unitFile.words;
const tokenMap = new Map();
const phraseMap = new Map();
for (const word of words) {
  phraseMap.set(phraseKey(word.exampleAr), word.exampleArTransliterationRu);
  const arabicTokens = normalize(word.arabic).match(arabicToken) || [];
  const cyrillicTokens = String(word.arabicTransliterationRu || "").split(/\s+/u).filter(Boolean);
  if (arabicTokens.length === cyrillicTokens.length) {
    arabicTokens.forEach((token, index) => {
      if (!tokenMap.has(token)) tokenMap.set(token, cyrillicTokens[index]);
    });
  }
}

for (const word of words) {
  for (const example of word.examples || []) {
    example.arTransliterationRu = transliterateText(example.arVocalized || example.ar, tokenMap, phraseMap);
  }
  for (const phrase of word.phrases || []) {
    phrase.arTransliterationRu = transliterateText(phrase.arVocalized || phrase.ar, tokenMap, phraseMap);
  }
}

const invalid = [];
for (const word of words) {
  for (const item of [...(word.examples || []), ...(word.phrases || [])]) {
    if (!cyrillicPattern.test(item.arTransliterationRu || "")) invalid.push(word.id);
  }
}

if (invalid.length) {
  console.error(JSON.stringify({ status: "FAIL", invalidIds: [...new Set(invalid)] }, null, 2));
  process.exit(1);
}

fs.writeFileSync(dataPath, `${JSON.stringify(unitFile, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: "PASS", wordsUpdated: words.length, pronunciationFields: words.length * 6 }, null, 2));
