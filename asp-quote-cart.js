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
    ".sqs-block-image img"        // <-- confirmed: matches your 29 rental images
  ].join(",");
  /* ================================ */

  /* ---- inject CSS from JS (no HTML field to smart-quote) ---- */
  var CSS = [
    ".aqc-add-btn{position:absolute;top:10px;right:10px;z-index:50;display:inline-flex;align-items:center;gap:6px;background:rgba(20,20,20,.82);color:#fff;border:none;border-radius:999px;padding:8px 12px;font:600 13px/1 -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;opacity:0;transition:opacity .18s,transform .18s,background .18s;pointer-events:auto;}",
    ".aqc-anchor:hover .aqc-add-btn{opacity:1;}",
    ".aqc-add-btn:hover{background:#000;transform:translateY(-1px);}",
    ".aqc-add-btn.aqc-in{opacity:1;background:#2e7d32;}",
    ".aqc-add-btn svg{width:15px;height:15px;}",
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
    ".aqc-item .aqc-rm{background:none;border:none;color:#c00;cursor:pointer;font-size:13px;}",
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

  function load() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch (e) { return []; } }
  function save(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
  var cart = load();
  function inCart(id) { return cart.some(function (i) { return i.id === id; }); }

  function nameFor(img) {
    var fig = img.closest("figure, .gallery-grid-item, .gallery-masonry-item, .sqs-block-image");
    var cap = fig && fig.querySelector("figcaption, .gallery-caption, .gallery-caption-content, .image-caption");
    var t = cap && cap.textContent.trim();
    if (t) return t;
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

  var PLUS  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>';

  function tag(img) {
    if (img.dataset.aqc) return;
    if (img.naturalWidth && img.naturalWidth < 60) return;
    img.dataset.aqc = "1";
    var anchor = img.closest("figure, .gallery-grid-item, .gallery-masonry-item, .sqs-block-image") || img.parentElement;
    if (!anchor) return;
    anchor.classList.add("aqc-anchor");
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";

    var id = idFor(img);
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "aqc-add-btn" + (inCart(id) ? " aqc-in" : "");
    btn.innerHTML = (inCart(id) ? CHECK : PLUS) + "<span>" + (inCart(id) ? "Added" : "Add to quote") + "</span>";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (inCart(id)) {
        cart = cart.filter(function (i) { return i.id !== id; });
        btn.className = "aqc-add-btn";
        btn.innerHTML = PLUS + "<span>Add to quote</span>";
      } else {
        cart.push({ id: id, name: nameFor(img), img: imgUrl(img) });
        btn.className = "aqc-add-btn aqc-in";
        btn.innerHTML = CHECK + "<span>Added</span>";
      }
      save(cart);
      renderPill();
    });
    anchor.appendChild(btn);
  }

  function scan() { document.querySelectorAll(IMG_SELECTORS).forEach(tag); }

  var pill;
  function renderPill() {
    if (!pill) {
      pill = document.createElement("button");
      pill.className = "aqc-pill";
      pill.type = "button";
      pill.addEventListener("click", openModal);
      document.body.appendChild(pill);
    }
    pill.innerHTML = 'Request Quote <span class="aqc-count">' + cart.length + "</span>";
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
            '<div class="aqc-field"><label>Phone *</label><input name="phone" required></div>' +
          "</div>" +
          '<div class="aqc-field"><label>Email *</label><input type="email" name="email" required></div>' +
          '<div class="aqc-field"><label>Event location *</label><input name="location" required></div>' +
          '<div class="aqc-row">' +
            '<div class="aqc-field"><label>Event start *</label><input type="date" name="start" required></div>' +
            '<div class="aqc-field"><label>Event end *</label><input type="date" name="end" required></div>' +
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

  function renderItems() {
    var ul = overlay.querySelector(".aqc-items");
    if (!cart.length) {
      ul.innerHTML = '<li class="aqc-empty">No items yet. Tap Add to quote on any item.</li>';
      return;
    }
    ul.innerHTML = "";
    cart.forEach(function (i) {
      var li = document.createElement("li");
      li.className = "aqc-item";
      li.innerHTML = '<img src="' + i.img + '" alt=""><span class="aqc-name"></span><button type="button" class="aqc-rm">Remove</button>';
      li.querySelector(".aqc-name").textContent = i.name;   // textContent = no HTML-injection risk
      li.querySelector(".aqc-rm").addEventListener("click", function () {
        cart = cart.filter(function (x) { return x.id !== i.id; });
        save(cart);
        // reset any visible button for this item
        document.querySelectorAll(".aqc-add-btn.aqc-in").forEach(function (b) {
          b.className = "aqc-add-btn";
          b.innerHTML = PLUS + "<span>Add to quote</span>";
        });
        document.querySelectorAll("img[data-aqc]").forEach(function (im) { delete im.dataset.aqc; });
        scan();
        renderItems();
        renderPill();
        if (!cart.length) closeModal();
      });
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
    data.items = cart.map(function (i) { return "- " + i.name; }).join("\n");
    data.itemCount = cart.length;
    data._subject = "Quote request (" + cart.length + " items) - " + (data.name || "");
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
