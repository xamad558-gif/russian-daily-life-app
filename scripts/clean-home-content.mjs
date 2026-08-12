import fs from 'node:fs';
import path from 'node:path';

const dataPath = path.join(process.cwd(), 'data', 'units', 'home.json');
const unitFile = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const words = unitFile.words;

const questionArabicById = {
  home50_001: 'أين البيت؟',
  home50_002: 'أين الشقة؟',
  home50_003: 'أين الغرفة؟',
  home50_004: 'أين غرفة المعيشة؟',
  home50_005: 'أين الكنبة؟',
  home50_006: 'أين الكرسي المريح؟',
  home50_007: 'أين التلفزيون؟',
  home50_008: 'أين المصباح؟',
  home50_009: 'أين السجادة؟',
  home50_010: 'أين الرف؟',
  home50_011: 'أين اللوحة؟',
  home50_012: 'أين النبتة؟',
  home50_013: 'أين غرفة النوم؟',
  home50_014: 'أين السرير؟',
  home50_015: 'أين الوسادة؟',
  home50_016: 'أين الدولاب؟',
  home50_017: 'أين البطانية؟',
  home50_018: 'أين الكومودينو؟',
  home50_019: 'أين الستارة؟',
  home50_020: 'أين المطبخ؟',
  home50_021: 'أين الطاولة؟',
  home50_022: 'أين الكرسي؟',
  home50_023: 'أين الثلاجة؟',
  home50_024: 'أين الموقد؟',
  home50_025: 'أين الكوب؟',
  home50_026: 'أين الكوب الزجاجي؟',
  home50_027: 'أين الملعقة؟',
  home50_028: 'أين الشوكة؟',
  home50_029: 'أين السكين؟',
  home50_030: 'أين الطبق؟',
  home50_031: 'أين الحوض؟',
  home50_032: 'أين الصنبور؟',
  home50_033: 'أين الحلة؟',
  home50_034: 'أين الحمام؟',
  home50_035: 'أين البانيو؟',
  home50_036: 'أين الدش؟',
  home50_037: 'أين المرآة؟',
  home50_038: 'أين المنشفة؟',
  home50_039: 'أين الصابون؟',
  home50_040: 'أين فرشاة الأسنان؟',
  home50_041: 'أين معجون الأسنان؟',
  home50_042: 'أين المرحاض؟',
  home50_043: 'أين الباب؟',
  home50_044: 'أين النافذة؟',
  home50_045: 'أين المفتاح؟',
  home50_046: 'أين القفل؟',
  home50_047: 'أين الحائط؟',
  home50_048: 'أين الأرضية؟',
  home50_049: 'أين السقف؟',
  home50_050: 'أين البلكونة؟',
  home75_051: 'أين الريموت؟',
  home75_052: 'أين الساعة؟',
  home75_053: 'أين الكتاب؟',
  home75_054: 'أين الهاتف؟',
  home75_055: 'أين الشاحن؟',
  home75_056: 'أين مقبس الكهرباء؟',
  home75_057: 'أين مفتاح النور؟',
  home75_058: 'أين الشماعة؟',
  home75_059: 'أين المرتبة؟',
  home75_060: 'أين الملاءة؟',
  home75_061: 'أين الملابس؟',
  home75_062: 'أين الحقيبة؟',
  home75_063: 'أين الصندوق؟',
  home75_064: 'أين الميكروويف؟',
  home75_065: 'أين الفرن؟',
  home75_066: 'أين الغلاية؟',
  home75_067: 'أين القمامة؟',
  home75_068: 'أين الغسالة؟',
  home75_069: 'أين المكنسة الكهربائية؟',
  home75_070: 'أين المكواة؟',
  home75_071: 'أين المكيّف؟',
  home75_072: 'أين الدفاية؟',
  home75_073: 'أين المقشة؟',
  home75_074: 'أين المكتب؟',
  home75_075: 'أين خزانة الأدراج؟'
};

const replacementExamples = {
  home50_039: {
    ru: 'Мыло лежит у раковины.',
    ar: 'الصابون بجانب الحوض.',
    en: 'The soap is by the sink.'
  },
  home75_051: {
    ru: 'Пульт лежит рядом с телевизором.',
    ar: 'الريموت بجانب التلفزيون.',
    en: 'The remote control is next to the television.'
  },
  home75_055: {
    ru: 'Зарядка лежит на столе.',
    ar: 'الشاحن على الطاولة.',
    en: 'The charger is on the table.'
  }
};

if (words.length !== Object.keys(questionArabicById).length) {
  throw new Error('The cleanup map must cover every home word.');
}

for (const word of words) {
  const questionArabic = questionArabicById[word.id];
  if (!questionArabic) throw new Error(`Missing cleanup mapping for ${word.id}.`);

  if (word.examples?.[1]) word.examples[1].ar = questionArabic;
  if (word.phrases?.[2]) word.phrases[2].ar = questionArabic;
  delete word.related;
  delete word.note;

  if (replacementExamples[word.id]) {
    word.examples[1] = replacementExamples[word.id];
  }
}

const kitchen = words.find(word => word.id === 'home50_020');
kitchen.grammar.ar.gender = 'مذكر';
kitchen.examples[2].ar = 'المطبخ جديد.';
kitchen.phrases[0].ar = 'هذا المطبخ';
kitchen.phrases[1].ar = 'مطبخ جديد';

const soap = words.find(word => word.id === 'home50_039');
soap.examples[0].en = 'Where is the soap?';

const mattress = words.find(word => word.id === 'home75_059');
mattress.examples[1] = {
  ru: 'Где матрас?',
  ar: questionArabicById.home75_059,
  en: 'Where is the mattress?'
};
mattress.examples[2] = {
  ru: 'Матрас лежит на кровати.',
  ar: 'المرتبة على السرير.',
  en: 'The mattress is on the bed.'
};

fs.writeFileSync(dataPath, `${JSON.stringify(unitFile, null, 2)}\n`, 'utf8');
console.log(`Cleaned ${words.length} home entries.`);
