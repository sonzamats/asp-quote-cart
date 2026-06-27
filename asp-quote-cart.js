/* ============================================================
   ASP Event Pros — Quote Cart  (external file, AJAX-safe)
   Host this file and reference it in Code Injection → Footer:
     <script src="https://YOUR-CDN/asp-quote-cart.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  /* ============ CONFIG ============ */
  var FORM_ENDPOINT = "FORMSPREE_ENDPOINT";   // <-- paste your Formspree URL
  var STORAGE_KEY   = "aspQuoteCart";
  var IMG_SELECTORS = [
    ".gallery-grid-item img",
    ".gallery-masonry-item img",
    ".gallery-strips-item img",
    ".gallery-reel-item img",
    "img.gallery-item-image",
    ".sqs-gallery img",
    ".sqs-block-image img"
  ].join(",");
  // Pages where add-to-quote must NOT appear (general landing pages).
  var LANDING_PATHS = ["/", "/products", "/rentals", "/partyrentals"];
  /* ================================ */

  function currentPath() {
    var p = location.pathname.replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }
  function pageAllowed() { return LANDING_PATHS.indexOf(currentPath()) === -1; }

  /* ---- inject CSS from JS (no HTML field to smart-quote) ---- */
  var CSS = [
    ".aqc-add-btn{position:absolute;top:10px;right:10px;z-index:50;display:inline-flex;align-items:center;gap:7px;background:rgba(20,20,20,.82);color:#fff;border:none;border-radius:999px;padding:8px 13px;font:600 13px/1 -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;opacity:0;transition:opacity .18s,transform .18s,background .18s;pointer-events:auto;}",
    ".aqc-anchor:hover .aqc-add-btn{opacity:1;}",
    ".aqc-add-btn:hover{background:#000;transform:translateY(-1px);}",
    ".aqc-add-btn.aqc-in{opacity:1;background:#2e7d32;}",
    ".aqc-add-btn svg{width:16px;height:16px;flex:none;}",
    ".aqc-add-btn .aqc-qty{min-width:16px;text-align:center;font-weight:700;}",
    ".aqc-add-btn .aqc-mini{width:20px;height:20px;border:none;border-radius:50%;background:rgba(255,255,255,.25);color:#fff;cursor:pointer;font:700 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;display:inline-flex;align-items:center;justify-content:center;padding:0;}",
    ".aqc-add-btn .aqc-mini:hover{background:rgba(255,255,255,.5);}",
    "@media (hover:none){.aqc-add-btn{opacity:1;}}",
    ".aqc-pill{position:fixed;right:20px;bottom:20px;z-index:9998;display:none;align-items:center;gap:8px;background:#111;color:#fff;border:none;border-radius:999px;padding:14px 20px;font:600 15px/1 -apple-system,Segoe UI,Roboto,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.28);cursor:pointer;}",
    ".aqc-pill.aqc-show{display:inline-flex;}",
    ".aqc-pill .aqc-count{background:#fff;color:#111;border-radius:999px;min-width:22px;height:22px;padding:0 6px;display:inline-flex;align-items:center;justify-content:center;font-size:13px;}",
    ".aqc-overlay{position:fixed;inset:0;z-index:9999;display:none;background:rgba(0,0,0,.55);}",
    ".aqc-overlay.aqc-show{display:block;}",
    ".aqc-modal{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(620px,92vw);max-height:88vh;overflow:auto;background:#fff;border-radius:14px;padding:24px;font:14px/1.4 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;}",
    ".aqc-modal h2{margin:0 0 4px;font-size:20px;}",
    ".aqc-modal .aqc-sub{color:#666;margin:0 0 16px;font-size:13px;}",
    ".aqc-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:26px;line-height:1;cursor:pointer;color:#888;}",
    ".aqc-items{list-style:none;margin:0 0 18px;padding:0;border-top:1px solid #eee;}",
    ".aqc-item{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid #eee;}",
    ".aqc-item img{width:52px;height:52px;object-fit:cover;border-radius:8px;flex:none;}",
    ".aqc-item .aqc-name{flex:1;font-weight:600;}",
    ".aqc-stepper{display:inline-flex;align-items:center;gap:0;border:1px solid #ddd;border-radius:8px;overflow:hidden;}",
    ".aqc-stepper button{width:30px;height:30px;border:none;background:#f4f4f4;cursor:pointer;font-size:16px;line-height:1;color:#111;}",
    ".aqc-stepper button:hover{background:#e8e8e8;}",
    ".aqc-stepper .aqc-n{min-width:30px;text-align:center;font-weight:700;}",
    ".aqc-item .aqc-rm{background:none;border:none;color:#c00;cursor:pointer;font-size:13px;margin-left:4px;}",
    ".aqc-empty{color:#888;padding:20px 0;text-align:center;}",
    ".aqc-field{margin-bottom:12px;}",
    ".aqc-field label{display:block;font-weight:600;margin-bottom:4px;font-size:13px;}",
    ".aqc-field input,.aqc-field textarea{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font:inherit;}",
    ".aqc-row{display:flex;gap:12px;}",
    ".aqc-row .aqc-field{flex:1;}",
    ".aqc-submit{width:100%;background:#111;color:#fff;border:none;border-radius:10px;padding:14px;font:600 15px/1 inherit;cursor:pointer;margin-top:6px;}",
    ".aqc-submit:disabled{opacity:.5;cursor:default;}",
    ".aqc-msg{text-align:center;padding:10px;font-weight:600;}",
    ".aqc-msg.ok{color:#2e7d32;}",
    ".aqc-msg.err{color:#c00;}"
  ].join("\n");

  function injectCSS() {
    if (document.getElementById("aqc-css")) return;
    var st = document.createElement("style");
    st.id = "aqc-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  /* ---- cart model: items carry a quantity ---- */
  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; } }
  function save(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
  var cart = load();
  function find(id) { for (var i = 0; i < cart.length; i++) if (cart[i].id === id) return cart[i]; return null; }
  function qtyOf(id) { var it = find(id); return it ? it.qty : 0; }
  function totalQty() { return cart.reduce(function (s, i) { return s + i.qty; }, 0); }

  /* ---- item name: prefer the product title block, not the alt description ---- */
  function nameFor(img) {
    // 1) true gallery caption, if present
    var fig = img.closest("figure, .gallery-grid-item, .gallery-masonry-item");
    var cap = fig && fig.querySelector("figcaption, .gallery-caption, .gallery-caption-content, .image-caption");
    if (cap && cap.textContent.trim()) return cap.textContent.trim();
    // 2) nearest title/text block AFTER the image block (category-page layout)
    var block = img.closest(".sqs-block") || img;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    walker.currentNode = block;
    var n;
    while ((n = walker.nextNode())) {
      if (block.contains(n)) continue;
      if (/^(H1|H2|H3|H4|P)$/.test(n.tagName)) {
        var t = n.textContent.trim();
        if (t.length >= 2 && t.length <= 70 && t.indexOf("#block") !== 0) return t;
      }
    }
    // 3) fallbacks
    if (img.alt && img.alt.trim()) return img.alt.trim();
    var src = img.currentSrc || img.src || "";
    var file = src.split("/").pop().split("?")[0].replace(/\.[a-z]+$/i, "");
    return decodeURIComponent(file).replace(/[-_]+/g, " ").trim() || "Item";
  }
  function imgUrl(img) {
    var s = img.currentSrc || img.src || "";
    return s.split("?")[0] + "?format=300w";
  }
  function idFor(img) {
    var s = (img.currentSrc || img.src || "").split("?")[0];
    return s || nameFor(img);
  }

  var CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 4h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>';

  function paintBtn(btn, id) {
    var q = qtyOf(id);
    if (q > 0) {
      btn.className = "aqc-add-btn aqc-in";
      btn.innerHTML = CART +
        '<button type="button" class="aqc-mini aqc-dec" aria-label="Decrease">&minus;</button>' +
        '<span class="aqc-qty">' + q + "</span>" +
        '<button type="button" class="aqc-mini aqc-inc" aria-label="Increase">+</button>';
    } else {
      btn.className = "aqc-add-btn";
      btn.innerHTML = CART + "<span>Add to quote</span>";
    }
  }

  function tag(img) {
    if (img.dataset.aqc) return;
    if (img.closest("a")) return;              // skip linked category tiles
    if (img.naturalWidth && img.naturalWidth < 60) return;
    img.dataset.aqc = "1";
    var anchor = img.closest("figure, .gallery-grid-item, .gallery-masonry-item, .sqs-block-image") || img.parentElement;
    if (!anchor) return;
    anchor.classList.add("aqc-anchor");
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";

    var id = idFor(img);
    var ctrl = document.createElement("div");
    ctrl.dataset.aqcId = id;
    paintBtn(ctrl, id);
    ctrl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var it = find(id);
      if (it && e.target.closest(".aqc-dec")) {
        it.qty -= 1;
        if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== id; });
      } else if (it && e.target.closest(".aqc-inc")) {
        it.qty += 1;
      } else if (!it) {
        cart.push({ id: id, name: nameFor(img), img: imgUrl(img), qty: 1 });
      } else {
        return; // already in cart, clicked a neutral area (icon/number)
      }
      save(cart);
      paintBtn(ctrl, id);
      renderPill();
      if (overlay && overlay.classList.contains("aqc-show")) renderItems();
      if (!cart.length) closeModal();
    });
    anchor.appendChild(ctrl);
  }

  function scan() { if (pageAllowed()) document.querySelectorAll(IMG_SELECTORS).forEach(tag); }

  function syncButtons() {
    document.querySelectorAll(".aqc-add-btn[data-aqc-id]").forEach(function (b) {
      paintBtn(b, b.dataset.aqcId);
    });
  }

  var pill;
  function renderPill() {
    if (!pill) {
      pill = document.createElement("button");
      pill.className = "aqc-pill";
      pill.type = "button";
      pill.addEventListener("click", openModal);
      document.body.appendChild(pill);
    }
    pill.innerHTML = 'Request Quote <span class="aqc-count">' + totalQty() + "</span>";
    pill.classList.toggle("aqc-show", cart.length > 0);
  }

  var overlay;
  function buildModal() {
    overlay = document.createElement("div");
    overlay.className = "aqc-overlay";
    overlay.innerHTML =
      '<div class="aqc-modal" role="dialog" aria-modal="true">' +
        '<button class="aqc-close" aria-label="Close">&times;</button>' +
        "<h2>Request a Quote</h2>" +
        '<p class="aqc-sub">Tell us about your event and we will send pricing for the items below.</p>' +
        '<ul class="aqc-items"></ul>' +
        '<form class="aqc-form">' +
          '<div class="aqc-row">' +
            '<div class="aqc-field"><label>Name *</label><input name="name" required></div>' +
            '<div class="aqc-field"><label>Phone</label><input name="phone"></div>' +
          "</div>" +
          '<div class="aqc-field"><label>Email *</label><input type="email" name="email" required></div>' +
          '<div class="aqc-field"><label>Event location</label><input name="location"></div>' +
          '<div class="aqc-row">' +
            '<div class="aqc-field"><label>Event start</label><input type="date" name="start"></div>' +
            '<div class="aqc-field"><label>Event end</label><input type="date" name="end"></div>' +
          "</div>" +
          '<div class="aqc-field"><label>Comments</label><textarea name="comments" rows="3"></textarea></div>' +
          '<button type="submit" class="aqc-submit">Send Quote Request</button>' +
          '<div class="aqc-msg"></div>' +
        "</form>" +
      "</div>";
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target.classList.contains("aqc-close")) closeModal();
    });
    overlay.querySelector(".aqc-form").addEventListener("submit", submitQuote);
  }

  function changeQty(id, delta) {
    var it = find(id);
    if (!it) return;
    it.qty += delta;
    if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== id; });
    save(cart);
    renderItems();
    renderPill();
    syncButtons();
    if (!cart.length) closeModal();
  }
  function removeItem(id) {
    cart = cart.filter(function (x) { return x.id !== id; });
    save(cart);
    renderItems();
    renderPill();
    syncButtons();
    if (!cart.length) closeModal();
  }

  function renderItems() {
    var ul = overlay.querySelector(".aqc-items");
    if (!cart.length) {
      ul.innerHTML = '<li class="aqc-empty">No items yet. Tap the cart icon on any item.</li>';
      return;
    }
    ul.innerHTML = "";
    cart.forEach(function (i) {
      var li = document.createElement("li");
      li.className = "aqc-item";
      li.innerHTML =
        '<img src="' + i.img + '" alt="">' +
        '<span class="aqc-name"></span>' +
        '<span class="aqc-stepper"><button type="button" class="aqc-dec">&minus;</button>' +
        '<span class="aqc-n">' + i.qty + '</span>' +
        '<button type="button" class="aqc-inc">+</button></span>' +
        '<button type="button" class="aqc-rm">Remove</button>';
      li.querySelector(".aqc-name").textContent = i.name;   // textContent = no HTML-injection risk
      li.querySelector(".aqc-dec").addEventListener("click", function () { changeQty(i.id, -1); });
      li.querySelector(".aqc-inc").addEventListener("click", function () { changeQty(i.id, 1); });
      li.querySelector(".aqc-rm").addEventListener("click", function () { removeItem(i.id); });
      ul.appendChild(li);
    });
  }

  function openModal() { if (!overlay) buildModal(); renderItems(); overlay.classList.add("aqc-show"); }
  function closeModal() { if (overlay) { overlay.classList.remove("aqc-show"); overlay.querySelector(".aqc-msg").textContent = ""; } }

  function submitQuote(e) {
    e.preventDefault();
    var form = e.target,
        msg  = form.querySelector(".aqc-msg"),
        btn  = form.querySelector(".aqc-submit");
    var data = Object.fromEntries(new FormData(form).entries());
    data.items = cart.map(function (i) { return "- " + i.name + " (x" + i.qty + ")"; }).join("\n");
    data.itemCount = totalQty();
    data._subject = "Quote request (" + totalQty() + " items) - " + (data.name || "");
    btn.disabled = true;
    msg.className = "aqc-msg";
    msg.textContent = "Sending...";
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error();
      msg.className = "aqc-msg ok";
      msg.textContent = "Sent! We will be in touch shortly.";
      cart = [];
      save(cart);
      renderPill();
      syncButtons();
      form.reset();
      setTimeout(closeModal, 1800);
    }).catch(function () {
      msg.className = "aqc-msg err";
      msg.textContent = "Something went wrong. Please call us or try again.";
    }).finally(function () { btn.disabled = false; });
  }

  function boot() { injectCSS(); scan(); renderPill(); }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("mercury:load", boot);            // SS 7.0 ajax
  window.addEventListener("popstate", function () { setTimeout(boot, 300); });
  new MutationObserver(function () { scan(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
