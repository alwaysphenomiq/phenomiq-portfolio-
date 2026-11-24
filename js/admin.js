/* Phenomiq admin: log in, list leads, search, mark contacted, delete.
   Every piece of lead text goes through escapeHtml() before it touches the page,
   which is what stops stored XSS from contact form submissions. */
(function () {
  'use strict';

  var cfg = window.PHENOMIQ_SUPABASE;
  var sb = window.supabase.createClient(cfg.url, cfg.anonKey);   /* admin keeps its login session */

  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var leadsList = document.getElementById('leads-list');
  var leadCount = document.getElementById('lead-count');
  var logoutBtn = document.getElementById('logout-btn');
  var searchBox = document.getElementById('search-box');
  var allLeads = [];

  /**
   * Escapes HTML special characters (including quotes) so user-submitted text can
   * never be read as HTML or JavaScript when inserted into the page.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadLeads();
  }

  async function checkSession() {
    var res = await sb.auth.getSession();
    if (res.data && res.data.session) showDashboard(); else showLogin();
  }

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) {
      loginError.textContent = 'Invalid email or password.';
      loginError.hidden = false;
    } else {
      loginError.hidden = true;
      showDashboard();
    }
  });

  logoutBtn.addEventListener('click', async function () {
    await sb.auth.signOut();
    allLeads = [];
    showLogin();
  });

  async function loadLeads() {
    leadsList.innerHTML = '<p class="empty">Loading...</p>';
    var res = await sb.from('leads').select('*').order('created_at', { ascending: false });
    if (res.error) {
      console.error(res.error);
      leadsList.innerHTML = '<p class="empty">Failed to load leads. Log out and log in again.</p>';
      return;
    }
    allLeads = res.data || [];
    applySearch();
  }

  function applySearch() {
    var term = searchBox.value.trim().toLowerCase();
    var shown = !term ? allLeads : allLeads.filter(function (lead) {
      return [lead.name, lead.contact, lead.message].some(function (v) {
        return String(v || '').toLowerCase().indexOf(term) !== -1;
      });
    });
    leadCount.textContent = shown.length + (shown.length === 1 ? ' lead' : ' leads');
    renderLeads(shown);
  }

  function renderLeads(data) {
    if (!data.length) {
      leadsList.innerHTML = '<p class="empty">No leads found.</p>';
      return;
    }
    leadsList.innerHTML = data.map(function (lead) {
      var done = !!lead.contacted;
      return '<article class="lead' + (done ? ' is-done' : '') + '">' +
        '<div class="lead-top"><span>' + escapeHtml(new Date(lead.created_at).toLocaleString()) + '</span>' +
        '<span class="lead-tag">' + (done ? 'Contacted' : 'New') + '</span></div>' +
        '<p class="lead-name">' + escapeHtml(lead.name) + '</p>' +
        '<p class="lead-contact">' + escapeHtml(lead.contact) + '</p>' +
        '<p class="lead-msg">' + escapeHtml(lead.message) + '</p>' +
        '<div class="lead-actions">' +
          '<button type="button" class="btn btn-ghost" data-action="toggle" data-id="' + escapeHtml(lead.id) + '" data-contacted="' + (done ? '1' : '0') + '">' +
            (done ? 'Mark as not contacted' : 'Mark as contacted') + '</button>' +
          '<button type="button" class="btn btn-danger" data-action="delete" data-id="' + escapeHtml(lead.id) + '">Delete</button>' +
        '</div></article>';
    }).join('');
  }

  /* One click listener for all buttons (no inline onclick handlers). */
  leadsList.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) return;
    var id = btn.getAttribute('data-id');

    if (btn.getAttribute('data-action') === 'toggle') {
      var wasContacted = btn.getAttribute('data-contacted') === '1';
      var up = await sb.from('leads').update({ contacted: !wasContacted }).eq('id', id);
      if (!up.error) loadLeads(); else console.error(up.error);
    }

    if (btn.getAttribute('data-action') === 'delete') {
      if (!window.confirm("Delete this lead? This can't be undone.")) return;
      var del = await sb.from('leads').delete().eq('id', id);
      if (!del.error) loadLeads(); else console.error(del.error);
    }
  });

  searchBox.addEventListener('input', applySearch);

  checkSession();
})();
