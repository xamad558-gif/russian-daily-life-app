(function () {
  let dependencies = null;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const INTERVALS = [1, 3, 7, 30];

  function configure(options) {
    dependencies = options;
  }

  function now() {
    return new Date();
  }

  function isoDate(date) {
    return date.toISOString();
  }

  function addDays(date, days) {
    return new Date(date.getTime() + days * DAY_MS);
  }

  function defaultStatus(mastery) {
    if (mastery >= 80) return "mastered";
    if (mastery > 0) return "learning";
    return "new";
  }

  function createState(id, mastery = 0) {
    return {
      id,
      status: defaultStatus(mastery),
      interval: 0,
      streak: 0,
      correct: 0,
      wrong: 0,
      lapses: 0,
      dueAt: mastery > 0 ? isoDate(now()) : null,
      lastReviewedAt: null
    };
  }

  function ensureWord(word) {
    const { state } = dependencies;
    const current = state.learning[word.id];
    if (!current) {
      state.learning[word.id] = createState(word.id, state.mastery[word.id] || word.masteryDefault || 0);
      return;
    }
    current.id = word.id;
    current.status = current.status || defaultStatus(state.mastery[word.id] || 0);
    current.interval = Number(current.interval || 0);
    current.streak = Number(current.streak || 0);
    current.correct = Number(current.correct || 0);
    current.wrong = Number(current.wrong || 0);
    current.lapses = Number(current.lapses || 0);
  }

  function ensure(words) {
    const { state, storage } = dependencies;
    state.learning = state.learning || {};
    words.forEach(ensureWord);
    storage.saveProgress({ learningState: state.learning });
  }

  function get(id) {
    const { state } = dependencies;
    return state.learning[id] || createState(id, state.mastery[id] || 0);
  }

  function isDue(id, at = now()) {
    const item = get(id);
    return Boolean(item.dueAt && new Date(item.dueAt).getTime() <= at.getTime());
  }

  function reviewWords(words) {
    const { state } = dependencies;
    return words.filter(word => state.saved.has(word.id) || isDue(word.id));
  }

  function syncMastery(id) {
    const { state, storage } = dependencies;
    const item = get(id);
    const mastery = state.mastery[id] || 0;
    if (mastery >= 80) item.status = "mastered";
    else if (mastery === 0 && !item.correct && !item.wrong) item.status = "new";
    else if (item.status === "mastered") item.status = "known";
    state.learning[id] = item;
    storage.saveProgress({ learningState: state.learning });
  }

  function recordAnswer(id, correct) {
    const { state, storage } = dependencies;
    const item = get(id);
    const currentMastery = state.mastery[id] || 0;
    const reviewedAt = now();
    item.lastReviewedAt = isoDate(reviewedAt);
    if (correct) {
      state.mastery[id] = Math.min(100, currentMastery + 15);
      item.correct += 1;
      item.streak += 1;
      item.interval = INTERVALS[Math.min(item.streak - 1, INTERVALS.length - 1)];
      item.dueAt = isoDate(addDays(reviewedAt, item.interval));
      item.status = state.mastery[id] >= 80 ? "mastered" : item.streak >= 2 ? "review" : "learning";
    } else {
      state.mastery[id] = Math.max(0, currentMastery - 5);
      item.wrong += 1;
      item.lapses += 1;
      item.streak = 0;
      item.interval = 0;
      item.dueAt = isoDate(reviewedAt);
      item.status = "learning";
    }
    state.learning[id] = item;
    storage.saveProgress({ mastery: state.mastery, learningState: state.learning });
  }

  function recordManual(id, delta) {
    const { state, storage } = dependencies;
    const item = get(id);
    const reviewedAt = now();
    item.lastReviewedAt = isoDate(reviewedAt);
    if (delta >= 0) {
      item.status = (state.mastery[id] || 0) >= 80 ? "mastered" : "known";
      item.interval = 7;
      item.dueAt = isoDate(addDays(reviewedAt, item.interval));
      item.streak = Math.max(item.streak, 1);
    } else {
      item.status = "learning";
      item.interval = 0;
      item.dueAt = isoDate(reviewedAt);
      item.streak = 0;
      item.lapses += 1;
    }
    state.learning[id] = item;
    storage.saveProgress({ learningState: state.learning });
  }

  function prioritize(words) {
    return [...words].sort((first, second) => {
      const firstDue = isDue(first.id) ? 0 : 1;
      const secondDue = isDue(second.id) ? 0 : 1;
      if (firstDue !== secondDue) return firstDue - secondDue;
      return (dependencies.state.mastery[first.id] || 0) - (dependencies.state.mastery[second.id] || 0);
    });
  }

  window.AppLearning = Object.freeze({ configure, ensure, get, isDue, reviewWords, syncMastery, recordAnswer, recordManual, prioritize });
})();
