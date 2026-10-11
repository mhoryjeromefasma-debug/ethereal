/* ==========================================================================
   Ethereal Perfumes — Product & inventory data layer (cached from the online database)
   Shared by the customer website and the admin panel, so both always show
   the same inventory. Exposes window.EtherealStore.
   ========================================================================== */
(function () {
  'use strict';

  var KEYS = { products: 'ethereal_products', settings: 'ethereal_settings' };
  var DEFAULT_THRESHOLD = 5;
  var CATEGORIES = ['Men', 'Women', 'Unisex'];
  var PLACEHOLDER = 'assets/images/placeholder.svg';

  var DAY = 86400000;
  var NEW_STOCK_DAYS = 7;   // how long the "New Stock" tag stays after restocking

  /* ---- storage helpers ---- */
  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function cloudOn() { return !!(window.EtherealCloud && window.EtherealCloud.enabled); }
  var lastSave = null;
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (e) { console.error('ETHEREAL: could not save to localStorage', e); return false; }
    // admin changes are also saved to the shared online database
    if (cloudOn()) {
      var pr = null;
      if (key === KEYS.products) pr = window.EtherealCloud.push('products', value);
      else if (key === KEYS.settings) pr = window.EtherealCloud.push('settings', value);
      if (pr) { pr.catch(function () {}); lastSave = pr; }
    }
    return true;
  }

  function normalize(p) {
    return {
      id: String(p.id), name: String(p.name || ''), brand: String(p.brand || ''),
      category: CATEGORIES.indexOf(p.category) > -1 ? p.category : 'Unisex',
      price: Number(p.price) || 0, size: String(p.size || ''),
      stock: Math.max(0, Math.floor(Number(p.stock) || 0)),
      sizeStock: Array.isArray(p.sizeStock) ? p.sizeStock.map(function (v) { return { size: String(v.size || ''), stock: Math.max(0, Math.floor(Number(v.stock) || 0)) }; }) : String(p.size || '').split(',').filter(Boolean).map(function (v) { return { size: v.trim(), stock: Math.max(0, Math.floor(Number(p.stock) || 0)) }; }),
      image: String(p.image || ''), description: String(p.description || ''),
      notes: String(p.notes || ''), featured: !!p.featured,
      createdAt: Number(p.createdAt) || Date.now(),
      restockedAt: Number(p.restockedAt) || 0
    };
  }

  function init() { /* catalog always comes from the online database — no local sample data */ }

  /* ---- products ---- */
  function getAll() {
    var list = read(KEYS.products, null);
    return (Array.isArray(list) ? list : []).map(normalize);
  }
  function getById(id) {
    return getAll().filter(function (p) { return p.id === id; })[0] || null;
  }
  function nextId() {
    var max = getAll().reduce(function (m, p) {
      var n = parseInt(String(p.id).replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    var n = String(max + 1);
    while (n.length < 3) n = '0' + n;
    return 'ETH-' + n;
  }
  function add(data) {
    var list = getAll();
    var p = normalize(Object.assign({}, data, { id: data.id || nextId(), createdAt: Date.now(), restockedAt: Date.now() }));
    list.push(p);
    return write(KEYS.products, list) ? p : null;
  }
  function update(id, patch) {
    var list = getAll(), found = null;
    list = list.map(function (p) {
      if (p.id !== id) return p;
      var next = Object.assign({}, p, patch, { id: p.id, createdAt: p.createdAt, restockedAt: p.restockedAt });
      // any stock increase marks the product as "New Stock"
      if (patch.stock != null && Number(patch.stock) > p.stock) next.restockedAt = Date.now();
      found = normalize(next);
      return found;
    });
    return found && write(KEYS.products, list) ? found : null;
  }
  function remove(id) {
    var list = getAll();
    var next = list.filter(function (p) { return p.id !== id; });
    if (next.length === list.length) return false;
    return write(KEYS.products, next);
  }
  function setStock(id, qty) {
    var n = Math.max(0, Math.floor(Number(qty) || 0));
    return update(id, { stock: n });
  }

  /* ---- settings / status ---- */
  function getThreshold() {
    var s = read(KEYS.settings, {});
    var n = Number(s && s.lowStockThreshold);
    return isNaN(n) || n < 0 ? DEFAULT_THRESHOLD : Math.floor(n);
  }
  function setThreshold(n) {
    var v = Math.max(0, Math.floor(Number(n)));
    if (isNaN(v)) return false;
    var s = read(KEYS.settings, {}) || {};
    s.lowStockThreshold = v;
    return write(KEYS.settings, s);
  }
  /** Availability is always derived from stock + threshold, so it can never drift. */
  function status(p) {
    if (p.stock <= 0) return { key: 'out', label: 'Out of Stock' };
    if (p.stock <= getThreshold()) return { key: 'low', label: 'Low Stock' };
    return { key: 'in', label: 'In Stock' };
  }
  function stats() {
    var all = getAll();
    return {
      total: all.length,
      units: all.reduce(function (s, p) { return s + p.stock; }, 0),
      low: all.filter(function (p) { return status(p).key === 'low'; }).length,
      out: all.filter(function (p) { return status(p).key === 'out'; }).length
    };
  }
  /** True for 7 days after stock is added (and while units are available). */
  function isNewStock(p) {
    return p.stock > 0 && p.restockedAt > 0 && (Date.now() - p.restockedAt) < NEW_STOCK_DAYS * DAY;
  }
  function brands() {
    var seen = {};
    getAll().forEach(function (p) { if (p.brand) seen[p.brand] = (seen[p.brand] || 0) + 1; });
    return Object.keys(seen).sort().map(function (b) { return { name: b, count: seen[b] }; });
  }

  /* ---- helpers ---- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function formatPrice(n) { return '₱' + Number(n || 0).toLocaleString('en-PH'); }
  function parseList(str) {
    return String(str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  init();

  window.EtherealStore = {
    KEYS: KEYS, CATEGORIES: CATEGORIES, PLACEHOLDER: PLACEHOLDER,
    getAll: getAll, getById: getById, nextId: nextId, add: add, update: update, remove: remove,
    setStock: setStock, saved: function () { return lastSave || Promise.resolve(); },
    getThreshold: getThreshold, setThreshold: setThreshold, status: status, isNewStock: isNewStock, stats: stats, brands: brands,
    esc: esc, formatPrice: formatPrice, parseList: parseList
  };
})();
