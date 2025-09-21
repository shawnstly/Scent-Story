// ==============================
// app.js (v2)
// ==============================

// 1) Product data (add images you have)
const PRODUCTS = [
    {
      slug: "ceo-elixir",
      name: "CEO Elixir",
      chapter: "Ambition",
      intensity: "Elixir",
      priceINR: 12999,
      notes: ["Oud", "Amber", "Saffron"],
      images: ["images/products/ceo-elixir.png","images/products/ceo-elixir-2.png","images/products/ceo-elixir-3.png"],
      bestseller: true,
      newLaunch: true
    },
    {
      slug: "boardroom-edp",
      name: "Boardroom EDP",
      chapter: "Power",
      intensity: "EDP",
      priceINR: 6999,
      notes: ["Cedar", "Vetiver", "Bergamot"],
      images: ["images/products/boardroom.png","images/products/boardroom-2.png"],
      bestseller: true
    },
    {
      slug: "fresh-salt-edp",
      name: "Fresh Salt EDP",
      chapter: "Seasons",
      intensity: "EDP",
      priceINR: 5999,
      notes: ["Sea Salt", "Musk", "Citrus"],
      images: ["images/products/fresh-salt.png"],
    },
    {
      slug: "intense-romance-parfum",
      name: "Intense Romance Parfum",
      chapter: "Romantic",
      intensity: "Parfum",
      priceINR: 8999,
      notes: ["Rose", "Vanilla", "Tonka"],
      images: ["images/products/intense-romance.png"]
    },
    {
      slug: "victory-night-edp",
      name: "Victory Night EDP",
      chapter: "Bold",
      intensity: "EDP",
      priceINR: 7499,
      notes: ["Incense", "Patchouli", "Grapefruit"],
      images: ["images/products/victory-night.png"],
    },
    {
      slug: "tropical-escape-edp",
      name: "Tropical Escape EDP",
      chapter: "Carefree",
      intensity: "EDP",
      priceINR: 5799,
      notes: ["Coconut", "Pineapple", "Jasmine"],
      images: ["images/products/tropical-escape.png"],
      newLaunch: true
    },
  ];
  
  // 2) Helpers
  function inr(n){ return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR"}).format(n); }
  function param(name){ return new URLSearchParams(window.location.search).get(name); }
  function el(id){ return document.getElementById(id); }
  
  // 3) Cart storage
  const CART_KEY = "SCENT_CART_V1";
  function readCart(){ return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  function writeCart(items){ localStorage.setItem(CART_KEY, JSON.stringify(items)); renderCartLink(); }
  function cartCount(){ return readCart().reduce((sum, i) => sum + i.qty, 0); }
  function renderCartLink(){ const l = el("cartLink"); if(l) l.textContent = `Cart (${cartCount()})`; }
  function addToCart(slug, qty=1){
    const cart = readCart();
    const found = cart.find(i => i.slug === slug);
    if(found){ found.qty += qty; } else { cart.push({ slug, qty }); }
    writeCart(cart); alert("Added to cart!");
  }
  function removeFromCart(slug){
    writeCart(readCart().filter(i => i.slug !== slug));
    renderCartPage();
  }
  function updateCartQty(slug, delta){
    const cart = readCart();
    const it = cart.find(i => i.slug === slug);
    if(!it) return;
    it.qty = Math.max(1, it.qty + delta);
    writeCart(cart);
    renderCartPage();
  }
  
  // 4) Home
  function renderHome(){
    const grid = el("productGrid");
    if(!grid) return;
    const bestsellers = PRODUCTS.filter(p => p.bestseller);
    grid.innerHTML = bestsellers.map(p => cardHTML(p)).join("");
  }
  
  // 5) Cards
  function cardHTML(p){
    return `
    <div class="card">
      <img src="${p.images[0] || 'images/placeholder.png'}" alt="${p.name}"/>
      <div class="title">${p.name}</div>
      <div class="muted">${p.chapter} • ${p.intensity}</div>
      <div class="price">${inr(p.priceINR)}</div>
      <div style="display:flex; gap:8px;">
        <a class="btn" href="product.html?slug=${p.slug}">View</a>
        <button class="btn-outline" onclick="addToCart('${p.slug}', 1)">Add</button>
      </div>
    </div>`;
  }
  
  // 6) PDP
  let activeProduct = null;
  function renderPDP(){
    const slug = param("slug"); if(!slug) return;
    activeProduct = PRODUCTS.find(p => p.slug === slug);
    if(!activeProduct){ document.querySelector(".pdp")?.replaceWith("Product not found."); return; }
  
    el("pName").textContent = activeProduct.name;
    el("pIntensity").textContent = activeProduct.intensity;
    el("pPrice").textContent = inr(activeProduct.priceINR);
    const pc = el("pChapter"); if(pc) pc.textContent = `Chapter: ${activeProduct.chapter}`;
  
    const notesUl = el("pNotes");
    notesUl.innerHTML = activeProduct.notes.map(n => `<li>${n}</li>`).join("");
  
    const main = el("mainImage");
    const thumbs = el("thumbs");
    main.src = activeProduct.images[0] || 'images/placeholder.png';
    thumbs.innerHTML = activeProduct.images.map((src, i)=>`<img src="${src}" alt="thumb ${i+1}" onclick="swapImage('${src}')"/>`).join("");
  
    el("addToCartBtn").onclick = () => {
      const qty = parseInt(el("qtyInput").value || "1", 10);
      addToCart(activeProduct.slug, Math.max(1, qty));
    };
  
    // Recommended = same chapter first, then others
    const reco = el("recoGrid");
    const same = PRODUCTS.filter(p => p.slug!==activeProduct.slug && p.chapter===activeProduct.chapter);
    const rest = PRODUCTS.filter(p => p.slug!==activeProduct.slug && p.chapter!==activeProduct.chapter);
    const picks = [...same, ...rest].slice(0,4);
    reco.innerHTML = picks.map(p => cardHTML(p)).join("");
  }
  function swapImage(src){ el("mainImage").src = src; }
  function incrementQty(){ const i = el("qtyInput"); i.value = Math.max(1, parseInt(i.value||"1",10) + 1); }
  function decrementQty(){ const i = el("qtyInput"); i.value = Math.max(1, parseInt(i.value||"1",10) - 1); }
  function toggleWishlist(){ alert("Wishlist requires login. We’ll enable it once auth is added."); }
  
  // 7) Collections page
  function renderCollections(){
    const wrap = el("collectionsWrap");
    if(!wrap) return;
    const chapters = ["Ambition","Romantic","Bold","Carefree","Power","Seasons"];
    wrap.innerHTML = chapters.map(ch => {
      const items = PRODUCTS.filter(p => p.chapter === ch);
      return `
        <section id="${ch}" style="margin:24px 0;">
          <h2 class="section-title">${ch}</h2>
          <div class="grid">${items.map(cardHTML).join("") || `<p class="muted">Coming soon.</p>`}</div>
        </section>
      `;
    }).join("");
  }
  
  // 8) New Launches
  function renderNew(){
    const grid = el("newGrid"); if(!grid) return;
    const news = PRODUCTS.filter(p => p.newLaunch);
    grid.innerHTML = news.map(cardHTML).join("") || `<p class="muted">No new launches at the moment.</p>`;
  }
  
  // 9) Cart page
  function renderCartPage(){
    const cont = el("cartView"); if(!cont) return;
    const cart = readCart();
    if(cart.length === 0){
      cont.innerHTML = `<p class="muted">Your cart is empty.</p>`;
      renderCartLink(); return;
    }
    let subtotal = 0;
    const rows = cart.map(it => {
      const p = PRODUCTS.find(x => x.slug === it.slug);
      if(!p) return "";
      const line = p.priceINR * it.qty;
      subtotal += line;
      return `
        <tr>
          <td>
            <div class="cart-item">
              <img class="cart-img" src="${p.images[0] || 'images/placeholder.png'}" alt="${p.name}"/>
              <div>
                <div class="title">${p.name}</div>
                <div class="muted">${p.intensity} • ${p.chapter}</div>
              </div>
            </div>
          </td>
          <td>${inr(p.priceINR)}</td>
          <td>
            <button class="qty-btn" onclick="updateCartQty('${p.slug}', -1)">−</button>
            <span style="padding:0 8px">${it.qty}</span>
            <button class="qty-btn" onclick="updateCartQty('${p.slug}', 1)">+</button>
          </td>
          <td>${inr(line)}</td>
          <td><button class="btn-outline" onclick="removeFromCart('${p.slug}')">Remove</button></td>
        </tr>
      `;
    }).join("");
  
    const shipping = subtotal > 0 ? 0 : 0;
    const total = subtotal + shipping;
  
    cont.innerHTML = `
      <div class="card">
        <table>
          <thead>
            <tr><th>Item</th><th>Price</th><th>Qty</th><th>Subtotal</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3" style="text-align:right;font-weight:600;">Subtotal</td><td>${inr(subtotal)}</td><td></td></tr>
            <tr><td colspan="3" style="text-align:right;">Shipping</td><td>${inr(shipping)}</td><td></td></tr>
            <tr><td colspan="3" style="text-align:right;font-weight:700;">Total</td><td>${inr(total)}</td><td></td></tr>
          </tfoot>
        </table>
      </div>
    `;
    renderCartLink();
  }
  
  // 10) Contact/Support forms (demo only)
  function submitContact(e){
    e.preventDefault();
    const name = el("firstName")?.value.trim();
    const phone = el("phone")?.value.trim();
    const email = el("email")?.value.trim();
    if(!name || !/^\d{10}$/.test(phone||"") || !email?.includes("@")){
      alert("Please fill all fields correctly.");
      return false;
    }
    alert("Thank you. Your details have been submitted successfully.");
    e.target.reset(); return false;
  }
  function submitGrievance(e){
    e.preventDefault();
    const full = el("gName")?.value.trim();
    const oid = el("gOrder")?.value.trim();
    const mail = el("gEmail")?.value.trim();
    const msg = el("gMsg")?.value.trim();
    if(!full || !mail?.includes("@") || !msg){
      alert("Please fill all required fields.");
      return false;
    }
    alert("Your issue has been recorded. Our team will reach out within 24–48 hours.");
    e.target.reset(); return false;
  }
  
  // 11) Track order (demo)
  function trackOrder(e){
    e.preventDefault();
    const id = el("orderId").value.trim();
    const em = el("trackEmail").value.trim();
    if(!id || !em.includes("@")){ alert("Enter a valid Order ID and Email."); return false; }
    const box = el("trackResult");
    box.style.display = "block";
    box.innerHTML = `
      <div class="title">Order: ${id}</div>
      <p>Status: <strong>Processing</strong></p>
      <p class="muted">Demo tracking. We’ll integrate real tracking later.</p>
    `;
    return false;
  }
  
  // 12) Page router (runs only what the page needs)
  document.addEventListener("DOMContentLoaded", () => {
    renderCartLink();
    renderHome();
    renderPDP();
    renderCollections();
    renderNew();
    renderCartPage();
  });
  const thumbs = document.getElementById('thumbs');
thumbs.innerHTML = imgs.map((src,i)=>`
  <button type="button" data-idx="${i}" aria-current="${i===0}">
    <img ${i===0? 'fetchpriority="high"' : 'loading="lazy"'} src="${src}" alt="${activeProduct.name} image ${i+1}">
  </button>`).join('');
  const lb = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');
const lbClose = document.getElementById('lbClose');
const lbPrev = document.getElementById('lbPrev');
const lbNext = document.getElementById('lbNext');

function openLightbox(i){
  index = (i+COUNT)%COUNT;
  lbImg.src = imgs[index];
  lb.removeAttribute('hidden');
  lb.classList.add('open');
  document.body.classList.add('no-scroll');
}
function closeLightbox(){
  lb.classList.remove('open');
  lb.setAttribute('hidden','');
  document.body.classList.remove('no-scroll');
}
function lbGo(delta){ openLightbox(index + delta); }

thumbs.querySelectorAll('img').forEach((imgEl, i)=>{
  imgEl.addEventListener('click', ()=> openLightbox(i));
});
lbClose.addEventListener('click', closeLightbox);
lbPrev.addEventListener('click', ()=> lbGo(-1));
lbNext.addEventListener('click', ()=> lbGo(+1));
lb.addEventListener('click', (e)=>{ if(e.target === lb) closeLightbox(); });
window.addEventListener('keydown', (e)=>{
  if(lb.classList.contains('open')){
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') lbGo(-1);
    if(e.key === 'ArrowRight') lbGo(+1);
  }
});