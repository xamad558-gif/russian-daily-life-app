(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function queryAll(selector) {
    return [...document.querySelectorAll(selector)];
  }

  async function init() {
    const { state, dataVersion, storage, learning, languageCodes, els, populateSubcategories, applyTheme, applyUiLanguage, applyLearningLanguage, switchView, applyFilters, updateMetrics } = dependencies;
    const response = await fetch(`data/words.json?v=${dataVersion}`, { cache: "no-store" });
    state.words = await response.json();
    state.words.forEach(word => { if (state.mastery[word.id] === undefined) state.mastery[word.id] = word.masteryDefault || 0; });
    storage.write("mastery", state.mastery);
    learning.ensure(state.words);
    state.selectedWordId = state.words[0]?.id || null;
    bindEvents();
    populateSubcategories();
    applyTheme(state.theme);
    if (state.learningLanguage === state.uiLang) {
      state.learningLanguage = languageCodes.find(code => code !== state.uiLang);
      storage.write("learningLanguage", state.learningLanguage);
    }
    applyUiLanguage(state.uiLang);
    applyLearningLanguage(state.learningLanguage);
    switchView(state.activeView);
    applyFilters();
    updateMetrics();
  }

  function bindEvents() {
    const { state, els, storage, applyFilters, applyUiLanguage, applyLearningLanguage, switchView, setDensity, setSidebarOpen, applyTheme, playVisibleWords, resetFilters, renderQuiz, playAudio, toggleFavorite, changeMastery } = dependencies;
    els.searchInput.addEventListener("input", applyFilters);
    els.subCategoryFilter.addEventListener("change", () => { if (els.subCategoryFilter.value !== "all") { state.lastRoom = els.subCategoryFilter.value; storage.write("lastRoom", state.lastRoom); } applyFilters(); });
    els.levelFilter.addEventListener("change", applyFilters);
    els.sortFilter.addEventListener("change", applyFilters);
    els.langButtons.forEach(button => button.addEventListener("click", () => applyUiLanguage(button.dataset.uiLang)));
    els.learningLanguageButtons.forEach(button => button.addEventListener("click", () => applyLearningLanguage(button.dataset.learningLang)));
    queryAll("[data-view-btn]").forEach(button => button.addEventListener("click", () => switchView(button.dataset.viewBtn)));
    queryAll("[data-density]").forEach(button => button.addEventListener("click", () => setDensity(button.dataset.density)));
    els.sidebarToggle.addEventListener("click", () => setSidebarOpen(!document.body.classList.contains("sidebar-open")));
    els.sidebarBackdrop.addEventListener("click", () => setSidebarOpen(false));
    els.themeToggle.addEventListener("click", () => applyTheme(state.theme === "dark" ? "light" : "dark"));
    els.playVisibleBtn.addEventListener("click", playVisibleWords);
    els.resetFiltersBtn.addEventListener("click", resetFilters);
    els.nextQuizBtn.addEventListener("click", renderQuiz);
    els.speakQuizBtn.addEventListener("click", () => state.currentQuiz && playAudio(state.currentQuiz.id, "word", state.learningLanguage));
    if (els.backToWordsBtn) els.backToWordsBtn.addEventListener("click", () => switchView("vocabulary"));
    if (els.heroReviewBtn) els.heroReviewBtn.addEventListener("click", () => switchView("review"));
    if (els.detailSpeakRuBtn) els.detailSpeakRuBtn.addEventListener("click", () => state.selectedWordId && playAudio(state.selectedWordId, "word", "ru"));
    if (els.detailMarkReviewBtn) els.detailMarkReviewBtn.addEventListener("click", () => state.selectedWordId && toggleFavorite(state.selectedWordId, true));
    if (els.detailKnownBtn) els.detailKnownBtn.addEventListener("click", () => state.selectedWordId && changeMastery(state.selectedWordId, +25));
  }

  function renderReview() {
    const { state, els, reviewWords, cardTemplate, bindCardButtons, bindCardInteractions, switchView, renderCards, renderDetail } = dependencies;
    const wordsForReview = reviewWords(state.words);
    els.reviewGrid.innerHTML = wordsForReview.map(cardTemplate).join("");
    els.reviewEmpty.classList.toggle("hidden", wordsForReview.length > 0);
    bindCardButtons(els.reviewGrid);
    bindCardInteractions(els.reviewGrid, id => { state.selectedWordId = id; switchView("vocabulary"); renderCards(); renderDetail(); });
  }

  function renderHomeHero(average) {
    const { state, els, rooms, getTranslation, languageValue, orderedLanguages } = dependencies;
    if (!els.heroProgressValue) return;
    const translation = getTranslation();
    const roomId = els.subCategoryFilter.value !== "all" ? els.subCategoryFilter.value : state.lastRoom;
    const room = rooms.find(item => item.id === roomId) || rooms[0];
    const roomWord = state.words.find(word => word.subCategory === room.id) || state.words[0];
    els.heroProgressValue.textContent = `${average}%`;
    els.heroProgressFill.style.width = `${average}%`;
    els.heroPhoto.src = room.image;
    els.heroPhoto.alt = translation.categories[room.id] || room.id;
    els.heroPhotoLabel.textContent = translation.categories[room.id] || room.id;
    els.heroWordLabel.textContent = roomWord ? languageValue(roomWord, state.learningLanguage) : "";
    els.heroWordMeaning.textContent = roomWord ? orderedLanguages().slice(1).map(lang => languageValue(roomWord, lang)).join(" · ") : "";
  }

  async function playVisibleWords() {
    const { state, playAudio, wait } = dependencies;
    for (const word of state.filtered.slice(0, 8)) {
      playAudio(word.id, "word", state.learningLanguage);
      await wait(950);
    }
  }

  window.AppController = Object.freeze({ configure, init, renderReview, renderHomeHero, playVisibleWords });
})();
