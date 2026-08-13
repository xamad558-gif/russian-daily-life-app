(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function saveFavoriteOnly(id) {
    const { state, storage } = dependencies;
    state.saved.add(id);
    storage.saveFavorites([...state.saved]);
  }

  function updateMasteryOnly(id, delta) {
    const { state, storage, learning } = dependencies;
    const current = state.mastery[id] || 0;
    state.mastery[id] = Math.max(0, Math.min(100, current + delta));
    storage.saveProgress({ mastery: state.mastery });
    if (learning) learning.syncMastery(id);
  }

  function changeMastery(id, delta) {
    const { state, learning, renderCards, renderDetail, updateMetrics, render } = dependencies;
    updateMasteryOnly(id, delta);
    if (learning) learning.recordManual(id, delta);
    renderCards();
    renderDetail();
    updateMetrics();
    if (state.activeView === "progress") render();
  }

  function updateMetrics() {
    const { state, els, renderHomeHero, learning } = dependencies;
    els.vocabCount.textContent = state.words.length;
    els.reviewCount.textContent = learning ? learning.reviewWords(state.words).length : state.saved.size;
    const values = state.words.map(word => state.mastery[word.id] || 0);
    const average = values.length ? Math.round(values.reduce((total, value) => total + value, 0) / values.length) : 0;
    const mastered = values.filter(value => value >= 80).length;
    els.totalWordsMetric.textContent = state.words.length;
    els.savedWordsMetric.textContent = state.saved.size;
    els.masteredWordsMetric.textContent = mastered;
    els.avgMasteryMetric.textContent = `${average}%`;
    els.overallProgressFill.style.width = `${average}%`;
    renderHomeHero(average);
  }

  function render() {
    const { state, els, orderedLanguages, languageValue, escapeHTML, getTranslation, learning } = dependencies;
    const translation = getTranslation();
    updateMetrics();
    els.masteryList.innerHTML = state.words.map(word => {
      const mastery = state.mastery[word.id] || 0;
      const secondary = orderedLanguages().slice(1).map(lang => languageValue(word, lang)).join(" / ");
      const learningState = learning ? learning.get(word.id) : { status: mastery >= 80 ? "mastered" : "new" };
      const statusLabel = translation.learningStates[learningState.status] || learningState.status;
      const dueLabel = learning && learning.isDue(word.id) ? `<small class="learning-due">${escapeHTML(translation.dueNow)}</small>` : "";
      return `<div class="mastery-item"><div><strong>${escapeHTML(languageValue(word, state.learningLanguage))}</strong><span> — ${escapeHTML(secondary)}</span><span class="learning-status status-${escapeHTML(learningState.status)}">${escapeHTML(statusLabel)}</span>${dueLabel}</div><div class="mastery-track"><div class="mastery-fill" style="width:${mastery}%"></div></div></div>`;
    }).join("");
  }

  window.AppProgress = Object.freeze({ configure, saveFavoriteOnly, updateMasteryOnly, changeMastery, updateMetrics, render });
})();
