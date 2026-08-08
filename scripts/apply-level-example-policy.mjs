import fs from "node:fs";
import path from "node:path";

const dataPath = path.join(process.cwd(), "data", "words.json");
const words = JSON.parse(fs.readFileSync(dataPath, "utf8"));

const replacements = {
  home50_039: [
    { ru: "Мыло лежит возле раковины.", ar: "الصابون بجانب الحوض.", en: "The soap is near the sink." },
    { ru: "Возьми мыло, пожалуйста.", ar: "خذ الصابون من فضلك.", en: "Please take the soap." }
  ],
  home50_040: [
    { ru: "Зубная щётка лежит в стакане.", ar: "فرشاة الأسنان في الكوب.", en: "The toothbrush is in the glass." },
    { ru: "Возьми зубную щётку и пасту.", ar: "خذ فرشاة الأسنان والمعجون.", en: "Take the toothbrush and toothpaste." }
  ],
  home50_041: [
    { ru: "Зубная паста стоит на полке.", ar: "معجون الأسنان على الرف.", en: "The toothpaste is on the shelf." },
    { ru: "Не забудь взять зубную пасту.", ar: "لا تنسَ أخذ معجون الأسنان.", en: "Do not forget to take the toothpaste." }
  ],
  home50_042: [
    { ru: "Туалет находится рядом с ванной.", ar: "المرحاض بجانب حوض الاستحمام.", en: "The toilet is next to the bathtub." },
    { ru: "В туалете чисто.", ar: "المرحاض نظيف.", en: "The toilet is clean." }
  ],
  home50_043: [
    { ru: "Дверь закрыта.", ar: "الباب مغلق.", en: "The door is closed." },
    { ru: "Пожалуйста, закрой дверь.", ar: "من فضلك، أغلق الباب.", en: "Please close the door." }
  ],
  home50_044: [
    { ru: "Окно открыто.", ar: "النافذة مفتوحة.", en: "The window is open." },
    { ru: "Закрой окно перед сном.", ar: "أغلق النافذة قبل النوم.", en: "Close the window before bed." }
  ],
  home50_045: [
    { ru: "Ключ лежит в сумке.", ar: "المفتاح في الحقيبة.", en: "The key is in the bag." },
    { ru: "Я не могу найти ключ.", ar: "لا أستطيع العثور على المفتاح.", en: "I cannot find the key." }
  ],
  home50_046: [
    { ru: "Замок на двери сломан.", ar: "قفل الباب مكسور.", en: "The lock on the door is broken." },
    { ru: "Проверь замок, пожалуйста.", ar: "تحقق من القفل من فضلك.", en: "Please check the lock." }
  ],
  home50_047: [
    { ru: "На стене висит картина.", ar: "توجد لوحة معلقة على الحائط.", en: "A picture is hanging on the wall." },
    { ru: "Мы покрасили стену вчера.", ar: "دهنا الحائط أمس.", en: "We painted the wall yesterday." }
  ],
  home50_048: [
    { ru: "На полу лежит ковёр.", ar: "توجد سجادة على الأرضية.", en: "There is a rug on the floor." },
    { ru: "Пол нужно помыть.", ar: "يجب تنظيف الأرضية.", en: "The floor needs to be washed." }
  ],
  home50_049: [
    { ru: "На потолке висит лампа.", ar: "يوجد مصباح معلق في السقف.", en: "A lamp hangs from the ceiling." },
    { ru: "Потолок недавно покрасили.", ar: "طُلي السقف مؤخرًا.", en: "The ceiling was painted recently." }
  ],
  home50_050: [
    { ru: "На балконе растут цветы.", ar: "تنمو الزهور في الشرفة.", en: "Flowers grow on the balcony." },
    { ru: "Летом мы завтракаем на балконе.", ar: "نتناول الفطور في الشرفة صيفًا.", en: "We have breakfast on the balcony in summer." }
  ],
  home75_051: [
    { ru: "Пульт лежит на диване.", ar: "جهاز التحكم على الأريكة.", en: "The remote control is on the sofa." },
    { ru: "Где пульт от телевизора?", ar: "أين جهاز التحكم بالتلفزيون؟", en: "Where is the television remote?" }
  ],
  home75_052: [
    { ru: "Часы показывают десять часов.", ar: "تُظهر الساعة العاشرة.", en: "The clock shows ten o'clock." },
    { ru: "Эти часы висят на стене.", ar: "هذه الساعة معلقة على الحائط.", en: "This clock hangs on the wall." }
  ],
  home75_053: [
    { ru: "Книга лежит на столе.", ar: "الكتاب على الطاولة.", en: "The book is on the table." },
    { ru: "Я читаю книгу вечером.", ar: "أقرأ الكتاب مساءً.", en: "I read the book in the evening." }
  ],
  home75_054: [
    { ru: "Телефон заряжается на столе.", ar: "الهاتف يُشحن على الطاولة.", en: "The phone is charging on the table." },
    { ru: "Позвони мне, когда найдёшь телефон.", ar: "اتصل بي عندما تجد الهاتف.", en: "Call me when you find the phone." }
  ],
  home75_055: [
    { ru: "Зарядка лежит рядом с телефоном.", ar: "الشاحن بجانب الهاتف.", en: "The charger is next to the phone." },
    { ru: "Мне нужна зарядка для телефона.", ar: "أحتاج إلى شاحن للهاتف.", en: "I need a charger for the phone." }
  ],
  home75_056: [
    { ru: "Розетка находится у стола.", ar: "مقبس الكهرباء بجانب الطاولة.", en: "The socket is next to the table." },
    { ru: "Не трогай розетку мокрыми руками.", ar: "لا تلمس مقبس الكهرباء بيدين مبللتين.", en: "Do not touch the socket with wet hands." }
  ],
  home75_057: [
    { ru: "Выключатель возле двери.", ar: "مفتاح النور بجانب الباب.", en: "The light switch is by the door." },
    { ru: "Нажми на выключатель, пожалуйста.", ar: "اضغط على مفتاح النور من فضلك.", en: "Please press the light switch." }
  ],
  home75_058: [
    { ru: "Вешалка стоит в прихожей.", ar: "الشماعة في المدخل.", en: "The hanger is in the hallway." },
    { ru: "Повесь пальто на вешалку.", ar: "علّق المعطف على الشماعة.", en: "Hang the coat on the hanger." }
  ],
  home75_059: [
    { ru: "Матрас лежит на кровати.", ar: "المرتبة على السرير.", en: "The mattress is on the bed." },
    { ru: "Мы купили новый матрас.", ar: "اشترينا مرتبة جديدة.", en: "We bought a new mattress." }
  ],
  home75_060: [
    { ru: "Простыня лежит на кровати.", ar: "الملاءة على السرير.", en: "The sheet is on the bed." },
    { ru: "Постирай простыню, пожалуйста.", ar: "اغسل الملاءة من فضلك.", en: "Please wash the sheet." }
  ],
  home75_061: [
    { ru: "Одежда висит в шкафу.", ar: "الملابس معلقة في الدولاب.", en: "The clothes are hanging in the wardrobe." },
    { ru: "Я складываю одежду в сумку.", ar: "أضع الملابس في الحقيبة.", en: "I put the clothes in the bag." }
  ],
  home75_062: [
    { ru: "Сумка стоит у двери.", ar: "الحقيبة بجانب الباب.", en: "The bag is by the door." },
    { ru: "Положи книгу в сумку.", ar: "ضع الكتاب في الحقيبة.", en: "Put the book in the bag." }
  ],
  home75_063: [
    { ru: "Коробка стоит на полу.", ar: "الصندوق على الأرضية.", en: "The box is on the floor." },
    { ru: "Открой эту коробку, пожалуйста.", ar: "افتح هذا الصندوق من فضلك.", en: "Please open this box." }
  ],
  home75_064: [
    { ru: "Микроволновка стоит на кухне.", ar: "الميكروويف في المطبخ.", en: "The microwave is in the kitchen." },
    { ru: "Разогрей суп в микроволновке.", ar: "سخّن الحساء في الميكروويف.", en: "Heat the soup in the microwave." }
  ],
  home75_065: [
    { ru: "Духовка включена.", ar: "الفرن قيد التشغيل.", en: "The oven is on." },
    { ru: "Поставь пирог в духовку.", ar: "ضع الكعكة في الفرن.", en: "Put the cake in the oven." }
  ],
  home75_066: [
    { ru: "Чайник кипит на кухне.", ar: "الغلاية تغلي في المطبخ.", en: "The kettle is boiling in the kitchen." },
    { ru: "Налей воду из чайника.", ar: "اسكب الماء من الغلاية.", en: "Pour water from the kettle." }
  ],
  home75_067: [
    { ru: "Мусор лежит в ведре.", ar: "القمامة في سلة المهملات.", en: "The trash is in the bin." },
    { ru: "Вынеси мусор, пожалуйста.", ar: "أخرج القمامة من فضلك.", en: "Please take out the trash." }
  ],
  home75_068: [
    { ru: "Стиральная машина работает.", ar: "غسالة الملابس تعمل.", en: "The washing machine is running." },
    { ru: "Положи одежду в стиральную машину.", ar: "ضع الملابس في غسالة الملابس.", en: "Put the clothes in the washing machine." }
  ],
  home75_069: [
    { ru: "Пылесос стоит в шкафу.", ar: "المكنسة الكهربائية في الدولاب.", en: "The vacuum cleaner is in the wardrobe." },
    { ru: "Я убираю комнату пылесосом.", ar: "أنظف الغرفة بالمكنسة الكهربائية.", en: "I clean the room with a vacuum cleaner." }
  ],
  home75_070: [
    { ru: "Утюг нагрелся.", ar: "سخنت المكواة.", en: "The iron is hot." },
    { ru: "Поставь утюг на место.", ar: "أعد المكواة إلى مكانها.", en: "Put the iron back in its place." }
  ],
  home75_071: [
    { ru: "Кондиционер работает.", ar: "المكيّف يعمل.", en: "The air conditioner is working." },
    { ru: "Включи кондиционер, пожалуйста.", ar: "شغّل المكيّف من فضلك.", en: "Please turn on the air conditioner." }
  ],
  home75_072: [
    { ru: "Обогреватель стоит у окна.", ar: "الدفاية بجانب النافذة.", en: "The heater is by the window." },
    { ru: "Зимой мы включаем обогреватель.", ar: "نشغّل الدفاية في الشتاء.", en: "We turn on the heater in winter." }
  ],
  home75_073: [
    { ru: "Метла стоит за дверью.", ar: "المقشة خلف الباب.", en: "The broom is behind the door." },
    { ru: "Возьми метлу и подмети пол.", ar: "خذ المقشة واكنس الأرضية.", en: "Take the broom and sweep the floor." }
  ],
  home75_074: [
    { ru: "Письменный стол стоит у окна.", ar: "المكتب بجانب النافذة.", en: "The desk is by the window." },
    { ru: "Я делаю домашнее задание за письменным столом.", ar: "أحل واجبي على المكتب.", en: "I do my homework at the desk." }
  ],
  home75_075: [
    { ru: "Комод стоит рядом с окном.", ar: "خزانة الأدراج بجانب النافذة.", en: "The chest of drawers is next to the window." },
    { ru: "В верхнем ящике комода лежат носки.", ar: "الجوارب في الدرج العلوي لخزانة الأدراج.", en: "Socks are in the top drawer of the chest of drawers." }
  ]
};

const missing = [];
for (const word of words) {
  const replacementsForWord = replacements[word.id];
  if (word.level === "A2" && !replacementsForWord) missing.push(word.id);
  if (!replacementsForWord) continue;
  replacementsForWord.forEach((replacement, index) => {
    const exampleIndex = index + 1;
    word.examples[exampleIndex] = { ...word.examples[exampleIndex], ...replacement };
  });
}

if (missing.length) throw new Error(`Missing A2 example replacements: ${missing.join(", ")}`);

fs.writeFileSync(dataPath, `${JSON.stringify(words, null, 2)}\n`, "utf8");
console.log(`Updated level-aware examples for ${Object.keys(replacements).length} A2 words.`);
