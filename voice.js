/**
 * Browser voice layer — Web Speech API (SpeechRecognition + speechSynthesis).
 * Hindi / Hinglish / English via hi-IN and en-IN voices when available.
 */
window.Voice = (function () {
  function getRecognitionCtor() {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null;
  }

  function isSupported() {
    return {
      stt: !!getRecognitionCtor(),
      tts: "speechSynthesis" in window,
    };
  }

  function pickVoice(langPref) {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    if (!voices.length) return null;

    const preferLangs =
      langPref === "en"
        ? ["en-IN", "en-GB", "en-US", "hi-IN"]
        : ["hi-IN", "en-IN", "en-GB", "en-US"];

    for (const code of preferLangs) {
      const v = voices.find((x) => x.lang && x.lang.toLowerCase() === code.toLowerCase());
      if (v) return v;
    }
    // fuzzy
    for (const code of preferLangs) {
      const prefix = code.slice(0, 2).toLowerCase();
      const v = voices.find((x) => x.lang && x.lang.toLowerCase().startsWith(prefix));
      if (v) return v;
    }
    // female-ish name heuristic for friendlier sales tone
    const female = voices.find((x) => /female|woman|priya|neerja|heera|kajal|veena|zira|samantha/i.test(x.name));
    return female || voices[0];
  }

  function langCode(langPref) {
    return langPref === "en" ? "en-IN" : "hi-IN";
  }

  function speak(text, langPref, handlers = {}) {
    return new Promise((resolve, reject) => {
      if (!("speechSynthesis" in window)) {
        handlers.onEnd && handlers.onEnd();
        resolve({ simulated: true });
        return;
      }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = langCode(langPref);
      const voice = pickVoice(langPref);
      if (voice) u.voice = voice;
      u.rate = langPref === "en" ? 1.0 : 0.95;
      u.pitch = 1.05;
      u.volume = 1;
      u.onstart = () => handlers.onStart && handlers.onStart();
      u.onend = () => {
        handlers.onEnd && handlers.onEnd();
        resolve({ simulated: false });
      };
      u.onerror = (e) => {
        handlers.onError && handlers.onError(e);
        // still resolve so conversation continues
        resolve({ error: e.error || "tts_error" });
      };
      // Chrome sometimes needs a beat after cancel
      setTimeout(() => window.speechSynthesis.speak(u), 40);
    });
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  /**
   * One-shot listen. Returns transcript promise.
   */
  function listenOnce(langPref, handlers = {}) {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      return Promise.reject(new Error("Speech recognition not supported in this browser. Use Chrome/Edge, or type your reply."));
    }

    return new Promise((resolve, reject) => {
      const rec = new Ctor();
      rec.lang = langCode(langPref);
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 3;

      let finalText = "";
      let settled = false;

      rec.onstart = () => handlers.onStart && handlers.onStart();
      rec.onresult = (event) => {
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          if (r.isFinal) finalText += r[0].transcript;
          else interim += r[0].transcript;
        }
        handlers.onPartial && handlers.onPartial((finalText + " " + interim).trim());
      };
      rec.onerror = (e) => {
        if (settled) return;
        settled = true;
        handlers.onError && handlers.onError(e);
        if (e.error === "no-speech") {
          reject(new Error("no-speech"));
        } else if (e.error === "not-allowed") {
          reject(new Error("Microphone permission denied. Allow mic access or use text input."));
        } else {
          reject(new Error(e.error || "recognition-error"));
        }
      };
      rec.onend = () => {
        if (settled) return;
        settled = true;
        handlers.onEnd && handlers.onEnd();
        const text = finalText.trim();
        if (text) resolve(text);
        else reject(new Error("no-speech"));
      };

      try {
        rec.start();
      } catch (err) {
        reject(err);
      }

      // expose stop
      handlers._stop = () => {
        try {
          rec.stop();
        } catch (_) {}
      };
    });
  }

  // Warm up voices list (Chrome loads async)
  if ("speechSynthesis" in window) {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }

  return {
    isSupported,
    speak,
    stopSpeaking,
    listenOnce,
    pickVoice,
    langCode,
  };
})();
