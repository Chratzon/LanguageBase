/* LanguageBase – Oberfläche */
(function () {
  "use strict";
  const { esc, md, shuffle, sample } = LB.util;
  const S = () => LB.store.state;
  const main = document.getElementById("main");
  const barTitle = document.getElementById("barTitle");
  const backBtn = document.getElementById("backBtn");
  const settingsBtn = document.getElementById("settingsBtn");
  const ORDER = ["en", "fr", "es", "it"];
  const SHORT = { en: "EN", fr: "FR", es: "ES", it: "IT" };

  const I = {
    say: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
    ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10"/></svg>',
    no: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    almost: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 7v6M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>'
  };

  /* ---------- Navigation ---------- */
  let session = null;
  function go(view, params, replace) {
    LB.tts.stop(); stopListening();
    const st = { view, params: params || {} };
    if (replace) history.replaceState(st, ""); else history.pushState(st, "");
    render(st);
  }
  window.addEventListener("popstate", (e) => { LB.tts.stop(); stopListening(); render(e.state || { view: "home", params: {} }); });
  backBtn.addEventListener("click", () => history.back());
  settingsBtn.addEventListener("click", () => go("settings"));

  function render(st) {
    const v = VIEWS[st.view] ? st.view : "home";
    backBtn.hidden = v === "home";
    settingsBtn.hidden = v === "settings";
    main.innerHTML = "";
    window.scrollTo(0, 0);
    VIEWS[v](st.params || {});
  }
  function setTitle(html) { barTitle.innerHTML = html; }
  function course(id) { return LB.courses[id]; }

  /* ---------- Fortschritt ---------- */
  function lessonScore(l, id) { const r = LB.store.lang(l).lessons[id]; return r ? r.best : null; }
  function langProgress(l) {
    const c = course(l);
    const ls = c.grammar.map((g) => lessonScore(l, g.id) || 0);
    const g = ls.reduce((a, b) => a + b, 0) / ls.length;
    let tot = 0, known = 0;
    c.vocab.forEach((d) => { const s = LB.srs.deckStats(l, d); tot += s.total; known += s.known; });
    return Math.round((g * 0.6 + (tot ? known / tot : 0) * 0.4) * 100);
  }
  function dueVocab(l) {
    const out = [];
    course(l).vocab.forEach((d) => d.items.forEach((_, i) => {
      const c = LB.srs.card(l, d.id, i);
      if (c && LB.srs.isDue(c) && c.b < LB.srs.MAX) out.push({ d, i, c });
    }));
    return out;
  }
  function reviewCount(l) { return LB.store.lang(l).mistakes.length + dueVocab(l).length; }

  /* ---------- Bausteine ---------- */
  function sayBtn(text, lang, label) {
    return `<button class="say" data-act="say" data-text="${esc(text)}" data-lang="${esc(lang)}" aria-label="${esc(label || "Vorlesen")}">${I.say}</button>`;
  }
  function meter(p) { return `<div class="meter" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`; }
  function ring(p) {
    const r = 14, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 34 34" aria-hidden="true"><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="17" cy="17" r="${r}" fill="none" stroke="var(--tint)" stroke-width="4" stroke-linecap="round" stroke-dasharray="${(c * p).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 17 17)"/></svg>`;
  }
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }

  /* Klicks auf Vorlese-Knöpfe überall */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act=say]");
    if (!b) return;
    e.preventDefault();
    if (!LB.tts.available) { toast("Sprachausgabe ist in diesem Browser nicht verfügbar."); return; }
    b.classList.add("on");
    LB.tts.speak(b.dataset.text, b.dataset.lang, { slow: b.dataset.slow === "1" }).then(() => b.classList.remove("on"));
  });

  /* ========== Ansichten ========== */
  const VIEWS = {};

  VIEWS.home = function () {
    setTitle('Language<span class="lb-b">Base</span>');
    const streak = LB.store.streakNow();
    main.innerHTML = `
      <section class="hero">
        <span class="hand">Wieder reinkommen statt neu anfangen.</span>
        <h2>Welche Sprache frischen wir auf?</h2>
        <p class="muted prose">Grammatik mit dem Warum dahinter, Vokabeln in der Lernkartei, Hören und Sprechen. Gedacht für alle, die eine Sprache schon einmal konnten.</p>
        ${streak ? `<span class="streak">${streak} ${streak === 1 ? "Tag" : "Tage"} in Folge</span>` : ""}
      </section>
      <section class="langs">
        ${ORDER.map((id) => {
          const c = course(id), p = langProgress(id), due = reviewCount(id);
          return `<button class="lang-card" data-go="${id}">
            <span class="code">${SHORT[id]}</span>
            <span class="name">${esc(c.name)}</span>
            <span class="native">${esc(c.native)}</span>
            ${meter(p)}
            <span class="small muted">${p} % aufgefrischt${due ? ` · ${due} fällig` : ""}</span>
          </button>`;
        }).join("")}
      </section>
      <section class="stack">
        <span class="label">In Planung</span>
        <div class="soon"><span class="chip">Polnisch</span><span class="chip">Tschechisch</span><span class="chip">Kroatisch</span><span class="chip">Ungarisch</span><span class="chip">Einsteigermodus</span></div>
      </section>`;
    main.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => go("lang", { l: b.dataset.go })));
  };

  VIEWS.lang = function ({ l }) {
    const c = course(l);
    if (!c) return go("home", {}, true);
    setTitle(esc(c.name));
    const L = LB.store.lang(l);
    const rc = reviewCount(l);
    main.innerHTML = `
      <section class="stack">
        <h2>${esc(c.name)} <span class="muted" style="font-weight:400;font-style:italic">${esc(c.native)}</span></h2>
        <p class="muted prose">${esc(c.welcome)}</p>
      </section>
      ${rc ? `<section class="review">
        <div class="t"><b>Heute wiederholen</b><span>${L.mistakes.length ? L.mistakes.length + " Fehler aus Lektionen" : ""}${L.mistakes.length && dueVocab(l).length ? " · " : ""}${dueVocab(l).length ? dueVocab(l).length + " Vokabeln fällig" : ""}</span></div>
        <button class="btn" data-act="review">Los geht's</button>
      </section>` : ""}
      <section class="stack">
        <div class="section-head"><h3>Grammatik</h3><span class="small muted">mit Erklärung</span></div>
        <div class="list">
          ${c.grammar.map((g) => {
            const s = lessonScore(l, g.id);
            return `<button class="item" data-lesson="${g.id}">
              <span class="lvl">${esc(g.lvl)}</span>
              <span class="t"><b>${esc(g.title)}</b><span>${esc(g.sub)}</span></span>
              <span class="score ${s >= 0.8 ? "good" : ""}">${s == null ? "neu" : Math.round(s * 100) + " %"}</span>
            </button>`;
          }).join("")}
        </div>
      </section>
      <section class="stack">
        <div class="section-head"><h3>Wortschatz</h3><span class="small muted">Lernkartei</span></div>
        <div class="list">
          ${c.vocab.map((d) => {
            const st = LB.srs.deckStats(l, d);
            return `<button class="item" data-deck="${d.id}">
              ${ring(st.known / st.total)}
              <span class="t"><b>${esc(d.title)}</b><span>${esc(d.sub)} · ${st.known}/${st.total} sitzen${st.due ? ` · ${st.due} fällig` : ""}</span></span>
            </button>`;
          }).join("")}
        </div>
      </section>
      <section class="stack">
        <div class="section-head"><h3>Umgangssprache und Fluchen</h3></div>
        <div class="list">
          <button class="item" data-act="slang">
            <span class="reg l3" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="t"><b>So spricht man wirklich</b><span>${c.slang.items.length} Ausdrücke mit Stärke-Skala und Situationen</span></span>
            <span class="score">${L.slang.best == null ? "neu" : Math.round(L.slang.best * 100) + " %"}</span>
          </button>
        </div>
      </section>`;
    main.querySelectorAll("[data-lesson]").forEach((b) => b.addEventListener("click", () => go("lesson", { l, id: b.dataset.lesson })));
    main.querySelectorAll("[data-deck]").forEach((b) => b.addEventListener("click", () => go("deck", { l, id: b.dataset.deck })));
    main.querySelector("[data-act=slang]").addEventListener("click", () => go("slang", { l }));
    const rv = main.querySelector("[data-act=review]");
    if (rv) rv.addEventListener("click", () => startReview(l));
  };

  VIEWS.lesson = function ({ l, id }) {
    const c = course(l), g = c && c.grammar.find((x) => x.id === id);
    if (!g) return go("lang", { l }, true);
    setTitle(esc(c.name) + " · Grammatik");
    const s = lessonScore(l, id);
    main.innerHTML = `
      <section class="lesson-head">
        <span class="label">${esc(g.lvl)} · ${g.ex.length} Übungen${s != null ? " · bisher " + Math.round(s * 100) + " %" : ""}</span>
        <h2>${esc(g.title)}</h2>
        <p class="prose">${esc(g.intro)}</p>
        <div class="row"><button class="btn primary" data-act="start">Übungen starten</button></div>
      </section>
      ${g.rules.map((r) => `<section class="rule">
        <h3>${esc(r.h)}</h3>
        <p class="prose">${esc(r.p)}</p>
        ${(r.ex || []).map(([t, d]) => `<div class="ex-line">
          <span class="t"><span class="tl" lang="${c.tts}">${md(t)}</span><span class="dt">${esc(d)}</span></span>
          ${sayBtn(t, c.tts)}
        </div>`).join("")}
      </section>`).join("")}
      <section class="why">
        <span class="label">Warum ist das so?</span>
        <p class="prose">${esc(g.why)}</p>
      </section>
      <section class="why de">
        <span class="label">Im Vergleich zum Deutschen</span>
        <p class="prose">${esc(g.de)}</p>
      </section>
      <p class="tip">${esc(g.tip)}</p>
      <button class="btn primary block" data-act="start">Übungen starten (${g.ex.length})</button>`;
    main.querySelectorAll("[data-act=start]").forEach((b) => b.addEventListener("click", () => startLesson(l, id)));
  };

  VIEWS.deck = function ({ l, id }) {
    const c = course(l), d = c && c.vocab.find((x) => x.id === id);
    if (!d) return go("lang", { l }, true);
    setTitle(esc(c.name) + " · Wortschatz");
    const st = LB.srs.deckStats(l, d);
    const boxName = (b) => b == null ? "neu" : b >= 6 ? "sitzt" : b >= 4 ? "fast sicher" : b >= 2 ? "im Aufbau" : "frisch";
    main.innerHTML = `
      <section class="stack">
        <h2>${esc(d.title)}</h2>
        <p class="muted">${esc(d.sub)}. ${st.known} von ${st.total} sitzen${st.due ? `, ${st.due} sind heute fällig` : ""}.</p>
        <button class="btn primary" data-act="learn">${st.seen ? "Weiterlernen" : "Lernen starten"}</button>
      </section>
      <section class="list">
        ${d.items.map((it, i) => {
          const cd = LB.srs.card(l, d.id, i);
          return `<div class="item" style="cursor:default">
            <span class="t"><b lang="${c.tts}">${esc(it.t)}</b><span>${esc(it.de)}${it.n ? " · " + esc(it.n) : ""}</span></span>
            <span class="lvl" title="Stand in der Lernkartei">${boxName(cd && cd.b)}</span>
            ${sayBtn(it.t, c.tts)}
          </div>`;
        }).join("")}
      </section>`;
    main.querySelector("[data-act=learn]").addEventListener("click", () => startDeck(l, id));
  };

  VIEWS.slang = function ({ l }) {
    const c = course(l);
    if (!c) return go("home", {}, true);
    setTitle(esc(c.name) + " · Umgangssprache");
    const show3 = S().settings.showLvl3;
    const items = c.slang.items.filter((x) => show3 || x.lvl < 3);
    const group = (lvl, name) => {
      const g = items.filter((x) => x.lvl === lvl);
      if (!g.length) return "";
      return `<section class="stack"><div class="section-head"><h3>${name}</h3></div><div class="list">
        ${g.map((x) => `<div class="item" style="cursor:default">
          <span class="reg l${x.lvl}" aria-label="Stärke ${x.lvl} von 3"><i></i><i></i><i></i></span>
          <span class="t"><b lang="${c.tts}">${esc(x.t)}</b><span>${esc(x.de)}</span>${x.n ? `<span class="slang-note">${esc(x.n)}</span>` : ""}</span>
          ${sayBtn(x.t, c.tts)}
        </div>`).join("")}
      </div></section>`;
    };
    main.innerHTML = `
      <section class="stack">
        <h2>Umgangssprache und Fluchen</h2>
        <p class="prose">${esc(c.slang.intro)}</p>
        <div class="legend">
          <span><span class="reg l1"><i></i><i></i><i></i></span> locker, fast überall okay</span>
          <span><span class="reg l2"><i></i><i></i><i></i></span> derb, nur unter Freunden</span>
          <span><span class="reg l3"><i></i><i></i><i></i></span> vulgär oder beleidigend</span>
        </div>
        ${show3 ? "" : `<p class="warn">Sehr derbe Ausdrücke sind ausgeblendet. Du kannst sie in den Einstellungen einschalten.</p>`}
        <button class="btn primary" data-act="quiz">Quiz: Was passt wann?</button>
      </section>
      ${group(1, "Locker")}${group(2, "Derb")}${group(3, "Vulgär")}`;
    main.querySelector("[data-act=quiz]").addEventListener("click", () => startSlang(l));
  };

  VIEWS.settings = function () {
    setTitle("Einstellungen");
    const st = S().settings;
    const voiceRows = ORDER.map((id) => {
      const c = course(id), ok = LB.tts.available && LB.tts.hasVoice(c.tts);
      return `<div class="setting"><span class="t">${esc(c.name)}<span>${ok ? "Stimme gefunden" : "Keine passende Stimme gefunden – in Android unter Einstellungen › Sprachausgabe nachinstallieren"}</span></span>${sayBtn(sampleSentence(id), c.tts, "Stimme testen")}</div>`;
    }).join("");
    main.innerHTML = `
      <section class="stack"><h2>Einstellungen</h2></section>
      <section class="stack">
        <span class="label">Darstellung und Ton</span>
        <div class="list">
          <div class="setting"><span class="t">Erscheinungsbild</span>
            <select id="setTheme" class="btn" style="min-height:42px">
              <option value="system"${st.theme === "system" ? " selected" : ""}>Wie das System</option>
              <option value="light"${st.theme === "light" ? " selected" : ""}>Hell</option>
              <option value="dark"${st.theme === "dark" ? " selected" : ""}>Dunkel</option>
            </select></div>
          <div class="setting"><span class="t">Sprechtempo<span id="rateVal">${Math.round(st.rate * 100)} %</span></span>
            <input type="range" id="setRate" min="0.6" max="1.2" step="0.05" value="${st.rate}" aria-label="Sprechtempo"></div>
          <div class="setting"><span class="t">Fragen vorlesen<span>Sätze in der Fremdsprache werden automatisch gesprochen</span></span>
            <label class="switch"><input type="checkbox" id="setRead"${st.readAloud ? " checked" : ""} aria-label="Fragen vorlesen"><i></i></label></div>
          <div class="setting"><span class="t">Sehr derbe Ausdrücke zeigen<span>Vulgäres und Beleidigungen in der Umgangssprache</span></span>
            <label class="switch"><input type="checkbox" id="setLvl3"${st.showLvl3 ? " checked" : ""} aria-label="Sehr derbe Ausdrücke zeigen"><i></i></label></div>
        </div>
      </section>
      <section class="stack">
        <span class="label">Sprache auf diesem Gerät</span>
        <div class="list">
          <div class="setting"><span class="t"><span class="status-line" style="color:var(--ink)"><i class="dot ${LB.tts.available ? "ok" : "no"}"></i>Sprachausgabe</span><span>${LB.tts.available ? "Verfügbar" : "Nicht verfügbar – Hörübungen werden übersprungen"}</span></span></div>
          <div class="setting"><span class="t"><span class="status-line" style="color:var(--ink)"><i class="dot ${LB.stt.available ? "ok" : "no"}"></i>Spracherkennung</span><span>${LB.stt.available ? "Verfügbar (in Chrome für Android meist mit Internet)" : "Nicht verfügbar – bei Sprechübungen bewertest du dich selbst. Am besten Chrome nutzen."}</span></span></div>
          ${voiceRows}
        </div>
      </section>
      <section class="stack">
        <span class="label">Fortschritt</span>
        <p class="small muted">Dein Fortschritt liegt nur auf diesem Gerät. Mit einer Sicherung kannst du ihn auf ein anderes Gerät mitnehmen.</p>
        <div class="row">
          <button class="btn" id="exp">Sicherung speichern</button>
          <label class="btn" for="impFile">Sicherung laden</label>
          <input type="file" id="impFile" accept="application/json,.json" hidden>
        </div>
        <button class="btn ghost" id="reset">Fortschritt zurücksetzen</button>
      </section>
      <p class="small muted">LanguageBase · Inhalte ${ORDER.map((id) => course(id).name).join(", ")}</p>`;
    const save = () => { LB.store.save(); };
    main.querySelector("#setTheme").addEventListener("change", (e) => { st.theme = e.target.value; save(); applyTheme(); });
    main.querySelector("#setRate").addEventListener("input", (e) => { st.rate = parseFloat(e.target.value); main.querySelector("#rateVal").textContent = Math.round(st.rate * 100) + " %"; save(); });
    main.querySelector("#setRead").addEventListener("change", (e) => { st.readAloud = e.target.checked; save(); });
    main.querySelector("#setLvl3").addEventListener("change", (e) => { st.showLvl3 = e.target.checked; save(); });
    main.querySelector("#exp").addEventListener("click", () => {
      const blob = new Blob([LB.store.export()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "languagebase-sicherung-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
    main.querySelector("#impFile").addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { try { LB.store.import(r.result); applyTheme(); toast("Sicherung geladen."); go("home", {}, true); } catch (err) { toast("Diese Datei ist keine LanguageBase-Sicherung."); } };
      r.readAsText(f);
    });
    const rb = main.querySelector("#reset");
    rb.addEventListener("click", () => {
      if (rb.dataset.armed) { LB.store.reset(); applyTheme(); toast("Fortschritt gelöscht."); go("home", {}, true); return; }
      rb.dataset.armed = "1"; rb.textContent = "Wirklich alles löschen? Nochmal tippen."; rb.style.color = "var(--red)";
      setTimeout(() => { if (rb.isConnected) { delete rb.dataset.armed; rb.textContent = "Fortschritt zurücksetzen"; rb.style.color = ""; } }, 4000);
    });
  };
  function sampleSentence(id) {
    return { en: "Nice to hear from you again.", fr: "Ça fait plaisir de te revoir.", es: "¡Qué alegría volver a verte!", it: "Che bello rivederti!" }[id];
  }

  /* ========== Übungen zusammenstellen ========== */
  const KIND_LABEL = { mc: "Auswahl", gap: "Lücke füllen", tr: "Übersetzen", fix: "Fehler finden", listen: "Hören", speak: "Sprechen", write: "Schreiben" };

  function fillSentence(q, answer) {
    const parts = String(answer).split(" / ");
    let i = 0;
    const s = q.replace(/\s*\([^)]*\)\s*$/, "").replace(/___/g, () => parts[Math.min(i++, parts.length - 1)]);
    return s;
  }
  function blanks(q) { return (q.match(/___/g) || []).length; }

  function fromGrammar(l, g, i) {
    const e = g.ex[i], src = { type: "grammar", l, lesson: g.id, i };
    const base = { src, why: e.w, lessonTitle: g.title };
    if (e.t === "mc") {
      const order = shuffle(e.o.map((o, k) => k));
      const opts = order.map((k) => e.o[k]);
      const item = Object.assign(base, { kind: "mc", label: KIND_LABEL.mc, prompt: e.q, options: opts, correct: order.indexOf(e.a) });
      if (blanks(e.q)) { item.promptSay = e.q; item.solutionSay = fillSentence(e.q, e.o[e.a]); }
      return item;
    }
    if (e.t === "gap") {
      const item = Object.assign(base, { kind: "write", label: KIND_LABEL.gap, prompt: e.q, answers: e.a, promptSay: e.q.replace(/\s*\([^)]*\)\s*$/, "") });
      if (blanks(e.q) === 1) item.solutionSay = fillSentence(e.q, e.a[0]);
      return item;
    }
    if (e.t === "tr") return Object.assign(base, { kind: "write", label: KIND_LABEL.tr, instruction: "Übersetze:", prompt: e.q, promptDe: true, answers: e.a, solutionSay: e.a[0], full: true });
    if (e.t === "fix") return Object.assign(base, { kind: "write", label: KIND_LABEL.fix, instruction: "Hier stimmt etwas nicht. Schreib den Satz richtig:", wrongSrc: e.q, prefill: e.q, answers: e.a, solutionSay: e.a[0], full: true, promptSay: e.q });
    if (e.t === "listen") return Object.assign(base, { kind: "listen", label: KIND_LABEL.listen, say: e.s, answers: [e.s].concat(e.a || []), de: e.de, solutionSay: e.s, full: true });
    if (e.t === "speak") return Object.assign(base, { kind: "speak", label: KIND_LABEL.speak, prompt: e.q, promptDe: true, answers: e.a, solutionSay: e.a[0] });
    return null;
  }

  function fromVocab(l, d, i) {
    const it = d.items[i], c = LB.srs.card(l, d.id, i), b = c ? c.b : 0;
    const src = { type: "vocab", l, deck: d.id, i };
    const why = [it.n, it.ex].filter(Boolean).join(" ");
    const others = d.items.filter((_, k) => k !== i);
    const answers = [it.t].concat(it.a || []);
    const mcMeaning = () => {
      const opts = shuffle([it.de].concat(sample(others, 3).map((o) => o.de)));
      return { kind: "mc", label: "Bedeutung", instruction: "Was bedeutet das?", prompt: it.t, promptSay: it.t, options: opts, correct: opts.indexOf(it.de), solutionSay: it.t, why, src, optsDe: true };
    };
    const mcWord = () => {
      const opts = shuffle([it.t].concat(sample(others, 3).map((o) => o.t)));
      return { kind: "mc", label: "Wort finden", instruction: "Wie sagt man das?", prompt: it.de, promptDe: true, options: opts, correct: opts.indexOf(it.t), solutionSay: it.t, why, src, optsSay: true };
    };
    if (d.mcOnly) {
      if (b === 0) return mcMeaning();
      if (b === 1) return mcWord();
      if (b === 2 && LB.tts.available) {
        const m = mcMeaning(); m.kind = "mc"; m.label = "Hören"; m.instruction = "Hör zu: Was bedeutet das?"; m.hidePrompt = true; m.autoSay = true; return m;
      }
      return { kind: "speak", label: "Nachsprechen", instruction: "Sprich nach:", prompt: it.t, promptSay: it.t, sub: it.de, answers, solutionSay: it.t, why, src };
    }
    if (b === 0) return mcMeaning();
    if (b === 1) return mcWord();
    if (b === 2) return { kind: "write", label: "Schreiben", instruction: "Wie heißt das?", prompt: it.de, promptDe: true, answers, solutionSay: it.t, why, src, articles: true };
    if (b === 3 && LB.tts.available) return { kind: "listen", label: "Hören", say: it.t, answers, de: it.de, solutionSay: it.t, why, src, articles: true };
    if (LB.stt.available) return { kind: "speak", label: "Sprechen", instruction: "Sag es laut:", prompt: it.de, promptDe: true, answers, solutionSay: it.t, why, src };
    return { kind: "write", label: "Schreiben", instruction: "Wie heißt das?", prompt: it.de, promptDe: true, answers, solutionSay: it.t, why, src, articles: true };
  }

  function slangItems(l) {
    const c = course(l), show3 = S().settings.showLvl3;
    const pool = c.slang.items.filter((x) => show3 || x.lvl < 3);
    const out = [];
    sample(pool, Math.min(6, pool.length)).forEach((x) => {
      const opts = shuffle([x.de].concat(sample(pool.filter((y) => y !== x), 3).map((y) => y.de)));
      out.push({ kind: "mc", label: "Bedeutung", instruction: "Was heißt das?", prompt: x.t, promptSay: x.t, options: opts, correct: opts.indexOf(x.de), optsDe: true, solutionSay: x.t, why: x.n || "", src: { type: "slang", l } });
    });
    const names = ["locker", "derb", "vulgär oder beleidigend"];
    sample(pool, Math.min(3, pool.length)).forEach((x) => {
      out.push({ kind: "mc", label: "Wie stark?", instruction: "Wie derb ist dieser Ausdruck?", prompt: x.t, promptSay: x.t, sub: x.de, options: names, correct: x.lvl - 1, optsDe: true, why: x.n || "", src: { type: "slang", l } });
    });
    c.slang.situations.forEach((s) => {
      if (!show3 && /cazzo|fuck|gilipollas|gueule|vaffanculo|minchia|me cago|coger/i.test(s.o.join(" ") + s.q)) return;
      const order = shuffle(s.o.map((_, k) => k));
      out.push({ kind: "mc", label: "Situation", prompt: s.q, promptDe: true, options: order.map((k) => s.o[k]), correct: order.indexOf(s.a), why: s.w, src: { type: "slang", l } });
    });
    return shuffle(out);
  }

  /* ---------- Sitzungen ---------- */
  function startSession(l, title, items, onDone) {
    session = { l, title, items: items.filter(Boolean), i: 0, results: [], onDone };
    if (!session.items.length) { toast("Gerade gibt es hier nichts zu üben."); return; }
    go("quiz", { l });
  }
  function startLesson(l, id) {
    const g = course(l).grammar.find((x) => x.id === id);
    startSession(l, g.title, g.ex.map((_, i) => fromGrammar(l, g, i)), (res) => {
      const L = LB.store.lang(l);
      const score = res.filter((r) => r.ok).length / res.length;
      const prev = L.lessons[id] || { best: 0, runs: 0 };
      L.lessons[id] = { best: Math.max(prev.best || 0, score), last: score, runs: (prev.runs || 0) + 1 };
      LB.store.save();
    });
  }
  function startDeck(l, id) {
    const d = course(l).vocab.find((x) => x.id === id);
    const idx = d.items.map((_, i) => i);
    const due = idx.filter((i) => { const c = LB.srs.card(l, d.id, i); return c && LB.srs.isDue(c); });
    const fresh = shuffle(idx.filter((i) => !LB.srs.card(l, d.id, i)));
    let pick = shuffle(due).slice(0, 10);
    if (pick.length < 10) pick = pick.concat(fresh.slice(0, 10 - pick.length));
    if (!pick.length) pick = sample(idx, Math.min(8, idx.length)); // alles gelernt: Bonusrunde
    startSession(l, d.title, shuffle(pick).map((i) => fromVocab(l, d, i)));
  }
  function startSlang(l) {
    startSession(l, "Umgangssprache", slangItems(l), (res) => {
      const L = LB.store.lang(l);
      const score = res.filter((r) => r.ok).length / res.length;
      L.slang.best = Math.max(L.slang.best || 0, score); LB.store.save();
    });
  }
  function startReview(l) {
    const c = course(l), L = LB.store.lang(l);
    const items = [];
    L.mistakes.slice(0, 8).forEach((m) => { const g = c.grammar.find((x) => x.id === m.lesson); if (g && g.ex[m.i]) items.push(fromGrammar(l, g, m.i)); });
    shuffle(dueVocab(l)).slice(0, 12).forEach(({ d, i }) => items.push(fromVocab(l, d, i)));
    startSession(l, "Wiederholung", shuffle(items));
  }
  function startRetry() {
    const wrong = session.results.filter((r) => !r.ok).map((r) => r.item);
    const s = session;
    session = { l: s.l, title: s.title + " · Fehler", items: wrong.map(regen), i: 0, results: [], onDone: null };
    go("quiz", { l: s.l }, true);
  }
  function regen(item) {
    const s = item.src;
    if (s.type === "grammar") { const g = course(s.l).grammar.find((x) => x.id === s.lesson); return fromGrammar(s.l, g, s.i); }
    if (s.type === "vocab") { const d = course(s.l).vocab.find((x) => x.id === s.deck); return fromVocab(s.l, d, s.i); }
    if (item.kind === "mc") { const order = shuffle(item.options.map((_, k) => k)); return Object.assign({}, item, { options: order.map((k) => item.options[k]), correct: order.indexOf(item.correct) }); }
    return item;
  }

  function record(item, ok) {
    const s = item.src;
    if (s.type === "grammar") {
      const L = LB.store.lang(s.l);
      const k = (m) => m.lesson === s.lesson && m.i === s.i;
      if (ok) L.mistakes = L.mistakes.filter((m) => !k(m));
      else if (!L.mistakes.some(k)) L.mistakes.push({ lesson: s.lesson, i: s.i });
      LB.store.save();
    } else if (s.type === "vocab") {
      LB.srs.grade(s.l, s.deck, s.i, ok);
    }
  }

  /* ========== Übungsansicht ========== */
  let listening = null;
  function stopListening() { if (listening) { listening.stop(); listening = null; } }

  VIEWS.quiz = function ({ l }) {
    if (!session || session.l !== l) return go("lang", { l }, true);
    const c = course(l);
    setTitle(esc(session.title));
    if (session.i >= session.items.length) return renderDone(c);
    const item = session.items[session.i];
    const n = session.items.length;
    main.innerHTML = `
      <div class="progress">${meter((session.i / n) * 100)}<span>${session.i + 1} / ${n}</span></div>
      <section class="card" id="card">
        <div class="kind"><span class="lvl">${esc(item.label)}</span>${item.lessonTitle && session.title !== item.lessonTitle ? `<span class="small muted">${esc(item.lessonTitle)}</span>` : ""}</div>
        <div id="body"></div>
      </section>
      <div id="fb"></div>`;
    const body = main.querySelector("#body");
    const T = { mc: renderMC, write: renderWrite, listen: renderListen, speak: renderSpeak }[item.kind];
    T(item, c, body);
  };

  function promptHTML(item, c) {
    let h = "";
    if (item.instruction) h += `<p class="muted">${esc(item.instruction)}</p>`;
    if (item.wrongSrc) h += `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><p class="wrong-src" lang="${c.tts}" style="flex:1">${esc(item.wrongSrc)}</p>${sayBtn(item.wrongSrc, c.tts)}</div>`;
    else if (item.prompt && !item.hidePrompt) {
      h += `<div class="row" style="flex-wrap:nowrap;align-items:flex-start"><p class="q${item.promptDe ? " de" : ""}"${item.promptDe ? "" : ` lang="${c.tts}"`} style="flex:1">${md(item.prompt)}</p>${item.promptSay ? sayBtn(item.promptSay, c.tts) : ""}</div>`;
    }
    if (item.sub) h += `<p class="muted small">${esc(item.sub)}</p>`;
    return h;
  }
  function autoRead(item, c) {
    const t = item.autoSay ? item.promptSay : (S().settings.readAloud && item.promptSay && !item.wrongSrc ? item.promptSay : null);
    if (t && LB.tts.available) setTimeout(() => LB.tts.speak(t, c.tts), 250);
  }

  function renderMC(item, c, body) {
    body.innerHTML = `<div class="stack" style="gap:16px">${promptHTML(item, c)}
      ${item.hidePrompt ? `<div class="play-big"><button class="btn primary" data-act="say" data-text="${esc(item.promptSay)}" data-lang="${c.tts}">${I.play} Abspielen</button><button class="btn" data-act="say" data-slow="1" data-text="${esc(item.promptSay)}" data-lang="${c.tts}">Langsam</button></div>` : ""}
      <div class="opts">${item.options.map((o, k) => `<button class="opt" data-k="${k}"${item.optsDe ? "" : ` lang="${c.tts}"`}>${md(o)}</button>`).join("")}</div>
      <button class="btn ghost" data-act="skip">Weiß ich nicht</button></div>`;
    autoRead(item, c);
    const opts = body.querySelectorAll(".opt");
    const finish = (k) => {
      opts.forEach((b, j) => { b.disabled = true; if (j === item.correct) b.classList.add("right"); else if (j === k) b.classList.add("picked-wrong"); });
      body.querySelector("[data-act=skip]").hidden = true;
      const ok = k === item.correct;
      if (item.optsSay && LB.tts.available) LB.tts.speak(item.options[item.correct], c.tts);
      showFeedback(item, c, { status: ok ? "ok" : "wrong" }, { mc: true });
    };
    opts.forEach((b) => b.addEventListener("click", () => finish(parseInt(b.dataset.k, 10))));
    body.querySelector("[data-act=skip]").addEventListener("click", () => finish(-1));
  }

  function inputHTML(c, prefill) {
    return `<textarea class="answer" id="ans" rows="2" lang="${c.tts}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Deine Antwort" aria-label="Deine Antwort">${prefill ? esc(prefill) : ""}</textarea>
      ${c.chars.length ? `<div class="chars" aria-label="Sonderzeichen">${c.chars.map((ch) => `<button type="button" data-ch="${esc(ch)}" tabindex="-1">${esc(ch)}</button>`).join("")}</div>` : ""}
      <div class="row"><button class="btn primary" data-act="check" style="flex:1">Prüfen</button><button class="btn ghost" data-act="skip">Weiß ich nicht</button></div>`;
  }
  function wireInput(body, onSubmit) {
    const ta = body.querySelector("#ans");
    body.querySelectorAll("[data-ch]").forEach((b) => {
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        const s = ta.selectionStart ?? ta.value.length, e2 = ta.selectionEnd ?? s;
        ta.value = ta.value.slice(0, s) + b.dataset.ch + ta.value.slice(e2);
        ta.focus(); ta.selectionStart = ta.selectionEnd = s + b.dataset.ch.length;
      });
    });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSubmit(ta.value); } });
    body.querySelector("[data-act=check]").addEventListener("click", () => onSubmit(ta.value));
    body.querySelector("[data-act=skip]").addEventListener("click", () => onSubmit(""));
    return ta;
  }
  function lockInput(body) {
    body.querySelectorAll("textarea, .chars button, [data-act=check], [data-act=skip]").forEach((el) => { el.disabled = true; });
    const r = body.querySelector("[data-act=check]"); if (r) r.closest(".row").hidden = true;
    const ch = body.querySelector(".chars"); if (ch) ch.hidden = true;
  }

  function renderWrite(item, c, body) {
    body.innerHTML = `<div class="stack" style="gap:14px">${promptHTML(item, c)}${inputHTML(c, item.prefill)}</div>`;
    autoRead(item, c);
    const ta = wireInput(body, (val) => {
      if (item.prefill && val.trim() === item.prefill.trim()) { toast("Da ist noch der Fehler drin. Ändere den Satz."); return; }
      lockInput(body);
      const res = LB.check(val, item.answers, c, { articles: item.articles });
      showFeedback(item, c, res, { input: val });
    });
    if (!item.prefill && window.matchMedia("(pointer:fine)").matches) ta.focus();
  }

  function renderListen(item, c, body) {
    if (!LB.tts.available) {
      body.innerHTML = `<p>Diese Hörübung braucht eine Sprachausgabe, die dieser Browser nicht hat.</p><button class="btn primary" data-act="next">Überspringen</button>`;
      body.querySelector("[data-act=next]").addEventListener("click", () => { session.items.splice(session.i, 1); render({ view: "quiz", params: { l: session.l } }); });
      return;
    }
    body.innerHTML = `<div class="stack" style="gap:14px">
      <p class="muted">Hör zu und schreib auf, was du hörst.</p>
      <div class="play-big">
        <button class="btn primary" data-act="say" data-text="${esc(item.say)}" data-lang="${c.tts}">${I.play} Abspielen</button>
        <button class="btn" data-act="say" data-slow="1" data-text="${esc(item.say)}" data-lang="${c.tts}">Langsam</button>
      </div>
      ${inputHTML(c)}</div>`;
    setTimeout(() => LB.tts.speak(item.say, c.tts), 300);
    wireInput(body, (val) => {
      lockInput(body);
      const res = LB.check(val, item.answers, c, { articles: item.articles });
      showFeedback(item, c, res, { input: val });
    });
  }

  function renderSpeak(item, c, body) {
    const can = LB.stt.available;
    body.innerHTML = `<div class="stack" style="gap:14px">${promptHTML(item, c)}
      ${can ? `<button class="mic" id="mic" aria-label="Aufnahme starten">${I.mic}</button>
        <p class="heard" id="heard">Tippe aufs Mikrofon und sprich.</p>
        <button class="btn ghost" data-act="skip">Weiß ich nicht</button>`
      : `<p class="warn">Spracherkennung gibt es in diesem Browser nicht. Sag den Satz laut, hör dir dann die Lösung an und bewerte dich selbst.</p>
        <button class="btn primary" data-act="reveal">Lösung zeigen</button>`}
      </div>`;
    if (!can) {
      body.querySelector("[data-act=reveal]").addEventListener("click", (e) => {
        e.target.hidden = true;
        showSelfCheck(item, c);
      });
      return;
    }
    const mic = body.querySelector("#mic"), heard = body.querySelector("#heard");
    body.querySelector("[data-act=skip]").addEventListener("click", () => {
      stopListening(); mic.disabled = true; body.querySelector("[data-act=skip]").hidden = true;
      showFeedback(item, c, { status: "wrong", best: item.answers[0] }, { spoken: true, heard: "" });
    });
    mic.addEventListener("click", () => {
      if (listening) { stopListening(); return; }
      LB.tts.stop();
      document.getElementById("fb").innerHTML = "";
      mic.classList.add("live"); mic.setAttribute("aria-label", "Aufnahme beenden");
      heard.textContent = "Ich höre zu …";
      listening = LB.stt.listen(c.tts, (t) => { if (t) heard.textContent = "„" + t + "“"; });
      listening.promise.then((alts) => {
        listening = null; mic.classList.remove("live"); mic.setAttribute("aria-label", "Nochmal aufnehmen");
        if (!alts.length) { heard.textContent = "Ich habe nichts verstanden. Tippe nochmal und sprich deutlich."; return; }
        const r = LB.checkSpoken(alts, item.answers, c);
        heard.textContent = "Erkannt: „" + r.heard + "“";
        showFeedback(item, c, { status: r.status, best: r.target }, { spoken: true, heard: r.heard, retry: true });
      }).catch((err) => {
        listening = null; mic.classList.remove("live");
        const m = { "not-allowed": "Das Mikrofon ist blockiert. Erlaube den Zugriff in den Website-Einstellungen von Chrome.", "service-not-allowed": "Das Mikrofon ist blockiert. Erlaube den Zugriff in den Website-Einstellungen von Chrome.", "no-speech": "Nichts gehört. Tippe und sprich direkt los.", "network": "Die Spracherkennung braucht gerade Internet.", "audio-capture": "Kein Mikrofon gefunden.", "language-not-supported": "Diese Sprache erkennt dein Gerät nicht. Installiere sie in den Android-Spracheinstellungen." }[err] || "Die Aufnahme hat nicht geklappt. Versuch es nochmal.";
        heard.textContent = m;
      });
    });
  }

  function showSelfCheck(item, c) {
    const fb = document.getElementById("fb");
    fb.innerHTML = `<section class="fb almost">
      <div class="solution"><span class="s correction" lang="${c.tts}">${esc(item.answers[0])}</span>${sayBtn(item.answers[0], c.tts)}</div>
      ${item.answers.length > 1 ? `<p class="also">Auch richtig: ${item.answers.slice(1, 3).map(esc).join(" · ")}</p>` : ""}
      ${item.why ? `<div class="why"><span class="label">Warum?</span><p>${esc(item.why)}</p></div>` : ""}
      <div class="row"><button class="btn primary" data-self="1" style="flex:1">Hab ich richtig gesagt</button><button class="btn" data-self="0" style="flex:1">Lag daneben</button></div>
    </section>`;
    if (LB.tts.available) LB.tts.speak(item.answers[0], c.tts);
    fb.querySelectorAll("[data-self]").forEach((b) => b.addEventListener("click", () => next(item, b.dataset.self === "1")));
  }

  /* Rückmeldung mit Korrektur und Erklärung */
  function showFeedback(item, c, res, ctx) {
    const fb = document.getElementById("fb");
    const ok = res.status !== "wrong";
    const head = { ok: [I.ok, "Richtig!"], almost: [I.almost, "Fast richtig"], wrong: [I.no, ctx.mc ? "Leider nicht" : "Nicht ganz"] }[res.status];
    let h = `<section class="fb ${res.status}" aria-live="polite"><div class="fb-head">${head[0]}<span>${head[1]}</span></div>`;
    if (res.note) h += `<p>${esc(res.note)}</p>`;

    const target = res.best || (item.answers && item.answers[0]);
    const userText = ctx.spoken ? ctx.heard : ctx.input;
    if (!ctx.mc && target) {
      if (userText && res.status !== "ok") {
        const d = LB.diff(userText, target, c);
        h += `<p class="yours small"><span class="muted">${ctx.spoken ? "Erkannt" : "Deine Antwort"}:</span> ${d.user.map(([w, x]) => x ? `<span class="x">${esc(w)}</span>` : esc(w)).join(" ")}</p>`;
        h += `<div class="solution"><span class="s correction" lang="${c.tts}">${d.targetTokens.map((w, k) => d.targetMarks[k] ? esc(w) : `<span class="miss">${esc(w)}</span>`).join(" ")}</span>${sayBtn(target, c.tts)}</div>`;
        const full = item.solutionSay && !item.full ? item.solutionSay : null;
        if (full && full !== target) h += `<p class="also">Im ganzen Satz: <span lang="${c.tts}">${esc(full)}</span></p>`;
      } else if (res.status === "ok" || !userText) {
        const show = item.full || ctx.spoken || !item.solutionSay ? target : item.solutionSay;
        h += `<div class="solution"><span class="s${res.status === "ok" ? "" : " correction"}" lang="${c.tts}">${esc(show)}</span>${sayBtn(item.solutionSay || target, c.tts)}</div>`;
      }
      if (res.status === "ok" && item.solutionSay && !item.full && item.solutionSay !== target) h += `<p class="also" lang="${c.tts}">${esc(item.solutionSay)}</p>`;
      const others = (item.answers || []).filter((a) => a !== target).slice(0, 2);
      if (others.length && !item.say) h += `<p class="also">Auch richtig: <span lang="${c.tts}">${others.map(esc).join(" · ")}</span></p>`;
    } else if (ctx.mc && item.solutionSay) {
      h += `<div class="solution"><span class="s" lang="${c.tts}">${md(item.solutionSay)}</span>${sayBtn(item.solutionSay, c.tts)}</div>`;
    }
    if (item.de) h += `<p class="muted">Bedeutung: ${esc(item.de)}</p>`;
    if (item.why) h += `<div class="why"><span class="label">Warum?</span><p>${esc(item.why)}</p></div>`;
    h += `<div class="row">${ctx.retry && res.status !== "ok" ? `<button class="btn" data-act="again" style="flex:1">Nochmal sprechen</button>` : ""}<button class="btn primary" data-act="next" style="flex:1">${session.i + 1 < session.items.length ? "Weiter" : "Fertig"}</button></div></section>`;
    fb.innerHTML = h;
    fb.querySelector("[data-act=next]").addEventListener("click", () => next(item, ok));
    const ag = fb.querySelector("[data-act=again]");
    if (ag) ag.addEventListener("click", () => { fb.innerHTML = ""; const m = document.getElementById("mic"); if (m) m.click(); });
    if (ctx.mc && !ok && item.solutionSay && LB.tts.available && S().settings.readAloud) LB.tts.speak(item.solutionSay, c.tts);
    fb.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }

  function next(item, ok) {
    LB.tts.stop(); stopListening();
    record(item, ok);
    session.results.push({ item, ok });
    session.i++;
    render({ view: "quiz", params: { l: session.l } });
  }

  function renderDone(c) {
    if (!session.finished) { session.finished = true; if (session.onDone) session.onDone(session.results); LB.store.touchStreak(); }
    const res = session.results, right = res.filter((r) => r.ok).length, pct = res.length ? Math.round((right / res.length) * 100) : 0;
    const msg = pct === 100 ? "Sitzt. Das hast du nicht verlernt." : pct >= 80 ? "Stark. Die paar Fehler wiederholen wir." : pct >= 50 ? "Kommt zurück. Lies die Erklärungen zu den Fehlern nochmal." : "Hier lohnt sich ein zweiter Durchgang mit der Erklärung.";
    main.innerHTML = `
      <section class="card done">
        <span class="label">${esc(session.title)}</span>
        <span class="big-score">${right}/${res.length}</span>
        <p class="tip" style="text-align:center">${esc(msg)}</p>
        <div class="row" style="justify-content:center">
          ${right < res.length ? `<button class="btn primary" data-act="retry">Fehler nochmal üben</button>` : ""}
          <button class="btn${right < res.length ? "" : " primary"}" data-act="back">Zur Übersicht</button>
        </div>
      </section>
      ${right < res.length ? `<section class="stack"><span class="label">Das war noch wackelig</span><div class="list">
        ${res.filter((r) => !r.ok).map((r) => `<div class="item" style="cursor:default"><span class="t"><b lang="${c.tts}">${esc(r.item.solutionSay || (r.item.answers && r.item.answers[0]) || r.item.options[r.item.correct])}</b>${r.item.why ? `<span>${esc(r.item.why)}</span>` : ""}</span></div>`).join("")}
      </div></section>` : ""}`;
    const rt = main.querySelector("[data-act=retry]");
    if (rt) rt.addEventListener("click", startRetry);
    main.querySelector("[data-act=back]").addEventListener("click", () => { const l = session.l; session = null; go("lang", { l }, true); });
  }

  /* ---------- Start ---------- */
  function applyTheme() {
    const t = S().settings.theme;
    if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  applyTheme();
  const start = history.state && VIEWS[history.state.view] && history.state.view !== "quiz" ? history.state : { view: "home", params: {} };
  history.replaceState(start, "");
  render(start);

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
