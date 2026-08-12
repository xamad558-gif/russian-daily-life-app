(function () {
  function read(key, fallback) {
    let rawValue;
    try {
      rawValue = localStorage.getItem(key);
    } catch {
      return fallback;
    }
    if (rawValue === null) return fallback;
    if (typeof fallback === "string") return rawValue;
    try {
      return JSON.parse(rawValue);
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  const SETTINGS_KEYS = { uiLang: "uiLang", learningLanguage: "learningLanguage", lastRoom: "lastRoom", density: "density", theme: "theme", activeUnit: "activeUnit" };
  const PROGRESS_KEYS = { mastery: "mastery", learningState: "learningState" };
  const FAVORITES_KEY = "savedWords";
  const QUIZ_STATS_KEY = "quizStats";

  function loadSettings() {
    const uiLang = read(SETTINGS_KEYS.uiLang, "ar");
    return {
      uiLang,
      learningLanguage: read(SETTINGS_KEYS.learningLanguage, uiLang === "ru" ? "ar" : "ru"),
      lastRoom: read(SETTINGS_KEYS.lastRoom, "home"),
      density: read(SETTINGS_KEYS.density, "grid"),
      theme: read(SETTINGS_KEYS.theme, "light"),
      activeUnit: read(SETTINGS_KEYS.activeUnit, "home")
    };
  }

  function saveSettings(settings) {
    for (const field of Object.keys(SETTINGS_KEYS)) {
      if (settings[field] !== undefined) write(SETTINGS_KEYS[field], settings[field]);
    }
  }

  function loadProgress() {
    return {
      mastery: read(PROGRESS_KEYS.mastery, {}),
      learningState: read(PROGRESS_KEYS.learningState, {})
    };
  }

  function saveProgress(progress) {
    if (progress.mastery !== undefined) write(PROGRESS_KEYS.mastery, progress.mastery);
    if (progress.learningState !== undefined) write(PROGRESS_KEYS.learningState, progress.learningState);
  }

  function loadFavorites() {
    return read(FAVORITES_KEY, []);
  }

  function saveFavorites(favorites) {
    write(FAVORITES_KEY, favorites);
  }

  function loadQuizStats() {
    return read(QUIZ_STATS_KEY, { correct: 0, wrong: 0 });
  }

  function saveQuizStats(stats) {
    write(QUIZ_STATS_KEY, stats);
  }

  window.AppStorage = Object.freeze({
    loadSettings, saveSettings,
    loadProgress, saveProgress,
    loadFavorites, saveFavorites,
    loadQuizStats, saveQuizStats
  });
})();
