

/*
  Scent Story – Data Layer helper (DL)
  Purpose: Provide a clean, reusable API to push GA4/Ads/Meta-ready events
  Usage: Include this file on every page (preferably with `defer`) and call DL.* methods.
  IMPORTANT: Ensure `window.dataLayer` is initialized in <head> BEFORE GTM loads.
*/
(function () {
  // ------------------------------
  // Internal refs & constants
  // ------------------------------
  const W = window;
  const DLAYER = (W.dataLayer = W.dataLayer || []);

  // LocalStorage keys (customize as needed)
  const LS_CART_KEY = "SCENT_CART_V1"; // if you keep a cart client-side
  const LS_PURCHASE_GUARD_PREFIX = "purchase_logged_"; // for duplicate-purchase prevention

  // Expose a single global object
  const DL = (W.DL = W.DL || {});

  // ------------------------------
  // Utilities
  // ------------------------------
  DL.nowISO = () => new Date().toISOString();
  DL.uid = (prefix = "evt") => `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`;

  // Defensive number coercion
  function toNum(n, fallback = 0) {
    const x = typeof n === "string" ? n.replace(/,/g, "") : n;
    const v = Number(x);
    return Number.isFinite(v) ? v : fallback;
  }

  // Deep clone (simple/fast)
  function clone(obj) {
    try { return JSON.parse(JSON.stringify(obj)); } catch { return obj; }
  }

  // ------------------------------
  // Core push (adds event_time + event_id and normalizes types)
  // ------------------------------
  DL.push = function (eventName, payload = {}) {
    const evt = {
      event: eventName,
      event_time: DL.nowISO(),
      event_id: payload.event_id || DL.uid(eventName),
      ...clone(payload),
    };

    // Normalize top-level numeric fields
    if (evt.value !== undefined) evt.value = toNum(evt.value, 0);
    if (evt.tax !== undefined) evt.tax = toNum(evt.tax, 0);
    if (evt.shipping !== undefined) evt.shipping = toNum(evt.shipping, 0);

    // Normalize items[] structure
    if (Array.isArray(evt.items)) {
      evt.items = evt.items.map((i) => ({
        ...i,
        price: toNum(i.price, 0),
        quantity: toNum(i.quantity ?? 1, 1),
        // Keep currency at item-level if provided; fallback at mapping time in GTM if needed
      }));
    }

    DLAYER.push(evt);
    return evt.event_id; // useful later for CAPI/EC deduplication
  };

  // ------------------------------
  // Cart helpers (optional; used if your cart is in localStorage)
  // ------------------------------
  DL.readCart = function () {
    try { return JSON.parse(localStorage.getItem(LS_CART_KEY) || "[]"); }
    catch { return []; }
  };

  DL.writeCart = function (items) {
    try { localStorage.setItem(LS_CART_KEY, JSON.stringify(items || [])); } catch {}
  };

  DL.cartSubtotal = function (items) {
    return (items || []).reduce((s, i) => s + toNum(i.price) * toNum(i.quantity ?? 1), 0);
  };

  // ------------------------------
  // Builders
  // ------------------------------
  /**
   * Build a GA4 item object with consistent keys
   * @param {Object} o { id, name, brand, cat, tier, price, qty, currency }
   */
  DL.buildItem = function (o = {}) {
    return {
      item_id: String(o.id ?? ""),
      item_name: String(o.name ?? ""),
      item_brand: String(o.brand ?? "Scent Story"),
      item_category: String(o.cat ?? "Fragrance"),
      item_category2: String(o.tier ?? ""), // EDP/Parfum/Elixir
      price: toNum(o.price, 0),
      quantity: toNum(o.qty ?? 1, 1),
      currency: String(o.currency ?? "INR"),
    };
  };

  // ------------------------------
  // Canonical ecommerce/event pushes
  // ------------------------------
  DL.viewItem = function (item) {
    const itm = clone(item);
    return DL.push("view_item", {
      currency: itm.currency || "INR",
      value: toNum(itm.price, 0),
      items: [itm],
    });
  };

  DL.addToCart = function (item, qty = 1) {
    const itm = clone(item);
    itm.quantity = toNum(qty ?? itm.quantity ?? 1, 1);
    return DL.push("add_to_cart", {
      currency: itm.currency || "INR",
      value: toNum(itm.price, 0) * toNum(itm.quantity, 1),
      items: [itm],
    });
  };

  DL.removeFromCart = function (item, qty = 1) {
    const itm = clone(item);
    itm.quantity = toNum(qty ?? itm.quantity ?? 1, 1);
    return DL.push("remove_from_cart", {
      currency: itm.currency || "INR",
      value: toNum(itm.price, 0) * toNum(itm.quantity, 1),
      items: [itm],
    });
  };

  DL.beginCheckout = function (cartItems) {
    const items = (cartItems || []).map(DL.buildItem);
    return DL.push("begin_checkout", {
      currency: "INR",
      value: DL.cartSubtotal(items),
      items,
    });
  };

  DL.purchase = function ({ orderId, items, value, tax = 0, shipping = 0, coupon = "" }) {
    const built = (items || []).map(DL.buildItem);
    return DL.push("purchase", {
      transaction_id: String(orderId),
      currency: "INR",
      value: toNum(value, DL.cartSubtotal(built)),
      tax: toNum(tax, 0),
      shipping: toNum(shipping, 0),
      coupon: String(coupon || ""),
      items: built,
    });
  };

  // Optional: wishlist & lead events
  DL.addToWishlist = (item) => DL.push("add_to_wishlist", { items: [DL.buildItem(item)] });
  DL.removeFromWishlist = (item) => DL.push("remove_from_wishlist", { items: [DL.buildItem(item)] });
  DL.generateLead = (type = "generic") => DL.push("generate_lead", { lead_type: String(type) });

  // ------------------------------
  // Purchase duplicate guard helper (use on thankyou pages)
  // ------------------------------
  DL.purchaseOnce = function (order) {
    const orderId = String(order?.orderId || "");
    const key = LS_PURCHASE_GUARD_PREFIX + orderId;
    if (!orderId) return null;
    if (sessionStorage.getItem(key)) return null; // already logged this session
    const id = DL.purchase(order);
    sessionStorage.setItem(key, "1");
    return id;
  };

  // ------------------------------
  // Minimal consent helpers (expand later when adding Consent Mode v2)
  // ------------------------------
  DL.setConsent = function (opts = {}) {
    // Example: { ad_user_data: "granted"|"denied", ad_personalization: "granted"|"denied" }
    return DL.push("consent_update", opts);
  };

  // ------------------------------
  // Debug helpers (for quick manual testing in console)
  // ------------------------------
  DL._exampleItem = function () {
    return DL.buildItem({ id: "SKU-001", name: "Cedar Noir EDP 50ml", tier: "EDP", price: 1999, qty: 1 });
  };
  DL._demoView = function () { return DL.viewItem(DL._exampleItem()); };
  DL._demoATC = function () { return DL.addToCart(DL._exampleItem(), 1); };
  DL._demoCheckout = function () { return DL.beginCheckout([DL._exampleItem()]); };
  DL._demoPurchase = function () {
    return DL.purchase({ orderId: "ORD-TEST-" + Date.now(), items: [DL._exampleItem()], value: 1999 });
  };
})();