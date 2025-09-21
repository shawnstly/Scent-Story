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

/* ===== SIMPLE HASH ROUTER (terms/privacy/track...) ===== */
(function () {
  const homeSections = Array.from(document.querySelectorAll('[data-home]'));
  const pageView = document.getElementById('page-view');
  const pageContent = document.getElementById('page-content');
  if (!pageView || !pageContent) return;

  const PAGES = {
    '/terms': `<h1 style="font-family:Playfair Display,serif">Terms & Services</h1><p>These sample terms are placeholders for your legal text.</p>`,
    '/privacy': `<h1 style="font-family:Playfair Display,serif">Privacy Policy</h1><p>We respect your privacy. Replace with your official policy.</p>`,
    '/shipping': `<h1 style="font-family:Playfair Display,serif">Shipping Policy</h1><p>Processing 1–2 business days. Standard delivery 3–7 days.</p>`,
    '/returns': `<h1 style="font-family:Playfair Display,serif">Delivery & Returns Policy</h1><p>Unused products in original packaging may be returned within 14 days.</p>`,
    '/contact': `<h1 style="font-family:Playfair Display,serif">Contact</h1>
                 <form id='contact-form' style="display:grid;gap:12px;max-width:560px">
                   <input id='fname' placeholder='First Name' required>
                   <input id='phone' type='tel' placeholder='Phone Number' pattern='^[0-9]{10,15}$' required>
                   <input id='email' type='email' placeholder='Email Address' required>
                   <button type='submit'>Submit</button>
                 </form>`,
    '/grievance': `<h1 style="font-family:Playfair Display,serif">Grievance Redressal</h1>
                   <p>If something went wrong, we want to fix it. Share order details and your concern below.</p>
                   <form style="display:grid;gap:12px;max-width:560px">
                     <input placeholder="Order ID">
                     <input type="email" placeholder="Email" required>
                     <textarea rows="4" placeholder="Describe the issue" required></textarea>
                     <button>Submit</button>
                   </form>
                   <p style="margin-top:10px">Prefer chat? Reach us on WhatsApp: <a href="#">+00 00000 00000</a></p>`,
    '/track': `<h1 style="font-family:Playfair Display,serif">Track My Order</h1>
               <form id="track-form-page" style="display:grid;gap:12px;max-width:460px">
                 <input name="trackId" placeholder="Enter your tracking number" required>
                 <button>Track</button>
                 <small id="track-status"></small>
               </form>`
  };

  function bindContact(){
    const form = document.getElementById('contact-form');
    if(!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if(form.checkValidity()){
        const p = document.getElementById('popup'); if (p) p.classList.add('active');
        form.reset();
      } else {
        alert('Please fill all fields with correct format.');
      }
    });
  }

  function showHome() {
    homeSections.forEach(s => s.style.display = '');
    pageView.style.display = 'none';
    const key = location.hash.replace('#','');
    if (key && !PAGES[key]) history.replaceState(null, '', location.pathname);
  }

  function showPage(html) {
    playLoaderVideo(650);
    homeSections.forEach(s => s.style.display = 'none');
    pageView.style.display = 'block';
    pageContent.innerHTML = html;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderRoute(){
    const key = location.hash.replace('#','');
    if (key && PAGES[key]) {
      showPage(PAGES[key]);
      if (key === '/contact') bindContact();
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
      showHome();
    }
  }

  window.addEventListener('hashchange', renderRoute);
  window.addEventListener('load', renderRoute);
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