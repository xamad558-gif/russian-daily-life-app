(function () {
  let dependencies = null;

  function configure(options) {
    dependencies = options;
  }

  function shuffleItems(items) {
    const shuffled = [...items];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
    }
    return shuffled;
  }

  function optionText(word) {
    const { orderedLanguages, languageValue, escapeHTML } = dependencies;
    return orderedLanguages().slice(1).map(lang => `<bdi dir="auto">${escapeHTML(languageValue(word, lang))}</bdi>`).join(" — ");
  }

  function render() {
    const { state, els, getTranslation, escapeHTML, languageValue, wordPronunciation, playAudio, learning } = dependencies;
    const candidates = state.filtered.length >= 4 ? state.filtered : state.words;
    const prioritized = learning ? learning.prioritize(candidates) : candidates;
    const pool = prioritized.slice(0, Math.max(4, Math.min(prioritized.length, 12)));
    const translation = getTranslation();
    state.quizAnswered = false;
    if (pool.length < 4) {
      els.quizBox.innerHTML = `<p class="empty-state">${escapeHTML(translation.quizNeedWords)}</p>`;
      return;
    }
    const correct = pool[Math.floor(Math.random() * pool.length)];
    state.currentQuiz = correct;
    const options = shuffleItems([correct, ...shuffleItems(candidates.filter(word => word.id !== correct.id)).slice(0, 3)]);
    const quizValue = languageValue(correct, state.learningLanguage);
    els.quizBox.innerHTML = `
      <div class="quiz-word" role="button" tabindex="0" aria-label="${escapeHTML(`${translation.a11y.playWord}: ${quizValue}`)}">${escapeHTML(quizValue)}</div>
      ${wordPronunciation(correct) ? `<p class="quiz-translit">[${escapeHTML(wordPronunciation(correct))}]</p>` : ""}
      <div class="quiz-options">
        ${options.map(word => `<button class="quiz-option" data-answer="${word.id}" type="button">${optionText(word)}</button>`).join("")}
      </div>
      <div id="quizFeedback" class="quiz-feedback hidden"></div>`;
    const quizWord = els.quizBox.querySelector(".quiz-word");
    quizWord.addEventListener("click", () => playAudio(correct.id, "word", state.learningLanguage));
    quizWord.addEventListener("keydown", event => {
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      playAudio(correct.id, "word", state.learningLanguage);
    });
    els.quizBox.querySelectorAll("[data-answer]").forEach(button => button.addEventListener("click", () => check(button)));
    updateStats();
  }

  function check(button) {
    const { state, els, getTranslation, storage, recordAnswer, saveFavoriteOnly, updateMetrics, renderCards, renderDetail, playAudio } = dependencies;
    if (state.quizAnswered || !state.currentQuiz) return;
    state.quizAnswered = true;
    const correctAnswer = button.dataset.answer === state.currentQuiz.id;
    const feedback = els.quizBox.querySelector("#quizFeedback");
    els.quizBox.querySelectorAll(".quiz-option").forEach(option => {
      option.disabled = true;
      if (option.dataset.answer === state.currentQuiz.id) option.classList.add("correct");
    });
    if (!correctAnswer) button.classList.add("wrong");
    if (correctAnswer) {
      state.quiz.correct += 1;
      recordAnswer(state.currentQuiz.id, true);
    } else {
      state.quiz.wrong += 1;
      saveFavoriteOnly(state.currentQuiz.id);
      recordAnswer(state.currentQuiz.id, false);
    }
    storage.saveQuizStats(state.quiz);
    updateStats();
    updateMetrics();
    if (feedback) {
      feedback.classList.remove("hidden", "good", "bad");
      feedback.classList.add(correctAnswer ? "good" : "bad");
      const translation = getTranslation();
      feedback.textContent = correctAnswer ? translation.quizFeedbackCorrect : translation.quizFeedbackWrong;
    }
    renderCards();
    renderDetail();
    playAudio(state.currentQuiz.id, "word", state.learningLanguage);
  }

  function updateStats() {
    const { state, els } = dependencies;
    els.quizCorrect.textContent = state.quiz.correct || 0;
    els.quizWrong.textContent = state.quiz.wrong || 0;
    els.quizTotal.textContent = (state.quiz.correct || 0) + (state.quiz.wrong || 0);
  }

  window.AppQuiz = Object.freeze({ configure, render, updateStats });
})();
