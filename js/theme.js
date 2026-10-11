/* ==========================================================================
   Ethereal Perfumes — Theme engine
   Loaded in <head> on every page so the saved theme applies before first paint.
   Exposes window.EtherealTheme.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'ethereal_theme';
  var DEFAULT_NAME = 'Dark Gold';

  // theme key -> CSS variable
  var MAP = {
    primary: '--primary',
    secondary: '--secondary',
    background: '--bg',
    text: '--text',
    accent: '--accent',
    cardBg: '--card-bg',
    button: '--btn',
    buttonText: '--btn-text'
  };

  var PRESETS = {
    'Dark Gold':      { primary: '#d4af37', secondary: '#1a1a1a', background: '#0b0b0b', text: '#f2ede4', accent: '#c8883a', cardBg: '#151515', button: '#d4af37', buttonText: '#0b0b0b' },
    'Midnight Blue':  { primary: '#7fb2ff', secondary: '#0f1a30', background: '#060b17', text: '#e8eefb', accent: '#4f8df0', cardBg: '#0d1730', button: '#4f8df0', buttonText: '#ffffff' },
    'Royal Purple':   { primary: '#c59bff', secondary: '#1d1230', background: '#0c0714', text: '#f1e9fb', accent: '#9b5de5', cardBg: '#1a1028', button: '#9b5de5', buttonText: '#ffffff' },
    'Emerald Green':  { primary: '#4fd1a1', secondary: '#0f2a22', background: '#06100d', text: '#e6f5ef', accent: '#2fb383', cardBg: '#0e211a', button: '#2fb383', buttonText: '#04120d' },
    'Burgundy':       { primary: '#e0a3a8', secondary: '#2a0f16', background: '#12060a', text: '#f7e9eb', accent: '#c0394f', cardBg: '#200d13', button: '#a62c42', buttonText: '#ffffff' }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function isValid(t) {
    if (!t || typeof t !== 'object') return false;
    return Object.keys(MAP).every(function (k) { return /^#[0-9a-f]{6}$/i.test(t[k] || ''); });
  }

  /** Returns the saved theme, or the default preset. */
  function current() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var t = JSON.parse(raw);
        if (isValid(t)) return t;
      }
    } catch (e) { /* ignore */ }
    return clone(PRESETS[DEFAULT_NAME]);
  }

  /** Applies a theme object to a target element (default: whole page). */
  function apply(theme, target) {
    var el = target || document.documentElement;
    Object.keys(MAP).forEach(function (k) {
      if (theme[k]) el.style.setProperty(MAP[k], theme[k]);
    });
  }

  function save(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) { return false; }
    apply(theme);
    if (window.EtherealCloud && window.EtherealCloud.enabled) { var pr = window.EtherealCloud.push('theme', theme); pr.catch(function () {}); save.last = pr; }
    return true;
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    var t = clone(PRESETS[DEFAULT_NAME]);
    apply(t);
    if (window.EtherealCloud && window.EtherealCloud.enabled) { var pr = window.EtherealCloud.push('theme', t); pr.catch(function () {}); save.last = pr; }
    return t;
  }

  window.EtherealTheme = {
    KEY: STORAGE_KEY, MAP: MAP, PRESETS: PRESETS, DEFAULT_NAME: DEFAULT_NAME,
    current: current, apply: apply, save: save, reset: reset, clone: clone
  };

  apply(current());

  // Keep other open tabs in sync when the admin saves a theme.
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY || e.key === null) apply(current());
  });
})();
