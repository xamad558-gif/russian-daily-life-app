import fs from "node:fs";
import path from "node:path";

const dataPath = path.join(process.cwd(), "data", "units", "home.json");
const unitFile = JSON.parse(fs.readFileSync(dataPath, "utf8"));
const words = unitFile.words;
const cyrillicToLatin = new Map(Object.entries({
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "'", э: "e", ю: "yu", я: "ya"
}));

function toLatin(value) {
  return String(value || "").split("").map(character => cyrillicToLatin.get(character.toLowerCase()) || character).join("");
}

for (const word of words) {
  word.arabicTransliterationEn = toLatin(word.arabicTransliterationRu);
  word.exampleArTransliterationEn = toLatin(word.exampleArTransliterationRu);
  for (const example of word.examples || []) example.arTransliterationEn = toLatin(example.arTransliterationRu);
  for (const phrase of word.phrases || []) phrase.arTransliterationEn = toLatin(phrase.arTransliterationRu);
}

fs.writeFileSync(dataPath, `${JSON.stringify(unitFile, null, 2)}\n`, "utf8");
console.log(`Refreshed Arabic-to-Latin pronunciation for ${words.length} words.`);
