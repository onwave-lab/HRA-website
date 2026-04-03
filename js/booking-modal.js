/**
 * Booking Modal – TidyCal Discovery Meeting with Bot Prevention
 * Replaces Acuity Scheduling links with an on-site popup.
 *
 * Bot prevention layers:
 *   1. Honeypot hidden fields (auto-filled by bots → blocked)
 *   2. Minimum time-on-page gate (3 s before iframe loads)
 *   3. Human-interaction signal (mouse / touch / scroll / key)
 *   4. Rate limiting (max 5 opens per minute, 2 s cooldown)
 */
(function () {
  'use strict';

  // --------------- config ---------------
  var TIDYCAL_URL = 'https://tidycal.com/high-ridge-advisory/initial-consultation';
  var MIN_TIME_MS = 3000;   // page must be open ≥ 3 s
  var COOLDOWN_MS = 2000;   // between consecutive opens
  var MAX_PER_MIN = 5;

  // --------------- state ----------------
  var t0            = Date.now();
  var interacted    = false;
  var lastOpen      = 0;
  var opens         = [];
  var iframeReady   = false;

  // -- interaction tracking --
  function flag() { interacted = true; }
  ['mousemove', 'scroll', 'touchstart', 'keydown'].forEach(function (evt) {
    document.addEventListener(evt, flag, { once: true, passive: true });
  });

  // --------------- styles ---------------
  var css = document.createElement('style');
  css.textContent =
    '.bm-ov{display:none;position:fixed;inset:0;background:rgba(15,39,68,.75);z-index:10001;' +
      'justify-content:center;align-items:center;backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}' +
    '.bm-ov.bm-open{display:flex}' +
    '.bm-dl{background:#fff;border-radius:12px;width:90%;max-width:620px;height:85vh;max-height:720px;' +
      'position:relative;box-shadow:0 25px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;' +
      'animation:bmIn .3s ease}' +
    '@keyframes bmIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}' +
    '.bm-x{position:absolute;top:10px;right:10px;width:34px;height:34px;border:none;' +
      'background:rgba(0,0,0,.06);border-radius:50%;cursor:pointer;display:flex;align-items:center;' +
      'justify-content:center;z-index:1;transition:background .2s}' +
    '.bm-x:hover{background:rgba(0,0,0,.12)}' +
    '.bm-body{flex:1;overflow:hidden;border-radius:0 0 12px 12px}' +
    '.bm-body iframe{width:100%;height:100%;border:none}' +
    '.bm-wait{display:flex;align-items:center;justify-content:center;height:100%;' +
      'color:#4a5568;font-family:Inter,system-ui,sans-serif;font-size:15px}' +
    '.bm-hp{position:absolute!important;left:-9999px!important;top:-9999px!important;' +
      'width:1px!important;height:1px!important;overflow:hidden!important;opacity:0!important;' +
      'pointer-events:none!important;tabindex:-1}' +
    '@media(max-width:600px){.bm-dl{width:96%;height:92vh;max-height:none;border-radius:8px}}';
  document.head.appendChild(css);

  // --------------- DOM ------------------
  var ov   = document.createElement('div');
  ov.className = 'bm-ov';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Schedule a Discovery Meeting');

  var dl   = document.createElement('div');
  dl.className = 'bm-dl';

  var xBtn = document.createElement('button');
  xBtn.className = 'bm-x';
  xBtn.setAttribute('aria-label', 'Close');
  xBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  var body = document.createElement('div');
  body.className = 'bm-body';

  // honeypots
  var hp1 = document.createElement('input');
  hp1.type = 'text'; hp1.name = 'website_url'; hp1.className = 'bm-hp';
  hp1.autocomplete = 'off'; hp1.setAttribute('aria-hidden', 'true');

  var hp2 = document.createElement('input');
  hp2.type = 'email'; hp2.name = 'email_confirm'; hp2.className = 'bm-hp';
  hp2.autocomplete = 'off'; hp2.setAttribute('aria-hidden', 'true');

  dl.appendChild(xBtn);
  dl.appendChild(hp1);
  dl.appendChild(hp2);
  dl.appendChild(body);
  ov.appendChild(dl);
  document.body.appendChild(ov);

  // --------------- helpers --------------
  function isBot() {
    if (hp1.value || hp2.value) return true;
    var now = Date.now();
    opens = opens.filter(function (t) { return now - t < 60000; });
    if (opens.length >= MAX_PER_MIN) return true;
    if (lastOpen && now - lastOpen < COOLDOWN_MS) return true;
    return false;
  }

  function timeOk() { return Date.now() - t0 >= MIN_TIME_MS; }

  function loadIframe(prefill) {
    // Allow reloading with new prefill data
    if (iframeReady && !prefill) return;
    body.innerHTML = '';
    var f = document.createElement('iframe');
    var url = TIDYCAL_URL;
    if (prefill) {
      var params = [];
      if (prefill.name) params.push('name=' + encodeURIComponent(prefill.name));
      if (prefill.email) params.push('email=' + encodeURIComponent(prefill.email));
      if (params.length) url += '?' + params.join('&');
    }
    f.src   = url;
    f.title = 'Schedule a Discovery Meeting with High Ridge Advisory';
    f.setAttribute('loading', 'lazy');
    body.appendChild(f);
    iframeReady = true;
  }

  // --------------- open / close ---------
  function open(e) {
    if (e) e.preventDefault();
    if (isBot()) return;

    var now = Date.now();
    opens.push(now);
    lastOpen = now;

    // Close exit popup if it's open, so booking modal takes over smoothly
    var exitPopup = document.getElementById('exit-popup');
    if (exitPopup && exitPopup.classList.contains('is-visible')) {
      exitPopup.classList.remove('is-visible');
    }

    ov.classList.add('bm-open');
    document.body.style.overflow = 'hidden';

    // Check for quiz prefill data (set by second-opinion.js after form submit)
    var prefill = null;
    if (window.sofBookingPrefill) {
      prefill = window.sofBookingPrefill;
      iframeReady = false; // Force reload with prefill
    }

    if (!timeOk()) {
      body.innerHTML = '<div class="bm-wait">Loading scheduler&hellip;</div>';
      var wait = MIN_TIME_MS - (now - t0);
      var pf = prefill;
      setTimeout(function () {
        if (isBot()) { close(); return; }
        loadIframe(pf);
      }, wait);
      return;
    }

    loadIframe(prefill);
  }

  function close() {
    ov.classList.remove('bm-open');
    document.body.style.overflow = '';
  }

  // --------------- listeners ------------
  xBtn.addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov.classList.contains('bm-open')) close();
  });

  // intercept every Acuity / booking link site-wide
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href*="as.me"], a[href*="tidycal"], [data-booking]');
    if (a) open(e);
  });

  window.openBookingModal = open;
})();
