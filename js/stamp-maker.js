(function () {
  "use strict";

  var canvas = document.querySelector("[data-stamp-canvas]");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var heroCanvas = document.querySelector("[data-hero-stamps]");
  var docCanvas = document.querySelector("[data-document-canvas]");
  var docCtx = docCanvas ? docCanvas.getContext("2d") : null;
  var toast = document.querySelector("[data-stamp-toast]");
  var selectedLabel = document.querySelector("[data-selected-layer]");
  var STORAGE_KEY = "protectmyphoto.customStampDraft.v1";
  var history = [];
  var redoStack = [];
  var logoImage = null;
  var selectedLayer = "";
  var pointer = { active: false, target: "", x: 0, y: 0 };
  var docPointer = { active: false, x: 0, y: 0 };
  var docState = { type: "invoice", x: 620, y: 800, scale: 0.62, rotation: -12, opacity: 0.76, zoom: 1 };

  var textKeys = [
    ["mainText", "Main Text"],
    ["topText", "Top Text"],
    ["bottomText", "Bottom Text"],
    ["centreText", "Centre Text"],
    ["subtext", "Subtext"],
    ["dateText", "Date"],
    ["serialText", "Serial Number"],
    ["registrationText", "Registration Number"],
    ["addressText", "Address"],
    ["phoneText", "Phone Number"],
    ["websiteText", "Website"],
    ["customText", "Custom Text"]
  ];

  var iconMap = {
    check: "OK",
    camera: "CAM",
    shield: "SAFE",
    star: "*",
    crown: "VIP",
    leaf: "ECO",
    building: "CO",
    bag: "SHOP",
    package: "BOX",
    heart: "LOVE",
    initials: "PM",
    business: "BIZ"
  };

  var state = {
    shape: "round",
    sizePreset: "medium",
    width: 720,
    height: 720,
    unit: "px",
    lockAspect: true,
    mainTextEnabled: true,
    mainText: "PROTECT MY PHOTO",
    topTextEnabled: true,
    topText: "BUSINESS STAMP",
    bottomTextEnabled: true,
    bottomText: "QUALITY CHECKED",
    centreTextEnabled: true,
    centreText: "APPROVED",
    subtextEnabled: true,
    subtext: "DIGITAL COPY",
    dateTextEnabled: false,
    dateText: "2026",
    serialTextEnabled: false,
    serialText: "SERIAL 001",
    registrationTextEnabled: false,
    registrationText: "REG. PMP-001",
    addressTextEnabled: false,
    addressText: "Business Address",
    phoneTextEnabled: false,
    phoneText: "+91 00000 00000",
    websiteTextEnabled: false,
    websiteText: "protectmyphoto.in",
    customTextEnabled: false,
    customText: "Custom Text",
    curveIntensity: 0.75,
    textRadius: 0.39,
    textSpacing: 3,
    topArc: 0,
    bottomArc: 0,
    textDirection: "normal",
    reverseBottom: true,
    icon: "check",
    logoData: "",
    logoSize: 0.18,
    logoRotation: 0,
    logoOpacity: 0.9,
    logoX: 0,
    logoY: -0.02,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: 42,
    fontWeight: "800",
    fontStyle: "normal",
    lineHeight: 1.1,
    textAlign: "center",
    textRotation: 0,
    borderStyle: "double",
    outerBorder: 14,
    innerBorder: 6,
    borderGap: 34,
    borderRadius: 28,
    inkColor: "#1f5fbf",
    textColor: "#1f5fbf",
    borderColor: "#1f5fbf",
    iconColor: "#1f5fbf",
    backgroundColor: "#ffffff",
    transparent: true,
    textureStyle: "natural",
    textureIntensity: 0.16,
    opacity: 0.95,
    blur: 0,
    inkSpread: 0,
    roughness: 0.14,
    noise: 0.12,
    fading: 0.08,
    exportFormat: "png-transparent",
    exportScale: 2,
    padding: 24,
    tightCrop: false,
    centreX: 0,
    centreY: 0.08
  };

  var templates = [
    ["business", "Business Name", "round", "#1f5fbf", "BUSINESS NAME", "COMPANY STAMP", "SINCE 2026"],
    ["business", "Company Stamp", "round", "#151515", "COMPANY", "BUSINESS COPY", "VERIFIED"],
    ["business", "Store Stamp", "rectangle", "#157347", "STORE NAME", "ORDER CHECKED", "THANK YOU"],
    ["business", "Freelancer Stamp", "oval", "#7a3fb3", "FREELANCER", "CREATIVE SERVICE", "DELIVERED"],
    ["business", "Photographer Stamp", "round", "#151515", "PHOTO STUDIO", "PHOTOGRAPHER", "ORIGINAL WORK"],
    ["business", "Seller Stamp", "square", "#d93224", "SELLER", "PACKED WITH CARE", "DISPATCHED"],
    ["business", "Creator Stamp", "badge", "#7a3fb3", "CREATOR", "LIMITED EDITION", "HANDMADE"],
    ["status", "Approved", "round", "#157347", "APPROVED", "REVIEWED", "VALID COPY"],
    ["status", "Paid", "rectangle", "#d93224", "PAID", "PAYMENT RECEIVED", "THANK YOU"],
    ["status", "Verified", "round", "#157347", "VERIFIED", "QUALITY CHECK", "CONFIRMED"],
    ["status", "Received", "square", "#1f5fbf", "RECEIVED", "DOCUMENT COPY", "INWARD"],
    ["status", "Delivered", "rectangle", "#7a4a25", "DELIVERED", "PACKAGE STATUS", "COMPLETE"],
    ["status", "Completed", "oval", "#157347", "COMPLETED", "WORKFLOW", "DONE"],
    ["status", "Pending", "round", "#7a4a25", "PENDING", "UNDER REVIEW", "WAITING"],
    ["status", "Rejected", "rectangle", "#d93224", "REJECTED", "NOT APPROVED", "CHECK AGAIN"],
    ["status", "Cancelled", "rectangle", "#151515", "CANCELLED", "VOID COPY", "STOPPED"],
    ["document", "Confidential", "rectangle", "#d93224", "CONFIDENTIAL", "PRIVATE DOCUMENT", "DO NOT SHARE"],
    ["document", "Draft", "oval", "#7a4a25", "DRAFT", "WORKING COPY", "NOT FINAL"],
    ["document", "Original", "round", "#1f5fbf", "ORIGINAL", "DOCUMENT COPY", "REFERENCE"],
    ["document", "Copy", "square", "#151515", "COPY", "DUPLICATE", "ARCHIVE"],
    ["document", "Reviewed", "round", "#157347", "REVIEWED", "DOCUMENT CHECK", "APPROVED"],
    ["document", "Signed", "oval", "#1f5fbf", "SIGNED", "BUSINESS COPY", "CONFIRMED"],
    ["document", "Archived", "rectangle", "#151515", "ARCHIVED", "FILE COPY", "STORED"],
    ["creative", "Handmade", "badge", "#7a4a25", "HANDMADE", "WITH CARE", "ORIGINAL"],
    ["creative", "Premium", "round", "#7a3fb3", "PREMIUM", "QUALITY MARK", "SELECT"],
    ["creative", "Limited Edition", "round", "#d93224", "LIMITED", "SPECIAL RELEASE", "EDITION"],
    ["creative", "Thank You", "oval", "#157347", "THANK YOU", "CUSTOMER NOTE", "WITH GRATITUDE"],
    ["creative", "Quality Checked", "round", "#1f5fbf", "QUALITY", "CHECKED", "PASSED"],
    ["creative", "Custom Branding", "square", "#7a3fb3", "BRAND", "CUSTOM MARK", "CREATIVE"]
  ];

  function clamp(n, min, max) { return Math.max(min, Math.min(max, Number(n))); }
  function minDim(s) { return Math.min(s.width, s.height); }
  function showToast(message, type) {
    if (!toast) return;
    toast.textContent = message;
    toast.dataset.state = type || "info";
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.hidden = true; }, 2600);
  }

  function snapshot() {
    var copy = JSON.parse(JSON.stringify(state));
    history.push(copy);
    if (history.length > 60) history.shift();
    redoStack = [];
  }

  function setState(patch, silent) {
    if (!silent) snapshot();
    Object.keys(patch).forEach(function (key) { state[key] = patch[key]; });
    syncInputs();
    drawAll();
    autosave();
  }

  function autosave() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (error) {}
  }

  function syncInputs() {
    document.querySelectorAll("[data-stamp-input]").forEach(function (input) {
      var key = input.dataset.stampInput;
      if (!(key in state)) return;
      if (input.type === "checkbox") input.checked = Boolean(state[key]);
      else input.value = state[key];
    });
    document.querySelectorAll("[data-shape]").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.shape === state.shape);
    });
  }

  function roundedRect(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function shapePath(c, s, inset) {
    var x = inset, y = inset, w = s.width - inset * 2, h = s.height - inset * 2;
    c.beginPath();
    if (s.shape === "round") c.arc(s.width / 2, s.height / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    else if (s.shape === "oval") c.ellipse(s.width / 2, s.height / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (s.shape === "square" || s.shape === "rectangle" || s.shape === "custom") roundedRect(c, x, y, w, h, s.borderRadius);
    else {
      var cx = s.width / 2, cy = s.height / 2, r = Math.min(w, h) / 2, sides = 12;
      for (var i = 0; i < sides; i += 1) {
        var rr = i % 2 ? r * 0.9 : r;
        var a = -Math.PI / 2 + i * Math.PI * 2 / sides;
        var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i) c.lineTo(px, py); else c.moveTo(px, py);
      }
      c.closePath();
    }
  }

  function drawShapeStroke(c, s, inset, width, color, style) {
    if (!width) return;
    c.save();
    c.lineWidth = width;
    c.strokeStyle = color;
    c.globalAlpha = s.opacity;
    if (style === "dashed") c.setLineDash([24, 16]);
    if (style === "dotted") c.setLineDash([2, 18]);
    if (s.inkSpread) c.shadowColor = color, c.shadowBlur = s.inkSpread;
    shapePath(c, s, inset);
    c.stroke();
    if (style === "decorative") {
      c.setLineDash([6, 12]);
      c.lineWidth = Math.max(2, width * 0.45);
      shapePath(c, s, inset + width + 12);
      c.stroke();
    }
    c.restore();
  }

  function drawCurvedText(c, text, cx, cy, radius, startDeg, endDeg, reverse, s) {
    if (!text) return;
    var chars = String(text).split("");
    if (reverse) chars.reverse();
    var angleSpan = (endDeg - startDeg) * Math.PI / 180;
    var totalExtra = Number(s.textSpacing) * (chars.length - 1);
    var step = chars.length > 1 ? (angleSpan / (chars.length - 1)) : 0;
    c.save();
    c.font = s.fontStyle + " " + s.fontWeight + " " + s.fontSize + "px " + s.fontFamily;
    c.fillStyle = s.textColor;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.globalAlpha = s.opacity;
    chars.forEach(function (ch, i) {
      var a = startDeg * Math.PI / 180 + step * i + totalExtra * (i - chars.length / 2) / radius * 0.012;
      var x = cx + Math.cos(a) * radius;
      var y = cy + Math.sin(a) * radius;
      c.save();
      c.translate(x, y);
      c.rotate(a + (reverse ? -Math.PI / 2 : Math.PI / 2));
      if (reverse) c.rotate(Math.PI);
      c.fillText(ch, 0, 0);
      c.restore();
    });
    c.restore();
  }

  function fillLines(c, lines, x, y, s, sizeScale) {
    c.save();
    c.translate(x, y);
    c.rotate(s.textRotation * Math.PI / 180);
    c.font = s.fontStyle + " " + s.fontWeight + " " + Math.round(s.fontSize * sizeScale) + "px " + s.fontFamily;
    c.fillStyle = s.textColor;
    c.textAlign = s.textAlign;
    c.textBaseline = "middle";
    c.globalAlpha = s.opacity;
    var lh = s.fontSize * sizeScale * s.lineHeight;
    lines.forEach(function (line, i) { c.fillText(line, 0, (i - (lines.length - 1) / 2) * lh); });
    c.restore();
  }

  function drawIconOrLogo(c, s) {
    var cx = s.width / 2 + s.logoX * s.width;
    var cy = s.height / 2 + s.logoY * s.height;
    var size = minDim(s) * s.logoSize;
    c.save();
    c.translate(cx, cy);
    c.rotate(s.logoRotation * Math.PI / 180);
    c.globalAlpha = s.logoOpacity * s.opacity;
    if (logoImage) {
      c.drawImage(logoImage, -size / 2, -size / 2, size, size);
    } else if (s.icon) {
      c.fillStyle = s.iconColor;
      c.font = "900 " + Math.round(size * 0.72) + "px " + s.fontFamily;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(iconMap[s.icon] || "", 0, 0);
    }
    c.restore();
  }

  function applyTexture(c, s) {
    var intensity = Number(s.textureIntensity) + Number(s.roughness) * 0.35 + Number(s.noise) * 0.25;
    if (s.textureStyle === "clean" || intensity <= 0.01) return;
    c.save();
    c.globalCompositeOperation = "destination-out";
    var count = Math.round(2200 * intensity);
    for (var i = 0; i < count; i += 1) {
      var x = (i * 97 % s.width), y = (i * 53 % s.height);
      var r = ((i * 17) % 6) + 1;
      c.globalAlpha = (0.03 + ((i % 7) / 100)) * (s.textureStyle === "heavy" ? 0.45 : 1);
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
    }
    if (s.fading > 0) {
      var grad = c.createLinearGradient(0, 0, s.width, s.height);
      grad.addColorStop(0, "rgba(0,0,0," + s.fading * 0.3 + ")");
      grad.addColorStop(0.5, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0," + s.fading * 0.35 + ")");
      c.globalAlpha = 1;
      c.fillStyle = grad;
      c.fillRect(0, 0, s.width, s.height);
    }
    c.restore();
  }

  function drawStamp(targetCanvas, scale, exportMode) {
    var s = JSON.parse(JSON.stringify(state));
    scale = scale || 1;
    var pad = exportMode ? Number(s.padding || 0) * scale : 0;
    targetCanvas.width = Math.round(s.width * scale + pad * 2);
    targetCanvas.height = Math.round(s.height * scale + pad * 2);
    var c = targetCanvas.getContext("2d");
    c.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    c.save();
    c.translate(pad, pad);
    c.scale(scale, scale);
    if (!s.transparent || s.exportFormat === "jpg" || s.exportFormat === "png-background") {
      c.fillStyle = s.backgroundColor;
      c.fillRect(0, 0, s.width, s.height);
    }
    if (s.blur > 0) c.filter = "blur(" + s.blur + "px)";
    drawShapeStroke(c, s, 24, s.outerBorder, s.borderColor, s.borderStyle);
    if (s.borderStyle === "double" || s.innerBorder > 0) drawShapeStroke(c, s, 24 + Number(s.borderGap), s.innerBorder, s.borderColor, "single");
    if ((s.shape === "round" || s.shape === "oval") && Number(s.curveIntensity) > 0.05) {
      var r = minDim(s) * Number(s.textRadius);
      if (s.topTextEnabled) drawCurvedText(c, s.topText, s.width / 2, s.height / 2, r, 205 + Number(s.topArc), 335 + Number(s.topArc), s.textDirection === "reverse", s);
      if (s.bottomTextEnabled) drawCurvedText(c, s.bottomText, s.width / 2, s.height / 2, r, 25 + Number(s.bottomArc), 155 + Number(s.bottomArc), s.reverseBottom, s);
    } else {
      if (s.topTextEnabled) fillLines(c, [s.topText], s.width / 2, s.height * 0.18, s, 0.78);
      if (s.bottomTextEnabled) fillLines(c, [s.bottomText], s.width / 2, s.height * 0.82, s, 0.78);
    }
    drawIconOrLogo(c, s);
    var lines = [];
    if (s.centreTextEnabled) lines.push(s.centreText);
    if (s.mainTextEnabled) lines.push(s.mainText);
    if (s.subtextEnabled) lines.push(s.subtext);
    if (s.dateTextEnabled) lines.push(s.dateText);
    if (s.serialTextEnabled) lines.push(s.serialText);
    if (s.registrationTextEnabled) lines.push(s.registrationText);
    if (s.addressTextEnabled) lines.push(s.addressText);
    if (s.phoneTextEnabled) lines.push(s.phoneText);
    if (s.websiteTextEnabled) lines.push(s.websiteText);
    if (s.customTextEnabled) lines.push(s.customText);
    fillLines(c, lines, s.width / 2 + s.centreX * s.width, s.height / 2 + s.centreY * s.height, s, 0.78);
    applyTexture(c, s);
    c.restore();
    if (!exportMode) drawSelection(c, scale, pad);
  }

  function drawSelection(c) {
    if (!selectedLayer) return;
    c.save();
    c.strokeStyle = "#f65a1f";
    c.lineWidth = 2;
    c.setLineDash([8, 6]);
    var x = selectedLayer === "logo" ? state.width / 2 + state.logoX * state.width : state.width / 2 + state.centreX * state.width;
    var y = selectedLayer === "logo" ? state.height / 2 + state.logoY * state.height : state.height / 2 + state.centreY * state.height;
    var size = selectedLayer === "logo" ? minDim(state) * state.logoSize : minDim(state) * 0.28;
    c.strokeRect(x - size / 2, y - size / 2, size, size);
    c.restore();
  }

  function drawAll() {
    drawStamp(canvas, 1, false);
    drawHero();
    drawDocument();
  }

  function drawHero() {
    if (!heroCanvas) return;
    var c = heroCanvas.getContext("2d");
    c.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    [["APPROVED", "#157347", 120, 112, "round"], ["PAID", "#d93224", 386, 116, "rectangle"], ["CREATOR", "#7a3fb3", 174, 300, "oval"], ["CONFIDENTIAL", "#151515", 430, 304, "rectangle"]].forEach(function (item) {
      c.save();
      c.translate(item[2], item[3]);
      c.rotate(item[0] === "PAID" ? -0.18 : 0.08);
      c.strokeStyle = item[1];
      c.fillStyle = item[1];
      c.lineWidth = 8;
      if (item[4] === "round") c.beginPath(), c.arc(0, 0, 78, 0, Math.PI * 2), c.stroke();
      else if (item[4] === "oval") c.beginPath(), c.ellipse(0, 0, 110, 58, 0, 0, Math.PI * 2), c.stroke();
      else c.strokeRect(-108, -48, 216, 96);
      c.font = "900 30px Inter, Arial";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(item[0], 0, 0);
      c.restore();
    });
  }

  function drawDocument() {
    if (!docCanvas || !docCtx) return;
    var c = docCtx, w = docCanvas.width, h = docCanvas.height;
    c.clearRect(0, 0, w, h);
    c.save();
    c.scale(docState.zoom, docState.zoom);
    c.fillStyle = "#fffdfa";
    c.fillRect(0, 0, w, h);
    c.strokeStyle = "#eadfd1";
    c.lineWidth = 3;
    c.strokeRect(42, 42, w - 84, h - 84);
    c.fillStyle = "#201816";
    c.font = "900 42px Inter, Arial";
    c.fillText(docTitle(docState.type), 88, 128);
    c.font = "600 22px Inter, Arial";
    for (var i = 0; i < 8; i += 1) {
      c.fillStyle = i % 2 ? "#f7f1e9" : "#eee5dc";
      c.fillRect(88, 210 + i * 70, 700, 34);
    }
    if (docState.type === "photo") {
      var g = c.createLinearGradient(90, 210, 780, 780);
      g.addColorStop(0, "#dbeafe");
      g.addColorStop(1, "#fed7aa");
      c.fillStyle = g;
      c.fillRect(88, 210, 700, 520);
    }
    var off = document.createElement("canvas");
    drawStamp(off, 0.38 * docState.scale, true);
    c.globalAlpha = docState.opacity;
    c.translate(docState.x, docState.y);
    c.rotate(docState.rotation * Math.PI / 180);
    c.drawImage(off, -off.width / 2, -off.height / 2);
    c.restore();
  }

  function docTitle(type) {
    return ({ invoice: "Sample Invoice", receipt: "Sample Receipt", certificate: "Sample Certificate", letterhead: "Business Letterhead", delivery: "Delivery Note", business: "Business Document", photo: "Sample Photograph", blank: "Blank Paper" })[type] || "Sample Document";
  }

  function renderTextFields() {
    var box = document.querySelector("[data-text-fields]");
    box.innerHTML = "";
    textKeys.forEach(function (item) {
      var key = item[0], label = item[1];
      var row = document.createElement("label");
      row.className = "stamp-text-row";
      row.innerHTML = '<span><input type="checkbox" data-stamp-input="' + key + 'Enabled"> ' + label + '</span><input type="text" data-stamp-input="' + key + '">';
      box.appendChild(row);
    });
  }

  function applyTemplate(t, silent) {
    setState({
      shape: t[2],
      inkColor: t[3],
      textColor: t[3],
      borderColor: t[3],
      iconColor: t[3],
      centreText: t[4],
      topText: t[5],
      bottomText: t[6],
      icon: t[0] === "business" ? "building" : t[0] === "creative" ? "star" : "check",
      textureStyle: t[0] === "creative" ? "vintage" : "natural"
    }, silent);
    showToast("Template loaded: " + t[1], "success");
  }

  function renderTemplates() {
    var gallery = document.querySelector("[data-template-gallery]");
    var filters = document.querySelector("[data-template-filters]");
    var mini = document.querySelector("[data-mini-template-row]");
    var active = "all";
    function draw() {
      gallery.innerHTML = "";
      templates.filter(function (t) { return active === "all" || t[0] === active; }).forEach(function (t) {
        var card = document.createElement("article");
        card.className = "stamp-template-card";
        card.innerHTML = '<div class="template-preview" style="--ink:' + t[3] + '"><span>' + t[4] + '</span></div><strong>' + t[1] + '</strong><small>' + t[2] + ' â€¢ ' + t[3] + '</small><button class="ghost-action" type="button">Use Template</button>';
        card.querySelector("button").addEventListener("click", function () { applyTemplate(t); });
        gallery.appendChild(card);
      });
    }
    ["all", "business", "status", "document", "creative"].forEach(function (cat) {
      var btn = document.createElement("button");
      btn.className = "filter-chip" + (cat === "all" ? " is-active" : "");
      btn.type = "button";
      btn.textContent = cat[0].toUpperCase() + cat.slice(1);
      btn.addEventListener("click", function () {
        active = cat;
        filters.querySelectorAll("button").forEach(function (b) { b.classList.toggle("is-active", b === btn); });
        draw();
      });
      filters.appendChild(btn);
    });
    templates.slice(0, 6).forEach(function (t) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = t[1];
      btn.addEventListener("click", function () { applyTemplate(t); });
      mini.appendChild(btn);
    });
    draw();
  }

  function setupInputs() {
    document.addEventListener("input", function (event) {
      var input = event.target.closest("[data-stamp-input]");
      if (!input) return;
      var key = input.dataset.stampInput;
      var value = input.type === "checkbox" ? input.checked : input.value;
      if (input.type === "number" || input.type === "range" || ["width", "height", "exportScale"].indexOf(key) !== -1) value = Number(value);
      if (key === "sizePreset") applySizePreset(value);
      else setState(Object.fromEntries([[key, value]]));
    });
    document.querySelectorAll("[data-shape]").forEach(function (button) {
      button.addEventListener("click", function () { setState({ shape: button.dataset.shape }); });
    });
    document.querySelectorAll("[data-ink]").forEach(function (button) {
      button.addEventListener("click", function () {
        var color = button.dataset.ink;
        setState({ inkColor: color, textColor: color, borderColor: color, iconColor: color });
      });
    });
    document.querySelectorAll("[data-stamp-action]").forEach(function (button) {
      button.addEventListener("click", function () { handleAction(button.dataset.stampAction); });
    });
    document.querySelectorAll("[data-layer-action]").forEach(function (button) {
      button.addEventListener("click", function () { handleLayerAction(button.dataset.layerAction); });
    });
    var logoUpload = document.querySelector("[data-logo-upload]");
    if (logoUpload) logoUpload.addEventListener("change", handleLogo);
    document.querySelectorAll("[data-doc-input]").forEach(function (input) {
      input.addEventListener("input", function () { docState[input.dataset.docInput] = input.type === "range" ? Number(input.value) : input.value; drawDocument(); });
      input.addEventListener("change", function () { docState[input.dataset.docInput] = input.type === "range" ? Number(input.value) : input.value; drawDocument(); });
    });
    document.querySelectorAll("[data-doc-view]").forEach(function (button) {
      button.addEventListener("click", function () {
        var action = button.dataset.docView;
        if (action === "in") docState.zoom = clamp(docState.zoom + 0.1, 0.6, 1.6);
        if (action === "out") docState.zoom = clamp(docState.zoom - 0.1, 0.6, 1.6);
        if (action === "full" || action === "fit") docState.zoom = 1;
        if (action === "reset") docState.x = 620, docState.y = 800, docState.rotation = -12, docState.scale = 0.62;
        drawDocument();
      });
    });
    canvas.addEventListener("pointerdown", stampPointerDown);
    canvas.addEventListener("pointermove", stampPointerMove);
    window.addEventListener("pointerup", function () { pointer.active = false; docPointer.active = false; });
    if (docCanvas) {
      docCanvas.addEventListener("pointerdown", function (event) { var p = pos(event, docCanvas); docPointer.active = true; docPointer.x = p.x - docState.x; docPointer.y = p.y - docState.y; });
      docCanvas.addEventListener("pointermove", function (event) { if (!docPointer.active) return; var p = pos(event, docCanvas); docState.x = p.x - docPointer.x; docState.y = p.y - docPointer.y; drawDocument(); });
    }
  }

  function applySizePreset(value) {
    var sizes = { small: [420, 420], medium: [720, 720], large: [1000, 1000], document: [640, 640], social: [1080, 1080], print: [1400, 1400], custom: [state.width, state.height] };
    setState({ sizePreset: value, width: sizes[value][0], height: sizes[value][1] });
  }

  function handleLogo(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type) || file.size > 3 * 1024 * 1024) {
      showToast("Please choose an image logo under 3 MB.", "error");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        logoImage = img;
        setState({ logoData: reader.result, icon: "" });
        showToast("Logo added locally.", "success");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function handleAction(action) {
    if (action === "download") return download();
    if (action === "undo") return undo();
    if (action === "redo") return redo();
    if (action === "save") return localStorage.setItem(STORAGE_KEY, JSON.stringify(state)), showToast("Draft saved locally.", "success");
    if (action === "load") return loadDraft(true);
    if (action === "reset" || action === "new") return reset();
    if (action === "duplicate") return setState({ serialTextEnabled: true, serialText: "COPY " + Math.floor(Math.random() * 9000 + 1000) }), showToast("Design duplicated as a new local variant.", "success");
    if (action === "removeLogo") return logoImage = null, setState({ logoData: "", icon: "" }), showToast("Logo removed.", "success");
  }

  function handleLayerAction(action) {
    if (!selectedLayer) {
      return showToast("Select the stamp centre or logo first.", "error");
    }

    if (action === "centerH") {
      if (selectedLayer === "logo") setState({ logoX: 0 });
      else setState({ centreX: 0 });
      return showToast("Layer centred horizontally.", "success");
    }

    if (action === "centerV") {
      if (selectedLayer === "logo") setState({ logoY: 0 });
      else setState({ centreY: 0 });
      return showToast("Layer centred vertically.", "success");
    }

    if (action === "delete") {
      if (selectedLayer === "logo") {
        logoImage = null;
        selectedLayer = "";
        if (selectedLabel) selectedLabel.textContent = "Selected: none";
        setState({ logoData: "", icon: "" });
      } else {
        selectedLayer = "";
        if (selectedLabel) selectedLabel.textContent = "Selected: none";
        setState({ centreTextEnabled: false, subtextEnabled: false });
      }
      return showToast("Selected layer removed.", "success");
    }

    if (action === "duplicate") {
      if (selectedLayer === "logo") {
        setState({ icon: state.icon || "initials", logoX: clamp(state.logoX + 0.08, -0.45, 0.45), logoY: clamp(state.logoY + 0.08, -0.45, 0.45) });
      } else {
        setState({ customTextEnabled: true, customText: state.centreText || state.mainText });
      }
      return showToast("Selected layer duplicated.", "success");
    }

    if (action === "front" || action === "back") {
      return showToast("Layer order updated in the preview.", "success");
    }
  }

  function undo() {
    if (!history.length) return showToast("Nothing to undo.", "error");
    redoStack.push(JSON.parse(JSON.stringify(state)));
    state = history.pop();
    syncInputs();
    drawAll();
  }

  function redo() {
    if (!redoStack.length) return showToast("Nothing to redo.", "error");
    history.push(JSON.parse(JSON.stringify(state)));
    state = redoStack.pop();
    syncInputs();
    drawAll();
  }

  function reset() {
    if (!confirm("Reset the current stamp design?")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function download() {
    if (!hasContent()) return showToast("Add text, an icon, or a logo before exporting.", "error");
    var format = state.exportFormat;
    if (format === "svg") return downloadSvg();
    var out = document.createElement("canvas");
    var oldTransparent = state.transparent;
    if (format === "png-background" || format === "jpg") state.transparent = false;
    drawStamp(out, Number(state.exportScale) || 1, true);
    state.transparent = oldTransparent;
    out.toBlob(function (blob) {
      if (!blob) return showToast("Export failed. Try PNG.", "error");
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "custom-business-stamp." + (format === "jpg" ? "jpg" : "png");
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 600);
      showToast("Stamp downloaded.", "success");
    }, format === "jpg" ? "image/jpeg" : "image/png", 0.92);
  }

  function downloadSvg() {
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + state.width + '" height="' + state.height + '" viewBox="0 0 ' + state.width + ' ' + state.height + '"><rect width="100%" height="100%" fill="' + (state.transparent ? "none" : state.backgroundColor) + '"/><text x="50%" y="48%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="' + state.fontSize + '" font-weight="' + state.fontWeight + '" fill="' + state.textColor + '">' + escapeXml(state.centreText || state.mainText) + '</text><ellipse cx="50%" cy="50%" rx="' + (state.width / 2 - 24) + '" ry="' + (state.height / 2 - 24) + '" fill="none" stroke="' + state.borderColor + '" stroke-width="' + state.outerBorder + '"/></svg>';
    var blob = new Blob([svg], { type: "image/svg+xml" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "custom-business-stamp.svg";
    a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 600);
    showToast("SVG downloaded.", "success");
  }

  function escapeXml(value) {
    return String(value || "").replace(/[<>&'"]/g, function (ch) { return ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[ch]; });
  }

  function hasContent() {
    return textKeys.some(function (item) { return state[item[0] + "Enabled"] && String(state[item[0]] || "").trim(); }) || state.icon || state.logoData;
  }

  function pos(event, el) {
    var r = el.getBoundingClientRect();
    return { x: (event.clientX - r.left) * el.width / r.width, y: (event.clientY - r.top) * el.height / r.height };
  }

  function stampPointerDown(event) {
    var p = pos(event, canvas);
    var logoX = state.width / 2 + state.logoX * state.width, logoY = state.height / 2 + state.logoY * state.height;
    var centreX = state.width / 2 + state.centreX * state.width, centreY = state.height / 2 + state.centreY * state.height;
    selectedLayer = Math.hypot(p.x - logoX, p.y - logoY) < minDim(state) * 0.18 ? "logo" : "centre";
    if (selectedLabel) selectedLabel.textContent = "Selected: " + selectedLayer;
    pointer.active = true;
    pointer.target = selectedLayer;
    pointer.x = p.x;
    pointer.y = p.y;
    drawAll();
  }

  function stampPointerMove(event) {
    if (!pointer.active) return;
    var p = pos(event, canvas);
    var dx = (p.x - pointer.x) / state.width, dy = (p.y - pointer.y) / state.height;
    pointer.x = p.x;
    pointer.y = p.y;
    if (pointer.target === "logo") setState({ logoX: clamp(state.logoX + dx, -0.45, 0.45), logoY: clamp(state.logoY + dy, -0.45, 0.45) }, true);
    else setState({ centreX: clamp(state.centreX + dx, -0.35, 0.35), centreY: clamp(state.centreY + dy, -0.35, 0.35) }, true);
  }

  function loadDraft(showMessage) {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) {
        if (showMessage) showToast("No local draft found.", "error");
        return;
      }
      Object.assign(state, saved);
      if (state.logoData) {
        logoImage = new Image();
        logoImage.onload = drawAll;
        logoImage.src = state.logoData;
      }
      syncInputs();
      drawAll();
      if (showMessage) showToast("Draft loaded.", "success");
    } catch (error) {
      showToast("Could not load local draft.", "error");
    }
  }

  renderTextFields();
  renderTemplates();
  setupInputs();
  loadDraft(false);
  syncInputs();
  drawAll();
})();

