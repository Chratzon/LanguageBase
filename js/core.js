/* LanguageBase – Kernfunktionen: Speicher, Antwortprüfung, Sprache */
(function () {
  "use strict";
  const LB = (window.LB = window.LB || { courses: {} });

  /* ---------- Speicher (lokal im Browser) ---------- */
  const KEY = "languagebase.v1";
  const defaults = () => ({
    settings: { rate: 0.95, readAloud: true, showLvl3: true, theme: "system" },
    langs: {},
    streak: { last: "", n: 0 }
  });
  let state;
  try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch (e) { state = defaults(); }
  state.settings = Object.assign(defaults().settings, state.settings || {});

  LB.store = {
    get state() { return state; },
    save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* Speicher voll oder gesperrt */ } },
    lang(id) {
      if (!state.langs[id]) state.langs[id] = { lessons: {}, vocab: {}, mistakes: [], slang: {} };
      const l = state.langs[id];
      l.lessons = l.lessons || {}; l.vocab = l.vocab || {}; l.mistakes = l.mistakes || []; l.slang = l.slang || {};
      return l;
    },
    touchStreak() {
      const today = dayKey(new Date());
      const s = state.streak;
      if (s.last === today) return;
      const y = new Date(); y.setDate(y.getDate() - 1);
      s.n = s.last === dayKey(y) ? s.n + 1 : 1;
      s.last = today;
      LB.store.save();
    },
    streakNow() {
      const s = state.streak, today = dayKey(new Date());
      const y = new Date(); y.setDate(y.getDate() - 1);
      return (s.last === today || s.last === dayKey(y)) ? s.n : 0;
    },
    export() { return JSON.stringify(state, null, 1); },
    import(json) { const d = JSON.parse(json); if (!d || typeof d !== "object" || !d.langs) throw new Error("bad"); state = Object.assign(defaults(), d); LB.store.save(); },
    reset() { state = defaults(); LB.store.save(); }
  };
  function dayKey(d) { return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); }

  /* ---------- Vokabel-Wiederholung (Lernkartei, 7 Fächer) ---------- */
  const DAY = 864e5;
  const INTERVALS = [0, 1, 2, 4, 8, 16, 32]; // Tage bis zur nächsten Abfrage je Fach
  LB.srs = {
    MAX: 6,
    key: (deckId, i) => deckId + ":" + i,
    card(lang, deckId, i) { return LB.store.lang(lang).vocab[LB.srs.key(deckId, i)]; },
    grade(lang, deckId, i, ok) {
      const v = LB.store.lang(lang).vocab;
      const k = LB.srs.key(deckId, i);
      const c = v[k] || { b: 0, due: 0, n: 0, w: 0 };
      c.n++;
      if (ok) c.b = Math.min(LB.srs.MAX, c.b + 1);
      else { c.b = Math.max(0, c.b - 2); c.w++; }
      c.due = Date.now() + INTERVALS[c.b] * DAY - (ok ? 0 : 0);
      v[k] = c;
      LB.store.save();
      return c;
    },
    isDue(c) { return !c || c.due <= Date.now(); },
    deckStats(lang, deck) {
      let seen = 0, known = 0, due = 0;
      deck.items.forEach((_, i) => {
        const c = LB.srs.card(lang, deck.id, i);
        if (c) { seen++; if (c.b >= 4) known++; if (c.due <= Date.now()) due++; }
      });
      return { total: deck.items.length, seen, known, due, fresh: deck.items.length - seen };
    }
  };

  /* ---------- Antwortprüfung ---------- */
  const EN_CONTRACTIONS = [
    [/\bwon't\b/g, "will not"], [/\bcan't\b/g, "can not"], [/\bcannot\b/g, "can not"], [/\bshan't\b/g, "shall not"],
    [/n't\b/g, " not"], [/'ll\b/g, " will"], [/'ve\b/g, " have"], [/'re\b/g, " are"], [/\bi'm\b/g, "i am"],
    [/'d\b/g, " would"], [/\b(it|that|what|he|she|there|here|who|where)'s\b/g, "$1 is"], [/\blet's\b/g, "let us"],
    [/\bgonna\b/g, "going to"], [/\bwanna\b/g, "want to"]
  ];
  function norm(s, lang) {
    s = String(s || "").normalize("NFC").toLowerCase()
      .replace(/[’‘`´]/g, "'")
      .replace(/\*\*/g, "")
      .replace(/[.,!?;:¡¿"«»„“”()\[\]\/–—…]/g, " ")
      .replace(/(^|\s)-+|-+(\s|$)/g, " ")
      .replace(/\s+/g, " ").trim();
    if (lang === "en") { EN_CONTRACTIONS.forEach(([re, r]) => { s = s.replace(re, r); }); s = s.replace(/\s+/g, " ").trim(); }
    // Apostroph-Varianten im Französischen/Italienischen: "l' eau" == "l'eau"
    s = s.replace(/' /g, "'");
    return s;
  }
  function fold(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe"); }
  function lev(a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j), cur = new Array(n + 1);
    for (let i = 1; i <= m; i++) {
      cur[0] = i;
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      [prev, cur] = [cur, prev];
    }
    return prev[n];
  }
  function stripArticle(s, arts) {
    for (const a of arts || []) {
      const p = a.endsWith("'") ? a : a + " ";
      if (s.startsWith(p)) return s.slice(p.length);
    }
    return s;
  }

  /* Prüft eine geschriebene Antwort gegen alle akzeptierten Lösungen.
     Ergebnis: ok | almost (zählt als richtig, mit Hinweis) | wrong */
  LB.check = function (input, answers, course, opts) {
    opts = opts || {};
    const lang = course.id;
    const u = norm(input, lang);
    const list = answers.map((a) => ({ raw: a, n: norm(a, lang) }));
    if (!u) return { status: "wrong", best: answers[0], note: "" };
    for (const a of list) if (a.n === u) return { status: "ok", best: a.raw };
    for (const a of list) if (fold(a.n) === fold(u)) return { status: "almost", best: a.raw, note: "Fast perfekt – achte auf die Akzente." };
    if (opts.articles) {
      const ua = stripArticle(u, course.articles);
      for (const a of list) {
        const an = stripArticle(a.n, course.articles);
        if (an !== a.n && fold(an) === fold(ua) && ua === u) return { status: "almost", best: a.raw, note: "Richtig – lern das Wort aber mit Artikel: " + a.raw };
      }
    }
    let best = list[0], bestD = Infinity;
    for (const a of list) { const d = lev(fold(a.n), fold(u)); if (d < bestD) { bestD = d; best = a; } }
    const len = best.n.length;
    const tol = len >= 18 ? 2 : len >= 6 ? 1 : 0;
    if (bestD <= tol) return { status: "almost", best: best.raw, note: "Fast – da ist ein Tippfehler drin." };
    return { status: "wrong", best: closestByWords(u, list).raw };
  };

  function tokens(s) { return s.split(" ").filter(Boolean); }
  function lcsMatrix(a, b) {
    const m = a.length, n = b.length, t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--)
      t[i][j] = fold(a[i]) === fold(b[j]) ? t[i + 1][j + 1] + 1 : Math.max(t[i + 1][j], t[i][j + 1]);
    return t;
  }
  function closestByWords(u, list) {
    const ut = tokens(u); let best = list[0], bs = -1;
    for (const a of list) { const at = tokens(a.n); const s = lcsMatrix(ut, at)[0][0] / Math.max(at.length, ut.length, 1); if (s > bs) { bs = s; best = a; } }
    return best;
  }

  /* Wort-für-Wort-Vergleich für die Korrekturanzeige.
     Liefert die Wörter der Eingabe (x = falsch/überflüssig) und der Lösung (miss = fehlte). */
  LB.diff = function (input, target, course) {
    const ut = tokens(norm(input, course.id)), tt = tokens(norm(target, course.id));
    const t = lcsMatrix(ut, tt);
    const userMarks = [], targetMarks = [];
    let i = 0, j = 0;
    while (i < ut.length && j < tt.length) {
      if (fold(ut[i]) === fold(tt[j])) { userMarks.push([ut[i], false]); targetMarks.push(true); i++; j++; }
      else if (t[i + 1][j] >= t[i][j + 1]) { userMarks.push([ut[i], true]); i++; }
      else { targetMarks.push(false); j++; }
    }
    while (i < ut.length) userMarks.push([ut[i++], true]);
    while (j < tt.length) { targetMarks.push(false); j++; }
    const score = t[0][0] / Math.max(tt.length, ut.length, 1);
    return { user: userMarks, targetTokens: tt, targetMarks, score };
  };

  /* Bewertung gesprochener Antworten: tolerant, weil die Erkennung selbst Fehler macht */
  LB.checkSpoken = function (alternatives, answers, course) {
    let best = { score: -1 };
    for (const heard of alternatives) for (const a of answers) {
      const d = LB.diff(heard, a, course);
      if (d.score > best.score) best = { score: d.score, heard, target: a, diff: d };
    }
    const status = best.score >= 0.85 ? "ok" : best.score >= 0.65 ? "almost" : "wrong";
    return Object.assign(best, { status });
  };

  /* ---------- Sprachausgabe ---------- */
  const synth = window.speechSynthesis || null;
  let voices = [];
  function loadVoices() { if (synth) voices = synth.getVoices() || []; }
  if (synth) { loadVoices(); synth.addEventListener && synth.addEventListener("voiceschanged", loadVoices); }
  function pickVoice(tag) {
    if (!voices.length) loadVoices();
    const base = tag.split("-")[0];
    return voices.find((v) => v.lang && v.lang.replace("_", "-").toLowerCase() === tag.toLowerCase() && /google|premium|enhanced|natural/i.test(v.name))
      || voices.find((v) => v.lang && v.lang.replace("_", "-").toLowerCase() === tag.toLowerCase())
      || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(base));
  }
  LB.tts = {
    available: !!(synth && window.SpeechSynthesisUtterance),
    speak(text, tag, opts) {
      opts = opts || {};
      if (!LB.tts.available) return Promise.resolve(false);
      return new Promise((res) => {
        synth.cancel();
        const u = new SpeechSynthesisUtterance(String(text).replace(/\*\*/g, "").replace(/___/g, "…"));
        u.lang = tag;
        const v = pickVoice(tag); if (v) u.voice = v;
        u.rate = (opts.slow ? 0.72 : 1) * (LB.store.state.settings.rate || 0.95);
        u.onend = () => res(true); u.onerror = () => res(false);
        synth.speak(u);
      });
    },
    stop() { if (synth) synth.cancel(); },
    hasVoice(tag) { return !!pickVoice(tag); }
  };

  /* ---------- Spracherkennung ---------- */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  LB.stt = {
    available: !!SR,
    /* Startet die Erkennung. onInterim(text) für Live-Anzeige, Ergebnis: Promise<string[]> mit Alternativen */
    listen(tag, onInterim) {
      if (!SR) return { promise: Promise.reject(new Error("unsupported")), stop() {} };
      const rec = new SR();
      rec.lang = tag; rec.interimResults = true; rec.maxAlternatives = 5; rec.continuous = false;
      let finals = [], ended = false;
      const promise = new Promise((resolve, reject) => {
        rec.onresult = (e) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) { finals = Array.from(r).map((x) => x.transcript); }
            else interim += r[0].transcript;
          }
          onInterim && onInterim(finals[0] || interim);
        };
        rec.onerror = (e) => { if (!ended) { ended = true; reject(e.error || "error"); } };
        rec.onend = () => { if (!ended) { ended = true; resolve(finals); } };
      });
      try { rec.start(); } catch (e) { return { promise: Promise.reject(e), stop() {} }; }
      return { promise, stop() { try { rec.stop(); } catch (e) {} } };
    }
  };

  /* ---------- Hilfen ---------- */
  LB.util = {
    esc: (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    md(s) { return LB.util.esc(s).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>"); },
    shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
    sample(a, n) { return LB.util.shuffle(a).slice(0, n); },
    norm
  };
})();
