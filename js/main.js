// Page fade-in
window.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('ready');
});
// try to control scroll restoration (not critical if unsupported)
try { history.scrollRestoration = 'manual'; } catch(_) {}

/* ===== Loader (video) ===== */
const loader = document.getElementById('page-loader');
const loaderVideo = document.getElementById('brand-loader-video');

function showLoader(){ if (loader) loader.classList.add('active'); }
function hideLoader(){ if (loader) loader.classList.remove('active'); }

function playLoaderVideo(capMs = 1000){
  if (!loader) return { ms: capMs };
  showLoader();
  if (loaderVideo) {
    try { loaderVideo.currentTime = 0; } catch(_) {}
    const p = loaderVideo.play?.();
    if (p && typeof p.then === 'function') p.catch(()=>{});
  }
  const ms = (loaderVideo && isFinite(loaderVideo.duration))
    ? Math.min(loaderVideo.duration * 1000, capMs)
    : capMs;
  setTimeout(() => { try{ loaderVideo && loaderVideo.pause?.(); }catch(_){} hideLoader(); }, ms);
  return { ms };
}

// Tiny reveal on first paint
window.addEventListener('DOMContentLoaded', () => setTimeout(hideLoader, 150));

// Intercept same-origin navigations (ignore hashes/external/new-tab)
document.addEventListener('click', (e) => {
  const a = e.target.closest('a'); if (!a) return;
  const href = a.getAttribute('href') || '';
  if (!href || href.startsWith('#') || /^https?:\/\//i.test(href) || a.target === '_blank') return;
  e.preventDefault();
  const { ms } = playLoaderVideo(1000);
  window.scrollTo({ top: 0, behavior: 'auto' });
  setTimeout(() => { window.location.href = href; }, Math.max(200, Math.min(ms * 0.6, 600)));
});

// Avoid flash on leave
window.addEventListener('beforeunload', showLoader);

/* ===== Mobile nav toggle + overlay ===== */
const nav = document.getElementById('primary-nav');
const toggle = document.querySelector('.nav-toggle');
const overlay = document.getElementById('nav-overlay');
let isOpen = false;

function setMenuState(open) {
  isOpen = open;
  if (nav) nav.classList.toggle('is-open', open);
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('body-locked', open);
  if (overlay) overlay.classList.toggle('active', open);

  // swap icon + label
  if (toggle) {
    toggle.innerHTML = open
      ? '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
}
if (toggle) toggle.addEventListener('click', () => setMenuState(!isOpen));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) setMenuState(false); });
document.addEventListener('click', (e) => {
  const inside = (nav && nav.contains(e.target)) || (toggle && toggle.contains(e.target));
  if (!inside && isOpen) setMenuState(false);
});
if (nav) nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenuState(false)));
if (overlay) overlay.addEventListener('click', () => setMenuState(false));

/* ===== HERO MARQUEE (robust) ===== */
(function(){
  const marquee = document.getElementById('marquee');
  if(!marquee) return;

  let offset = 0, paused = false, last = performance.now();
  let speed = window.innerWidth < 768 ? 20 : 30; // px/s responsive
  let slideW = 0;
  const GAP = 24; // must match CSS .marquee gap

  function measure(){
    const first = marquee.firstElementChild;
    slideW = first ? (first.offsetWidth + GAP) : 0;
  }

  window.addEventListener('load', measure);
  window.addEventListener('resize', () => { speed = window.innerWidth < 768 ? 20 : 30; measure(); });
  marquee.addEventListener('mouseenter', () => { paused = true; });
  marquee.addEventListener('mouseleave', () => { paused = false; });

  function tick(now){
    const dt = (now - last) / 1000; last = now;
    if(!paused && slideW){
      offset -= speed * dt;
      if (Math.abs(offset) >= slideW) {
        marquee.appendChild(marquee.firstElementChild);
        offset += slideW;
        measure();
      }
      marquee.style.transform = `translateX(${offset}px)`;
    }
    requestAnimationFrame(tick);
  }

  measure(); // fallback if load already fired
  requestAnimationFrame(tick);
})();

/* ===== Newsletter inline success ===== */
(function(){
  const form = document.getElementById('newsletter-form');
  if(!form) return;
  const email = document.getElementById('nl-email');
  const ok = document.getElementById('newsletter-success');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!email || !email.value || !email.validity.valid) { email && email.focus(); return; }
    if (ok) ok.hidden = false;
    form.reset();
  });
})();

/* ===== Year in footer ===== */
(function(){ const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear(); })();

/* ===== Wishlist (storage + global toggle) ===== */
const WISHLIST_KEY = 'SCENT_WISHLIST_V1';
// Map old/short keys to the catalog slugs we use in app.js
const SKU_ALIASES = {
  // Elixir
  'ceo': 'ceo-elixir',
  'autumn-fire': 'autumn-fire-elixir',
  'forever-love': 'forever-love-elixir',
  
  // Parfum
  'intense-romance': 'intense-romance-parfum',
  'victory-night': 'victory-night-parfum',
  'winter-embrace': 'winter-embrace-parfum',
  'the-icon': 'the-icon-parfum',
  'tropical-escape': 'tropical-escape-parfum',
  // EDP
  'boardroom': 'boardroom-edp',
  'fresh-salt': 'fresh-salt-edp',
  'beast': 'beast-edp',
  'first-date': 'first-date-edp',
  'summer-drift': 'summer-drift-edp',
};
function resolveSkuAlias(s){ const k = String(s||'').toLowerCase(); return SKU_ALIASES[k] || k; }
function readWishlist(){ try { return JSON.parse(localStorage.getItem(WISHLIST_KEY)||'[]'); } catch(_) { return []; } }
function writeWishlist(list){
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(list||[]));
  try{ window.dispatchEvent(new CustomEvent('wishlist:changed')); }catch(_){ }
}
function inWishlist(sku){ const key = resolveSkuAlias(sku); return readWishlist().some(it => resolveSkuAlias(it.sku) === key); }
function addToWishlist(item){ const list = readWishlist(); if(!list.some(it=>it.sku===item.sku)){ list.push(item); writeWishlist(list); } window.dispatchEvent(new CustomEvent('wishlist:changed')); }

// Helper: robust key for wishlist items (string or object)
function __wlKey(v){
  if (!v) return '';
  if (typeof v === 'string') return v.toLowerCase();
  return String(v.sku || v.slug || v.id || __slugifyName(v.name||'')) .toLowerCase();
}

function removeFromWishlist(sku){
  var key = String(sku||'').toLowerCase();
  var filtered = readWishlist().filter(function(it){
    return __wlKey(it) !== key;
  });
  writeWishlist(filtered);
  try{ window.dispatchEvent(new CustomEvent('wishlist:changed')); }catch(_){ }
}
function toggleWishlist(item){
  item.sku = resolveSkuAlias(item.sku);
  inWishlist(item.sku) ? removeFromWishlist(item.sku) : addToWishlist(item);
}

function extractProductDataFromEl(el){
  const param = (name)=>{ try{ return new URLSearchParams(window.location.search).get(name); }catch(_){ return null; } };
  const slugify = (s)=>String(s||'fragrance').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');

  // 1) Prefer active PDP product populated by app.js (product.html)
  if (window.activeProduct && window.activeProduct.slug){
    const p = window.activeProduct;
    return {
      sku: String(p.slug).toLowerCase(),
      name: p.name || 'Fragrance',
      price: String(p.priceINR || p.price || ''),
      image: (p.images && p.images[0]) ? p.images[0] : '',
      href: `product.html?slug=${p.slug}`,
      tags: [p.intensity, p.chapter].filter(Boolean)
    };
  }

  // 2) If URL has ?slug=, resolve via global PRODUCTS
  const slug = param('slug');
  if (slug && Array.isArray(window.PRODUCTS)){
    const p = window.PRODUCTS.find(x => (x.slug||'').toLowerCase() === String(slug).toLowerCase());
    if (p){
      return {
        sku: String(p.slug).toLowerCase(),
        name: p.name || 'Fragrance',
        price: String(p.priceINR || p.price || ''),
        image: (p.images && p.images[0]) ? p.images[0] : '',
        href: `product.html?slug=${p.slug}`,
        tags: [p.intensity, p.chapter].filter(Boolean)
      };
    }
  }

  // 3) DOM fallback for tiles/cards
  const root  = el.closest('[data-product]') || el.closest('.tile') || el.closest('.product') || document;
  const sku   = el.getAttribute('data-sku')   || root.getAttribute('data-sku')   || '';
  const name  = el.getAttribute('data-name')  || root.getAttribute('data-name')  || (root.querySelector('.product-title, h1, h2')?.textContent) || 'Fragrance';
  const price = el.getAttribute('data-price') || root.getAttribute('data-price') || (root.querySelector('.price')?.textContent) || '';

  // try to find a meaningful image near the control
  let image = el.getAttribute('data-image') || el.getAttribute('data-img') || root.getAttribute('data-image') || root.getAttribute('data-img');
  if(!image){
    const cand = root.querySelector('.img-primary, .product-media .is-active img, .gallery img.is-active, .gallery img.current, .gallery img, img[data-primary], picture img, img');
    if(cand){ image = cand.currentSrc || cand.src || cand.getAttribute('src'); }
  }
  if(!image){
    const anyImg = document.querySelector('.img-primary, .gallery img, picture img, img');
    if(anyImg){ image = anyImg.currentSrc || anyImg.src || anyImg.getAttribute('src'); }
  }
  // normalize to images/
  if (image){
    let s = String(image).trim();
    if (!/^https?:/i.test(s) && !/\bimages\//i.test(s)){
      s = s.replace(/^\.\//,'');
      s = 'images/' + s;
    }
    image = s;
  }

  return { sku: resolveSkuAlias(String(sku || slugify(name)).toLowerCase()), name: String(name).trim(), price: String(price).trim(), image: image || '', href: window.location.href };
}

// ===== Wishlist enrichment from catalog (ensures image/name/price/href are present) =====
function __slugifyName(s){
  return String(s||'')
    .toLowerCase()
    .replace(/&/g,' and ')
    .replace(/[^a-z0-9]+/g,'-')
    .replace(/(^-|-$)/g,'');
}
// Fallback images by the *real* slugs used in PDP/PDP1
const FALLBACK_IMG_BY_SLUG = {
  '': 'images/placeholder.png',
  // Elixir
  'ceo-elixir':        'images/CEO.png',
  'autumn-fire-elixir':'images/Autumn Fire.png',
  'forever-love-elixir':    'images/Forever Love.png',
  
  // Parfum
  'intense-romance-parfum': 'images/Intense Romance.png',
  'victory-night-parfum': 'images/Victory Night.png',
  'winter-embrace-parfum':'images/Winter Embrace.png',
  'tropical-escape-parfum':'images/Tropical Escape.png',
  'the-icon-parfum':        'images/Icon.png',
  // EDP
  'boardroom-edp':     'images/Boardroom.png',
  'fresh-salt-edp':    'images/Fresh Salt.png',
  'first-date-edp':      'images/First Date.png',
  'beast-edp':      'images/Beast.png',
  'summer-drift-edp': 'images/Summer Drift.png',
};

// ===== Wishlist image helpers (robust path + fallbacks) =====
function __wlBuildImgCandidates(raw){
  let p = String(raw||'').trim();
  if(!p) return ['/images/placeholder.png'];
  // normalize to /images/... root-based
  if(!/^https?:/i.test(p)){
    if(p.startsWith('./')) p = p.slice(2);
    if(!/^images\//i.test(p)) p = 'images/' + p;
    p = '/' + p.replace(/^\/+/,'');
  }
  const i = p.lastIndexOf('/');
  const dir = (i===-1) ? '/' : p.slice(0,i+1);
  const file = (i===-1) ? p : p.slice(i+1);
  const dot = file.lastIndexOf('.');
  const base = dot===-1 ? file : file.slice(0,dot);
  const ext  = dot===-1 ? ''   : file.slice(dot);

  const variants = new Set();
  function enc(name){ variants.add(dir + encodeURIComponent(name + ext)); }
  const forms = [
    base,
    base.replace(/\s+/g,''),
    base.replace(/\s+/g,'_'),
    base.replace(/\s+/g,'-'),
    base.toLowerCase(),
    base.toUpperCase(),
    base.replace(/\s+/g,'').toLowerCase(),
    base.replace(/\s+/g,'_').toLowerCase(),
    base.replace(/\s+/g,'-').toLowerCase(),
    base.replace(/\s+/g,'').toUpperCase(),
    base.replace(/\s+/g,'_').toUpperCase(),
    base.replace(/\s+/g,'-').toUpperCase()
  ];
  forms.forEach(enc);
  variants.add('/images/placeholder.png');
  return Array.from(variants);
}

window.__wlImgFallback = function(imgEl){
  try{
    const list = JSON.parse(imgEl.getAttribute('data-fallbacks')||'[]');
    let idx = Number(imgEl.getAttribute('data-fallback-idx')||'0');
    idx++;
    if(idx < list.length){
      imgEl.setAttribute('data-fallback-idx', String(idx));
      imgEl.src = list[idx];
    }else{
      imgEl.src = '/images/placeholder.png';
    }
  }catch(_){ imgEl.src = '/images/placeholder.png'; }
};

function resolveWishlistImagePath(item){
  let img = (item && item.image) || FALLBACK_IMG_BY_SLUG[String(item && item.sku || '').toLowerCase()] || '';
  const list = __wlBuildImgCandidates(img);
  return { src: list[0], fallbacks: list };
}

function enrichWishlistItemFromCatalog(data){
  try{
    var catalog = Array.isArray(window.PRODUCTS) ? window.PRODUCTS : [];
    if (!catalog.length) return data; // nothing to enrich

    var skuKey  = String(data.sku||'').toLowerCase();
    var nameKey = __slugifyName(data.name||'');

    var match = catalog.find(function(p){ return (p.slug||'').toLowerCase() === skuKey; })
            || catalog.find(function(p){ return __slugifyName(p.name) === skuKey; })
            || catalog.find(function(p){ return __slugifyName(p.name) === nameKey; })
            || null;

    if (!match) return data;

    // Ensure wishlist items always have a stable SKU (catalog slug)
    if (!data.sku) data.sku = (match.slug || __slugifyName(match.name || ''));
    if (String(data.sku||'').toLowerCase() === 'unknown') data.sku = (match.slug || __slugifyName(match.name||''));

    if (!data.name)  data.name  = match.name || data.name;
    if (!data.price) data.price = String(match.priceINR || match.price || '');

    if (!data.image){
      var catImg = (Array.isArray(match?.images) && match.images.length) ? match.images[0] : '';
      data.image = catImg || FALLBACK_IMG_BY_SLUG[skuKey] || FALLBACK_IMG_BY_SLUG[nameKey] || data.image || '';
    }

    if (!data.href)  data.href  = 'product.html?slug=' + (match.slug || skuKey || nameKey);
  }catch(_){ /* no-op */ }
  return data;
}

// Optional global for inline usage
window.ScentWishlist = { add: addToWishlist, remove: removeFromWishlist, toggle: toggleWishlist, has: inWishlist, read: readWishlist };

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-wishlist]');
  if(!btn) return;
  let data = extractProductDataFromEl(btn);
  data = enrichWishlistItemFromCatalog(data); // ensure image/name/price/href from catalog
  data.sku = resolveSkuAlias(data.sku);
  // (Optional safety) Ensure click‑added items get catalog slug if present
  if (!data.sku && data.href){
    try{ var u = new URL(data.href, location.href); var s = u.searchParams.get('slug'); if (s) data.sku = s; }catch(_){}
  }
  toggleWishlist(data);
  const active = inWishlist(data.sku);
  btn.classList.toggle('active', active);
  btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  try{
    if(window.__updateWishlistBadge__) window.__updateWishlistBadge__();
    if(window.__pulseWishlistBadge__)  window.__pulseWishlistBadge__();
  }catch(_){}
});

/* ===== SIMPLE HASH ROUTER (terms/privacy/track...) ===== */
(function () {
  // Global router guard so we only bind once across all pages (index, PDP, etc.)
  if (window.__HAS_MAIN_ROUTER__) return; 
  window.__HAS_MAIN_ROUTER__ = true;

  const homeSections = Array.from(document.querySelectorAll('[data-home]'));
  let pageView = document.getElementById('page-view');
  let pageContent = document.getElementById('page-content');
  // If a page doesn't provide #page-view/#page-content (e.g., PDP), create a lightweight container
  if (!pageView || !pageContent) {
    pageView = document.createElement('section');
    pageView.id = 'page-view';
    pageView.style.display = 'none';
    pageView.style.minHeight = '40vh';
    pageView.innerHTML = '<div id="page-content"></div>';
    document.body.appendChild(pageView);
    pageContent = document.getElementById('page-content');
  }

  // Detect a primary content area on non-index pages so we can hide/show it when SPA routes are active
  const mainPage = document.getElementById('pdp-main') || document.getElementById('main-content') || document.querySelector('main');

  const PAGES = {
    '/terms': `<h1 style="font-family:Playfair Display,serif">Terms & Services</h1><p>These sample terms are placeholders for your legal text.</p>`,
    '/privacy': `<h1 style="font-family:Playfair Display,serif">Privacy Policy</h1><p>We respect your privacy. Replace with your official policy.</p>`,
    '/shipping': `<h1 style="font-family:Playfair Display,serif">Shipping Policy</h1><p>Processing 1–2 business days. Standard delivery 3–7 days.</p>`,
    '/returns': `<h1 style="font-family:Playfair Display,serif">Delivery & Returns Policy</h1><p>Unused products in original packaging may be returned within 14 days.</p>`,
    '/contact': `
    <section class="container" aria-labelledby="contact-title" style="max-width:1100px">
        <h1 id="contact-title" class="section-title" style="margin-bottom:6px">We’re Here to Help</h1>
        <p style="color:#a8b0ba;margin:0 0 20px">Questions about your order, our fragrances, or membership? Contact our scent concierge below.</p>

        <div style="display:grid;grid-template-columns:1.2fr .8fr;gap:16px">
          <!-- Contact Form -->
          <form id="contact-form" class="contact-form" novalidate
                style="display:grid;gap:10px;background:#12151a;border:1px solid #262b33;border-radius:16px;padding:16px">
            <div>
              <label style="font-size:12px;color:#a8b0ba">Full Name</label>
              <input name="name" required placeholder="Your full name"
                     style="width:100%;padding:10px;border-radius:10px;border:1px solid #262b33;background:#0f1216;color:#EDEDED" />
            </div>
            <div>
              <label style="font-size:12px;color:#a8b0ba">Email</label>
              <input name="email" type="email" inputmode="email" required maxlength="254"
                     pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[A-Za-z]{2,}$"
                     placeholder="you@example.com"
                     oninput="this.value=this.value.replace(/\\s/g,'').toLowerCase()"
                     style="width:100%;padding:10px;border-radius:10px;border:1px solid #262b33;background:#0f1216;color:#EDEDED" />
            </div>
            <div>
              <label style="font-size:12px;color:#a8b0ba">Phone (10 digits)</label>
              <input name="phone" inputmode="numeric" pattern="[0-9]{10}" maxlength="10" required
                     placeholder="10-digit mobile"
                     oninput="this.value=this.value.replace(/\\D/g,'').slice(0,10)"
                     style="width:100%;padding:10px;border-radius:10px;border:1px solid #262b33;background:#0f1216;color:#EDEDED" />
            </div>
            <div>
              <label style="font-size:12px;color:#a8b0ba">Reason for Contact</label>
              <select name="reason" style="width:100%;padding:10px;border-radius:10px;border:1px solid #262b33;background:#0f1216;color:#EDEDED">
                <option>Order Inquiry</option>
                <option>Membership & Rewards</option>
                <option>Return / Exchange</option>
                <option>Corporate Gifting</option>
                <option>Press / Collaborations</option>
              </select>
            </div>
            <div>
              <label style="font-size:12px;color:#a8b0ba">Message</label>
              <textarea name="message" rows="5" minlength="20" required placeholder="How can we help?"
                        style="width:100%;padding:10px;border-radius:10px;border:1px solid #262b33;background:#0f1216;color:#EDEDED"></textarea>
              <small style="color:#a8b0ba">Minimum 20 characters for context.</small>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn-gold" type="submit"
                      style="background:linear-gradient(135deg,#f6e7b9,#bfa06a);border:1px solid #bfa06a;color:#111;border-radius:12px;padding:12px 14px">
                Send Message
              </button>
              <a class="btn" href="#/track"
                 style="display:inline-flex;align-items:center;gap:8px;border:1px solid #262b33;background:#1a1f26;border-radius:12px;padding:12px 14px;color:#fff;text-decoration:none">
                Track My Order
              </a>
            </div>
            <p id="contact-success" role="status" hidden
               style="margin:8px 0 0;color:#45D483;font-weight:600">Thanks! Our concierge will respond within 24 hours.</p>
          </form>

          <!-- Info Cards -->
          <div style="display:grid;gap:10px">
            <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px">
              <div class="body" style="padding:14px 16px">
                <h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Call Us</h3>
                <p style="margin:0;color:#a8b0ba">+91 98765 43210<br/>Mon–Sat, 10 AM – 7 PM IST</p>
              </div>
            </div>
            <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px">
              <div class="body" style="padding:14px 16px">
                <h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Email Support</h3>
                <p style="margin:0;color:#a8b0ba">support@scentstory.in<br/>Response within 24–48 hrs</p>
              </div>
            </div>
            <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px">
              <div class="body" style="padding:14px 16px">
                <h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Corporate Office</h3>
                <p style="margin:0;color:#a8b0ba">21, Park Street, Bangalore, India</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    `,

    '/grievance': `
      <section class="container" aria-labelledby="griev-title" style="padding:20px 0 28px;max-width:1100px;">
        <h1 id="griev-title" class="section-title">Grievances</h1>
        <p style="max-width:820px;color:var(--muted);margin:6px 0 14px">
          Tell us what went wrong and we’ll make it right. We respond within 24 hours (Mon–Sat, 10:00–18:00 IST).
        </p>

        <div class="grievance-grid">
          <!-- Left: Form -->
          <form id="grievance-form" class="grievance-form" novalidate>
            <div class="row2">
              <label>Full Name
                <input name="name" type="text" required placeholder="Your full name">
              </label>
              <label>Email
                <input name="email" type="email" required placeholder="name@example.com"
                       pattern="^(?:[a-z0-9_\-.+]+)@(?:[a-z0-9\-]+\.)+[a-z]{2,}$"
                       title="Enter a valid email address">
              </label>
            </div>
            <div class="row2">
              <label>Phone (10 digits)
                <input name="phone" type="tel" inputmode="numeric" pattern="^\d{10}$" maxlength="10"
                       placeholder="9876543210" title="Enter exactly 10 digits">
              </label>
              <label>Order ID (optional)
                <input name="order" type="text" placeholder="SS123456">
              </label>
            </div>
            <label>Issue Type
              <select name="issue" required>
                <option value="">Select an issue</option>
                <option value="delivery">Delivery Delay / Damage</option>
                <option value="quality">Product Quality</option>
                <option value="payment">Payment / Refund</option>
                <option value="account">Account / Access</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>Message
              <textarea name="message" rows="6" required placeholder="Describe the issue with details (dates, order ID, photos if any)"></textarea>
            </label>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <label style="display:flex;align-items:center;gap:8px">
                <input id="g-consent" type="checkbox" required>
                <span style="color:var(--muted)">I agree to the <a href="index.html#/privacy" style="text-decoration:underline">Privacy Policy</a></span>
              </label>
              <button type="submit" class="btn-gold">Submit Grievance</button>
              <span id="g-hint" style="color:#e9b949"></span>
            </div>
            <p id="grievance-success" role="status" hidden style="margin-top:8px;color:#8de6a2">
              Thanks. Your grievance has been recorded. Our team will reach out within 24 hours.
            </p>
          </form>

          <!-- Right: Policy / help card -->
          <aside class="panel">
            <h3 style="margin:0 0 8px;color:#efe2b8">Policy &amp; Help</h3>
            <ul style="list-style:none;padding:0;margin:0;display:grid;gap:8px;color:var(--muted)">
              <li><i class="fa-regular fa-file-lines" aria-hidden="true"></i> <a href="index.html#/returns">Returns Policy</a></li>
              <li><i class="fa-regular fa-file-lines" aria-hidden="true"></i> <a href="index.html#/shipping">Shipping Policy</a></li>
              <li><i class="fa-regular fa-envelope" aria-hidden="true"></i> support@scentstory.in</li>
              <li><i class="fa-solid fa-headset" aria-hidden="true"></i> +91‑804‑000‑0000 (10:00–18:00 IST)</li>
            </ul>
          </aside>
        </div>
      </section>
    `,
    '/track': `<h1 style="font-family:Playfair Display,serif">Track My Order</h1>
               <form id="track-form-page" style="display:grid;gap:12px;max-width:460px">
                 <input name="trackId" placeholder="Enter your tracking number" required>
                 <button>Track</button>
                 <small id="track-status"></small>
               </form>`,

    '/wishlist': `
      <section class="container" aria-labelledby="wl-title" style="max-width:1100px;">
        <h1 id="wl-title" class="section-title">My Wishlist</h1>
        <p style="color:#a8b0ba;margin-top:-6px">Save the scents you love. Items stay here until you remove them or add to bag.</p>

        <div id="wishlist-empty" style="display:none;text-align:center;padding:28px 12px">
          <p style="font-weight:600;background:linear-gradient(90deg,#ff6b6b,#ffc400);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Your wishlist is empty</p>
          <p style="color:#a8b0ba">Explore our <a href="#/collections" style="color:#ffc400">full collections</a> and tap ♡ on any product.</p>
          <a class="btn-gold" href="#/collections" style="margin-top:8px">Browse Collections</a>
        </div>

        <div id="wishlist-grid" class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px"></div>
      </section>
    `,

    '/collections': `
      <section class="container" aria-labelledby="collections-title" style="max-width:1200px">
        <h1 id="collections-title" class="section-title" style="margin-bottom:6px">Explore All Collections</h1>
        <p style="color:#a8b0ba;margin:0 0 18px">Browse our complete lineup by concentration — Eau de Parfum (EDP), Parfum, and Elixir.</p>

        <div class="col-groups" style="display:grid;gap:18px">
          <!-- EDP -->
          <section aria-labelledby="sec-edp" class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px;overflow:hidden">
            <div class="head" style="padding:14px 16px;border-bottom:1px solid #262b33;display:flex;align-items:center;justify-content:space-between">
              <h2 id="sec-edp" style="margin:0;font-size:18px;font-family:'Playfair Display',serif">Eau de Parfum (EDP)</h2>
              <a href="pdp1.html?cat=edp" class="btn" style="border:1px solid #262b33;background:#1a1f26;color:#fff;border-radius:10px;padding:8px 12px;text-decoration:none">View all EDP</a>
            </div>
            <div class="body" style="padding:14px 16px">
              <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
                <a class="tile" href="pdp1.html?cat=edp&sku=firstdate" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/First Date.png" alt="First Date – EDP" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">First Date</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Fruity • Citrus • White Musk</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=edp&sku=freshsalt" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Fresh Salt.png" alt="Fresh Salt – EDP" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Fresh Salt</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Marine • Crisp • Clean</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=edp&sku=beast" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Beast.png" alt="Beast – EDP" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Beast</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Spicy • Bold • Woody</p></div>
                </a>
              </div>
            </div>
          </section>

          <!-- Parfum -->
          <section aria-labelledby="sec-parfum" class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px;overflow:hidden">
            <div class="head" style="padding:14px 16px;border-bottom:1px solid #262b33;display:flex;align-items:center;justify-content:space-between">
              <h2 id="sec-parfum" style="margin:0;font-size:18px;font-family:'Playfair Display',serif">Parfum</h2>
              <a href="pdp1.html?cat=parfum" class="btn" style="border:1px solid #262b33;background:#1a1f26;color:#fff;border-radius:10px;padding:8px 12px;text-decoration:none">View all Parfum</a>
            </div>
            <div class="body" style="padding:14px 16px">
              <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
                <a class="tile" href="pdp1.html?cat=parfum&sku=intenseromance" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Intense Romance.png" alt="Intense Romance – Parfum" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Intense Romance</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Vanilla • Tonka • Rose</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=parfum&sku=icon" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Icon.png" alt="Icon – Parfum" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Icon</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Amber • Leather • Spice</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=parfum&sku=tropicalescape" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Tropical Escape.png" alt="Tropical Escape – Parfum" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Tropical Escape</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Coconut • Jasmine • Sandal</p></div>
                </a>
              </div>
            </div>
          </section>

          <!-- Elixir -->
          <section aria-labelledby="sec-elixir" class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px;overflow:hidden">
            <div class="head" style="padding:14px 16px;border-bottom:1px solid #262b33;display:flex;align-items:center;justify-content:space-between">
              <h2 id="sec-elixir" style="margin:0;font-size:18px;font-family:'Playfair Display',serif">Elixir</h2>
              <a href="pdp1.html?cat=elixir" class="btn" style="border:1px solid #262b33;background:#1a1f26;color:#fff;border-radius:10px;padding:8px 12px;text-decoration:none">View all Elixir</a>
            </div>
            <div class="body" style="padding:14px 16px">
              <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">
                <a class="tile" href="pdp1.html?cat=elixir&sku=ceo" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/CEO.png" alt="CEO – Elixir" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">CEO</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Black Pepper • Cardamom • Cedarwood</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=elixir&sku=foreverlove" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Forever Love.png" alt="Forever Love – Elixir" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Forever Love</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Rose • Patchouli • Musk</p></div>
                </a>
                <a class="tile" href="pdp1.html?cat=elixir&sku=autumnfire" style="display:block;border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216;text-decoration:none">
                  <img src="images/Autumn Fire.png" alt="Autumn Fire – Elixir" style="width:100%;height:350px;object-fit:cover;display:block">
                  <div style="padding:10px 12px"><h3 style="margin:0 0 4px;font-size:15px;font-family:'Playfair Display',serif;color:#EDEDED">Autumn Fire</h3><p style="margin:0;color:#a8b0ba;font-size:13px">Smoky • Resin • Spice</p></div>
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>
    `,
    '/about': `
      <section class="container" style="max-width:1100px;padding:24px 0 40px;">
        <h1 class="section-title">About Us</h1>
        <p style="color:#a8b0ba">Scent Story crafts modern luxury fragrances with IFRA‑compliant ingredients and a focus on longevity, clarity and elegance. Designed in India. Worn everywhere.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px">
          <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px"><div class="body" style="padding:14px 16px"><h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Our Promise</h3><p style="margin:0;color:#a8b0ba">Cruelty‑free. Phthalate‑free. Thoughtfully sourced aroma molecules and naturals.</p></div></div>
          <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px"><div class="body" style="padding:14px 16px"><h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Made For Gifting</h3><p style="margin:0;color:#a8b0ba">Premium boxes, personalized notes, and effortless returns.</p></div></div>
        </div>
      </section>
    `,

    '/craft': `
      <section class="container" style="max-width:1100px;padding:24px 0 40px;">
        <h1 class="section-title">Craft &amp; Safety</h1>
        <p style="color:#a8b0ba">We adhere to IFRA guidelines and batch‑test every lot for stability and safety. Bottles are filled in controlled, clean rooms and sealed for freshness.</p>
        <ul style="margin-top:10px;color:#a8b0ba">
          <li>IFRA &amp; FDA aligned formulation practices</li>
          <li>Allergens disclosed as required</li>
          <li>Stability testing across heat and humidity ranges</li>
        </ul>
      </section>
    `,

    '/press': `
      <section class="container" style="max-width:1100px;padding:24px 0 40px;">
        <h1 class="section-title">Press</h1>
        <p style="color:#a8b0ba">For media inquiries and imagery, write to <b>press@scentstory.in</b>.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:14px">
          <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px"><div class="body" style="padding:14px 16px"><h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Media Kit</h3><p style="margin:0;color:#a8b0ba">Logos, bottle renders, and brand guidelines available on request.</p></div></div>
          <div class="card" style="background:#12151a;border:1px solid #262b33;border-radius:16px"><div class="body" style="padding:14px 16px"><h3 style="margin:0 0 6px;font-family:'Playfair Display',serif">Samples &amp; Reviews</h3><p style="margin:0;color:#a8b0ba">We partner with creators for honest reviews and editorial features.</p></div></div>
        </div>
      </section>
    `,

    '/cookies': `
      <section class="container" style="max-width:1100px;padding:24px 0 40px;">
        <h1 class="section-title">Cookies &amp; Consent</h1>
        <p style="color:#a8b0ba">Cookies help us remember your preferences and measure performance. Manage preferences in your browser.</p>
      </section>
    `,

    '/accessibility': `
      <section class="container" style="max-width:1100px;padding:24px 0 40px;">
        <h1 class="section-title">Accessibility</h1>
        <p style="color:#a8b0ba">We strive to meet WCAG 2.1 AA. If you encounter issues, please contact support@scentstory.in.</p>
      </section>
    `,
  };

  function setActiveRoute(){
    const current = location.hash || '#/home';
    document.querySelectorAll('a[href^="#/"]').forEach(a => {
      const on = a.getAttribute('href') === current;
      a.classList.toggle('is-active', on);
      a.setAttribute('aria-current', on ? 'page' : 'false');
    });
  }

  function bindGrievance(){
    const form = document.getElementById('grievance-form');
    if(!form) return;

    const email = form.elements.email;
    const phone = form.elements.phone;
    const issue = form.elements.issue;
    const message = form.elements.message;
    const success = document.getElementById('grievance-success');

    // Email validity
    if(email){
      const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
      const checkEmail = ()=> email.setCustomValidity(re.test((email.value||'').trim()) ? '' : 'Please enter a valid email (e.g., name@example.com)');
      ['input','change','blur'].forEach(ev=> email.addEventListener(ev, checkEmail));
      checkEmail();
    }

    // Optional phone: clamp to 10 digits if present
    if(phone){
      const clamp = ()=>{ phone.value = (phone.value||'').replace(/\D/g,'').slice(0,10); };
      ['input','change'].forEach(ev=> phone.addEventListener(ev, clamp));
      clamp();
    }

    // Issue is required
    if(issue){
      const checkIssue = ()=> issue.setCustomValidity(issue.value ? '' : 'Please select an issue type.');
      ['change','blur'].forEach(ev=> issue.addEventListener(ev, checkIssue));
      checkIssue();
    }

    // Message: min length 30
    if(message){
      const min = 30;
      const checkMsg = ()=> message.setCustomValidity((message.value||'').length >= min ? '' : `Please provide at least ${min} characters.`);
      ['input','change','blur'].forEach(ev=> message.addEventListener(ev, checkMsg));
      checkMsg();
    }

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); return; }
      if(success){ success.hidden = false; success.scrollIntoView({behavior:'smooth', block:'center'}); }
      form.reset();
    });
  }

  function bindContact(){
    const form = document.getElementById('contact-form');
    if(!form) return;

    const email = form.elements.email;
    const phone = form.elements.phone;
    const message = form.elements.message;
    const success = document.getElementById('contact-success');

    // Email: custom validity
    if(email){
      const re = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
      const checkEmail = ()=>{
        const v = (email.value||'').trim();
        email.setCustomValidity(re.test(v) ? '' : 'Please enter a valid email (e.g., name@example.com)');
      };
      ['input','change','blur'].forEach(ev=> email.addEventListener(ev, checkEmail));
      checkEmail();
    }

    // Phone: clamp to 10 digits
    if(phone){
      const clamp = ()=>{ phone.value = (phone.value||'').replace(/\D/g,'').slice(0,10); };
      ['input','change'].forEach(ev=> phone.addEventListener(ev, clamp));
      clamp();
    }

    // Message: min length feedback
    if(message){
      const min = 20;
      const checkMsg = ()=> message.setCustomValidity((message.value||'').length >= min ? '' : `Please provide at least ${min} characters.`);
      ['input','change','blur'].forEach(ev=> message.addEventListener(ev, checkMsg));
      checkMsg();
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if(!form.checkValidity()){ form.reportValidity(); return; }
      // Simulate success
      if(success){ success.hidden = false; success.scrollIntoView({behavior:'smooth', block:'center'}); }
      form.reset();
    });
  }

  function bindWishlist(){
    const grid = document.getElementById('wishlist-grid');
    const empty = document.getElementById('wishlist-empty');
    if(!grid || !empty) return;

    function render(){
      const list = readWishlist().map(function(raw){
        // Allow legacy string entries (just sku)
        const obj = (typeof raw === 'string') ? { sku: resolveSkuAlias(raw) } : raw;
        const enriched = enrichWishlistItemFromCatalog(obj);
        if (!enriched.image) {
          enriched.image = FALLBACK_IMG_BY_SLUG[String(enriched.sku||'').toLowerCase()] || enriched.image || '';
        }
        return enriched;
      });
      grid.innerHTML = '';
      if(!list.length){
        empty.style.display='block';
        return;
      } else {
        empty.style.display='none';
      }

      const frag = document.createDocumentFragment();
      list.forEach(item=>{
        const priceHtml = item.price ? '<p class="price" style="margin:0 0 10px;color:#efe2b8">'+ item.price +'</p>' : '';
        const card = document.createElement('article');
        card.className = 'card';
        card.setAttribute('data-sku', item.sku);
        card.style.cssText = 'border:1px solid #262b33;border-radius:12px;overflow:hidden;background:#0f1216';
        const resolved = resolveWishlistImagePath(item);
        card.innerHTML = (
          '<div style="position:relative;aspect-ratio:1/1;background:#12151a">\n' +
            '<img src="'+ resolved.src +'" data-fallbacks=\''+ JSON.stringify(resolved.fallbacks).replace(/'/g,'&apos;') +'\' data-fallback-idx="0" alt="'+ (item.name||'Fragrance') +'" onerror="window.__wlImgFallback(this)" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">\n' +
          '</div>\n' +
          '<div style="padding:10px 12px">\n' +
            '<h3 style="margin:0 0 6px;font-family:\'Playfair Display\',serif">'+ (item.name||'Fragrance') +'</h3>\n' +
            priceHtml +
            '<div style="display:flex;gap:8px">\n' +
              '<button class="btn-gold" data-act="add-cart">Add to Bag</button>\n' +
              '<button class="btn" data-act="remove" style="border:1px solid #262b33;background:#1a1f26;color:#fff;border-radius:10px;padding:8px 12px">Remove</button>\n' +
            '</div>\n' +
          '</div>'
        );
        frag.appendChild(card);
      });
      grid.appendChild(frag);
    }

    render();

    grid.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      const card = btn.closest('[data-sku]'); if(!card) return;
      const sku = card.getAttribute('data-sku');
      const list = readWishlist();
      const item = list.find(it=>it.sku===sku);
      if (btn.dataset.act === 'remove') {
        removeFromWishlist(sku);
        // re-render only the removed item, not all
        const remaining = readWishlist();
        const itemCard = card;
        itemCard.remove();
        if (!remaining.length) {
          empty.style.display = 'block';
        }
        return;
      }
      if(btn.dataset.act==='add-cart' && item){
        if(typeof window.addToCart === 'function'){
          const priceNum = parseInt(String(item.price).replace(/[^0-9]/g,''),10) || 0;
          window.addToCart({ sku: item.sku, name: item.name, price: priceNum, image: item.image, qty: 1 });
        }
        removeFromWishlist(sku); render();
      }
    });

    window.addEventListener('wishlist:changed', render);
  }

  function showHome() {
    // Show index home sections if present
    homeSections.forEach(s => s.style.display = '');
    // Show native page content on standalone pages (PDP, etc.)
    if (mainPage) mainPage.style.display = '';
    // Hide SPA container
    pageView.style.display = 'none';
    setActiveRoute();
    const key = location.hash.replace('#','');
    if (key && !PAGES[key]) history.replaceState(null, '', location.pathname);
  }

  function showPage(html) {
    playLoaderVideo(650);
    // Hide index sections if present
    homeSections.forEach(s => s.style.display = 'none');
    // Hide native page content on standalone pages when showing a SPA page
    if (mainPage) mainPage.style.display = 'none';
    // Show SPA container
    pageView.style.display = 'block';
    pageContent.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderRoute(){
    const key = location.hash.replace('#','');
    if (key && PAGES[key]) {
      showPage(PAGES[key]);
      setActiveRoute();
      if (key === '/contact') bindContact();
      if (key === '/grievance') bindGrievance();
      if (key === '/wishlist') bindWishlist();
      if (key === '/track') {
        const tf = document.getElementById('track-form-page');
        if (tf) tf.addEventListener('submit', (e)=>{
          e.preventDefault();
          const id = new FormData(tf).get('trackId');
          const t = document.getElementById('track-status');
          if (t) t.textContent = id ? `Status for ${id}: In transit – expected delivery 3–5 days.` : 'Enter a tracking number.';
        });
      }
    } else {
      // Only collapse into the SPA home when we are actually on the SPA root (index),
      // i.e., when the page has home sections. On standalone pages (PDP, etc.),
      // do nothing so their native content remains visible.
      if (homeSections.length) {
        showHome();
      } else {
        setActiveRoute(); // just keep hash highlights consistent
      }
    }
  }

  // Run in capture phase so our router wins against other handlers and works on all pages
  window.addEventListener('hashchange', renderRoute, true);
  window.addEventListener('popstate', renderRoute, true);
  window.addEventListener('load', renderRoute, true);
})();

function setupSeamlessMarquee(selector = '#marquee') {
  const track = document.querySelector(selector);
  if (!track) return;
  if (track.dataset.seamless === '1') return;

  const children = Array.from(track.children);

  // Clone one full set for seamless wrap
  children.forEach(node => track.appendChild(node.cloneNode(true)));

  // Ensure >= 2× viewport width (prevents gaps on very wide screens)
  const viewport = track.parentElement;
  const minWidth = (viewport?.clientWidth || window.innerWidth) * 2;
  while (track.scrollWidth < minWidth) {
    children.forEach(node => track.appendChild(node.cloneNode(true)));
  }

  track.dataset.seamless = '1';
}

document.addEventListener('DOMContentLoaded', () => {
  setupSeamlessMarquee('#marquee');  // or '.marquee-track' if you use a wrapper
});
/* Popup close helper for inline button */
window.closePopup = function(){ const p=document.getElementById('popup'); if(p) p.classList.remove('active'); };
// Failsafe: if body stays hidden due to an early script parse error, ensure visibility
try { setTimeout(()=>{ document.body && document.body.classList.add('ready'); }, 0); } catch(_) {}

// ===== WL Navbar Badge (count + pop) — guarded init =====
(function(){
  if (window.__WL_BADGE_INITIALIZED__) return; // prevent double init
  window.__WL_BADGE_INITIALIZED__ = true;

  var WISHLIST_KEY = 'SCENT_WISHLIST_V1';

  function readWishlistCount(){
    try{
      var raw = localStorage.getItem(WISHLIST_KEY) || '[]';
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 0;  // supports array of slugs or objects
    }catch(_){ return 0; }
  }

  function updateWishlistBadge(){
    var n = readWishlistCount();
    // Numeric badge (preferred)
    document.querySelectorAll('#wishlist-count').forEach(function(b){
      b.textContent = n;
      b.hidden = !(n>0);
    });
    // Fallback text if no numeric badge exists
    document.querySelectorAll('#wishlistLink, a[href="wishlist.html"]').forEach(function(link){
      if (!link) return;
      if (link.querySelector('#wishlist-count')) return; // numeric badge present
      var base = link.getAttribute('data-base-label') || 'Wishlist';
      link.textContent = n>0 ? (base + ' ('+ n +')') : base;
    });
  }

  function pulseWishlistBadge(){
    var target = document.getElementById('wishlist-count')
             || document.getElementById('wishlistLink')
             || document.querySelector('a[href="wishlist.html"]');
    if(!target) return;
    target.classList.remove('wl-pop');
    void target.offsetWidth; // reflow to restart animation
    target.classList.add('wl-pop');
    setTimeout(function(){ target.classList.remove('wl-pop'); }, 420);
  }

  // expose for explicit calls
  window.__updateWishlistBadge__ = updateWishlistBadge;
  window.__pulseWishlistBadge__  = pulseWishlistBadge;

  // keep in sync across tabs & local toggles
  window.addEventListener('storage', function(e){ if(e.key==='SCENT_WISHLIST_V1') updateWishlistBadge(); });
  window.addEventListener('wishlist:changed', function(){ updateWishlistBadge(); pulseWishlistBadge(); });
  document.addEventListener('DOMContentLoaded', updateWishlistBadge);

  // tiny CSS for badge + pop
  try{
    var style = document.createElement('style');
    style.textContent = '#wishlist-count{display:inline-flex;min-width:18px;height:18px;align-items:center;justify-content:center;border-radius:9px;font-size:12px;background:#bfa06a;color:#111;margin-left:6px;padding:0 6px;box-shadow:0 4px 14px rgba(191,160,106,.25)}.wl-pop{animation:wlPop .33s ease}@keyframes wlPop{0%{transform:scale(.85)}50%{transform:scale(1.15)}100%{transform:scale(1)}}';
    document.head.appendChild(style);
  }catch(_){ }
})();

/* ==========================================================
   Navbar Count Logic — style‑safe (does not change fonts/colors)
   Works with badge spans (#cart-count / #wishlist-count) or text fallback
   ========================================================== */
(function(){
  var CART_KEY = 'SCENT_CART_V1';
  var WL_KEY   = 'SCENT_WISHLIST_V1';

  function getCartCount(){
    try{ var arr = JSON.parse(localStorage.getItem(CART_KEY)||'[]');
         return Array.isArray(arr) ? arr.reduce(function(s,i){ return s + (i && i.qty ? i.qty : 1); }, 0) : 0; }
    catch(_){ return 0; }
  }
  function getWishlistCount(){
    try{ var arr = JSON.parse(localStorage.getItem(WL_KEY)||'[]');
         return Array.isArray(arr) ? arr.length : 0; }
    catch(_){ return 0; }
  }

  function updateCartBadgeGeneric(){
    var n = getCartCount();
    var badge = document.getElementById('cart-count');
    if (badge) { badge.textContent = n; badge.hidden = !(n>0); }
    else {
      var link = document.getElementById('cart-link') || document.querySelector('a[href*="cart"]');
      if (link) {
        var base = link.getAttribute('data-base-label') || link.dataset.baseLabel || 'Cart';
        link.textContent = (n>0) ? (base + ' (' + n + ')') : base;
      }
    }
  }

  function updateWishlistBadgeGeneric(){
    // If the dedicated WL badge module exists, use it to avoid conflicts
    if (window.__updateWishlistBadge__) { try{ window.__updateWishlistBadge__(); return; }catch(_){} }
    var n = getWishlistCount();
    var badge = document.getElementById('wishlist-count');
    if (badge) { badge.textContent = n; badge.hidden = !(n>0); }
    else {
      var link = document.getElementById('wishlistLink') || document.querySelector('a[href*="wishlist"]');
      if (link) {
        var base = link.getAttribute('data-base-label') || link.dataset.baseLabel || 'Wishlist';
        link.textContent = (n>0) ? (base + ' (' + n + ')') : base;
      }
    }
  }

  // Expose for pages to call without altering styles
  window.updateCartBadgeGeneric = updateCartBadgeGeneric;
  window.updateWishlistBadgeGeneric = updateWishlistBadgeGeneric;

  // Keep in sync across events (no CSS injected)
  window.addEventListener('storage', function(e){
    if (e.key === CART_KEY) updateCartBadgeGeneric();
    if (e.key === WL_KEY)   updateWishlistBadgeGeneric();
  });
  window.addEventListener('cart:changed', updateCartBadgeGeneric);
  window.addEventListener('wishlist:changed', updateWishlistBadgeGeneric);

  // Patch existing writers if present to emit change events (logic-only)
  (function(){
    try{
      if (typeof window.writeCart === 'function') {
        var _wc = window.writeCart;
        window.writeCart = function(items){ _wc(items); try{ window.dispatchEvent(new CustomEvent('cart:changed')); }catch(_){} };
      }
      if (typeof window.writeWishlist === 'function') {
        var _ww = window.writeWishlist;
        window.writeWishlist = function(list){ _ww(list); try{ window.dispatchEvent(new CustomEvent('wishlist:changed')); }catch(_){} };
      }
    }catch(_){ }
  })();

  // First paint + gentle polling to catch late loads
  function tick(){ updateCartBadgeGeneric(); updateWishlistBadgeGeneric(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tick); else tick();
  setInterval(tick, 900);
})();