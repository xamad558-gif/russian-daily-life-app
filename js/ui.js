(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function queryAll(selector) {
    return [...document.querySelectorAll(selector)];
  }

  function applyUiLanguage(lang) {
    const { state, els, storage, languageCodes, getTranslation, interfaceLanguageLabels, learningLanguageLabels, detailText, renderCategoryMenu, renderRoomStrip, applyFilters, renderQuiz, renderFullWordDetail, updateMetrics, renderReview, renderProgress } = dependencies;
    const previousUiLang = state.uiLang;
    state.uiLang = lang;
    storage.write("uiLang", lang);
    if (state.learningLanguage === lang) {
      state.learningLanguage = previousUiLang !== lang ? previousUiLang : languageCodes.find(code => code !== lang);
      storage.write("learningLanguage", state.learningLanguage);
    }
    const translation = getTranslation();
    document.body.dataset.uiLang = lang;
    document.body.dataset.learningLanguage = state.learningLanguage;
    document.documentElement.lang = lang;
    document.documentElement.dir = translation.dir;
    els.sidebarToggle.setAttribute("aria-label", document.body.classList.contains("sidebar-open") ? translation.a11y.closeMenu : translation.a11y.openMenu);
    els.sidebarToggle.setAttribute("aria-expanded", String(document.body.classList.contains("sidebar-open")));
    els.sidebarToggle.setAttribute("aria-controls", "sidebar");
    els.themeToggle.setAttribute("aria-label", translation.a11y.toggleTheme);
    els.backToWordsBtn.textContent = detailText("back");
    els.backToWordsBtn.setAttribute("aria-label", translation.a11y.back);
    els.detailSpeakRuBtn.setAttribute("aria-label", translation.a11y.playRussian);
    els.viewButtons.forEach(button => button.setAttribute("aria-label", button.dataset.density === "grid" ? translation.a11y.gridView : translation.a11y.compactView));
    Object.entries({
      brandSubtitle: "brandSubtitle", vocabNavLabel: "vocabNavLabel", reviewNavLabel: "reviewNavLabel", quizNavLabel: "quizNavLabel", progressNavLabel: "progressNavLabel", quizBadge: "quizBadge",
      sectionsTitle: "sectionsTitle", streakTitle: "streakTitle", streakDays: "streakDays", streakNote: "streakNote", pageTitle: "pageTitle", playVisibleBtn: "playVisible", resetFiltersBtn: "resetFilters",
      reviewTitle: "reviewTitle", reviewSubtitle: "reviewSubtitle", reviewEmpty: "reviewEmpty", quizTitle: "quizTitle", quizSubtitle: "quizSubtitle", nextQuizBtn: "nextQuiz", speakQuizBtn: "speakQuiz",
      quizStatsTitle: "quizStatsTitle", correctLabel: "correct", wrongLabel: "wrong", totalLabel: "total", progressTitle: "progressTitle", progressSubtitle: "progressSubtitle",
      totalWordsMetricLabel: "totalWords", savedWordsMetricLabel: "savedWords", masteredWordsMetricLabel: "masteredWords", avgMasteryMetricLabel: "avgMastery", dailyTipText: "dailyTip", emptyState: "emptyState", heroKicker: "homeHeroKicker", heroTitle: "homeHeroTitle", heroSubtitle: "homeHeroSubtitle", heroReviewBtn: "homeHeroCta", heroProgressLabel: "homeProgressLabel", roomStripEyebrow: "roomStripEyebrow", roomStripTitle: "roomStripTitle", roomStripHint: "roomStripHint"
    }).forEach(([elementKey, translationKey]) => {
      if (els[elementKey]) els[elementKey].textContent = translation[translationKey];
    });
    els.searchInput.placeholder = translation.searchPlaceholder;
    if (els.learningLanguageLabel) els.learningLanguageLabel.textContent = lang === "ru" ? "Язык обучения" : (learningLanguageLabels[lang] || learningLanguageLabels.en);
    if (els.interfaceLanguageLabel) els.interfaceLanguageLabel.textContent = lang === "ru" ? "Язык интерфейса" : (interfaceLanguageLabels[lang] || interfaceLanguageLabels.en);
    els.subCategoryFilter.options[0].text = translation.allSubCategories;
    [...els.subCategoryFilter.options].forEach((option, index) => { if (index) option.text = translation.categories[option.value] || option.value; });
    els.levelFilter.options[0].text = translation.allLevels;
    els.sortFilter.options[0].text = translation.sortPopular;
    els.sortFilter.options[1].text = translation.sortAZ;
    els.sortFilter.options[2].text = translation.sortZA;
    els.sortFilter.options[3].text = translation.sortMastery;
    els.langButtons.forEach(button => button.classList.toggle("active", button.dataset.uiLang === lang));
    syncLanguageAvailability();
    renderCategoryMenu();
    renderRoomStrip();
    applyFilters();
    renderQuiz();
    renderFullWordDetail();
    updateMetrics();
    if (state.activeView === "review") renderReview();
    if (state.activeView === "progress") renderProgress();
  }

  function syncLanguageAvailability() {
    const { state, els } = dependencies;
    els.langButtons.forEach(button => {
      button.disabled = false;
      button.removeAttribute("aria-disabled");
    });
    els.learningLanguageButtons.forEach(button => {
      const unavailable = button.dataset.learningLang === state.uiLang;
      button.hidden = unavailable;
      button.disabled = unavailable;
      button.setAttribute("aria-hidden", String(unavailable));
    });
  }

  function applyLearningLanguage(lang) {
    const { state, els, storage, languageCodes, renderCards, renderDetail, renderFullWordDetail, renderQuiz, updateMetrics, renderReview, renderProgress } = dependencies;
    if (!languageCodes.includes(lang) || lang === state.uiLang) lang = languageCodes.find(code => code !== state.uiLang);
    state.learningLanguage = lang;
    storage.write("learningLanguage", lang);
    document.body.dataset.learningLanguage = lang;
    els.learningLanguageButtons.forEach(button => {
      const active = button.dataset.learningLang === lang;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    syncLanguageAvailability();
    renderCards();
    renderDetail();
    renderFullWordDetail();
    renderQuiz();
    updateMetrics();
    if (state.activeView === "review") renderReview();
    if (state.activeView === "progress") renderProgress();
  }

  function switchView(view) {
    const { state, renderReview, renderQuiz, renderProgress, renderFullWordDetail } = dependencies;
    state.activeView = view;
    document.body.dataset.view = view;
    queryAll("[data-view-btn]").forEach(button => button.classList.toggle("active", button.dataset.viewBtn === view));
    ["vocabulary", "wordDetail", "review", "quiz", "progress"].forEach(viewName => {
      const panel = document.querySelector(`#${viewName}View`);
      if (panel) panel.classList.toggle("hidden", viewName !== view);
    });
    setSidebarOpen(false);
    window.scrollTo(0, 0);
    if (view !== "wordDetail") history.replaceState({ view }, "");
    if (view === "review") renderReview();
    if (view === "quiz") renderQuiz();
    if (view === "progress") renderProgress();
    if (view === "wordDetail") renderFullWordDetail();
  }

  function applyTheme(theme) {
    const { state, els, storage } = dependencies;
    state.theme = theme;
    storage.write("theme", theme);
    document.body.classList.toggle("dark", theme === "dark");
    els.themeToggle.textContent = theme === "dark" ? "☀" : "☾";
    els.themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
  }

  function setSidebarOpen(open) {
    const { state, els, getTranslation } = dependencies;
    document.body.classList.toggle("sidebar-open", open);
    const translation = getTranslation();
    els.sidebarToggle.setAttribute("aria-expanded", String(open));
    els.sidebarToggle.setAttribute("aria-label", open ? translation.a11y.closeMenu : translation.a11y.openMenu);
  }

  function setDensity(density) {
    const { state, els, storage, renderCards } = dependencies;
    state.density = density;
    storage.write("density", density);
    queryAll("[data-density]").forEach(button => button.classList.toggle("active", button.dataset.density === density));
    renderCards();
  }

  window.AppUI = Object.freeze({ configure, applyUiLanguage, syncLanguageAvailability, applyLearningLanguage, switchView, applyTheme, setSidebarOpen, setDensity });
})();
