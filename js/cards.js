(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function translationRows(word) {
    const { orderedLanguages, pronunciationForLanguage, languageValue, escapeHTML } = dependencies;
    return orderedLanguages().slice(1).map(lang => {
      const pronunciation = pronunciationForLanguage(word, lang);
      return `<div class="card-translation"><bdi dir="auto">${escapeHTML(languageValue(word, lang))}</bdi>${pronunciation ? `<small class="card-translation-pronunciation" dir="ltr">[${escapeHTML(pronunciation)}]</small>` : ""}</div>`;
    }).join("");
  }

  function audioButtons(word, includeText = false) {
    const { state, orderedLanguages, languageValue, languageFlag, escapeHTML, getTranslation } = dependencies;
    const translation = getTranslation();
    return orderedLanguages().map(lang => {
      const labelKey = `play${lang === "ru" ? "Russian" : lang === "ar" ? "Arabic" : "English"}`;
      return `<button class="audio-btn ${lang}" data-audio="word" data-lang="${lang}" data-id="${word.id}" type="button" aria-label="${escapeHTML(translation.a11y[labelKey])}">${languageFlag(lang)} 🔊${includeText ? ` ${escapeHTML(languageValue(word, lang))}` : ""}</button>`;
    }).join("");
  }

  function meaningCards(word) {
    const { orderedLanguages, pronunciationForLanguage, languageValue, escapeHTML } = dependencies;
    return orderedLanguages().map((lang, index) => {
      const pronunciation = index === 0 ? "" : pronunciationForLanguage(word, lang);
      return `<div class="meaning-card ${index === 0 ? "is-target" : ""}"><strong>${escapeHTML(languageValue(word, lang))}</strong>${pronunciation ? `<small class="meaning-card-pronunciation" dir="ltr">[${escapeHTML(pronunciation)}]</small>` : ""}</div>`;
    }).join("");
  }

  function cardTemplate(word) {
    const { state, getTranslation, languageValue, wordPronunciation, escapeHTML, levelClass } = dependencies;
    const translation = getTranslation();
    const saved = state.saved.has(word.id);
    const mastery = state.mastery[word.id] || 0;
    return `
      <article class="word-card ${state.selectedWordId === word.id ? "active" : ""}" data-card="${word.id}" role="button" tabindex="0" aria-label="${escapeHTML(`${translation.a11y.openWord}: ${languageValue(word, state.learningLanguage)}`)}">
        <div class="card-image-wrap">
          <img src="${escapeHTML(word.imagePath)}" alt="${escapeHTML(`${word.russian} — ${word.arabic}`)}" loading="lazy"/>
          <button class="favorite-btn ${saved ? "saved" : ""}" data-fav="${word.id}" type="button" aria-label="${escapeHTML(saved ? translation.a11y.removeReview : translation.a11y.saveReview)}" aria-pressed="${saved}">${saved ? "★" : "☆"}</button>
          <span class="mastery-chip">${mastery}%</span>
          <span class="level-chip ${levelClass(word.level)}">${escapeHTML(word.level || "")}</span>
        </div>
        <div class="card-body">
          <h3 class="card-word">${escapeHTML(languageValue(word, state.learningLanguage))}</h3>
          ${wordPronunciation(word) ? `<p class="card-translit">[${escapeHTML(wordPronunciation(word))}]</p>` : ""}
          <div class="card-translations">${translationRows(word)}</div>
          <div class="audio-row">${audioButtons(word)}</div>
        </div>
      </article>`;
  }

  function bindCardInteractions(root, onOpen) {
    root.querySelectorAll("[data-card]").forEach(card => {
      const open = () => onOpen(card.dataset.card);
      card.addEventListener("click", event => {
        if (event.target.closest("[data-fav]") || event.target.closest("[data-audio]")) return;
        open();
      });
      card.addEventListener("keydown", event => {
        if (event.target.closest("button") || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
        open();
      });
    });
  }

  function bindCardButtons(root) {
    const { toggleFavorite, playAudio } = dependencies;
    root.querySelectorAll("[data-fav]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); toggleFavorite(button.dataset.fav); }));
    root.querySelectorAll("[data-audio]").forEach(button => button.addEventListener("click", event => { event.stopPropagation(); playAudio(button.dataset.id, button.dataset.audio, button.dataset.lang); }));
  }

  function render() {
    const { state, els, renderDetail } = dependencies;
    els.cardsGrid.classList.toggle("compact", state.density === "compact");
    els.cardsGrid.innerHTML = state.filtered.map(cardTemplate).join("");
    bindCardInteractions(els.cardsGrid, id => { state.selectedWordId = id; render(); renderDetail(); });
    bindCardButtons(els.cardsGrid);
  }

  window.AppCards = Object.freeze({ configure, translationRows, audioButtons, meaningCards, cardTemplate, bindCardInteractions, bindCardButtons, render });
})();
