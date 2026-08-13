const I18N = AppI18N.translations;
const LANGUAGE_CODES = AppI18N.languageCodes;

const DATA_VERSION = "v8.3-visual-guide";

const INTERFACE_LANGUAGE_LABELS = { ar:"\u0644\u063a\u0629 \u0627\u0644\u0648\u0627\u062c\u0647\u0629", en:"Interface language", ru:"\u042f\u0437\u044b\u043a \u0438\u043d\u0442\u0435\u0440\u0444\u0435\u0439\u0633\u0430" };
const LANGUAGE_LABELS = { ru:"\u0420\u0443\u0441\u0441\u043a\u0438\u0439", ar:"\u0627\u0644\u0639\u0631\u0628\u064a\u0629", en:"English" };
const LEARNING_LANGUAGE_LABELS = { ar:"\u0644\u063a\u0629 \u0627\u0644\u062a\u0639\u0644\u0645", en:"Learning language", ru:"\u042f\u0437\u044b\u043a \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f" };

const settings = AppStorage.loadSettings();
const progress = AppStorage.loadProgress();
const state = {
  words: [], filtered: [], rooms: [], selectedWordId: null, activeView:"vocabulary",
  saved: new Set(AppStorage.loadFavorites()),
  mastery: progress.mastery,
  learning: progress.learningState,
  quiz: AppStorage.loadQuizStats(),
  currentQuiz: null,
  quizAnswered: false,
  uiLang: settings.uiLang,
  learningLanguage: settings.learningLanguage,
  lastRoom: settings.lastRoom,
  density: settings.density,
  theme: settings.theme,
  activeUnit: settings.activeUnit,
  unitRegistry: null
};

AppI18N.configure({ state });
AppLearning.configure({ state, storage: AppStorage });
AppUnits.configure({ dataVersion: DATA_VERSION });

AppAudio.configure({ findWord: id => state.words.find(word => word.id === id) });
const playAudio = (...args) => AppAudio.playAudio(...args);
const wait = (...args) => AppAudio.wait(...args);
const reviewWords = (...args) => AppLearning.reviewWords(...args);
const recordAnswer = (...args) => AppLearning.recordAnswer(...args);
const renderQuiz = (...args) => AppQuiz.render(...args);
const renderProgress = (...args) => AppProgress.render(...args);
const updateMetrics = (...args) => AppProgress.updateMetrics(...args);
const updateMasteryOnly = (...args) => AppProgress.updateMasteryOnly(...args);
const saveFavoriteOnly = (...args) => AppProgress.saveFavoriteOnly(...args);
const changeMastery = (...args) => AppProgress.changeMastery(...args);
const populateSubcategories = (...args) => AppFilters.populateSubcategories(...args);
const renderCategoryMenu = (...args) => AppFilters.renderCategoryMenu(...args);
const renderRoomStrip = (...args) => AppFilters.renderRoomStrip(...args);
const renderUnitMenu = (...args) => AppFilters.renderUnitMenu(...args);
const selectRoom = (...args) => AppFilters.selectRoom(...args);
const applyFilters = (...args) => AppFilters.apply(...args);
const resetFilters = (...args) => AppFilters.reset(...args);
const applyUiLanguage = (...args) => AppUI.applyUiLanguage(...args);
const syncLanguageAvailability = (...args) => AppUI.syncLanguageAvailability(...args);
const applyLearningLanguage = (...args) => AppUI.applyLearningLanguage(...args);
const switchView = (...args) => AppUI.switchView(...args);
const applyTheme = (...args) => AppUI.applyTheme(...args);
const setSidebarOpen = (...args) => AppUI.setSidebarOpen(...args);
const setDensity = (...args) => AppUI.setDensity(...args);
const renderCards = (...args) => AppCards.render(...args);
const translationRows = (...args) => AppCards.translationRows(...args);
const audioButtons = (...args) => AppCards.audioButtons(...args);
const meaningCards = (...args) => AppCards.meaningCards(...args);
const cardTemplate = (...args) => AppCards.cardTemplate(...args);
const bindCardInteractions = (...args) => AppCards.bindCardInteractions(...args);
const bindCardButtons = (...args) => AppCards.bindCardButtons(...args);
const renderDetail = (...args) => AppDetail.renderDetail(...args);
const renderFullWordDetail = (...args) => AppDetail.renderFullWordDetail(...args);
const openFullDetail = (...args) => AppDetail.openFullDetail(...args);
const detailText = (...args) => AppDetail.detailText(...args);
const audioLabel = (...args) => AppDetail.audioLabel(...args);
const exampleLineForLanguage = (...args) => AppDetail.exampleLineForLanguage(...args);

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const els = {
  brandSubtitle: $("#brandSubtitle"), vocabNavLabel: $("#vocabNavLabel"), reviewNavLabel: $("#reviewNavLabel"), quizNavLabel: $("#quizNavLabel"), progressNavLabel: $("#progressNavLabel"), quizBadge: $("#quizBadge"),
  sectionsTitle: $("#sectionsTitle"), streakTitle: $("#streakTitle"), streakDays: $("#streakDays"), streakNote: $("#streakNote"), searchInput: $("#searchInput"),
  heroKicker: $("#heroKicker"), heroTitle: $("#heroTitle"), heroSubtitle: $("#heroSubtitle"), heroReviewBtn: $("#heroReviewBtn"), heroProgressLabel: $("#heroProgressLabel"), heroProgressValue: $("#heroProgressValue"), heroProgressFill: $("#heroProgressFill"), heroPhoto: $("#heroPhoto"), heroPhotoLabel: $("#heroPhotoLabel"), heroWordLabel: $("#heroWordLabel"), heroWordMeaning: $("#heroWordMeaning"), roomStripEyebrow: $("#roomStripEyebrow"), roomStripTitle: $("#roomStripTitle"), roomStripHint: $("#roomStripHint"), roomStrip: $("#roomStrip"), filtersBar: $("#filtersBar"),
  subCategoryFilter: $("#subCategoryFilter"), levelFilter: $("#levelFilter"), sortFilter: $("#sortFilter"), categoryMenu: $("#categoryMenu"), unitMenu: $("#unitMenu"), unitsTitle: $("#unitsTitle"),
  pageTitle: $("#pageTitle"), pageCounter: $("#pageCounter"), cardsGrid: $("#cardsGrid"), emptyState: $("#emptyState"),
  langButtons: $$(".lang-btn"), learningLanguageButtons: $$('[data-learning-lang]'), learningLanguageLabel: $("#learningLanguageLabel"), interfaceLanguageLabel: $("#interfaceLanguageLabel"), viewButtons: $$("[data-density]"), sidebarToggle: $("#sidebarToggle"), sidebarBackdrop: $("#sidebarBackdrop"), themeToggle: $("#themeToggle"),
  playVisibleBtn: $("#playVisibleBtn"), resetFiltersBtn: $("#resetFiltersBtn"), reviewGrid: $("#reviewGrid"), reviewEmpty: $("#reviewEmpty"),
  reviewTitle: $("#reviewTitle"), reviewSubtitle: $("#reviewSubtitle"), quizTitle: $("#quizTitle"), quizSubtitle: $("#quizSubtitle"), quizBox: $("#quizBox"),
  nextQuizBtn: $("#nextQuizBtn"), speakQuizBtn: $("#speakQuizBtn"), quizStatsTitle: $("#quizStatsTitle"), quizCorrect: $("#quizCorrect"), quizWrong: $("#quizWrong"), quizTotal: $("#quizTotal"),
  correctLabel: $("#correctLabel"), wrongLabel: $("#wrongLabel"), totalLabel: $("#totalLabel"), progressTitle: $("#progressTitle"), progressSubtitle: $("#progressSubtitle"),
  totalWordsMetric: $("#totalWordsMetric"), savedWordsMetric: $("#savedWordsMetric"), masteredWordsMetric: $("#masteredWordsMetric"), avgMasteryMetric: $("#avgMasteryMetric"),
  totalWordsMetricLabel: $("#totalWordsMetricLabel"), savedWordsMetricLabel: $("#savedWordsMetricLabel"), masteredWordsMetricLabel: $("#masteredWordsMetricLabel"), avgMasteryMetricLabel: $("#avgMasteryMetricLabel"), appError: $("#appError"),
  masteryList: $("#masteryList"), overallProgressFill: $("#overallProgressFill"), dailyTipText: $("#dailyTipText"), vocabCount: $("#vocabCount"), reviewCount: $("#reviewCount"), fullWordDetail: $("#fullWordDetail"), backToWordsBtn: $("#backToWordsBtn"), detailSpeakRuBtn: $("#detailSpeakRuBtn"), detailMarkReviewBtn: $("#detailMarkReviewBtn"), detailKnownBtn: $("#detailKnownBtn")
};

const init = (...args) => AppController.init(...args);

const languageValue = (...args) => AppI18N.languageValue(...args);
const orderedLanguages = (...args) => AppI18N.orderedLanguages(...args);
const pronunciationForLanguage = (...args) => AppI18N.pronunciationForLanguage(...args);
const wordPronunciation = (...args) => AppI18N.wordPronunciation(...args);
const examplePronunciation = (...args) => AppI18N.examplePronunciation(...args);
const examplePronunciationForExample = (...args) => AppI18N.examplePronunciationForExample(...args);
const languageFlag = (...args) => AppI18N.languageFlag(...args);
const roomLabel = (...args) => AppI18N.roomLabel(...args);
const roomIcon = (...args) => AppI18N.roomIcon(...args);

function toggleFavorite(id, forceSave=false){
  if (forceSave) state.saved.add(id);
  else if (state.saved.has(id)) state.saved.delete(id); else state.saved.add(id);
  AppStorage.saveFavorites([...state.saved]);
  renderCards(); renderReview(); updateMetrics();
}

const renderReview = (...args) => AppController.renderReview(...args);
const renderHomeHero = (...args) => AppController.renderHomeHero(...args);
const playVisibleWords = (...args) => AppController.playVisibleWords(...args);
const selectUnit = (...args) => AppController.selectUnit(...args);
function levelClass(level){ return `level-${String(level || "unknown").toLowerCase().replace(/[^a-z0-9]+/g,"-")}`; }
function escapeHTML(v){ return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }
AppController.configure({
  state,
  els,
  dataVersion: DATA_VERSION,
  storage: AppStorage,
  learning: AppLearning,
  units: AppUnits,
  languageCodes: LANGUAGE_CODES,
  getTranslation: () => I18N[state.uiLang],
  languageValue,
  orderedLanguages,
  roomLabel,
  populateSubcategories,
  renderCategoryMenu,
  renderRoomStrip,
  renderUnitMenu,
  applyTheme,
  applyUiLanguage,
  applyLearningLanguage,
  switchView,
  applyFilters,
  updateMetrics,
  setDensity,
  setSidebarOpen,
  resetFilters,
  renderQuiz,
  playAudio,
  toggleFavorite,
  changeMastery,
  reviewWords,
  cardTemplate,
  bindCardButtons,
  bindCardInteractions,
  renderCards,
  renderDetail,
  wait
});

AppUI.configure({
  state,
  els,
  storage: AppStorage,
  languageCodes: LANGUAGE_CODES,
  getTranslation: () => I18N[state.uiLang],
  interfaceLanguageLabels: INTERFACE_LANGUAGE_LABELS,
  learningLanguageLabels: LEARNING_LANGUAGE_LABELS,
  detailText,
  roomLabel,
  renderCategoryMenu,
  renderRoomStrip,
  renderUnitMenu,
  applyFilters,
  renderCards,
  renderDetail,
  renderQuiz,
  renderProgress,
  updateMetrics,
  renderReview,
  renderFullWordDetail
});

AppDetail.configure({
  state,
  els,
  getTranslation: () => I18N[state.uiLang],
  languageValue,
  orderedLanguages,
  languageLabels: LANGUAGE_LABELS,
  wordPronunciation,
  examplePronunciation,
  examplePronunciationForExample,
  escapeHTML,
  levelClass,
  languageFlag,
  roomLabel,
  translationRows,
  audioButtons,
  meaningCards,
  playAudio,
  speak: AppAudio.speak,
  changeMastery,
  toggleFavorite,
  switchView,
  openFullDetail
});

AppProgress.configure({
  state,
  els,
  storage: AppStorage,
  learning: AppLearning,
  orderedLanguages,
  languageValue,
  getTranslation: () => I18N[state.uiLang],
  escapeHTML,
  renderHomeHero,
  renderCards,
  renderDetail
});

AppFilters.configure({
  state,
  els,
  storage: AppStorage,
  getTranslation: () => I18N[state.uiLang],
  escapeHTML,
  roomLabel,
  roomIcon,
  switchView,
  selectRoom,
  selectUnit,
  renderCards,
  renderDetail,
  updateMetrics,
  apply: applyFilters
});

AppCards.configure({
  state,
  els,
  getTranslation: () => I18N[state.uiLang],
  orderedLanguages,
  languageValue,
  pronunciationForLanguage,
  wordPronunciation,
  escapeHTML,
  levelClass,
  languageFlag,
  toggleFavorite,
  playAudio,
  renderDetail,
  openFullDetail
});

AppQuiz.configure({
  state,
  els,
  storage: AppStorage,
  learning: AppLearning,
  getTranslation: () => I18N[state.uiLang],
  orderedLanguages,
  languageValue,
  wordPronunciation,
  escapeHTML,
  playAudio,
  recordAnswer,
  saveFavoriteOnly,
  updateMetrics,
  renderCards,
  renderDetail
});

init();
