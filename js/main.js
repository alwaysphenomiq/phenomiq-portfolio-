/* Phenomiq website scripts: menu, header, glow pause, year, contact form. */
(function () {
  'use strict';

  var WHATSAPP = '2348125813963';

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- Header background after scrolling, and the back-to-top button ---------- */
  var header = document.querySelector('.site-header');
  var toTop = document.querySelector('.to-top');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Back to top: scroll up, then put keyboard focus back on the logo link so
     keyboard and screen reader users start again from the top of the page. */
  if (toTop) {
    toTop.addEventListener('click', function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0 });          /* smooth, unless the visitor prefers reduced motion (CSS) */
      var brand = document.querySelector('.brand');
      if (brand) brand.focus({ preventScroll: true });
    });
  }

  /* ---------- Dark / light theme ---------- */
  /* The theme itself is set by a tiny script in <head> (no flash). This wires the button. */
  var root = document.documentElement;
  var themeBtn = document.querySelector('.theme-toggle');
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, save) {
    root.setAttribute('data-theme', theme);
    if (themeMeta) themeMeta.setAttribute('content', theme === 'light' ? '#FFFFFF' : '#0F131A');
    if (themeBtn) themeBtn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    if (save) { try { localStorage.setItem('phenomiq-theme', theme); } catch (e) { /* private mode: ignore */ } }
  }

  if (themeBtn) {
    applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
    themeBtn.hidden = false;           /* the button only appears when JavaScript works */
    themeBtn.addEventListener('click', function () {
      applyTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    });
  }

  /* ---------- Floating pill menu ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var pill = document.getElementById('menu');

  function setMenu(open) {
    if (!menuBtn || !pill) return;
    pill.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }

  if (menuBtn && pill) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    pill.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!pill.contains(e.target) && !menuBtn.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
  }

  /* ---------- Highlight the current section in the menu ---------- */
  var links = pill ? pill.querySelectorAll('a[href^="#"]:not(.pill-cta)') : [];
  if ('IntersectionObserver' in window && links.length) {
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var link = byId[entry.target.id];
        if (link) link.setAttribute('aria-current', 'location');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(byId).forEach(function (id) {
      var section = document.getElementById(id);
      if (section) sectionObserver.observe(section);
    });
  }

  /* ---------- Pause the glow when it is off screen (saves battery) ---------- */
  var glows = document.querySelectorAll('.glow');
  if ('IntersectionObserver' in window) {
    var glowObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.classList.toggle('is-paused', !entry.isIntersecting);
      });
    });
    glows.forEach(function (g) { glowObserver.observe(g); });
  }

  /* ---------- Contact form -> Supabase "leads" table ---------- */
  var form = document.getElementById('contact-form');
  var note = document.getElementById('form-note');
  var client = null;

  /* The public form always sends as a visitor ("anon"). It never reuses an admin
     login saved in this browser, which is what caused the 403 error before. */
  function getClient() {
    if (client) return client;
    var cfg = window.PHENOMIQ_SUPABASE;
    if (!cfg || !window.supabase || !window.supabase.createClient) return null;
    client = window.supabase.createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
    });
    return client;
  }

  function clearInvalid() {
    form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
  }
  function markInvalid(ids) {
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', 'form-note'); }
    });
    var first = document.getElementById(ids[0]);
    if (first) first.focus();
  }

  function setNote(html, kind) {
    note.className = 'form-note' + (kind ? ' is-' + kind : '');
    note.innerHTML = html;
  }

  function whatsappFallback(text) {
    var url = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
    return '<a href="' + url + '" target="_blank" rel="noopener">Send it on WhatsApp instead</a>';
  }

  if (form && note) {
    form.addEventListener('input', function (e) {
      if (e.target.removeAttribute) e.target.removeAttribute('aria-invalid');
    });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();

      var data = new FormData(form);
      var fullName = String(data.get('name') || '').trim();
      var whatsapp = String(data.get('whatsapp') || '').trim();
      var email = String(data.get('email') || '').trim();
      var service = String(data.get('service') || '').trim();
      var message = String(data.get('message') || '').trim();
      var honeypot = String(data.get('hp_check') || '').trim();

      if (honeypot) {            /* a bot filled the hidden field: pretend it worked */
        form.reset();
        setNote("Thanks. Your message is in. We'll reply within 24 hours.", 'ok');
        return;
      }
      clearInvalid();
      var bad = [];
      var digits = whatsapp.replace(/\D/g, '');
      if (!fullName) bad.push('name');
      if (!digits && !email) { bad.push('whatsapp'); bad.push('email'); }
      else {
        if (whatsapp && digits.length < 10) bad.push('whatsapp');
        if (email && email.indexOf('@') < 1) bad.push('email');
      }
      if (message.length < 10) bad.push('message');
      if (bad.length) {
        setNote('Please add your name, a valid WhatsApp number or email, and a message of at least 10 characters.', 'error');
        markInvalid(bad);
        return;
      }

      var contactParts = [];
      if (whatsapp) contactParts.push('WhatsApp ' + whatsapp);
      if (email) contactParts.push(email);
      var contactInfo = contactParts.join(' | ');
      var fullMessage = service ? 'Needs: ' + service + '\n\n' + message : message;
      var submitBtn = form.querySelector('button[type="submit"]');
      var originalLabel = submitBtn.textContent;

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      setNote('Sending your message...', '');

      var sb = getClient();
      var failed = !sb;

      if (sb) {
        try {
          var result = await sb.from('leads').insert([{ name: fullName, contact: contactInfo, message: fullMessage }]);
          if (result.error) {
            failed = true;
            console.error('Lead insert failed:', result.error);   /* check "code" here if it ever fails */
          }
        } catch (err) {
          failed = true;
          console.error('Lead insert error:', err);
        }
      }

      if (failed) {
        setNote('Sorry, that did not send. ' + whatsappFallback('Hi Phenomiq, my name is ' + fullName + '. ' + fullMessage), 'error');
      } else {
        form.reset();
        setNote("Thanks. Your message is in. We'll reply within 24 hours.", 'ok');
      }

      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    });
  }
})();
