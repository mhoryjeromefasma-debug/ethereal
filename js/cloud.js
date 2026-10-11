/* ==========================================================================
   Ethereal Perfumes — Online sync (Supabase REST, no library needed)
   - Customers: read the shared catalog (public).
   - Admin: sign in with email + password, then every change is saved online.
   Exposes window.EtherealCloud. Inactive (enabled = false) until js/config.js is filled in.
   ========================================================================== */
(function () {
  'use strict';

  var C = window.ETHEREAL_CONFIG || {};
  var BASE = String(C.supabaseUrl || '').replace(/\/+$/, '');
  var ANON = String(C.supabaseAnonKey || '');
  var enabled = !!(BASE && ANON);
  var AUTH_KEY = 'ethereal_cloud_auth';
  var LOCAL = { products: 'ethereal_products', settings: 'ethereal_settings', theme: 'ethereal_theme' };   // remote key -> localStorage key
  var BUCKET = 'product-images';
  var page = document.body ? document.body.dataset.page : '';
  var pulled = false, pending = {}, timer = null, flushing = false, waiters = [];
  function settle(ok, err) { var w = waiters; waiters = []; w.forEach(function (x) { if (ok) x.resolve(); else x.reject(err); }); }

  function emit(state, message) {
    try { window.dispatchEvent(new CustomEvent('ethereal:sync', { detail: { state: state, message: message || '' } })); } catch (e) { /* ignore */ }
  }
  function headers(token, extra) {
    var h = { apikey: ANON, 'Content-Type': 'application/json' };
    if (token) h.Authorization = 'Bearer ' + token;
    else if (/^eyJ/.test(ANON)) h.Authorization = 'Bearer ' + ANON;   // legacy anon key is a JWT; new publishable keys are not
    if (extra) Object.keys(extra).forEach(function (k) { h[k] = extra[k]; });
    return h;
  }
  function canon(v) {   // stable stringify, so key order never causes false "changed" results
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }

  /* ---------- admin session ---------- */
  function session() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; } }
  function saveSession(d, email) {
    var s = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: d.expires_at || Math.floor(Date.now() / 1000) + (d.expires_in || 3600), email: email || (d.user && d.user.email) || '' };
    try { localStorage.setItem(AUTH_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
    return s;
  }
  function clearSession() { try { localStorage.removeItem(AUTH_KEY); } catch (e) { /* ignore */ } }
  function hasSession() { var s = session(); return !!(s && s.access_token && s.refresh_token); }

  function signIn(email, password) {
    return fetch(BASE + '/auth/v1/token?grant_type=password', { method: 'POST', headers: headers(), body: JSON.stringify({ email: email, password: password }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.access_token) { saveSession(res.d, email); return { ok: true }; }
        return { ok: false, message: 'Incorrect email or password.' };
      })
      .catch(function () { return { ok: false, message: 'Cannot reach the server. Check your internet and the URL in js/config.js.' }; });
  }
  function refresh() {
    var s = session(); if (!s) return Promise.resolve(null);
    return fetch(BASE + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: headers(), body: JSON.stringify({ refresh_token: s.refresh_token }) })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.access_token) return saveSession(d, s.email).access_token; clearSession(); return null; })
      .catch(function () { return null; });
  }
  function getToken() {
    var s = session(); if (!s) return Promise.resolve(null);
    if (s.expires_at * 1000 - Date.now() > 60000) return Promise.resolve(s.access_token);
    return refresh();
  }
  function signOut() {
    var s = session(); clearSession();
    if (s && enabled) { try { fetch(BASE + '/auth/v1/logout', { method: 'POST', headers: headers(s.access_token) }); } catch (e) { /* ignore */ } }
  }

  /* ---------- read: shared catalog -> local cache ---------- */
  function pull() {
    if (!enabled) return Promise.resolve({ ok: false });
    return fetch(BASE + '/rest/v1/kv?select=key,value&key=in.(products,settings,theme)', { headers: headers(), cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (rows) {
        var changed = [], hasProducts = false;
        rows.forEach(function (row) {
          var lk = LOCAL[row.key]; if (!lk) return;
          if (row.key === 'products') { if (!Array.isArray(row.value)) return; hasProducts = true; }
          if (row.key === 'theme' && (!row.value || typeof row.value !== 'object')) return;
          var old = null; try { old = JSON.parse(localStorage.getItem(lk) || 'null'); } catch (e) { /* ignore */ }
          if (old !== null && canon(old) === canon(row.value)) return;
          try { localStorage.setItem(lk, JSON.stringify(row.value)); changed.push(lk); } catch (e) { /* ignore */ }
        });
        pulled = true;
        changed.forEach(function (k) { try { window.dispatchEvent(new StorageEvent('storage', { key: k })); } catch (e) { /* ignore */ } });
        return { ok: true, hasProducts: hasProducts };
      })
      .catch(function () { return { ok: false }; });
  }

  /* ---------- write: admin changes -> shared catalog ---------- */
  function push(key, value) {
    if (!enabled || !hasSession()) return Promise.reject(new Error('Not signed in'));
    pending[key] = value;
    emit('saving');
    clearTimeout(timer);
    timer = setTimeout(flush, 150);
    return new Promise(function (resolve, reject) { waiters.push({ resolve: resolve, reject: reject }); });
  }
  function flush() {
    if (flushing) { timer = setTimeout(flush, 300); return; }
    var keys = Object.keys(pending); if (!keys.length) return;
    if (!pulled) { pending = {}; var e0 = new Error('Not connected to the online database'); emit('error', 'Not connected to the online database — this change was NOT saved online. Refresh the page and try again.'); settle(false, e0); return; }
    flushing = true;
    var batch = pending; pending = {};
    getToken().then(function (token) {
      if (!token) { emit('authlost', 'Your session expired. Please sign in again.'); settle(false, new Error('auth')); return; }
      return Promise.all(keys.map(function (k) {
        return fetch(BASE + '/rest/v1/kv?on_conflict=key', {
          method: 'POST', headers: headers(token, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify([{ key: k, value: batch[k], updated_at: new Date().toISOString() }])
        }).then(function (r) {
          if (r.status === 401 || r.status === 403) { clearSession(); throw new Error('auth'); }
          if (!r.ok) throw new Error('HTTP ' + r.status);
        });
      })).then(function () { emit('saved'); settle(true); });
    }).catch(function (e) {
      settle(false, e);
      if (e && e.message === 'auth') emit('authlost', 'Not allowed to save. Please sign in again.');
      else emit('error', 'Could not save online (' + (e && e.message || 'network') + '). Your change is only on this device for now.');
    }).then(function () {
      flushing = false;
      if (Object.keys(pending).length) timer = setTimeout(flush, 100);
    });
  }

  /* ---------- product photos -> online storage ---------- */
  function uploadImage(blob) {
    var name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    return getToken().then(function (token) {
      if (!token) throw new Error('Not signed in');
      return fetch(BASE + '/storage/v1/object/' + BUCKET + '/' + name, {
        method: 'POST', headers: { apikey: ANON, Authorization: 'Bearer ' + token, 'Content-Type': blob.type || 'image/jpeg', 'x-upsert': 'false' }, body: blob
      });
    }).then(function (r) {
      if (!r.ok) throw new Error('Upload failed (' + r.status + ')');
      return BASE + '/storage/v1/object/public/' + BUCKET + '/' + name;
    });
  }

  function flushOnLeave() {
    var keys = Object.keys(pending), s = session();
    if (!enabled || !keys.length || !pulled || !s || !s.access_token) return;
    keys.forEach(function (k) {
      try {
        fetch(BASE + '/rest/v1/kv?on_conflict=key', {
          method: 'POST', keepalive: true, headers: headers(s.access_token, { Prefer: 'resolution=merge-duplicates,return=minimal' }),
          body: JSON.stringify([{ key: k, value: pending[k], updated_at: new Date().toISOString() }])
        });
      } catch (e) { /* ignore */ }
    });
    pending = {};
  }
  window.addEventListener('pagehide', flushOnLeave);
  window.addEventListener('beforeunload', flushOnLeave);

  window.EtherealCloud = {
    enabled: enabled, pull: pull, push: push, signIn: signIn, signOut: signOut, hasSession: hasSession,
    email: function () { var s = session(); return s ? s.email : ''; }, uploadImage: uploadImage
  };

  /* ---------- customer pages: stay up to date ---------- */
  if (enabled && page !== 'admin' && page !== 'admin-login') {
    var root = document.documentElement, hidden = false;
    if (!localStorage.getItem(LOCAL.products)) { root.classList.add('cloud-loading'); hidden = true; }   // first visit: don't flash an empty catalog
    function reveal() { if (hidden) { hidden = false; root.classList.remove('cloud-loading'); } }
    setTimeout(reveal, 3000);
    pull().then(reveal);
    setInterval(function () { if (!document.hidden) pull(); }, 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) pull(); });
  }
})();
