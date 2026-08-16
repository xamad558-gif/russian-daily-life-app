(function () {
  const translations = {
    ar: {
      dir: "rtl", brandSubtitle: "تعلم الروسية بسهولة", vocabNavLabel: "الكلمات", reviewNavLabel: "المراجعة", quizNavLabel: "الاختبار", progressNavLabel: "التقدم", quizBadge: "جديد",
      sectionsTitle: "الأقسام", unitsTitle: "الوحدات", streakTitle: "سلسلة التعلم", streakDays: "7 أيام", streakNote: "استمر في هذه الوحدة!", unitKicker: "{unit} · تعلّم بصري", unitHeroTitle: "تعلّم {language} من {unit}", unitHeroSubtitle: "اختر قسمًا، ثم اربط الكلمة بالصورة والصوت والجملة.", unitReviewSubtitle: "تظهر هنا الكلمات التي حفظتها من وحدة {unit} للمراجعة.", searchPlaceholder: "ابحث عن كلمة...", loadError: "تعذر تحميل بيانات الكلمات. أعد تحميل الصفحة وحاول مرة أخرى.",
      pageTitle: "البيت", pageCounterWord: "كلمة", emptyState: "لا توجد نتائج مطابقة.", allSubCategories: "جميع الأقسام الفرعية", allLevels: "جميع المستويات",
      sortPopular: "الأكثر شيوعًا", sortAZ: "أبجديًا A-Z", sortZA: "أبجديًا Z-A", sortMastery: "الأقل إتقانًا",
      playVisible: "🔊 تشغيل الكلمات الظاهرة", resetFilters: "إعادة ضبط", reviewTitle: "كلمات المراجعة", reviewSubtitle: "تظهر هنا كلمات وحدة المنزل التي حفظتها للمراجعة.", reviewEmpty: "لا توجد كلمات محفوظة بعد.", homeHeroKicker: "وحدة البيت · تعلّم بصري", homeHeroTitle: "تعلّم الروسية من الأشياء حولك", homeHeroSubtitle: "اختر الغرفة التي تريدها، ثم اربط الكلمة بالصورة والصوت والجملة.", homeHeroCta: "ابدأ مراجعة اليوم", homeProgressLabel: "تقدم الوحدة", roomStripEyebrow: "استكشف حسب المكان", roomStripTitle: "غرفتك التالية", roomStripHint: "اختر صورة للبدء", roomWords: "كلمة", roomOpen: "افتح قسم",
      quizTitle: "اختبار سريع", quizSubtitle: "اختر الترجمة الصحيحة للكلمة الروسية.", nextQuiz: "سؤال جديد", speakQuiz: "🔊 اسمع الكلمة", quizStatsTitle: "نتيجة الاختبار", correct: "صحيح", wrong: "خطأ", total: "الإجمالي", quizFeedbackCorrect: "✅ إجابة صحيحة.", quizFeedbackWrong: "❌ إجابة غير صحيحة. تم تمييز الإجابة الصحيحة.", quizNeedWords: "تحتاج إلى أربع كلمات على الأقل لبدء الاختبار.",
      progressTitle: "التقدم", progressSubtitle: "ملخص سريع لما حفظته وما تحتاج مراجعته.", totalWords: "إجمالي الكلمات", savedWords: "محفوظة", masteredWords: "متقنة", avgMastery: "متوسط الإتقان",
      dailyTip: "حاول استخدام الكلمات الجديدة في جمل يومية. الممارسة هي مفتاح النجاح.",
      labels: { example: "مثال", info: "معلومات", level: "المستوى", frequency: "الشيوع", category: "الفئة", updated: "آخر تحديث", known: "أعرفها", review: "أراجعها", mastery: "الإتقان" },
      learningStates: { new: "جديدة", learning: "قيد التعلم", review: "للمراجعة", known: "معروفة", mastered: "متقنة" }, dueNow: "مستحقة الآن",
      detail: { fullPage: "📖 صفحة الكلمة", back: "→ رجوع", review: "☆ مراجعة", known: "✓ أعرفها", grammar: "جدول المقارنة", examples: "أمثلة", phrases: "عبارات مهمة", info: "البيان", word: "الكلمة", type: "نوع الكلمة", singular: "المفرد", plural: "الجمع", gender: "الجنس / النوع", example: "مثال" },
      a11y: { openMenu: "فتح القائمة", closeMenu: "إغلاق القائمة", toggleTheme: "تبديل المظهر", openWord: "فتح تفاصيل الكلمة", saveReview: "حفظ للمراجعة", removeReview: "إزالة من المراجعة", playArabic: "تشغيل النطق بالعربية", playRussian: "تشغيل النطق بالروسية", playEnglish: "تشغيل النطق بالإنجليزية", playWord: "تشغيل نطق الكلمة الروسية", gridView: "عرض شبكي", compactView: "عرض مختصر", back: "رجوع" },
    },
    en: {
      dir: "ltr", brandSubtitle: "Learn Russian easily", vocabNavLabel: "Words", reviewNavLabel: "Review", quizNavLabel: "Quiz", progressNavLabel: "Progress", quizBadge: "New",
      sectionsTitle: "Sections", unitsTitle: "Units", streakTitle: "Learning streak", streakDays: "7 days", streakNote: "Keep going with this unit!", unitKicker: "{unit} unit · visual learning", unitHeroTitle: "Learn {language} through {unit}", unitHeroSubtitle: "Choose a section, then connect each word to its image, sound, and sentence.", unitReviewSubtitle: "Saved words from {unit} appear here for review.", searchPlaceholder: "Search for a word...", loadError: "Word data could not be loaded. Reload the page and try again.",
      pageTitle: "Home", pageCounterWord: "words", emptyState: "No matching results.", allSubCategories: "All subcategories", allLevels: "All levels",
      sortPopular: "Most common", sortAZ: "Alphabetical A-Z", sortZA: "Alphabetical Z-A", sortMastery: "Lowest mastery",
      playVisible: "🔊 Play visible words", resetFilters: "Reset", reviewTitle: "Review words", reviewSubtitle: "Core Home words you saved appear here for review.", reviewEmpty: "No saved words yet.", homeHeroKicker: "Home unit · visual learning", homeHeroTitle: "Learn Russian from the things around you", homeHeroSubtitle: "Choose a room, then connect each word to its image, sound, and sentence.", homeHeroCta: "Start today’s review", homeProgressLabel: "Unit progress", roomStripEyebrow: "Explore by place", roomStripTitle: "Choose your next room", roomStripHint: "Select an image to begin", roomWords: "words", roomOpen: "Open section",
      quizTitle: "Quick quiz", quizSubtitle: "Choose the correct translation of the Russian word.", nextQuiz: "New question", speakQuiz: "🔊 Hear the word", quizStatsTitle: "Quiz score", correct: "Correct", wrong: "Wrong", total: "Total", quizFeedbackCorrect: "✅ Correct.", quizFeedbackWrong: "❌ Not quite. The correct answer is highlighted.", quizNeedWords: "You need at least four words to start the quiz.",
      progressTitle: "Progress", progressSubtitle: "A quick summary of what you saved and what needs review.", totalWords: "Total words", savedWords: "Saved", masteredWords: "Mastered", avgMastery: "Average mastery",
      dailyTip: "Try using new words in daily sentences. Practice is the key.",
      labels: { example: "Example", info: "Information", level: "Level", frequency: "Frequency", category: "Category", updated: "Updated", known: "I know it", review: "Review it", mastery: "Mastery" },
      learningStates: { new: "New", learning: "Learning", review: "Due for review", known: "Known", mastered: "Mastered" }, dueNow: "Due now",
      detail: { fullPage: "📖 Full word page", back: "← Back", review: "☆ Review", known: "✓ I know it", grammar: "Grammar comparison", examples: "Examples", phrases: "Useful phrases", info: "Info", word: "Word", type: "Type", singular: "Singular", plural: "Plural", gender: "Gender", example: "Example" },
      a11y: { openMenu: "Open menu", closeMenu: "Close menu", toggleTheme: "Toggle theme", openWord: "Open word details", saveReview: "Save for review", removeReview: "Remove from review", playArabic: "Play Arabic pronunciation", playRussian: "Play Russian pronunciation", playEnglish: "Play English pronunciation", playWord: "Play Russian word pronunciation", gridView: "Grid view", compactView: "Compact view", back: "Back" },
    },
    ru: {
      dir: "ltr", brandSubtitle: "Учите русский легко", vocabNavLabel: "Слова", reviewNavLabel: "Повторение", quizNavLabel: "Тест", progressNavLabel: "Прогресс", quizBadge: "Новый",
      sectionsTitle: "Разделы", unitsTitle: "Модули", streakTitle: "Серия обучения", streakDays: "7 дней", streakNote: "Продолжайте этот блок!", unitKicker: "Блок «{unit}» · визуальное обучение", unitHeroTitle: "Учите {language} через блок «{unit}»", unitHeroSubtitle: "Выберите раздел и свяжите слово с изображением, звуком и примером.", unitReviewSubtitle: "Здесь появляются сохранённые слова из блока «{unit}».", searchPlaceholder: "Найдите слово...", loadError: "Не удалось загрузить данные слов. Перезагрузите страницу и попробуйте снова.",
      pageTitle: "Дом", pageCounterWord: "слов", emptyState: "Нет подходящих результатов.", allSubCategories: "Все подразделы", allLevels: "Все уровни",
      sortPopular: "Наиболее частые", sortAZ: "По алфавиту A-Z", sortZA: "По алфавиту Z-A", sortMastery: "Слабое усвоение",
      playVisible: "🔊 Произнести слова", resetFilters: "Сбросить", reviewTitle: "Слова для повторения", reviewSubtitle: "Здесь появляются сохранённые слова из блока Дом.", reviewEmpty: "Сохранённых слов пока нет.", homeHeroKicker: "Блок «Дом» · визуальное обучение", homeHeroTitle: "Учите русский по предметам вокруг вас", homeHeroSubtitle: "Выберите комнату и свяжите слово с изображением, звуком и примером.", homeHeroCta: "Начать повторение", homeProgressLabel: "Прогресс блока", roomStripEyebrow: "По месту в доме", roomStripTitle: "Выберите следующую комнату", roomStripHint: "Нажмите на изображение", roomWords: "слов", roomOpen: "Открыть раздел",
      quizTitle: "Быстрый тест", quizSubtitle: "Выберите правильный перевод русского слова.", nextQuiz: "Новый вопрос", speakQuiz: "🔊 Слушать слово", quizStatsTitle: "Результат теста", correct: "Верно", wrong: "Ошибка", total: "Всего", quizFeedbackCorrect: "✅ Верно.", quizFeedbackWrong: "❌ Неверно. Правильный ответ выделен.", quizNeedWords: "Для теста нужно не меньше четырёх слов.",
      progressTitle: "Прогресс", progressSubtitle: "Краткая сводка сохранённых и изученных слов.", totalWords: "Всего слов", savedWords: "Сохранено", masteredWords: "Выучено", avgMastery: "Среднее усвоение",
      dailyTip: "Пробуйте использовать новые слова в ежедневных фразах. Практика — ключ.",
      labels: { example: "Пример", info: "Информация", level: "Уровень", frequency: "Частотность", category: "Категория", updated: "Обновлено", known: "Знаю", review: "Повторить", mastery: "Усвоение" },
      learningStates: { new: "Новое", learning: "Изучается", review: "Повторить", known: "Знакомо", mastered: "Выучено" }, dueNow: "Пора повторить",
      detail: { fullPage: "📖 Страница слова", back: "← Назад", review: "☆ Повторение", known: "✓ Знаю", grammar: "Сравнение", examples: "Примеры", phrases: "Полезные фразы", info: "Инфо", word: "Слово", type: "Часть речи", singular: "Ед. число", plural: "Мн. число", gender: "Род", example: "Пример" },
      a11y: { openMenu: "Открыть меню", closeMenu: "Закрыть меню", toggleTheme: "Сменить тему", openWord: "Открыть страницу слова", saveReview: "Сохранить для повторения", removeReview: "Убрать из повторения", playArabic: "Слушать арабское произношение", playRussian: "Слушать русское произношение", playEnglish: "Слушать английское произношение", playWord: "Слушать русское слово", gridView: "Сетка", compactView: "Компактный вид", back: "Назад" },
    }
  };

  const languageCodes = ["ru", "ar", "en"];
  const interfaceLanguageLabels = { ar: "لغة الواجهة", en: "Interface language", ru: "Язык интерфейса" };
  const languageLabels = { ru: "Русский", ar: "العربية", en: "English" };
  const learningLanguageLabels = { ar: "لغة التعلم", en: "Learning language", ru: "Язык обучения" };
  let state = null;

  function configure(options) {
    state = options.state;
  }

  function languageValue(word, lang) {
    return { ru: word.russian, ar: word.arabic, en: word.english }[lang] || "";
  }

  function orderedLanguages() {
    return state.learningLanguage === state.uiLang ? [state.learningLanguage] : [state.learningLanguage, state.uiLang];
  }

  function pronunciationForLanguage(word, lang) {
    if (lang === state.uiLang) return "";
    if (lang === "ru") {
      if (state.uiLang === "ar") return word.transliterationAr || word.transliteration || "";
      if (state.uiLang === "en") return word.transliteration || "";
      return "";
    }
    if (lang === "ar") {
      if (state.uiLang === "ru") return word.arabicTransliterationRu || "";
      if (state.uiLang === "en") return word.arabicTransliterationEn || "";
      return "";
    }
    if (lang === "en") {
      if (state.uiLang === "ru") return word.englishTransliterationRu || "";
      return word.englishTransliterationAr || "";
    }
    return "";
  }

  function wordPronunciation(word, lang = state.learningLanguage) {
    return pronunciationForLanguage(word, lang);
  }

  function examplePronunciation(word, lang) {
    if (lang === state.uiLang) return "";
    if (lang === "ru") {
      if (state.uiLang === "ar") return word.exampleTransliterationAr || "";
      if (state.uiLang === "en") return word.exampleTransliterationEn || "";
    }
    if (lang === "ar") {
      if (state.uiLang === "ru") return word.exampleArTransliterationRu || "";
      if (state.uiLang === "en") return word.exampleArTransliterationEn || "";
    }
    if (lang === "en") {
      if (state.uiLang === "ru") return word.exampleEnTransliterationRu || "";
      return word.exampleEnTransliterationAr || "";
    }
    return "";
  }

  function examplePronunciationForExample(word, example, index, lang) {
    if (lang === state.uiLang) return "";
    const fallback = index === 0 ? examplePronunciation(word, lang) : "";
    if (lang === "ru") {
      if (state.uiLang === "ar") return example.ruTransliterationAr || fallback;
      if (state.uiLang === "en") return example.ruTransliterationEn || fallback;
    }
    if (lang === "ar") {
      if (state.uiLang === "ru") return example.arTransliterationRu || fallback;
      if (state.uiLang === "en") return example.arTransliterationEn || fallback;
    }
    if (lang === "en") {
      if (state.uiLang === "ru") return example.enTransliterationRu || fallback;
      if (state.uiLang === "ar") return example.enTransliterationAr || fallback;
    }
    return "";
  }

  function languageFlag(lang) {
    return { ru: "🇷🇺", ar: "🇸🇦", en: "🇺🇸" }[lang] || "";
  }

  function findRoom(roomId) {
    return (state.rooms || []).find(room => room.id === roomId);
  }

  function roomLabel(roomId) {
    const room = findRoom(roomId);
    return room?.title?.[state.uiLang] || room?.title?.en || roomId;
  }

  function roomIcon(roomId) {
    return findRoom(roomId)?.icon || "📘";
  }

  const learningLanguageNames = {
    ar: { ru: "الروسية", ar: "العربية", en: "الإنجليزية" },
    en: { ru: "Russian", ar: "Arabic", en: "English" },
    ru: { ru: "русский", ar: "арабский", en: "английский" }
  };

  function learningLanguageName(lang) {
    return learningLanguageNames[state.uiLang]?.[lang] || lang;
  }

  window.AppI18N = Object.freeze({ translations, languageCodes, interfaceLanguageLabels, languageLabels, learningLanguageLabels, configure, languageValue, orderedLanguages, pronunciationForLanguage, wordPronunciation, examplePronunciation, examplePronunciationForExample, languageFlag, roomLabel, roomIcon, learningLanguageName });
})();
