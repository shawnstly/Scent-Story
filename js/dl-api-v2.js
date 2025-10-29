/**
 * Scent Story — Data Layer API v2 (Leak-Proof)
 * Drop-in: load before cart inline script. Backward-compatible with pushDL/resetVolatileDL.
 */
(function(){
  'use strict';

  // ---- Config inferred from your page ----
  const CONFIG = {
    siteId: 'scentstory',
    pageType: 'cart',
    currency: 'INR',
    shippingAllow: new Set(['standard','express','nextday']), // matches your radio list
    dedupeWindowMs: 1200,
    finalFlagKey: 'finalised_cart_pushed_v1',
    cartKey: 'SCENT_CART_V1',
    shipKey: 'SCENT_SHIP_ID'
  };

  const g = (typeof window!=='undefined') ? window : {};
  g.dataLayer = g.dataLayer || [];

  // -------- utilities --------
  const nowIso = () => new Date().toISOString();
  const uuid = ()=>'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
    const r=Math.random()*16|0,v=c==='x'?r:(r&0x3|0x8);return v.toString(16);
  });
  function stableJson(obj){
    return JSON.stringify(sortObj(obj));
    function sortObj(x){
      if (Array.isArray(x)) return x.map(sortObj);
      if (x && typeof x === 'object'){
        const out = {};
        Object.keys(x).sort().forEach(k => { out[k] = sortObj(x[k]); });
        return out;
      }
      return x;
    }
  }
  const hash = (s)=>{let h=0;for(let i=0;i<s.length;i++){h=(h<<5)-h+s.charCodeAt(i);h|=0;}return String(h);};
  const pick = (obj, keys)=>keys.reduce((o,k)=> (obj[k]!==undefined && obj[k]!==null ? (o[k]=obj[k],o) : o), {});

  // -------- state helpers (use your storage) --------
  function readCart(){
    try { return JSON.parse(localStorage.getItem(CONFIG.cartKey)||'[]'); } catch { return []; }
  }
  function selectedShip(){
    const id = localStorage.getItem(CONFIG.shipKey) || 'std';
    return { id, name: shipName(id), cost: shipCost(id) };
  }
  function shipName(id){
    if(id==='std') return 'Free Standard';
    if(id==='exp') return 'Express Air';
    if(id==='nd')  return 'Next Day';
    return id;
  }
  function shipCost(id){
    if(id==='std') return 0;
    if(id==='exp') return 199;
    if(id==='nd')  return 499;
    return 0;
  }

  // mirror your item sanitizer shape used in finalised push
  function dlItemFromCartItem(ci){
    const price = Number(ci?.price||0);
    const qty = Math.max(1, Number(ci?.qty||ci?.quantity||1));
    const id = String((ci?.sku||ci?.slug||ci?.id||ci?.name||'').toString().toLowerCase().trim());
    return { item_id:id, price, quantity:qty, currency:CONFIG.currency };
  }

  // -------- ordered queue + dedupe --------
  const Dedupe = (()=>{ let lastHash=null, lastAt=0; return {
    check(payload){
      const h = hash(stableJson(payload));
      const now = Date.now();
      if (lastHash===h && (now-lastAt)<=CONFIG.dedupeWindowMs) return true;
      lastHash=h; lastAt=now; return false;
    }
  };})();

  const Queue = (()=>{ const q=[]; let busy=false;
    async function run(){ if(busy) return; busy=true;
      while(q.length){ const job=q.shift(); try{ await job(); }catch(e){ console.error('[ScentDL] job error',e);} }
      busy=false;
    }
    return { push(fn){ q.push(fn); run(); } };
  })();

  // -------- core push with base fields & whitelist --------
  function base(){
    return {
      event_time: nowIso(),
      event_id: uuid(),
      page_type: CONFIG.pageType,
      site_id: CONFIG.siteId
    };
  }
  const WHITELISTS = {
    quantity_adjusted_in_cart: ['currency','item_id','old_quantity','new_quantity','delta','value_delta','cart_value_after','items'],
    removed_item_from_cart:    ['currency','value','cart_value_after','items'],
    empty_cart:                ['currency','message','cart_value_after'],
    cleared_cart:              ['currency','value','items'],
    delivery_shipping_tier:    ['currency','shipping_tier'], // strictly tier fields only
    finalised_item_cart:       ['currency','cart_value_after','items','value','shipping_tier','delivery_tier','payment_method','subtotal','tax','shipping','total']
  };

  function pushEvent(event, data){
    const wl = WHITELISTS[event];
    if(!wl){ console.warn('[ScentDL] Unknown event, blocking:', event); return; }

    // Scrub to whitelist and add base fields:
    const payload = Object.assign({event}, base(), pick(data||{}, wl));

    // Strict shipping guard
    if (event==='delivery_shipping_tier') {
      const t = data?.shipping_tier || {};
      if (!CONFIG.shippingAllow.has(String(t.id||'').trim())) {
        console.warn('[ScentDL] Blocked unapproved shipping tier:', t.id);
        return;
      }
      // ensure only id/name/cost under tier
      payload.shipping_tier = pick(t, ['id','name','cost']);
    }

    // Enqueue the push to guarantee order and avoid rapid-fire collisions
    Queue.push(async () => {
      if (Dedupe.check(payload)) return;  // drop near-duplicate
      (g.dataLayer = g.dataLayer || []).push(payload);
      if (g.console) console.log('[DL]', payload);
    });
  }

  // -------- public API aligned to your semantics --------
  const API = {
    quantityAdjusted({ item_id, old_quantity, new_quantity, price, cart_value_after }){
      const delta = Number(new_quantity) - Number(old_quantity);
      pushEvent('quantity_adjusted_in_cart', {
        currency: CONFIG.currency,
        item_id: String(item_id),
        old_quantity: Number(old_quantity),
        new_quantity: Number(new_quantity),
        delta,
        value_delta: Number(price||0) * delta,
        cart_value_after: Number(cart_value_after||0),
        // keep a single GA4-style item to mirror your current shape
        items: [{ item_id: String(item_id), price: Number(price||0), quantity: Number(new_quantity), currency: CONFIG.currency }]
      });
    },
    itemRemoved({ removed_item, cart_value_after }){
      const it = dlItemFromCartItem(removed_item||{});
      pushEvent('removed_item_from_cart', {
        currency: CONFIG.currency,
        value: Number(it.price||0) * Number(it.quantity||0),
        cart_value_after: Number(cart_value_after||0),
        items: [it]
      });
      // caller can still fire empty_cart if needed; we don’t auto-emit it
    },
    cartCleared({ items_snapshot }){
      const items = (items_snapshot||[]).map(dlItemFromCartItem);
      const value = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.quantity)||0), 0);
      pushEvent('cleared_cart', {
        currency: CONFIG.currency,
        value,
        items
      });
    },
    shippingSelected({ id, name, cost }){
      pushEvent('delivery_shipping_tier', {
        currency: CONFIG.currency,
        shipping_tier: { id, name, cost: (cost==null? undefined : Number(cost)) }
      });
    },
    finalisedSnapshot({ payment_method }){
      // pull canonical snapshot directly to avoid DOM leaks
      const cart = readCart();
      if(!cart || !cart.length) return;
      const items = cart.map(dlItemFromCartItem);
      const sub = items.reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.quantity)||0), 0);
      const ship = selectedShip();
      // NOTE: your page computes GST 12% & shipping costs; we mirror constants here
      const tax = Math.round(sub * 0.12);
      const shipping = Number(ship.cost||0);
      const total = sub + tax + shipping;

      pushEvent('finalised_item_cart', {
        currency: CONFIG.currency,
        cart_value_after: sub,
        items,
        value: sub,
        shipping_tier: ship,
        delivery_tier: ship,
        payment_method: String(payment_method||''),
        subtotal: sub,
        tax,
        shipping,
        total
      });
      // set the same session flag your page uses
      try { sessionStorage.setItem(CONFIG.finalFlagKey, '1'); } catch(_){}
    }
  };

  // -------- Backward-compatibility shim --------
  // Replace global pushDL so existing calls route through our whitelists.
  g.pushDL = function(eventName, data){ pushEvent(eventName, data || {}); };
  // Your old resetVolatileDL nulled fields; not needed now, keep for compatibility.
  g.resetVolatileDL = function(){ /* no-op by design */ };

  // Named export if you want to call typed methods from handlers
  g.ScentDL = API;
})();