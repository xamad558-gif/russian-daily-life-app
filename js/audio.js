(function () {
  let findWord = () => null;

  function configure(options) {
    findWord = options.findWord;
  }

  function playAudio(id, mode, lang) {
    const word = findWord(id);
    if (!word) return;
    const voice = { ar: "ar-SA", ru: "ru-RU", en: "en-US" }[lang];
    let text = "";
    let source = "";
    if (mode === "word") {
      if (lang === "ar") { text = word.arabic; source = word.audioWordAr; }
      if (lang === "ru") { text = word.russian; source = word.audioWordRu; }
      if (lang === "en") { text = word.english; source = word.audioWordEn; }
    } else {
      if (lang === "ar") { text = word.exampleAr; source = word.audioSentenceAr; }
      if (lang === "ru") { text = word.exampleRu; source = word.audioSentenceRu; }
      if (lang === "en") { text = word.exampleEn; source = word.audioSentenceEn; }
    }
    if (source) {
      const audio = new Audio(source);
      audio.play().catch(() => speak(text, voice));
    } else {
      speak(text, voice);
    }
  }

  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speechText = String(text || "").replace(/\s*\/\s*/g, lang.startsWith("en") ? ", " : " ").replace(/\s+/g, " ").trim();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = lang;
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  window.AppAudio = Object.freeze({ configure, playAudio, speak, wait });
})();
