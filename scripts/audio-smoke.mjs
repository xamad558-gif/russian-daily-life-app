#!/usr/bin/env node
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync("js/audio.js", "utf8");
const spoken = [];
const voices = [{ lang: "ru-RU" }, { lang: "ar-SA" }, { lang: "en-US" }];
const context = {
  window: {
    speechSynthesis: {
      getVoices: () => voices,
      cancel: () => {},
      speak: utterance => spoken.push({ text: utterance.text, lang: utterance.lang, voice: utterance.voice })
    }
  },
  SpeechSynthesisUtterance: function (text) {
    this.text = text;
    this.lang = "";
    this.voice = null;
  },
  Audio: class {
    addEventListener() {}
    play() {
      return { catch: callback => callback() };
    }
  }
};

vm.runInNewContext(source, context);
context.window.AppAudio.configure({
  findWord: () => ({
    russian: "дом",
    arabic: "بيت",
    english: "house",
    exampleRu: "Это наш дом.",
    audioWordRu: "missing.mp3",
    audioWordAr: "missing.mp3",
    audioWordEn: "missing.mp3"
  })
});

context.window.AppAudio.playAudio("home50_001", "word", "ru");
context.window.AppAudio.playAudio("home50_001", "word", "ar");
context.window.AppAudio.playAudio("home50_001", "word", "en");

assert.deepEqual(spoken.map(item => item.text), ["дом", "بيت", "house"]);
assert.deepEqual(spoken.map(item => item.lang), ["ru-RU", "ar-SA", "en-US"]);
assert.equal(spoken[0].voice.lang, "ru-RU");
console.log("Audio smoke test passed: source words and matching voices are selected.");
