(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function detailText(key) {
    const { getTranslation } = dependencies;
    const translation = getTranslation();
    return translation.detail?.[key] || key;
  }

  function audioLabel(lang) {
    const { getTranslation } = dependencies;
    const translation = getTranslation();
    return { ar: translation.a11y.playArabic, ru: translation.a11y.playRussian, en: translation.a11y.playEnglish }[lang] || translation.a11y.playWord;
  }

  function exampleLineForLanguage(word, lang) {
    const { languageLabels, examplePronunciation, escapeHTML } = dependencies;
    const values = { ru: word.exampleRu, ar: word.exampleAr, en: word.exampleEn };
    const text = values[lang] || "";
    const pronunciation = examplePronunciation(word, lang);
    const dir = lang === "ar" ? "" : ' dir="ltr"';
    return `<div class="detail-example-line"><div class="detail-example-copy"><span class="example-language-label">${escapeHTML(languageLabels[lang])}</span><p${dir}>${escapeHTML(text)}</p>${pronunciation ? `<small class="example-pronunciation" dir="auto">[${escapeHTML(pronunciation)}]</small>` : ""}</div><button class="small-icon-btn" data-audio="sentence" data-lang="${lang}" data-id="${word.id}" type="button" aria-label="${escapeHTML(audioLabel(lang))}">&#128266;</button></div>`;
  }

  function renderDetail() {
    const { els } = dependencies;
    if (!els.detailPane) return;
    const { state, getTranslation, languageValue, orderedLanguages, wordPronunciation, escapeHTML, levelClass, translationRows, audioButtons, playAudio, openFullDetail, changeMastery, toggleFavorite } = dependencies;
    const word = state.words.find(item => item.id === state.selectedWordId);
    if (!word) {
      els.detailPane.innerHTML = "";
      return;
    }
    const translation = getTranslation();
    const stars = "⭐".repeat(Number(word.frequency || 1));
    const mastery = state.mastery[word.id] || 0;
    els.detailPane.innerHTML = `
      <div class="detail-image"><img src="${escapeHTML(word.imagePath)}" alt="${escapeHTML(`${word.russian} — ${word.arabic}`)}"/></div>
      <h2 class="detail-word">${escapeHTML(languageValue(word, state.learningLanguage))}</h2>
      ${wordPronunciation(word) ? `<p class="detail-translit">[${escapeHTML(wordPronunciation(word))}]</p>` : ""}
      <div class="detail-translations">${translationRows(word)}</div>
      <div class="detail-audio-row">${audioButtons(word, true)}</div>
      <button class="secondary-btn open-detail-btn" data-open-detail="${word.id}" type="button">${detailText("fullPage")}</button>
      <div class="detail-block">
        <h3>${escapeHTML(translation.labels.example)}</h3>
        ${orderedLanguages().map(lang => exampleLineForLanguage(word, lang)).join("")}
      </div>
      <div class="detail-block">
        <h3>${escapeHTML(translation.labels.info)}</h3>
        <div class="detail-info-grid">
          <span class="label">${escapeHTML(translation.labels.level)}</span><span class="badge ${levelClass(word.level)}">${escapeHTML(word.level)}</span>
          <span class="label">${escapeHTML(translation.labels.frequency)}</span><span class="stars">${stars}</span>
          <span class="label">${escapeHTML(translation.labels.category)}</span><span>${escapeHTML(translation.categories[word.subCategory] || word.subCategory)}</span>
          <span class="label">${escapeHTML(translation.labels.mastery)}</span><span class="badge">${mastery}%</span>
          <span class="label">${escapeHTML(translation.labels.updated)}</span><span>${escapeHTML(word.addedAt || "2026-07-05")}</span>
        </div>
        <div class="mastery-actions">
          <button class="mastery-btn known" data-known="${word.id}" type="button">${escapeHTML(translation.labels.known)}</button>
          <button class="mastery-btn review" data-review="${word.id}" type="button">${escapeHTML(translation.labels.review)}</button>
        </div>
      </div>`;
    els.detailPane.querySelectorAll("[data-audio]").forEach(button => button.addEventListener("click", () => playAudio(button.dataset.id, button.dataset.audio, button.dataset.lang)));
    const openButton = els.detailPane.querySelector("[data-open-detail]");
    if (openButton) openButton.addEventListener("click", () => openFullDetail(openButton.dataset.openDetail));
    els.detailPane.querySelector("[data-known]").addEventListener("click", () => changeMastery(word.id, +25));
    els.detailPane.querySelector("[data-review]").addEventListener("click", () => { toggleFavorite(word.id, true); changeMastery(word.id, -10); });
  }

  function openFullDetail(id) {
    const { state, switchView } = dependencies;
    history.replaceState({ view: state.activeView, scrollY: window.scrollY }, "");
    state.selectedWordId = id;
    switchView("wordDetail");
    history.pushState({ view: "wordDetail", id }, "", `#word/${id}`);
  }

  function renderFullWordDetail() {
    const { state, els, orderedLanguages, languageValue, wordPronunciation, examplePronunciationForExample, escapeHTML, meaningCards, languageFlag, languageLabels, speak } = dependencies;
    const word = state.words.find(item => item.id === state.selectedWordId);
    if (!word || !els.fullWordDetail) return;
    if (els.backToWordsBtn) els.backToWordsBtn.textContent = detailText("back");
    if (els.detailMarkReviewBtn) els.detailMarkReviewBtn.textContent = detailText("review");
    if (els.detailKnownBtn) els.detailKnownBtn.textContent = detailText("known");

    const grammar = word.grammar || {};
    const examples = word.examples || [];
    const phrases = word.phrases || [];
    const showGenderComparison = orderedLanguages().includes("ru") && orderedLanguages().includes("ar");
    els.fullWordDetail.innerHTML = `
      <section class="full-detail-hero">
        <div class="full-detail-image"><img src="${escapeHTML(word.imagePath)}" alt="${escapeHTML(`${word.russian} — ${word.arabic}`)}"/></div>
        <div class="full-detail-head">
          <h1 class="full-detail-word">${escapeHTML(languageValue(word, state.learningLanguage))}</h1>
          ${wordPronunciation(word) ? `<p class="full-detail-translit">[${escapeHTML(wordPronunciation(word))}]</p>` : ""}
          <div class="full-detail-meanings">
            <div class="meaning-card"><strong>${escapeHTML(word.russian)}</strong></div>
            <div class="meaning-card"><strong>${escapeHTML(word.arabic)}</strong></div>
            <div class="meaning-card"><strong>${escapeHTML(word.english)}</strong></div>
          </div>
        </div>
      </section>
      <section class="detail-section-card"><h3>${detailText("grammar")}</h3>${renderGrammarTable(grammar)}</section>
      <section class="detail-section-card"><h3>${detailText("examples")}</h3><div class="example-stack">${examples.slice(0, 3).map((example, index) => renderExampleCard(word, example, index)).join("")}</div></section>
      ${phrases.length ? `<section class="detail-section-card"><h3>${detailText("phrases")}</h3><div class="phrase-grid">${phrases.slice(0, 6).map(renderPhraseCard).join("")}</div></section>` : ""}
      ${showGenderComparison ? `<section class="detail-section-card"><h3>${genderText("title")}</h3>${renderGenderComparison(grammar)}</section>` : ""}`;

    const meaningCardGrid = els.fullWordDetail.querySelector(".full-detail-meanings");
    if (meaningCardGrid) meaningCardGrid.innerHTML = meaningCards(word);
    els.fullWordDetail.querySelectorAll("[data-example-audio]").forEach(button => button.addEventListener("click", () => playExampleAudio(word, Number(button.dataset.exampleIndex), button.dataset.lang)));
  }

  function renderGrammarTable(grammar) {
    const { orderedLanguages, languageFlag, languageLabels, escapeHTML } = dependencies;
    const grammarByLanguage = { ru: grammar.ru || {}, ar: grammar.ar || {}, en: grammar.en || {} };
    const languages = orderedLanguages();
    const rows = [
      [detailText("word"), ...languages.map(lang => grammarByLanguage[lang]?.word)],
      [detailText("type"), ...languages.map(lang => grammarByLanguage[lang]?.type)],
      [detailText("singular"), ...languages.map(lang => grammarByLanguage[lang]?.singular)],
      [detailText("plural"), ...languages.map(lang => grammarByLanguage[lang]?.plural)],
      [detailText("gender"), ...languages.map(lang => grammarByLanguage[lang]?.gender)]
    ];
    const headers = languages.map(lang => `<th>${languageFlag(lang)} ${escapeHTML(languageLabels[lang])}</th>`).join("");
    const cells = rows.map(row => `<tr><td>${escapeHTML(row[0])}</td>${row.slice(1).map(value => `<td dir="auto">${escapeHTML(value || "—")}</td>`).join("")}</tr>`).join("");
    return `<div class="tri-table-wrap"><table class="tri-table"><thead><tr><th>${detailText("info")}</th>${headers}</tr></thead><tbody>${cells}</tbody></table></div>`;
  }

  const genderMeta = {
    masculine: { emoji: "👦", ar: "مذكر", en: "Masculine", ru: "мужской" },
    feminine: { emoji: "👧", ar: "مؤنث", en: "Feminine", ru: "женский" },
    neuter: { emoji: "⚪", ar: "محايد روسي", en: "Neuter", ru: "средний" },
    "plural-only": { emoji: "👥", ar: "جمع فقط", en: "Plural-only", ru: "только множественное" },
    unknown: { emoji: "❔", ar: "غير محدد", en: "Not specified", ru: "не указан" }
  };

  function normalizeGender(value, lang) {
    const text = String(value || "").toLowerCase();
    if (lang === "ru") {
      if (text.includes("masculine")) return "masculine";
      if (text.includes("feminine")) return "feminine";
      if (text.includes("neuter")) return "neuter";
      if (text.includes("plural-only")) return "plural-only";
    }
    if (lang === "ar") {
      if (text.includes("مذكر")) return "masculine";
      if (text.includes("مؤنث")) return "feminine";
    }
    return "unknown";
  }

  function genderText(key) {
    const { state } = dependencies;
    const dictionary = {
      ar: { title: "مقارنة الجنس", same: "الجنس متشابه في الروسية والعربية", different: "تنبيه: الجنس مختلف بين الروسية والعربية", russian: "الروسية", arabic: "العربية" },
      en: { title: "Gender comparison", same: "The gender matches in Russian and Arabic", different: "Notice: the gender differs between Russian and Arabic", russian: "Russian", arabic: "Arabic" },
      ru: { title: "Сравнение рода", same: "Род совпадает в русском и арабском языках", different: "Внимание: род различается в русском и арабском языках", russian: "Русский", arabic: "Арабский" }
    };
    return dictionary[state.uiLang]?.[key] || dictionary.en[key] || key;
  }

  function renderGenderComparison(grammar) {
    const { state, escapeHTML } = dependencies;
    const ruKey = normalizeGender(grammar.ru?.gender, "ru");
    const arKey = normalizeGender(grammar.ar?.gender, "ar");
    const matches = ruKey !== "unknown" && arKey !== "unknown" && ruKey === arKey;
    const ruMeta = genderMeta[ruKey] || genderMeta.unknown;
    const arMeta = genderMeta[arKey] || genderMeta.unknown;
    const statusClass = matches ? "is-matching" : "is-different";
    const statusIcon = matches ? "✅" : "⚠️";
    return `<div class="gender-comparison ${statusClass}" role="status">
      <div class="gender-status"><span class="gender-status-icon" aria-hidden="true">${statusIcon}</span><strong>${escapeHTML(genderText(matches ? "same" : "different"))}</strong></div>
      <div class="gender-values">
        <div class="gender-value"><span class="gender-language">🇷🇺 ${escapeHTML(genderText("russian"))}</span><span class="gender-symbol" aria-hidden="true">${ruMeta.emoji}</span><bdi class="gender-label" dir="auto">${escapeHTML(ruMeta[state.uiLang] || ruMeta.en)}</bdi></div>
        <div class="gender-value"><span class="gender-language">🇸🇦 ${escapeHTML(genderText("arabic"))}</span><span class="gender-symbol" aria-hidden="true">${arMeta.emoji}</span><bdi class="gender-label" dir="auto">${escapeHTML(arMeta[state.uiLang] || arMeta.ar)}</bdi></div>
      </div>
    </div>`;
  }

  function renderExampleCard(word, example, index) {
    const { orderedLanguages, languageFlag, examplePronunciationForExample, escapeHTML } = dependencies;
    const lines = orderedLanguages().map(lang => {
      const pronunciation = examplePronunciationForExample(word, example, index, lang);
      return `<div class="example-line"><span class="flag">${languageFlag(lang)} ${lang.toUpperCase()}</span><span class="example-line-copy" dir="auto"><span>${escapeHTML(example[lang] || "")}</span>${pronunciation ? `<small class="example-pronunciation" dir="auto">[${escapeHTML(pronunciation)}]</small>` : ""}</span><button class="small-icon-btn" data-example-audio="1" data-example-index="${index}" data-lang="${lang}" type="button" aria-label="${escapeHTML(audioLabel(lang))}">🔊</button></div>`;
    }).join("");
    return `<article class="example-card"><div class="example-card-head"><span>${detailText("example")} ${index + 1}</span></div><div class="example-lines">${lines}</div></article>`;
  }

  function renderPhraseCard(phrase) {
    const { orderedLanguages, escapeHTML } = dependencies;
    return `<div class="phrase-card">${orderedLanguages().map(lang => `<div class="${lang}" dir="auto">${escapeHTML(phrase[lang] || "")}</div>`).join("")}</div>`;
  }

  function playExampleAudio(word, index, lang) {
    const { speak } = dependencies;
    const example = (word.examples || [])[index];
    if (!example) return;
    const text = example[lang] || "";
    const source = example.audio && example.audio[lang];
    const voice = { ar: "ar-SA", ru: "ru-RU", en: "en-US" }[lang];
    if (source) {
      const audio = new Audio(source);
      const fallback = () => speak(text, voice);
      audio.addEventListener("error", fallback, { once: true });
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") playback.catch(fallback);
    } else {
      speak(text, voice);
    }
  }

  window.AppDetail = Object.freeze({ configure, renderDetail, renderFullWordDetail, openFullDetail, detailText, audioLabel, exampleLineForLanguage });
})();
