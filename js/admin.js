/* ==========================================================================
   Ethereal Perfumes — Admin logic (login, dashboard, products, stock, theme)
   Pages: admin-login.html, admin.html (selected by <body data-page="...">)
   Login = Supabase Auth (email + password). Every change is saved to the online
   database, so customers on any device see it.
   ========================================================================== */
(function () {
  'use strict';

  var S = window.EtherealStore;
  var Cloud = window.EtherealCloud;
  var ONLINE = !!(Cloud && Cloud.enabled);
  var T = window.EtherealTheme;
  var esc = S.esc;
  var page = document.body.dataset.page;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function isLoggedIn() { return ONLINE && Cloud.hasSession(); }
  var NOT_CONFIGURED = 'Online database is not set up yet. Fill in supabaseUrl and supabaseAnonKey in js/config.js (see README.md), then redeploy.';

  /* ======================= LOGIN PAGE ======================= */
  function initLogin() {
    if (isLoggedIn()) { location.replace('admin.html'); return; }
    var form = $('#login-form'), err = $('#login-error'), card = $('#login-card');
    function fail(msg) {
      err.textContent = msg;
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      $('#password').value = ''; $('#password').focus();
    }
    if (!ONLINE) { err.textContent = NOT_CONFIGURED; $('button[type=submit]', form).disabled = true; return; }
    {
      // real sign-in (Supabase Auth): email + password
      $('label[for="username"]').textContent = 'Email';
      $('#username').type = 'email'; $('#username').autocomplete = 'username';
      $('#password').autocomplete = 'current-password';
      $('#demo-note').innerHTML = '<a href="index.html" class="link-arrow" style="display:inline-block">&larr; Back to website</a>';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = $('button[type=submit]', form); btn.disabled = true; btn.textContent = 'Signing in…'; err.textContent = '';
        Cloud.signIn($('#username').value.trim(), $('#password').value).then(function (r) {
          btn.disabled = false; btn.textContent = 'Sign In';
          if (r.ok) location.href = 'admin.html'; else fail(r.message);
        });
      });
    }
  }

  /* ======================= ADMIN PAGE ======================= */
  function initAdmin() {
    if (!isLoggedIn()) { location.replace('admin-login.html'); return; }

    var TITLES = { dashboard: 'Dashboard', products: 'Product Management', stock: 'Stock Management', theme: 'Theme Customizer' };
    var FALLBACK = S.PLACEHOLDER;
    var toastTimer;

    /* ---------- helpers ---------- */
    function toast(msg, isError) {
      var t = $('#toast');
      t.textContent = msg; t.classList.toggle('error', !!isError); t.classList.add('show');
      clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2600);
    }
    function badge(p) { var st = S.status(p); return '<span class="badge ' + st.key + '">' + st.label + '</span>'; }
    function thumb(p) {
      return '<img src="' + esc(p.image || FALLBACK) + '" alt="" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">';
    }
    function saveFailed() { toast('Could not save — browser storage is full or blocked.', true); }
    // wait until the change is really stored online, then confirm (errors are shown by the sync status handler)
    function confirmSaved(okMsg) {
      S.saved().then(function () { toast(okMsg + ' · saved online ✓'); }, function () { /* sync handler already shows the error */ });
    }

    var modalRoot = $('#modal-root');
    function closeModal() { modalRoot.innerHTML = ''; document.removeEventListener('keydown', escHandler); }
    function escHandler(e) { if (e.key === 'Escape') closeModal(); }
    function openModal(html, small) {
      modalRoot.innerHTML = '<div class="modal-backdrop"><div class="modal' + (small ? ' small' : '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
      $('.modal-backdrop', modalRoot).addEventListener('mousedown', function (e) { if (e.target === this) closeModal(); });
      document.addEventListener('keydown', escHandler);
    }
    function confirmDialog(opts, onYes) {
      openModal('<h2>' + esc(opts.title) + '</h2><p class="muted">' + opts.message + '</p>' +
        '<div class="modal-actions"><button class="btn btn-ghost" id="c-no" type="button">Cancel</button>' +
        '<button class="btn btn-danger" id="c-yes" type="button">' + esc(opts.confirmText || 'Confirm') + '</button></div>', true);
      $('#c-no').addEventListener('click', closeModal);
      $('#c-yes').addEventListener('click', function () { closeModal(); onYes(); });
    }

    /* ---------- navigation ---------- */
    var renderers = { dashboard: renderDashboard, products: renderProducts, stock: renderStock, theme: renderTheme };
    function show(view) {
      if (!TITLES[view]) view = 'dashboard';
      $$('.view').forEach(function (el) { el.classList.toggle('hidden', el.id !== 'view-' + view); });
      $$('[data-view]').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
      $('#view-title').textContent = TITLES[view];
      renderers[view]();
      try { history.replaceState(null, '', '#' + view); } catch (e) { /* ignore */ }
      $('#sidebar').classList.remove('open');
      window.scrollTo(0, 0);
    }
    $$('[data-view]').forEach(function (b) { b.addEventListener('click', function () { show(b.dataset.view); }); });
    $('#side-toggle').addEventListener('click', function () { $('#sidebar').classList.toggle('open'); });
    $('#logout-btn').addEventListener('click', function () {
      Cloud.signOut();
      location.href = 'admin-login.html';
    });

    /* ---------- DASHBOARD ---------- */
    function renderDashboard() {
      var st = S.stats(), all = S.getAll();
      $('#stat-total').textContent = st.total;
      $('#stat-units').textContent = st.units.toLocaleString('en-PH');
      $('#stat-low').textContent = st.low;
      $('#stat-out').textContent = st.out;
      $('#threshold-label').textContent = S.getThreshold();

      function list(key, emptyMsg) {
        var items = all.filter(function (p) { return S.status(p).key === key; });
        if (!items.length) return '<p class="muted">' + emptyMsg + '</p>';
        return items.map(function (p) {
          return '<div class="panel-row">' + thumb(p) + '<div class="grow"><b>' + esc(p.name) + '</b><small>' + esc(p.brand) + ' · ' + esc(p.id) + '</small></div>' +
            '<div style="text-align:right"><b>' + p.stock + '</b><small>units</small></div></div>';
        }).join('');
      }
      $('#low-list').innerHTML = list('low', 'All good — no products are running low.');
      $('#out-list').innerHTML = list('out', 'Nothing is out of stock.');
    }

    /* ---------- PRODUCTS ---------- */
    function renderProducts() {
      var q = $('#prod-search').value.trim().toLowerCase();
      var list = S.getAll().filter(function (p) {
        return !q || (p.id + ' ' + p.name + ' ' + p.brand).toLowerCase().indexOf(q) > -1;
      });
      $('#product-rows').innerHTML = list.length ? list.map(function (p) {
        return '<tr><td>' + thumb(p) + '</td><td>' + esc(p.id) + '</td>' +
          '<td><span class="name">' + esc(p.name) + '</span><small>' + esc(p.brand) + '</small></td>' +
          '<td>' + esc(p.category) + '</td><td>' + S.formatPrice(p.price) + '</td><td>' + esc(p.size) + '</td>' +
          '<td><b>' + p.stock + '</b></td><td>' + badge(p) + (S.isNewStock(p) ? ' <span class="badge-new inline">New Stock</span>' : '') + '</td>' +
          '<td class="actions"><button class="btn btn-ghost btn-sm" data-edit="' + esc(p.id) + '" type="button">Edit</button>' +
          '<button class="btn btn-danger btn-sm" data-del="' + esc(p.id) + '" type="button">Delete</button></td></tr>';
      }).join('') : '<tr><td colspan="9" class="muted" style="text-align:center;padding:2.5rem">No products found.</td></tr>';
    }
    $('#prod-search').addEventListener('input', renderProducts);
    $('#add-product').addEventListener('click', function () { openProductForm(null); });
    $('#product-rows').addEventListener('click', function (e) {
      var ed = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
      if (ed) openProductForm(ed.dataset.edit);
      if (del) {
        var p = S.getById(del.dataset.del); if (!p) return;
        confirmDialog({
          title: 'Delete product?', confirmText: 'Delete',
          message: 'You are about to permanently delete <b>' + esc(p.name) + '</b> (' + esc(p.id) + '). This cannot be undone.'
        }, function () {
          if (S.remove(p.id)) { renderProducts(); confirmSaved('"' + p.name + '" deleted'); } else saveFailed();
        });
      }
    });

    function fileToDataUrl(file, max) {
      return new Promise(function (resolve, reject) {
        var r = new FileReader();
        r.onerror = reject;
        r.onload = function () {
          var im = new Image();
          im.onerror = reject;
          im.onload = function () {
            var k = Math.min(1, max / Math.max(im.width, im.height));
            var c = document.createElement('canvas');
            c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
            var ctx = c.getContext('2d');
            ctx.fillStyle = '#111'; ctx.fillRect(0, 0, c.width, c.height);
            ctx.drawImage(im, 0, 0, c.width, c.height);
            resolve(c.toDataURL('image/jpeg', 0.85));
          };
          im.src = r.result;
        };
        r.readAsDataURL(file);
      });
    }

    function openProductForm(id) {
      var editing = id ? S.getById(id) : null;
      var p = editing || { id: S.nextId(), name: '', brand: '', category: 'Women', price: '', size: '', stock: 0, image: '', description: '', notes: '', featured: false };
      var imgValue = p.image || '';
      var brandOpts = S.brands().map(function (b) { return '<option value="' + esc(b.name) + '">'; }).join('');
      var isData = /^data:/.test(imgValue);

      openModal(
        '<h2>' + (editing ? 'Edit Product' : 'Add Product') + '</h2>' +
        '<form id="product-form" novalidate><div class="form-grid">' +
        '<div><label for="f-id">Product ID</label><input id="f-id" value="' + esc(p.id) + '" readonly></div>' +
        '<div><label for="f-name">Perfume Name *</label><input id="f-name" value="' + esc(p.name) + '" required></div>' +
        '<div><label for="f-brand">Brand *</label><input id="f-brand" list="brand-options" value="' + esc(p.brand) + '" required><datalist id="brand-options">' + brandOpts + '</datalist></div>' +
        '<div><label for="f-category">Category</label><select id="f-category">' +
        S.CATEGORIES.map(function (c) { return '<option' + (c === p.category ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
        '<div><label for="f-price">Price (₱) *</label><input id="f-price" type="number" min="0" step="1" value="' + esc(p.price) + '" required></div>' +
        '<div><label for="f-stock">Stock Quantity *</label><input id="f-stock" type="number" min="0" step="1" value="' + esc(p.stock) + '" required></div>' +
        '<div class="full"><label for="f-size">Sizes (comma separated, e.g. 50ml, 100ml)</label><input id="f-size" value="' + esc(p.size) + '"></div>' +
        '<div class="full"><label for="f-size-stock">Stock per size (format: 50ml:12, 100ml:0)</label><input id="f-size-stock" value="' + esc((p.sizeStock || []).map(function (v) { return v.size + ':' + v.stock; }).join(', ')) + '" placeholder="50ml:12, 100ml:0"><small>Use 0 when a size is sold out. This is what customers will see.</small></div>' +
        '<div class="full"><label>Product Image</label><div class="img-field"><img id="f-preview" src="' + esc(imgValue || FALLBACK) + '" alt="Preview" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' +
        '<div class="inputs"><input id="f-image" placeholder="' + (isData ? 'Uploaded image in use' : 'assets/images/my-perfume.jpg or https://…') + '" value="' + (isData ? '' : esc(imgValue)) + '">' +
        '<input id="f-file" type="file" accept="image/*"></div></div></div>' +
        '<div class="full"><label for="f-notes">Fragrance Notes (comma separated)</label><input id="f-notes" value="' + esc(p.notes) + '" placeholder="Bergamot, Rose, Amber"></div>' +
        '<div class="full"><label for="f-desc">Description</label><textarea id="f-desc">' + esc(p.description) + '</textarea></div>' +
        '<div class="full"><label class="check" style="text-transform:none;letter-spacing:0;font-size:.9rem"><input type="checkbox" id="f-featured"' + (p.featured ? ' checked' : '') + '> Show as featured on the homepage</label></div>' +
        '</div><p class="form-error" id="f-error" role="alert"></p>' +
        '<div class="modal-actions"><button class="btn btn-ghost" id="f-cancel" type="button">Cancel</button>' +
        '<button class="btn" type="submit">' + (editing ? 'Save Changes' : 'Add Product') + '</button></div></form>'
      );

      var preview = $('#f-preview'), imageInput = $('#f-image'), err = $('#f-error');
      imageInput.addEventListener('input', function () { imgValue = imageInput.value.trim(); preview.src = imgValue || FALLBACK; });
      $('#f-file').addEventListener('change', function () {
        var file = this.files[0]; if (!file) return;
        fileToDataUrl(file, 700).then(function (url) {
          imgValue = url; preview.src = url; imageInput.value = ''; imageInput.placeholder = 'Uploaded image in use';
          if (!ONLINE) return;
          // online: keep the photo in online storage so customers load it fast and the catalog stays small
          imageInput.placeholder = 'Uploading photo…'; err.textContent = '';
          return fetch(url).then(function (r) { return r.blob(); }).then(function (blob) { return Cloud.uploadImage(blob); })
            .then(function (publicUrl) { imgValue = publicUrl; imageInput.placeholder = 'Uploaded image in use'; })
            .catch(function () { imageInput.placeholder = 'Uploaded image in use (local copy)'; err.textContent = 'Online photo upload failed, so a local copy is used. Check the storage step in the README.'; });
        }).catch(function () { err.textContent = 'Could not read that image file.'; });
      });
      $('#f-cancel').addEventListener('click', closeModal);

      $('#product-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var data = {
          id: p.id,
          name: $('#f-name').value.trim(), brand: $('#f-brand').value.trim(), category: $('#f-category').value,
          price: Number($('#f-price').value), stock: Number($('#f-stock').value), size: $('#f-size').value.trim(),
          sizeStock: $('#f-size-stock').value.split(',').map(function (part) { var bits = part.split(':'); return { size: (bits[0] || '').trim(), stock: Math.max(0, Math.floor(Number(bits[1]) || 0)) }; }).filter(function (v) { return v.size; }),
          image: imgValue, notes: $('#f-notes').value.trim(), description: $('#f-desc').value.trim(),
          featured: $('#f-featured').checked
        };
        if (!data.name) { err.textContent = 'Perfume name is required.'; return; }
        if (!data.brand) { err.textContent = 'Brand is required.'; return; }
        if ($('#f-price').value === '' || isNaN(data.price) || data.price < 0) { err.textContent = 'Enter a valid price.'; return; }
        if ($('#f-stock').value === '' || isNaN(data.stock) || data.stock < 0 || Math.floor(data.stock) !== data.stock) { err.textContent = 'Stock must be a whole number (0 or more).'; return; }
        var saved = editing ? S.update(p.id, data) : S.add(data);
        if (!saved) { saveFailed(); return; }
        closeModal();
        renderProducts();
        confirmSaved(editing ? 'Product updated' : 'Product added');
      });
    }

    /* ---------- STOCK ---------- */
    function renderStock() {
      $('#threshold-input').value = S.getThreshold();
      $('#stock-rows').innerHTML = S.getAll().map(function (p) {
        return '<tr data-id="' + esc(p.id) + '"><td>' + thumb(p) + '</td>' +
          '<td><span class="name">' + esc(p.name) + '</span><small>' + esc(p.brand) + ' · ' + esc(p.id) + '</small></td>' +
          '<td class="st-cell">' + badge(p) + '</td>' +
          '<td><div class="stepper"><button type="button" data-step="-1" aria-label="Decrease">&minus;</button>' +
          '<input type="number" min="0" step="1" value="' + p.stock + '" aria-label="Stock for ' + esc(p.name) + '">' +
          '<button type="button" data-step="1" aria-label="Increase">+</button></div></td></tr>';
      }).join('');
    }
    function commitStock(row, value) {
      var id = row.dataset.id, qty = Math.max(0, Math.floor(Number(value)));
      if (isNaN(qty)) qty = 0;
      var updated = S.setStock(id, qty);
      if (!updated) { saveFailed(); return; }
      $('input', row).value = updated.stock;
      $('.st-cell', row).innerHTML = badge(updated);
      confirmSaved(updated.name + ': ' + updated.stock + ' units · ' + S.status(updated).label);
    }
    $('#stock-rows').addEventListener('click', function (e) {
      var b = e.target.closest('[data-step]'); if (!b) return;
      var row = b.closest('tr'), input = $('input', row);
      commitStock(row, (Number(input.value) || 0) + Number(b.dataset.step));
    });
    $('#stock-rows').addEventListener('change', function (e) {
      if (e.target.matches('input')) commitStock(e.target.closest('tr'), e.target.value);
    });
    $('#save-threshold').addEventListener('click', function () {
      var v = $('#threshold-input').value;
      if (v === '' || isNaN(Number(v)) || Number(v) < 0) { toast('Enter a valid threshold (0 or more).', true); return; }
      if (!S.setThreshold(v)) { saveFailed(); return; }
      confirmSaved('Low-stock threshold set to ' + S.getThreshold());
      renderStock();
    });

    /* ---------- THEME ---------- */
    var FIELDS = [
      ['primary', 'Primary Color'], ['secondary', 'Secondary Color'], ['background', 'Background Color'], ['text', 'Text Color'],
      ['accent', 'Accent Color'], ['cardBg', 'Product Card Background'], ['button', 'Button Color'], ['buttonText', 'Button Text Color']
    ];
    var draft = T.current();
    var previewEl = $('#theme-preview');

    function syncPreview() {
      T.apply(draft, previewEl);
      FIELDS.forEach(function (f) {
        $('#pk-' + f[0]).value = draft[f[0]];
        $('#hx-' + f[0]).value = draft[f[0]];
      });
      var names = Object.keys(T.PRESETS);
      $$('.preset').forEach(function (b) {
        var pr = T.PRESETS[b.dataset.preset];
        b.classList.toggle('active', Object.keys(T.MAP).every(function (k) { return pr[k].toLowerCase() === String(draft[k]).toLowerCase(); }));
      });
      return names;
    }
    function renderTheme() {
      draft = T.current();
      $('#presets').innerHTML = Object.keys(T.PRESETS).map(function (name) {
        var pr = T.PRESETS[name];
        return '<button type="button" class="preset" data-preset="' + esc(name) + '"><span class="dots"><i style="background:' + pr.primary + '"></i><i style="background:' + pr.accent + '"></i><i style="background:' + pr.background + '"></i></span>' + esc(name) + '</button>';
      }).join('');
      $('#color-fields').innerHTML = FIELDS.map(function (f) {
        return '<div class="color-row"><label for="pk-' + f[0] + '">' + f[1] + '</label>' +
          '<input type="color" id="pk-' + f[0] + '" data-key="' + f[0] + '">' +
          '<input type="text" id="hx-' + f[0] + '" data-key="' + f[0] + '" maxlength="7" spellcheck="false" aria-label="' + f[1] + ' hex"></div>';
      }).join('');
      syncPreview();
    }
    $('#presets').addEventListener('click', function (e) {
      var b = e.target.closest('.preset'); if (!b) return;
      draft = T.clone(T.PRESETS[b.dataset.preset]); syncPreview();
    });
    $('#color-fields').addEventListener('input', function (e) {
      var key = e.target.dataset.key; if (!key) return;
      var v = e.target.value.trim();
      if (e.target.type === 'text') {
        if (v.charAt(0) !== '#') v = '#' + v;
        if (!/^#[0-9a-f]{6}$/i.test(v)) return;       // wait until the hex is complete
      }
      draft[key] = v.toLowerCase();
      T.apply(draft, previewEl);
      $('#pk-' + key).value = draft[key];
      if (e.target.type !== 'text') $('#hx-' + key).value = draft[key];
      $$('.preset').forEach(function (b) {
        var pr = T.PRESETS[b.dataset.preset];
        b.classList.toggle('active', Object.keys(T.MAP).every(function (k) { return pr[k].toLowerCase() === String(draft[k]).toLowerCase(); }));
      });
    });
    $('#save-theme').addEventListener('click', function () {
      if (T.save(draft)) { var pr = T.save.last; if (pr) pr.then(function () { toast('Theme saved online ✓ — applies to the whole website'); }, function () {}); } else saveFailed();
    });
    $('#reset-theme').addEventListener('click', function () {
      draft = T.reset(); syncPreview(); if (T.save.last) T.save.last.then(function () { toast('Theme reset to default (Dark Gold) ✓'); }, function () {});
    });

    // keep admin in sync if stock changes in another tab
    window.addEventListener('storage', function (e) {
      if (e.key === S.KEYS.products || e.key === S.KEYS.settings) {
        var cur = $$('[data-view]').filter(function (b) { return b.classList.contains('active'); })[0];
        if (cur && cur.dataset.view !== 'theme' && !modalRoot.innerHTML) renderers[cur.dataset.view]();
      }
    });

    /* ---------- online sync status ---------- */
    var syncEl = $('#sync-status'), syncTimer;
    function setSync(text, cls) { if (!syncEl) return; syncEl.textContent = text; syncEl.className = 'sync' + (cls ? ' ' + cls : ''); }
    if (!ONLINE) {
      setSync('Database not configured', 'err'); toast(NOT_CONFIGURED, true);
    } else {
      setSync('Connecting to online database…');
      window.addEventListener('ethereal:sync', function (e) {
        var d = e.detail || {};
        clearTimeout(syncTimer);
        if (d.state === 'saving') setSync('Saving online…');
        else if (d.state === 'saved') { setSync('Saved online ✓', 'ok'); syncTimer = setTimeout(function () { setSync('Online · ' + Cloud.email(), 'ok'); }, 2500); }
        else if (d.state === 'error') { setSync('Not saved online', 'err'); toast(d.message, true); }
        else if (d.state === 'authlost') { toast(d.message, true); setTimeout(function () { location.replace('admin-login.html'); }, 1600); }
      });
      Cloud.pull().then(function (r) {
        if (!r.ok) { setSync('Offline — changes will NOT be saved online', 'err'); toast('Cannot reach the online database. Check js/config.js and your internet, then refresh.', true); return; }
        setSync('Online · ' + Cloud.email(), 'ok');
        var cur = $$('[data-view]').filter(function (b) { return b.classList.contains('active'); })[0];
        if (cur && !modalRoot.innerHTML) renderers[cur.dataset.view]();
      });
    }

    show((location.hash || '').replace('#', '') || 'dashboard');
  }

  if (page === 'admin-login') initLogin();
  else if (page === 'admin') initAdmin();
})();
