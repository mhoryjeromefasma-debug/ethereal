/* ==========================================================================
   Ethereal Perfumes — Customer website logic
   Pages: home, shop, product (selected by <body data-page="...">)
   Requires js/products.js (window.EtherealStore)
   ========================================================================== */
(function () {
  'use strict';

  var S = window.EtherealStore;
  var esc = S.esc;
  var FALLBACK = S.PLACEHOLDER;
  var page = document.body.dataset.page;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Shared layout (header + footer) ---------- */
  var SEARCH_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';

  // >>> PALITAN ITO ng totoong links ng shop mo <<<
  var CONTACT = {
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    whatsapp: 'https://wa.me/'   // hal. https://wa.me/639171234567 (country code + number, walang + o space)
  };

  function renderLayout() {
    var active = page === 'product' ? 'collection' : page;
    var links = [
      ['home', 'Home', 'index.html'],
      ['about', 'About', 'index.html#about'],
      ['collection', 'Collection', 'shop.html'],
      ['contact', 'Contact', '#contact-menu']
    ].map(function (l) {
      return '<a href="' + l[2] + '" data-nav="' + l[0] + '"' + (l[0] === active ? ' class="active"' : '') +
        (l[0] === 'contact' ? ' aria-haspopup="true" aria-expanded="false"' : '') + '>' + l[1] + '</a>';
    }).join('');

    var header = $('#site-header');
    if (header) {
      header.outerHTML =
        '<header class="site-header"><div class="container nav-wrap">' +
        '<a class="logo" href="index.html" aria-label="Ethereal Perfumes home"><span class="logo-word">Ethereal</span><small>Perfumes</small></a>' +
        '<nav class="nav-links" id="nav-links" aria-label="Main">' + links + '<div class="contact-menu" id="contact-menu"><span>Connect with us</span>' +
        '<a href="' + CONTACT.facebook + '" target="_blank" rel="noopener">Facebook <i>&#8599;</i></a>' +
        '<a href="' + CONTACT.instagram + '" target="_blank" rel="noopener">Instagram <i>&#8599;</i></a>' +
        '<a href="' + CONTACT.whatsapp + '" target="_blank" rel="noopener">WhatsApp <i>&#8599;</i></a></div></nav>' +
        '<div class="nav-actions">' +
        '<button class="icon-btn" id="search-btn" aria-label="Search perfumes">' + SEARCH_SVG + '</button>' +
        '<button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false">&#9776;</button>' +
        '</div></div>' +
        '<div class="search-overlay" id="search-overlay"><form class="container" id="search-form" role="search">' +
        '<input type="search" id="search-input" placeholder="Search by perfume name or brand…" autocomplete="off">' +
        '<button class="btn" type="submit">Search</button></form></div></header>';
    }

    var footer = $('#site-footer');
    if (footer) {
      footer.outerHTML =
        '<footer class="site-footer"><div class="container">' +
        '<div class="footer-grid"><div><a class="logo" href="index.html"><span class="logo-word">Ethereal</span><small>Perfumes</small></a>' +
        '<p>A curated catalog of fine fragrances. Browse, discover and check live availability.</p></div>' +
        '<div class="footer-links"><a href="index.html">Home</a><a href="index.html#about">About</a><a href="shop.html">Collection</a></div></div>' +
        '<div class="copyright"><span>&copy; ' + new Date().getFullYear() + ' Ethereal Perfumes</span>' +
        '<span>Product catalog &amp; availability checking only — no online ordering.</span></div>' +
        '</div></footer>';
    }

    // header interactions
    var menuBtn = $('#menu-btn'), nav = $('#nav-links');
    var cMenu = $('#contact-menu'), cLink = $('a[data-nav="contact"]', nav);
    function setContact(open) {
      cMenu.classList.toggle('show', open);
      cLink.classList.toggle('open', open);
      cLink.setAttribute('aria-expanded', String(open));
    }
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
        if (!open) setContact(false);
      });
    }
    $$('a', nav).forEach(function (a) {
      if (a.closest('#contact-menu')) return;
      a.addEventListener('click', function (e) {
        if (a.dataset.nav === 'contact') { e.preventDefault(); setContact(!cMenu.classList.contains('show')); return; }
        setContact(false);
        nav.classList.remove('open');
        // About is a section of the home page: light its line right away on click
        if (a.dataset.nav === 'about' && page === 'home') { e.preventDefault(); setActive('about'); history.replaceState(null, '', '#about'); var t = $('#about'); if (t) t.scrollIntoView({ behavior: 'smooth' }); }
        if (a.dataset.nav === 'home' && page === 'home') { e.preventDefault(); setActive('home'); history.replaceState(null, '', location.pathname); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      });
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('#nav-links')) setContact(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setContact(false); });

    function setActive(key) {
      $$('a[data-nav]', nav).forEach(function (a) { if (a.dataset.nav !== 'contact') a.classList.toggle('active', a.dataset.nav === key); });
    }
    // On the home page, move the line to "About" while the About section is on screen
    if (page === 'home' && 'IntersectionObserver' in window) {
      var aboutEl = $('#about');
      if (aboutEl) new IntersectionObserver(function (entries) {
        setActive(entries[0].isIntersecting ? 'about' : 'home');
      }, { rootMargin: '-45% 0px -45% 0px' }).observe(aboutEl);
    }
    if (page === 'home' && location.hash === '#about') setActive('about');
    var overlay = $('#search-overlay'), input = $('#search-input');
    $('#search-btn').addEventListener('click', function () {
      var shopSearch = $('#shop-search');
      if (shopSearch) { shopSearch.focus(); shopSearch.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      var open = overlay.classList.toggle('open');
      if (open) setTimeout(function () { input.focus(); }, 150);
    });
    $('#search-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var q = input.value.trim();
      location.href = 'shop.html' + (q ? '?q=' + encodeURIComponent(q) : '');
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') overlay.classList.remove('open'); });
  }

  /* ---------- Shared pieces ---------- */
  function badge(p) { var st = S.status(p); return '<span class="badge ' + st.key + '">' + st.label + '</span>'; }
  function imgTag(p, cls) {
    return '<img ' + (cls ? 'class="' + cls + '" ' : '') + 'src="' + esc(p.image || FALLBACK) + '" alt="' + esc(p.name) +
      '" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">';
  }
  function sizeRows(p) {
    var list = p.sizeStock && p.sizeStock.length ? p.sizeStock : [];
    if (!list.length) return '';
    return '<ul class="size-rows">' + list.map(function (v) {
      var cls = v.stock <= 0 ? 'out' : (v.stock <= S.getThreshold() ? 'low' : 'in');
      var txt = v.stock <= 0 ? 'Out of stock' : (cls === 'low' ? 'Only ' + v.stock + ' left' : v.stock + ' in stock');
      return '<li><b>' + esc(v.size) + '</b><span class="' + cls + '">' + txt + '</span></li>';
    }).join('') + '</ul>';
  }
  function newTag(p) { return S.isNewStock(p) ? '<span class="badge-new">New Stock</span>' : ''; }
  function card(p) {
    return '<a class="card reveal" href="product.html?id=' + encodeURIComponent(p.id) + '" aria-label="' + esc(p.name) + ' by ' + esc(p.brand) + '">' +
      '<div class="card-img">' + imgTag(p) + badge(p) + newTag(p) + '</div>' +
      '<div class="card-body"><p class="brand">' + esc(p.brand) + '</p><h3>' + esc(p.name) + '</h3>' +
      '<p class="meta">' + esc(p.category) + '</p>' + sizeRows(p) +
      '<div class="card-foot"><span class="price">' + S.formatPrice(p.price) + '</span><span class="link">View Details &rarr;</span></div></div></a>';
  }
  function observeReveal() {
    var els = $$('.reveal:not(.visible)');
    if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('visible'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visible'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    els.forEach(function (el, i) { el.style.transitionDelay = Math.min(i % 8, 7) * 50 + 'ms'; io.observe(el); });
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }

  /* ---------- INTRO: WELCOME → TO → ETHEREAL, then ETHEREAL moves up to the logo ---------- */
  function initIntro() {
    // Plays every time the site is opened or refreshed.
    // Skipped only when jumping to a section (#about) or coming from another page of this site.
    if (location.hash) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var nav0 = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var isReload = nav0 && nav0.type === 'reload';
    var fromSameSite = false;
    try { fromSameSite = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) { /* ignore */ }
    if (fromSameSite && !isReload) return;

    var ov = document.createElement('div');
    ov.className = 'intro';
    ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<span class="intro-word">Welcome</span><span class="intro-word">To</span>' +
      '<span class="intro-word final">Ethereal</span><button class="intro-skip" type="button">Skip</button>';
    document.body.appendChild(ov);
    // .intro-lock hides the header logo until the animated word lands on it
    document.body.classList.add('intro-lock');

    var words = ov.querySelectorAll('.intro-word');
    var w1 = words[0], w2 = words[1], w3 = words[2];
    var timers = [];
    var finished = false;

    function finish(instant) {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      document.body.classList.remove('intro-lock');          // real logo appears
      if (instant === true) {
        if (ov.parentNode) ov.parentNode.removeChild(ov);      // animated word → logo, seamless
      } else {
        ov.classList.add('done');
        setTimeout(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); }, 1000);
      }
    }

    ov.querySelector('.intro-skip').addEventListener('click', function () { finish(false); });
    timers.push(setTimeout(function () { w1.classList.add('show'); }, 150));
    timers.push(setTimeout(function () { w2.classList.add('show'); }, 1750));
    timers.push(setTimeout(function () { w3.classList.add('show'); }, 3300));
    timers.push(setTimeout(function () {
      var target = document.querySelector('.site-header .logo-word');
      if (!target) { finish(false); return; }
      var from = w3.getBoundingClientRect(), to = target.getBoundingClientRect();
      var dx = (to.left + to.width / 2) - (from.left + from.width / 2);
      var dy = (to.top + to.height / 2) - (from.top + from.height / 2);
      var k = to.width / from.width;
      w3.style.transition = 'transform 1.2s cubic-bezier(.65,0,.25,1)';
      w3.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + k + ')';
      ov.style.background = 'transparent';
      timers.push(setTimeout(function () { finish(true); }, 1250));
    }, 5000));
  }

  /* ---------- HOME ---------- */
  function initHome() {
    function render() {
      var all = S.getAll();
      var feat = all.filter(function (p) { return p.featured; });
      if (!feat.length) feat = all;
      $('#featured-grid').innerHTML = feat.slice(0, 4).map(card).join('') ||
        '<div class="empty" style="grid-column:1/-1"><h3>No perfumes yet</h3><p>Check back soon.</p></div>';

      var brands = S.brands();
      $('#hero-stats').innerHTML =
        '<div><b>' + all.length + '</b><span>Fragrances</span></div>' +
        '<div><b>' + brands.length + '</b><span>Houses</span></div>' +
        '<div><b>' + all.filter(function (p) { return p.stock > 0; }).length + '</b><span>Available</span></div>';

      var desc = { Men: 'Bold, woody and smoky signatures', Women: 'Floral, luminous and sensual', Unisex: 'Genderless, modern and rare' };
      $('#category-tiles').innerHTML = S.CATEGORIES.slice().sort(function (a) { return a === 'Women' ? -1 : 0; }).map(function (c) {
        var items = all.filter(function (p) { return p.category === c; });
        var cover = items[0] ? items[0].image || FALLBACK : FALLBACK;
        return '<a class="tile reveal" href="shop.html?category=' + c + '"><img src="' + esc(cover) + '" alt="' + c + ' fragrances" loading="lazy" onerror="this.onerror=null;this.src=\'' + FALLBACK + '\'">' +
          '<div class="tile-text"><h3>' + c + '</h3><p>' + desc[c] + ' · ' + items.length + ' scents</p><span>Explore &rarr;</span></div></a>';
      }).join('');

      $('#brand-list').innerHTML = brands.map(function (b) {
        return '<a class="brand-card reveal" href="shop.html?brand=' + encodeURIComponent(b.name) + '"><h3>' + esc(b.name) + '</h3><p>' +
          b.count + ' fragrance' + (b.count === 1 ? '' : 's') + ' in the collection</p></a>';
      }).join('');
      observeReveal();
    }
    render();
    window.addEventListener('storage', function (e) { if (e.key === S.KEYS.products || e.key === S.KEYS.settings) render(); });
  }

  /* ---------- SHOP ---------- */
  var PRICE_RANGES = { all: [0, Infinity], u4: [0, 3999], '4-6': [4000, 5999], '6-8': [6000, 7999], '8up': [8000, Infinity] };

  function initShop() {
    var params = new URLSearchParams(location.search);
    var st = {
      q: params.get('q') || '',
      category: S.CATEGORIES.indexOf(params.get('category')) > -1 ? params.get('category') : 'All',
      brand: params.get('brand') || 'All',
      price: 'all', sort: 'newest', inStock: false
    };
    var els = {
      search: $('#shop-search'), pills: $('#cat-pills'), brand: $('#brand-filter'), price: $('#price-filter'),
      sort: $('#sort-select'), stock: $('#instock-only'), reset: $('#reset-filters'), count: $('#result-count'), grid: $('#shop-grid')
    };

    // category pills
    els.pills.innerHTML = ['All'].concat(S.CATEGORIES).map(function (c) {
      return '<button type="button" class="pill" data-cat="' + c + '">' + c + '</button>';
    }).join('');

    function fillBrands() {
      var names = S.brands().map(function (b) { return b.name; });
      if (st.brand !== 'All' && names.indexOf(st.brand) === -1) st.brand = 'All';
      els.brand.innerHTML = '<option value="All">All brands</option>' +
        names.map(function (n) { return '<option value="' + esc(n) + '">' + esc(n) + '</option>'; }).join('');
      els.brand.value = st.brand;
    }

    function syncControls() {
      els.search.value = st.q;
      els.price.value = st.price; els.sort.value = st.sort; els.stock.checked = st.inStock;
      $$('.pill', els.pills).forEach(function (b) { b.classList.toggle('active', b.dataset.cat === st.category); });
    }

    function render() {
      var q = norm(st.q.trim()), range = PRICE_RANGES[st.price] || PRICE_RANGES.all;
      var list = S.getAll().filter(function (p) {
        if (q && norm(p.name).indexOf(q) === -1 && norm(p.brand).indexOf(q) === -1) return false;
        if (st.category !== 'All' && p.category !== st.category) return false;
        if (st.brand !== 'All' && p.brand !== st.brand) return false;
        if (p.price < range[0] || p.price > range[1]) return false;
        if (st.inStock && p.stock <= 0) return false;
        return true;
      });
      list.sort(function (a, b) {
        if (st.sort === 'price-asc') return a.price - b.price;
        if (st.sort === 'price-desc') return b.price - a.price;
        return b.createdAt - a.createdAt;
      });
      els.count.textContent = list.length + (list.length === 1 ? ' fragrance' : ' fragrances') + ' found';
      els.grid.innerHTML = list.length ? list.map(card).join('') :
        '<div class="empty" style="grid-column:1/-1"><h3>No perfumes found</h3><p>Try a different search or clear your filters.</p></div>';
      observeReveal();
    }

    els.search.addEventListener('input', function () { st.q = els.search.value; render(); });
    els.pills.addEventListener('click', function (e) {
      var b = e.target.closest('.pill'); if (!b) return;
      st.category = b.dataset.cat; syncControls(); render();
    });
    els.brand.addEventListener('change', function () { st.brand = els.brand.value; render(); });
    els.price.addEventListener('change', function () { st.price = els.price.value; render(); });
    els.sort.addEventListener('change', function () { st.sort = els.sort.value; render(); });
    els.stock.addEventListener('change', function () { st.inStock = els.stock.checked; render(); });
    els.reset.addEventListener('click', function () {
      st = { q: '', category: 'All', brand: 'All', price: 'all', sort: 'newest', inStock: false };
      fillBrands(); syncControls(); render();
    });
    window.addEventListener('storage', function (e) {
      if (e.key === S.KEYS.products || e.key === S.KEYS.settings) { fillBrands(); render(); }
    });

    fillBrands(); syncControls(); render();
  }

  /* ---------- PRODUCT DETAIL ---------- */
  function initProduct() {
    var id = new URLSearchParams(location.search).get('id');
    var root = $('#product-root');

    function stockPanel(p, checkedAt) {
      var st = S.status(p), msg, note;
      if (st.key === 'out') { msg = 'Currently unavailable'; note = 'This perfume is out of stock right now. Please check again soon.'; }
      else if (st.key === 'low') { msg = 'Only ' + p.stock + ' unit' + (p.stock === 1 ? '' : 's') + ' left'; note = 'Stock is running low — availability may change quickly.'; }
      else { msg = p.stock + ' units available'; note = 'This perfume is available.'; }
      return '<div class="row"><div><span class="stock-qty">' + msg + '</span></div>' + badge(p) + '</div>' +
        '<p class="stock-note">' + note + (checkedAt ? ' <br>Checked at ' + checkedAt + ' from the latest inventory.' : '') + '</p>';
    }

    function render() {
      var p = S.getById(id);
      if (!p) {
        root.innerHTML = '<div class="container"><div class="empty" style="margin:4rem 0"><h3>Perfume not found</h3>' +
          '<p>This product may have been removed from the catalog.</p><p style="margin-top:1.4rem"><a class="btn" href="shop.html">Back to Collection</a></p></div></div>';
        document.title = 'Not found — Ethereal Perfumes';
        return;
      }
      document.title = p.name + ' — Ethereal Perfumes';
      var sizes = (p.sizeStock || S.parseList(p.size).map(function (s) { return { size: s, stock: p.stock }; })).map(function (v) {
        return '<span class="size-stock"><b>' + esc(v.size) + '</b><small class="' + (v.stock > 0 ? 'available' : 'unavailable') + '">' +
          (v.stock > 0 ? v.stock + ' in stock' : 'Out of stock') + '</small></span>';
      }).join('');
      var notes = S.parseList(p.notes).map(function (s) { return '<span class="chip">' + esc(s) + '</span>'; }).join('');
      var related = S.getAll().filter(function (x) { return x.id !== p.id && x.category === p.category; }).slice(0, 4);
      if (related.length < 4) {
        related = related.concat(S.getAll().filter(function (x) { return x.id !== p.id && x.category !== p.category; }).slice(0, 4 - related.length));
      }

      root.innerHTML =
        '<div class="container"><div class="crumbs"><a href="index.html">Home</a> / <a href="shop.html">Collection</a> / ' + esc(p.name) + '</div>' +
        '<div class="product">' +
        '<div class="product-img fade-up">' + imgTag(p) + '</div>' +
        '<div class="product-info fade-up d1">' +
        '<p class="eyebrow">' + esc(p.brand) + ' · ' + esc(p.category) + (S.isNewStock(p) ? ' <span class="badge-new inline">New Stock</span>' : '') + '</p>' +
        '<h1>' + esc(p.name) + '</h1>' +
        '<span class="price">' + S.formatPrice(p.price) + '</span>' +
        '<p class="desc">' + esc(p.description || 'No description available.') + '</p>' +
        '<div class="block"><h4>Available Sizes &amp; Stock</h4><div class="size-stock-list">' + (sizes || '<span class="muted">—</span>') + '</div></div>' +
        '<div class="block"><h4>Fragrance Notes</h4><div class="chips">' + (notes || '<span class="muted">—</span>') + '</div></div>' +
        '<div class="block"><h4>Availability</h4><div class="stock-panel" id="stock-panel">' + stockPanel(p) + '</div>' +
        '<button class="btn btn-block" id="check-btn" type="button">Check Availability</button></div>' +
        '<a class="link-arrow" href="shop.html">&larr; Back to Collection</a>' +
        '</div></div></div>' +
        (related.length ? '<section class="related"><div class="container"><div class="section-head"><div><p class="eyebrow">You may also like</p><h2>Related Fragrances</h2></div></div>' +
          '<div class="grid">' + related.map(card).join('') + '</div></div></section>' : '');

      $('#check-btn').addEventListener('click', function () {
        var btn = this; btn.disabled = true; btn.textContent = 'Checking…';
        setTimeout(function () {
          var fresh = S.getById(id);
          btn.disabled = false; btn.textContent = 'Check Availability';
          if (!fresh) { render(); return; }
          var panel = $('#stock-panel');
          panel.innerHTML = stockPanel(fresh, new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          panel.classList.remove('flash'); void panel.offsetWidth; panel.classList.add('flash');
        }, 450);
      });
      observeReveal();
    }
    render();
    window.addEventListener('storage', function (e) { if (e.key === S.KEYS.products || e.key === S.KEYS.settings) render(); });
  }

  /* ---------- boot ---------- */
  renderLayout();
  if (page === 'home') { initIntro(); initHome(); }
  else if (page === 'shop') initShop();
  else if (page === 'product') initProduct();
})();
