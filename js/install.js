/* LanguageBase – Installation als App (Android/Chrome) */
(function () {
  "use strict";
  let deferred = null;
  const listeners = new Set();
  const notify = () => listeners.forEach((fn) => { try { fn(); } catch (e) {} });

  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; notify(); });
  window.addEventListener("appinstalled", () => { deferred = null; LB.install.justInstalled = true; notify(); });

  LB.install = {
    justInstalled: false,
    /* Läuft die Seite gerade als installierte App? */
    get standalone() {
      return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
    },
    /* Bietet Chrome gerade eine Installation an? */
    get canPrompt() { return !!deferred; },
    get secure() { return location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1"; },
    get ios() { return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    async prompt() {
      if (!deferred) return "unavailable";
      const e = deferred; deferred = null;
      e.prompt();
      const r = await e.userChoice.catch(() => ({ outcome: "dismissed" }));
      notify();
      return r.outcome;
    }
  };
})();
