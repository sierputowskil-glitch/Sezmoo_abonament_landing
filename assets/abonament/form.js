/* SEZMOO /abonament/ — formularz → send.php + Turnstile (invisible).
   Logika i zdarzenia dataLayer jak w assets/js/app.js (form_start, generate_lead,
   form_submit_error), bez reszty skryptu strony głównej, który wymaga jej DOM. */
(function () {
  "use strict";
  var f = document.getElementById("abonament-form");
  if (!f) return;

  var note = f.querySelector(".cform__note");
  var btn = f.querySelector('button[type="submit"]');
  var lbl = btn ? btn.querySelector(".lbl") : null;
  var lblText = lbl ? lbl.textContent : "";
  var nameInput = f.querySelector('input[name="name"]');
  var phoneInput = f.querySelector('input[name="phone"]');
  var NAME_RE = /^[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*(?:\s+[A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ][A-Za-zĄąĆćĘęŁłŃńÓóŚśŹźŻżÀ-ÖØ-öø-ÿ'’\-]*)+$/;
  var PHONE_RE = /^\+?[0-9][0-9\s\-()]{6,18}[0-9]$/;
  var widgetId = null, tokenResolve = null, started = false;
  var siteKeyPromise = null, apiPromise = null;

  var host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;clip:rect(0,0,0,0);";
  f.appendChild(host);

  function dlPush(p) { window.dataLayer = window.dataLayer || []; window.dataLayer.push(p); }
  function meta() {
    var need = f.querySelector('[name="need"]'), pack = f.querySelector('[name="package"]');
    return { form_id: f.id, form_name: "abonament", form_lang: "pl",
      form_need: need && need.value ? need.value : "", form_package: pack && pack.value ? pack.value : "" };
  }
  function say(t) { if (note) { note.textContent = t; note.style.color = "var(--y)"; } }

  function validate() {
    if (nameInput) {
      var n = (nameInput.value || "").trim().replace(/\s+/g, " ");
      nameInput.value = n;
      nameInput.setCustomValidity(!n ? "Podaj imię i nazwisko." : (NAME_RE.test(n) ? "" : "Podaj imię i nazwisko (same litery)."));
    }
    if (phoneInput) {
      var p = (phoneInput.value || "").trim(), d = p.replace(/\D+/g, "");
      phoneInput.value = p;
      phoneInput.setCustomValidity(p === "" || (PHONE_RE.test(p) && d.length >= 9 && d.length <= 15) ? "" : "Podaj prawidłowy numer telefonu (np. +48 500 000 000).");
    }
  }
  [nameInput, phoneInput].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", function () { el.setCustomValidity(""); });
    el.addEventListener("blur", validate);
  });

  function getSiteKey() {
    if (!siteKeyPromise) siteKeyPromise = fetch("/public-config.php", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var k = d && d.turnstileSiteKey ? String(d.turnstileSiteKey) : "";
        if (!k || k.indexOf("...") !== -1) throw new Error("no-sitekey");
        return k;
      });
    return siteKeyPromise;
  }
  function loadApi() {
    if (window.turnstile) return Promise.resolve();
    if (!apiPromise) apiPromise = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true; s.onload = function () { res(); }; s.onerror = function () { rej(new Error("turnstile")); };
      document.head.appendChild(s);
    });
    return apiPromise;
  }
  function ensureWidget() {
    if (widgetId !== null) return Promise.resolve();
    return Promise.all([getSiteKey(), loadApi()]).then(function (pair) {
      widgetId = window.turnstile.render(host, {
        sitekey: pair[0], size: "invisible", execution: "execute", appearance: "execute",
        callback: function () { if (tokenResolve) { var r = tokenResolve; tokenResolve = null; r(); } },
        "error-callback": function () { if (tokenResolve) { var r = tokenResolve; tokenResolve = null; r(new Error("turnstile-error")); } }
      });
    });
  }
  function challenge() {
    return ensureWidget().then(function () {
      return new Promise(function (res, rej) {
        tokenResolve = function (err) { err ? rej(err) : res(); };
        try { window.turnstile.execute(widgetId); } catch (e) { tokenResolve = null; rej(e); }
      });
    });
  }
  function resetWidget() { if (widgetId !== null && window.turnstile) { try { window.turnstile.reset(widgetId); } catch (e) {} } }
  function done() { if (btn) btn.disabled = false; if (lbl) lbl.textContent = lblText; }

  // Turnstile ładujemy dopiero, gdy ktoś zacznie wypełniać formularz (szybszy start strony).
  f.addEventListener("focusin", function () {
    if (started) return;
    started = true;
    var m = meta();
    dlPush({ event: "form_start", form_id: m.form_id, form_name: m.form_name, form_lang: m.form_lang });
    ensureWidget().catch(function () { say("● Nie udało się załadować ochrony formularza — napisz na biuro@sezmoo.com"); });
  });

  f.addEventListener("submit", function (e) {
    e.preventDefault();
    validate();
    if (!f.checkValidity()) { f.reportValidity(); return; }
    if (btn) btn.disabled = true;
    if (lbl) lbl.textContent = "Wysyłanie…";
    var m = meta();
    challenge()
      .then(function () { return fetch(f.getAttribute("action") || "/send.php", { method: "POST", body: new FormData(f) }); })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "Nieprawidłowa odpowiedź serwera" }; }); })
      .then(function (d) {
        if (d && d.ok) {
          dlPush({ event: "generate_lead", form_id: m.form_id, form_name: m.form_name, form_lang: m.form_lang, form_need: m.form_need, form_package: m.form_package });
          say("● Dziękujemy — odezwiemy się w ciągu 24h.");
          f.reset(); started = false;
        } else {
          dlPush({ event: "form_submit_error", form_id: m.form_id, form_name: m.form_name, form_lang: m.form_lang, form_need: m.form_need, error_type: d && d.error ? "server" : "unknown" });
          say("● " + ((d && d.error) || "Coś poszło nie tak") + " — napisz na biuro@sezmoo.com");
        }
        resetWidget(); done();
      })
      .catch(function () {
        dlPush({ event: "form_submit_error", form_id: m.form_id, form_name: m.form_name, form_lang: m.form_lang, form_need: m.form_need, error_type: "network" });
        say("● Nie udało się wysłać — napisz na biuro@sezmoo.com");
        resetWidget(); done();
      });
  });
})();
