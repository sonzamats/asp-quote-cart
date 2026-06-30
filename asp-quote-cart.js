/* ============================================================
   ASP Event Pros — Quote Cart  (external file, AJAX-safe)
   Host this file and reference it in Code Injection → Footer:
     <script src="https://YOUR-CDN/asp-quote-cart.js" defer></script>
   ============================================================ */
(function () {
  "use strict";

  /* ============ CONFIG ============ */
  var FORM_ENDPOINT = "https://formspree.io/f/xeebgvjy";
  var STORAGE_KEY   = "aspQuoteCart";
  // Items (matched by lowercase name) that show an options chooser instead of a plain add.
  // Per item:  list  = show the page's bullet list as selectable options (default true)
  //            custom = if a string, also show a free-text field using it as the placeholder
  // Listed options are read live from the page, so they stay in sync.
  // Keys must be in normalized form (lowercase, straight quotes) — see normName().
  var VARIANT_ITEMS = {
    "projector screens": {},
    "steel deck staging": { custom: "Enter custom dimensions (e.g. 6x8)" },
    "steps": {},
    "stage skirt": { list: false, custom: "Enter the length you need (e.g. 24\")" },
    "legs/extenders": { list: false, custom: "Enter the size you need" },
    "global truss 12\" box truss": {},
    "round table": {},
    "folding table": {},
    "classroom table": {},
    "half moon table": {},
    "cocktail table": {},
    "chiavari chair gold with cushion": {},
    "chiavari chair silver with cushion": {},
    "asp cobraled led wall": { custom: "Enter custom dimensions (e.g. 12ft x 8ft)" }
  };

  /* ---- Linen builder: one configurator (size x material x color x qty) ---- */
  var LINEN_PATH = "/linens";
  var LINEN_SIZES = ["132 Round", "120 Round", "108 Round", "90 Round", "70 Round", "8 ft Table Cloth", "6 ft Table Cloth", "Table Sache"];
  var LINEN_MATERIALS = ["Polyester", "Satin", "Lamour", "Crinkle Organza", "Spandex", "Taffeta", "Velvet", "Chanton", "Glitz Sequin"];
  var LINEN_COLORS = [
    "Amethyst #142", "Aqua #118", "Beige #102", "Black #133", "Burgundy #132", "Burnt Orange #148",
    "Camel #150", "Canteen #152", "Celadon #155", "Charcoal #147", "Cherry Red #159", "Claret #145",
    "Clover #154", "Copper #106", "Dark Blue #158", "Dusty Rose #111", "Eggplant #153", "Fuchsia #149",
    "Gold #105", "Goldenrod #141", "Grey #134", "Jade #120", "Kelley #123", "Khaki #138", "Lemon #104",
    "Light Blue #127", "Light Pink #109", "Lilac #131", "Lime #136", "Maize #103", "Mauve #112",
    "Mint #140", "Moss #124", "Navy #130", "Neon Green #197", "Neon Tangerine #194", "Neon Yellow #199",
    "Olive #146", "Orange #108", "Pink #110", "Powder Blue #157", "Pumpkin #156", "Red #117", "Ruby #144",
    "Seamist #119", "Slate #128", "Teal #122", "Terra Cotta #137", "Turquoise #121"
  ];

  // Video wall page: bespoke per-image mapping (auto-tagging disabled there).
  // src substring (lowercase) -> product. Unmatched images get no button.
  var VIDEOWALL_PATH = "/video-wall";
  var VIDEO_WALL_MAP = [
    { match: "supports_multiple_installation", type: "wall", name: "ASP CobraLED LED Wall",
      options: ["3.9mm Indoor/Outdoor", "4.85mm Indoor", "2.6mm Indoor", "1.9mm Fine Detail"] },
    { match: "upadiii", type: "product", name: "Unilumin 2.6mm Indoor LED Wall" },
    // NovaStar.png is the logo (no button); each scaler gets ONE button on its first product image.
    { match: "916789_123964", type: "product", name: "NovaStar VX-1000" },
    { match: "mctrl660", type: "product", name: "NovaStar MCTRL660" }
    // novastar_thumbnail (2nd MCTRL660 image) intentionally not mapped -> no button
  ];
  var IMG_SELECTORS = [
    ".gallery-grid-item img",
    ".gallery-masonry-item img",
    ".gallery-strips-item img",
    ".gallery-reel-item img",
    "img.gallery-item-image",
    ".sqs-gallery img",
    ".sqs-block-image img"
  ].join(",");
  // The two rental landing pages. Their linked category tiles define exactly
  // which pages may show add-to-quote buttons (Rentals + Party Rentals only).
  var RENTAL_LANDINGS = ["/products", "/partyrentals"];
  // Fallback list of category pages (used if the live read above fails).
  // Auto-extended at runtime, so new categories are picked up without editing this.
  var ALLOW_SEED = [
    "/mixers", "/interfaces", "/speakers-link", "/827709107501-1", "/microphone-link",
    "/amps-and-racks", "/lighting-link", "/screensandprojectors", "/video-wall", "/cameras",
    "/truss-link", "/stage-link", "/cable-and-wiring", "/atmospherics", "/communications",
    "/network", "/power", "/pipe-and-drape", "/linens", "/tables-and-chairs", "/furniture",
    "/carpetstep-and-repeat", "/dance-floor", "/dishware", "/decor-misc", "/dj-equipement",
    "/instruments", "/amplifiers", "/carpet", "/tents"
  ];
  /* ================================ */

  function norm(href) {
    var p = (href || "").split("?")[0].split("#")[0].replace(/\/+$/, "");
    return p === "" ? "/" : p;
  }
  function currentPath() { return norm(location.pathname); }

  var allowSet = null;
  function pageAllowed() { return !!(allowSet && allowSet[currentPath()]); }

  function buildAllow() {
    var set = {};
    ALLOW_SEED.forEach(function (p) { set[norm(p)] = 1; });
    var cached;
    try { cached = JSON.parse(sessionStorage.getItem("aqcAllow") || "null"); } catch (e) {}
    if (cached && cached.length) {
      cached.forEach(function (p) { set[p] = 1; });
      allowSet = set;
      return Promise.resolve();
    }
    return Promise.all(RENTAL_LANDINGS.map(function (u) {
      return fetch(u).then(function (r) { return r.text(); }).then(function (html) {
        var doc = new DOMParser().parseFromString(html, "text/html");
        Array.prototype.forEach.call(
          doc.querySelectorAll('.sqs-block-image a[href^="/"]'),
          function (a) { set[norm(a.getAttribute("href"))] = 1; }
        );
      }).catch(function () {});
    })).then(function () {
      allowSet = set;
      try { sessionStorage.setItem("aqcAllow", JSON.stringify(Object.keys(set))); } catch (e) {}
    });
  }

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
    ".aqc-msg.err{color:#c00;}",
    ".aqc-custom{border-top:1px solid #eee;padding-top:14px;margin-bottom:14px;}",
    ".aqc-hint{color:#666;font-size:12px;margin-bottom:8px;}",
    ".aqc-customrow{display:flex;gap:8px;}",
    ".aqc-customrow input{flex:1;min-width:0;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font:inherit;}",
    ".aqc-cadd{background:#111;color:#fff;border:none;border-radius:8px;padding:0 18px;cursor:pointer;font:600 14px/1 inherit;}",
    ".aqc-citems{list-style:none;margin:8px 0 0;padding:0;}",
    ".aqc-linen-cta{text-align:center;padding:26px 16px;}",
    ".aqc-linen-btn{display:inline-flex;align-items:center;gap:9px;background:#111;color:#fff;border:none;border-radius:999px;padding:15px 26px;font:600 16px/1 -apple-system,Segoe UI,Roboto,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.18);}",
    ".aqc-linen-btn:hover{background:#000;transform:translateY(-1px);}",
    ".aqc-linen-btn svg{width:18px;height:18px;}",
    ".aqc-lb-field{margin-bottom:12px;}",
    ".aqc-lb-field label{display:block;font-weight:600;margin-bottom:4px;font-size:13px;}",
    ".aqc-lb-field select,.aqc-lb-field input{width:100%;box-sizing:border-box;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font:inherit;background:#fff;}",
    ".aqc-lb-add{width:100%;background:#2e7d32;color:#fff;border:none;border-radius:10px;padding:13px;font:600 15px/1 inherit;cursor:pointer;margin-top:4px;}",
    ".aqc-lb-add:hover{background:#256528;}"
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
  function shortText(el) {
    var t = el.textContent.trim();
    return (t.length >= 2 && t.length <= 70 && t.indexOf("#block") !== 0) ? t : null;
  }
  // The label element visually centered directly BELOW an image (its grid column).
  // Column-aware, so multi-column grids never borrow a neighbor's label.
  function bestLabelBelow(img) {
    var r = img.getBoundingClientRect();
    if (!r.width) return null;
    var scope = img.closest(".fluid-engine") || img.closest("section, main") || document.body;
    var cx = r.left + r.width / 2;
    var best = null, bestGap = Infinity;
    Array.prototype.forEach.call(scope.querySelectorAll("h1,h2,h3,h4,p"), function (el) {
      var t = shortText(el);
      if (!t) return;
      var er = el.getBoundingClientRect();
      if (!er.width || !er.height) return;
      if (cx < er.left - 5 || cx > er.right + 5) return;
      var gap = er.top - r.bottom;
      if (gap < -20 || gap > 240) return;
      if (gap < bestGap) { bestGap = gap; best = el; }
    });
    return best;
  }
  // Options listed under an item's name — used for variant items only.
  // Prefers a <li> bullet list; falls back to short <p> options (e.g. "1m"/"2m"/"3m").
  function variantsFor(img) {
    var nameEl = bestLabelBelow(img);
    if (!nameEl) return [];
    var r = img.getBoundingClientRect(), nr = nameEl.getBoundingClientRect(), cx = r.left + r.width / 2;
    var scope = img.closest(".fluid-engine") || document.body;
    function collect(sel, maxLen, maxGap) {
      var out = [];
      Array.prototype.forEach.call(scope.querySelectorAll(sel), function (el) {
        if (el === nameEl) return;
        var t = el.textContent.trim();
        if (!t || t.length > maxLen) return;
        if (el.children.length && el.querySelector("p,li,h1,h2,h3,h4")) return; // skip containers
        var er = el.getBoundingClientRect();
        if (!er.width || cx < er.left - 5 || cx > er.right + 5) return;
        var gap = er.top - nr.bottom;
        if (gap < -5 || gap > maxGap) return;
        out.push(t);
      });
      return out;
    }
    var li = collect("li", 90, 450);
    return li.length ? li : collect("p", 40, 250);
  }
  // Normalize a name for matching: lowercase, straight quotes, single spaces.
  function normName(s) {
    return (s || "").toLowerCase()
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/\s+/g, " ").trim();
  }
  function isVariantItem(name) {
    return VARIANT_ITEMS.hasOwnProperty(normName(name));
  }
  function variantCfg(name) {
    return VARIANT_ITEMS[normName(name)] || {};
  }
  function nameFor(img) {
    // 1) true gallery caption, if present
    var fig = img.closest("figure, .gallery-grid-item, .gallery-masonry-item");
    var cap = fig && fig.querySelector("figcaption, .gallery-caption, .gallery-caption-content, .image-caption");
    if (cap && cap.textContent.trim()) return cap.textContent.trim();
    // 2) the label centered directly below this image (its grid column)
    var el = bestLabelBelow(img);
    if (el) { var lt = shortText(el); if (lt) return lt; }
    // 3) fallback: nearest following text block in DOM order
    var block = img.closest(".sqs-block") || img;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, null);
    walker.currentNode = block;
    var n;
    while ((n = walker.nextNode())) {
      if (block.contains(n)) continue;
      if (/^(H1|H2|H3|H4|P)$/.test(n.tagName)) {
        var t = shortText(n);
        if (t) return t;
      }
    }
    // 4) last resort: alt text, then filename
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

  function variantLines(id) { return cart.filter(function (c) { return c.id.indexOf(id + "::") === 0; }); }
  function paintBtn(btn, id) {
    var vl = variantLines(id);
    if (vl.length) {                       // variant item with one or more options chosen
      var n = vl.reduce(function (s, c) { return s + c.qty; }, 0);
      btn.className = "aqc-add-btn aqc-in";
      btn.innerHTML = CART + '<span class="aqc-qty">' + n + "</span>";
      return;
    }
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
    if (img.closest("header, footer")) return; // skip logos in header/footer
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
      // resolve the name at click time (page fully laid out); cache it
      var name = ctrl._aqcName || (ctrl._aqcName = nameFor(img));
      if (isVariantItem(name)) { openVariants(img, id, name, imgUrl(img)); return; }
      var it = find(id);
      if (it && e.target.closest(".aqc-dec")) {
        it.qty -= 1;
        if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== id; });
      } else if (it && e.target.closest(".aqc-inc")) {
        it.qty += 1;
      } else if (!it) {
        cart.push({ id: id, name: name, img: imgUrl(img), qty: 1 });
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

  // Video-wall page: only tag images that map to a product; logos/decorative get nothing.
  function tagVideoWall(img) {
    if (img.dataset.aqc) return;
    if (img.closest("header, footer")) return;
    var src = (img.currentSrc || img.src || "").toLowerCase();
    var entry = null;
    for (var i = 0; i < VIDEO_WALL_MAP.length; i++) {
      if (src.indexOf(VIDEO_WALL_MAP[i].match) !== -1) { entry = VIDEO_WALL_MAP[i]; break; }
    }
    if (!entry) return;
    img.dataset.aqc = "1";
    var anchor = img.closest(".sqs-block-image") || img.parentElement;
    if (!anchor) return;
    anchor.classList.add("aqc-anchor");
    if (getComputedStyle(anchor).position === "static") anchor.style.position = "relative";
    var id = "vw::" + entry.name;          // same id across an item's images -> shared cart line
    var ctrl = document.createElement("div");
    ctrl.dataset.aqcId = id;
    paintBtn(ctrl, id);
    ctrl.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (entry.type === "wall") { openVariants(img, id, entry.name, imgUrl(img), entry.options); return; }
      var it = find(id);
      if (it && e.target.closest(".aqc-dec")) {
        it.qty -= 1;
        if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== id; });
      } else if (it && e.target.closest(".aqc-inc")) {
        it.qty += 1;
      } else if (!it) {
        cart.push({ id: id, name: entry.name, img: imgUrl(img), qty: 1 });
      } else {
        return;
      }
      save(cart);
      syncButtons();                       // keep both images of the same item in sync
      renderPill();
      if (overlay && overlay.classList.contains("aqc-show")) renderItems();
      if (!cart.length) closeModal();
    });
    anchor.appendChild(ctrl);
  }

  function scan() {
    if (!pageAllowed()) return;
    if (currentPath() === LINEN_PATH) { injectLinenButton(); return; } // linens: builder only, no per-image buttons
    if (currentPath() === VIDEOWALL_PATH) { document.querySelectorAll(IMG_SELECTORS).forEach(tagVideoWall); return; }
    document.querySelectorAll(IMG_SELECTORS).forEach(tag);
  }

  function syncButtons() {
    document.querySelectorAll(".aqc-add-btn[data-aqc-id]").forEach(function (b) {
      paintBtn(b, b.dataset.aqcId);
    });
  }

  /* ---- variant items: a chooser of options, each its own quote line ---- */
  var vpop;
  function closeVariants() { if (vpop) vpop.classList.remove("aqc-show"); }
  function changeVariant(vid, fullName, thumb, delta) {
    var it = find(vid);
    if (it) { it.qty += delta; if (it.qty <= 0) cart = cart.filter(function (x) { return x.id !== vid; }); }
    else if (delta > 0) { cart.push({ id: vid, name: fullName, img: thumb, qty: 1 }); }
    save(cart);
    renderPill();
    syncButtons();
    if (overlay && overlay.classList.contains("aqc-show")) renderItems();
    return qtyOf(vid);
  }
  function stepperRow(labelText, vid, fullName, thumb, onZero) {
    var li = document.createElement("li");
    li.className = "aqc-item";
    li.innerHTML =
      '<span class="aqc-name"></span>' +
      '<span class="aqc-stepper"><button type="button" class="aqc-dec">&minus;</button>' +
      '<span class="aqc-n">' + qtyOf(vid) + "</span>" +
      '<button type="button" class="aqc-inc">+</button></span>';
    li.querySelector(".aqc-name").textContent = labelText;
    var nEl = li.querySelector(".aqc-n");
    li.querySelector(".aqc-dec").addEventListener("click", function () {
      var q = changeVariant(vid, fullName, thumb, -1);
      nEl.textContent = q;
      if (q <= 0 && onZero) onZero();
    });
    li.querySelector(".aqc-inc").addEventListener("click", function () { nEl.textContent = changeVariant(vid, fullName, thumb, 1); });
    return li;
  }
  function customLinesFor(baseId) {
    return cart.filter(function (c) { return c.id.indexOf(baseId + "::custom::") === 0; });
  }
  function renderCustomItems(ul, baseId, baseName, thumb) {
    ul.innerHTML = "";
    customLinesFor(baseId).forEach(function (c) {
      ul.appendChild(stepperRow(c.name.replace(baseName + " — ", ""), c.id, c.name, thumb,
        function () { renderCustomItems(ul, baseId, baseName, thumb); }));
    });
  }
  function openVariants(img, baseId, baseName, thumb, explicitOpts) {
    var cfg = variantCfg(baseName);
    var pageOpts = explicitOpts || variantsFor(img);
    var opts = (cfg.list === false) ? [] : pageOpts;
    var hints = (cfg.list === false) ? pageOpts : [];
    if (!opts.length && !cfg.custom) {       // nothing to choose — normal add
      var it = find(baseId);
      if (it) it.qty += 1; else cart.push({ id: baseId, name: baseName, img: thumb, qty: 1 });
      save(cart); renderPill(); syncButtons();
      if (overlay && overlay.classList.contains("aqc-show")) renderItems();
      return;
    }
    if (!vpop) {
      vpop = document.createElement("div");
      vpop.className = "aqc-overlay";
      document.body.appendChild(vpop);
      vpop.addEventListener("click", function (e) {
        if (e.target === vpop || e.target.classList.contains("aqc-close") || e.target.classList.contains("aqc-vdone")) closeVariants();
      });
    }
    var sub = (opts.length && cfg.custom) ? "Choose an option or enter your own — each is added to your quote."
            : cfg.custom ? "Enter what you need — each is added to your quote."
            : "Select the option(s) you need — each is added to your quote.";
    var customHtml = cfg.custom
      ? '<div class="aqc-custom">' +
          (hints.length ? '<div class="aqc-hint">Available: ' + hints.join(" • ") + "</div>" : "") +
          '<div class="aqc-customrow"><input class="aqc-cinput" type="text"><button type="button" class="aqc-cadd">Add</button></div>' +
          '<ul class="aqc-citems"></ul>' +
        "</div>"
      : "";
    vpop.innerHTML =
      '<div class="aqc-modal" role="dialog" aria-modal="true">' +
        '<button class="aqc-close" aria-label="Close">&times;</button>' +
        "<h2></h2>" +
        '<p class="aqc-sub"></p>' +
        (opts.length ? '<ul class="aqc-items"></ul>' : "") +
        customHtml +
        '<button type="button" class="aqc-submit aqc-vdone">Done</button>' +
      "</div>";
    vpop.querySelector("h2").textContent = baseName;
    vpop.querySelector(".aqc-sub").textContent = sub;
    if (opts.length) {
      var ul = vpop.querySelector(".aqc-items");
      opts.forEach(function (v) {
        ul.appendChild(stepperRow(v, baseId + "::" + v, baseName + " — " + v, thumb, null));
      });
    }
    if (cfg.custom) {
      var input = vpop.querySelector(".aqc-cinput");
      input.placeholder = cfg.custom;
      var citems = vpop.querySelector(".aqc-citems");
      renderCustomItems(citems, baseId, baseName, thumb);
      var addCustom = function () {
        var txt = input.value.trim();
        if (!txt) return;
        changeVariant(baseId + "::custom::" + txt, baseName + " — " + txt, thumb, 1);
        input.value = "";
        renderCustomItems(citems, baseId, baseName, thumb);
        input.focus();
      };
      vpop.querySelector(".aqc-cadd").addEventListener("click", addCustom);
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); addCustom(); } });
    }
    vpop.classList.add("aqc-show");
  }

  /* ---- linen builder (size x material x color x qty) ---- */
  function injectLinenButton() {
    if (currentPath() !== LINEN_PATH) return;
    if (document.getElementById("aqc-linen-btn")) return;
    var sec = document.querySelector("#sections > section, section.page-section");
    if (!sec) return;
    var cta = document.createElement("div");
    cta.className = "aqc-linen-cta";
    var btn = document.createElement("button");
    btn.id = "aqc-linen-btn";
    btn.type = "button";
    btn.className = "aqc-linen-btn";
    btn.innerHTML = CART + "<span>Build Linen Order</span>";
    btn.addEventListener("click", openLinenBuilder);
    cta.appendChild(btn);
    sec.insertAdjacentElement("afterend", cta);
  }
  function linenThumb() {
    var im = document.querySelector('img[src*="linen-colors"]');
    if (!im) return "";
    return (im.currentSrc || im.src || "").split("?")[0] + "?format=300w";
  }
  function linenLines() { return cart.filter(function (c) { return c.id.indexOf("linen::") === 0; }); }
  function renderLinenList(ul, thumb) {
    ul.innerHTML = "";
    linenLines().forEach(function (c) {
      ul.appendChild(stepperRow(c.name.replace("Linen — ", ""), c.id, c.name, thumb,
        function () { renderLinenList(ul, thumb); }));
    });
  }
  var lbpop;
  function openLinenBuilder() {
    var thumb = linenThumb();
    if (!lbpop) {
      lbpop = document.createElement("div");
      lbpop.className = "aqc-overlay";
      document.body.appendChild(lbpop);
      lbpop.addEventListener("click", function (e) {
        if (e.target === lbpop || e.target.classList.contains("aqc-close") || e.target.classList.contains("aqc-vdone")) lbpop.classList.remove("aqc-show");
      });
    }
    function opts(arr) {
      return arr.map(function (v) {
        var s = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
        return '<option value="' + s + '">' + s + "</option>";
      }).join("");
    }
    lbpop.innerHTML =
      '<div class="aqc-modal" role="dialog" aria-modal="true">' +
        '<button class="aqc-close" aria-label="Close">&times;</button>' +
        "<h2>Build Your Linen Order</h2>" +
        '<p class="aqc-sub">Choose size, material and color — add as many as you need. We confirm color &amp; material availability with your quote.</p>' +
        '<div class="aqc-lb-field"><label>Size</label><select class="aqc-lb-size">' + opts(LINEN_SIZES) + "</select></div>" +
        '<div class="aqc-lb-field"><label>Material</label><select class="aqc-lb-mat">' + opts(LINEN_MATERIALS) + "</select></div>" +
        '<div class="aqc-lb-field"><label>Color</label><select class="aqc-lb-color">' + opts(LINEN_COLORS) + "</select></div>" +
        '<div class="aqc-lb-field"><label>Quantity</label><input class="aqc-lb-qty" type="number" min="1" value="1"></div>' +
        '<button type="button" class="aqc-lb-add">Add to quote</button>' +
        '<ul class="aqc-items" style="margin-top:18px"></ul>' +
        '<button type="button" class="aqc-submit aqc-vdone">Done</button>' +
      "</div>";
    var ul = lbpop.querySelector(".aqc-items");
    renderLinenList(ul, thumb);
    lbpop.querySelector(".aqc-lb-add").addEventListener("click", function () {
      var size = lbpop.querySelector(".aqc-lb-size").value;
      var mat = lbpop.querySelector(".aqc-lb-mat").value;
      var color = lbpop.querySelector(".aqc-lb-color").value;
      var qInput = lbpop.querySelector(".aqc-lb-qty");
      var q = Math.max(1, parseInt(qInput.value, 10) || 1);
      var vid = "linen::" + size + "::" + mat + "::" + color;
      var name = "Linen — " + size + " / " + mat + " / " + color;
      var it = find(vid);
      if (it) it.qty += q; else cart.push({ id: vid, name: name, img: thumb, qty: q });
      save(cart);
      renderPill();
      if (overlay && overlay.classList.contains("aqc-show")) renderItems();
      renderLinenList(ul, thumb);
      qInput.value = "1";
    });
    lbpop.classList.add("aqc-show");
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

  function boot() {
    injectCSS();
    renderPill();
    if (allowSet) scan();
    else buildAllow().then(scan);
  }

  if (document.readyState !== "loading") boot();
  else document.addEventListener("DOMContentLoaded", boot);
  window.addEventListener("mercury:load", boot);            // SS 7.0 ajax
  window.addEventListener("popstate", function () { setTimeout(boot, 300); });
  new MutationObserver(function () { scan(); }).observe(document.documentElement, { childList: true, subtree: true });
})();
