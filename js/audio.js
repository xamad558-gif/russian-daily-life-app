(function () {
  let findWord = () => null;
  const languageConfig = {
    ar: { voice: "ar-SA", word: "arabic", sentence: "exampleAr" },
    ru: { voice: "ru-RU", word: "russian", sentence: "exampleRu" },
    en: { voice: "en-US", word: "english", sentence: "exampleEn" }
  };

  function configure(options) {
    findWord = options.findWord;
  }

  function speechTextFor(word, mode, lang) {
    const config = languageConfig[lang];
    if (!config) return "";
    return String(word[mode === "word" ? config.word : config.sentence] || "").trim();
  }

  function normalizeSpeechText(text, lang) {
    return String(text || "")
      .replace(/\s*\/\s*/g, lang === "en-US" ? ", " : " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchingVoice(lang) {
    if (!("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    const normalized = lang.toLowerCase();
    return voices.find(voice => (voice.lang || "").toLowerCase() === normalized)
      || voices.find(voice => (voice.lang || "").toLowerCase().startsWith(normalized.split("-")[0]))
      || null;
  }

  function audioSourceFor(word, mode, lang) {
    const suffix = { ar: "Ar", ru: "Ru", en: "En" }[lang];
    return suffix ? word[`${mode === "word" ? "audioWord" : "audioSentence"}${suffix}`] : "";
  }

  function playAudio(id, mode, lang) {
    const word = findWord(id);
    if (!word) return;
    const config = languageConfig[lang];
    if (!config) return;
    const text = speechTextFor(word, mode, lang);
    const source = audioSourceFor(word, mode, lang);
    const voice = config.voice;
    if (!text) return;
    if (source) {
      const audio = new Audio(source);
      let fallbackUsed = false;
      const fallback = () => {
        if (fallbackUsed) return;
        fallbackUsed = true;
        speak(text, voice);
      };
      audio.addEventListener("error", fallback, { once: true });
      const playback = audio.play();
      if (playback && typeof playback.catch === "function") playback.catch(fallback);
    } else {
      speak(text, voice);
    }
  }

  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return;
    const speechText = normalizeSpeechText(text, lang);
    if (!speechText) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = lang;
    const voice = matchingVoice(lang);
    if (voice) utterance.voice = voice;
    utterance.rate = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function wait(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
  }

  window.AppAudio = Object.freeze({ configure, playAudio, speak, wait });
})();
