(function () {
  "use strict";

  var MAX_IMAGE_BYTES = 12 * 1024 * 1024;
  var IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  var state = {
    files: [],
    image: null,
    previewUrl: null
  };
  var core = window.ProtectMyPhotoCore;

  var tool = document.body.dataset.tool;
  var fileInput = document.querySelector("[data-file-input]");
  var chooseFile = document.querySelector("[data-choose-file]");
  var uploadZone = document.querySelector("[data-upload-zone]");
  var statusBox = document.querySelector("[data-status]");
  var preview = document.querySelector("[data-preview]");
  var previewImage = document.querySelector("[data-preview-image]");
  var runButton = document.querySelector("[data-run-tool]");
  var clearButton = document.querySelector("[data-clear]");
  var statsBox = null;

  function qs(selector) {
    return document.querySelector(selector);
  }

  function setStatus(message, type) {
    if (!statusBox) {
      return;
    }

    statusBox.classList.toggle("is-error", type === "error");
    statusBox.classList.toggle("is-success", type === "success");
    var messageTarget = statusBox.querySelector("p");
    if (messageTarget) {
      messageTarget.textContent = message;
    }
  }

  function ensureStatsBox() {
    if (!preview) {
      return null;
    }

    if (!statsBox) {
      statsBox = document.createElement("div");
      statsBox.className = "result-stats";
      preview.insertBefore(statsBox, preview.querySelector(".action-row"));
    }

    return statsBox;
  }

  function setStats(items) {
    var box = ensureStatsBox();

    if (!box) {
      return;
    }

    box.innerHTML = items.map(function (item) {
      return "<span>" + item[0] + "<strong>" + item[1] + "</strong></span>";
    }).join("");
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) {
      return Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function extensionFor(type) {
    if (type === "image/png") {
      return "png";
    }

    if (type === "image/webp") {
      return "webp";
    }

    return "jpg";
  }

  function validateImage(file) {
    if (!file) {
      return "No image selected.";
    }

    if (IMAGE_TYPES.indexOf(file.type) === -1) {
      return "Please choose a JPG, PNG, or WebP image.";
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return "This image is " + formatBytes(file.size) + ". Please choose an image under 12 MB.";
    }

    return "";
  }

  function loadImage(file) {
    return core.loadImageFromBlob(file).catch(function () {
      throw new Error("This image could not be opened. It may be corrupt or unsupported.");
    });
  }

  function makeCanvas(width, height) {
    return core.makeCanvas(width, height);
  }

  function drawImageToCanvas(image, width, height, bgColor) {
    var canvas = makeCanvas(width, height);
    var context = canvas.getContext("2d", { alpha: bgColor ? false : true });

    if (bgColor) {
      context.fillStyle = bgColor;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function canvasToBlob(canvas, type, quality) {
    return core.canvasToBlob(canvas, type, quality).catch(function () {
      throw new Error("The browser could not export this image.");
    });
  }

  function downloadBlob(blob, fileName) {
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 500);
  }

  function hexToRgb(hex) {
    var value = String(hex || "#ffffff").replace("#", "");
    if (value.length === 3) {
      value = value.split("").map(function (part) { return part + part; }).join("");
    }
    var number = parseInt(value, 16);
    return {
      r: (number >> 16) & 255,
      g: (number >> 8) & 255,
      b: number & 255
    };
  }

  function colorDistance(aR, aG, aB, bR, bG, bB) {
    var dr = aR - bR;
    var dg = aG - bG;
    var db = aB - bB;
    return Math.sqrt((dr * dr) + (dg * dg) + (db * db));
  }

  function detectEdgeColor(imageData, width, height) {
    var data = imageData.data;
    var points = [[2, 2], [width - 3, 2], [2, height - 3], [width - 3, height - 3], [Math.floor(width / 2), 2], [Math.floor(width / 2), height - 3], [2, Math.floor(height / 2)], [width - 3, Math.floor(height / 2)]];
    var total = { r: 0, g: 0, b: 0, count: 0 };

    points.forEach(function (point) {
      var x = Math.max(0, Math.min(width - 1, point[0]));
      var y = Math.max(0, Math.min(height - 1, point[1]));
      var index = (y * width + x) * 4;
      total.r += data[index];
      total.g += data[index + 1];
      total.b += data[index + 2];
      total.count += 1;
    });

    return {
      r: Math.round(total.r / total.count),
      g: Math.round(total.g / total.count),
      b: Math.round(total.b / total.count)
    };
  }

  function applyPlainBackgroundCleanup(canvas, background, options) {
    var mode = options.mode || "off";
    if (mode === "off") return;

    var context = canvas.getContext("2d", { willReadFrequently: true });
    var width = canvas.width;
    var height = canvas.height;
    var imageData = context.getImageData(0, 0, width, height);
    var data = imageData.data;
    var bg = hexToRgb(background);
    var edge = detectEdgeColor(imageData, width, height);
    var tolerance = Number(options.tolerance) || 0;
    var softness = Number(options.softness) || 0;

    for (var i = 0; i < data.length; i += 4) {
      var alpha = data[i + 3];
      var replace = false;
      var mix = 1;

      if (mode === "transparent") {
        replace = alpha < 250;
        mix = alpha < 1 ? 1 : Math.max(0, 1 - alpha / 255);
      } else {
        var distance = colorDistance(data[i], data[i + 1], data[i + 2], edge.r, edge.g, edge.b);
        if (distance <= tolerance) {
          replace = true;
        } else if (softness && distance <= tolerance + softness) {
          replace = true;
          mix = 1 - ((distance - tolerance) / softness);
        }
      }

      if (replace) {
        data[i] = Math.round((bg.r * mix) + (data[i] * (1 - mix)));
        data[i + 1] = Math.round((bg.g * mix) + (data[i + 1] * (1 - mix)));
        data[i + 2] = Math.round((bg.b * mix) + (data[i + 2] * (1 - mix)));
        data[i + 3] = 255;
      } else if (alpha < 255) {
        var alphaMix = alpha / 255;
        data[i] = Math.round((data[i] * alphaMix) + (bg.r * (1 - alphaMix)));
        data[i + 1] = Math.round((data[i + 1] * alphaMix) + (bg.g * (1 - alphaMix)));
        data[i + 2] = Math.round((data[i + 2] * alphaMix) + (bg.b * (1 - alphaMix)));
        data[i + 3] = 255;
      }
    }

    context.putImageData(imageData, 0, 0);
  }

  function showPreview(file) {
    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
    }

    state.previewUrl = URL.createObjectURL(file);

    if (previewImage) {
      previewImage.src = state.previewUrl;
    }

    if (preview) {
      preview.hidden = false;
    }
  }

  function clearAll() {
    state.files = [];
    state.image = null;
    fileInput.value = "";

    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }

    if (previewImage) {
      previewImage.removeAttribute("src");
    }

    if (preview) {
      preview.hidden = true;
    }

    if (uploadZone) {
      uploadZone.classList.remove("has-file");
    }

    if (statsBox) {
      statsBox.innerHTML = "";
    }

    setStatus("No image selected yet.", "");
  }

  function setResizeDefaults(image) {
    var widthInput = qs("[data-width]");
    var heightInput = qs("[data-height]");

    if (widthInput && heightInput && tool !== "passport" && tool !== "background") {
      widthInput.value = image.naturalWidth;
      heightInput.value = image.naturalHeight;
    }
  }

  function handleFiles(files) {
    var selected = Array.prototype.slice.call(files || []);

    if (!selected.length) {
      return;
    }

    var invalid = selected.map(validateImage).find(Boolean);

    if (invalid) {
      clearAll();
      setStatus(invalid, "error");
      return;
    }

    state.files = selected;

    loadImage(selected[0]).then(function (image) {
      state.image = image;
      setResizeDefaults(image);
      showPreview(selected[0]);
      if (uploadZone) {
        uploadZone.classList.add("has-file");
      }
      setStats([
        ["Input", formatBytes(selected.reduce(function (total, file) { return total + file.size; }, 0))],
        ["Dimensions", image.naturalWidth + " x " + image.naturalHeight]
      ]);
      setStatus(selected.length + " image(s) ready. Nothing has been uploaded.", "success");

      if (tool === "passport") {
        drawPassportPreview();
      } else if (tool === "background") {
        drawBackgroundPreview();
      }
    }).catch(function (error) {
      clearAll();
      setStatus(error.message, "error");
    });
  }

  function scaledSize(image, maxWidth) {
    var width = Math.min(image.naturalWidth, Number(maxWidth) || image.naturalWidth);
    var scale = width / image.naturalWidth;
    return {
      width: width,
      height: Math.round(image.naturalHeight * scale)
    };
  }

  function runCompress() {
    var quality = Number(qs("[data-quality]").value) || 0.75;
    var targetControl = qs("[data-target-kb]");
    var targetKb = targetControl ? Number(targetControl.value) || 0 : 0;
    var size = scaledSize(state.image, qs("[data-max-width]").value);
    var canvas = drawImageToCanvas(state.image, size.width, size.height, "#ffffff");
    return core.exportCanvasWithTarget(canvas, {
      type: "image/jpeg",
      quality: quality,
      targetKb: targetKb,
      minQuality: 0.3
    }).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-compressed.jpg");
      setStats([
        ["Original", formatBytes(state.files[0].size)],
        ["Output", formatBytes(blob.size)],
        ["Target", targetKb ? "Under " + targetKb + " KB" : "Best effort"]
      ]);
      setStatus("Downloaded compressed image: " + formatBytes(blob.size), "success");
    });
  }

  function runResize() {
    var widthInput = qs("[data-width]");
    var heightInput = qs("[data-height]");
    var type = qs("[data-output-format]").value;
    var width = Number(widthInput.value) || state.image.naturalWidth;
    var height = Number(heightInput.value) || state.image.naturalHeight;
    var canvas = drawImageToCanvas(state.image, width, height, type === "image/jpeg" ? "#ffffff" : "");
    return canvasToBlob(canvas, type, 0.9).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-resized." + extensionFor(type));
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Dimensions", width + " x " + height]
      ]);
      setStatus("Downloaded resized image: " + formatBytes(blob.size), "success");
    });
  }

  function runConvert() {
    var type = qs("[data-output-format]").value;
    var quality = Number(qs("[data-quality]").value) || 0.85;
    var canvas = drawImageToCanvas(state.image, state.image.naturalWidth, state.image.naturalHeight, type === "image/jpeg" ? "#ffffff" : "");
    return canvasToBlob(canvas, type, quality).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-converted." + extensionFor(type));
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Format", extensionFor(type).toUpperCase()]
      ]);
      setStatus("Downloaded converted image: " + formatBytes(blob.size), "success");
    });
  }

  function runMetadata() {
    var type = qs("[data-output-format]").value;
    var quality = Number(qs("[data-quality]").value) || 0.9;
    var canvas = drawImageToCanvas(state.image, state.image.naturalWidth, state.image.naturalHeight, type === "image/jpeg" ? "#ffffff" : "");
    return canvasToBlob(canvas, type, quality).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-clean." + extensionFor(type));
      setStats([
        ["Original", formatBytes(state.files[0].size)],
        ["Clean file", formatBytes(blob.size)]
      ]);
      setStatus("Downloaded clean image: " + formatBytes(blob.size), "success");
    });
  }

  function runPdf() {
    var quality = Number(qs("[data-quality]").value) || 0.82;
    var pageSize = qs("[data-page-size]").value;
    var tasks = state.files.map(loadImage);

    return Promise.all(tasks).then(function (images) {
      return core.createPdfFromImages(images, { pageSize: pageSize, quality: quality });
    }).then(function (pdf) {
      downloadBlob(pdf, "protectmyphoto-images.pdf");
      setStats([
        ["Images", String(state.files.length)],
        ["PDF size", formatBytes(pdf.size)]
      ]);
      setStatus("Downloaded PDF: " + formatBytes(pdf.size), "success");
    });
  }

  function passportDimensions() {
    var preset = qs("[data-passport-preset]").value;
    var widthInput = qs("[data-width]");
    var heightInput = qs("[data-height]");

    if (preset === "passport") {
      widthInput.value = 350;
      heightInput.value = 450;
    } else if (preset === "exam") {
      widthInput.value = 200;
      heightInput.value = 230;
    } else if (preset === "square") {
      widthInput.value = 600;
      heightInput.value = 600;
    }

    return {
      width: Number(widthInput.value) || 350,
      height: Number(heightInput.value) || 450
    };
  }

  function drawPassportPreview() {
    var canvas = qs("[data-passport-canvas]");

    if (!canvas || !state.image) {
      return null;
    }

    var dims = passportDimensions();
    var bg = qs("[data-bg-color]").value || "#ffffff";
    var zoom = Number(qs("[data-zoom]").value) || 1;
    var offsetX = Number(qs("[data-offset-x]").value) || 0;
    var offsetY = Number(qs("[data-offset-y]").value) || 0;
    var context = canvas.getContext("2d", { alpha: false });
    var baseScale = Math.max(dims.width / state.image.naturalWidth, dims.height / state.image.naturalHeight);
    var scale = baseScale * zoom;
    var drawWidth = state.image.naturalWidth * scale;
    var drawHeight = state.image.naturalHeight * scale;
    var x = (dims.width - drawWidth) / 2 + offsetX;
    var y = (dims.height - drawHeight) / 2 + offsetY;

    canvas.width = dims.width;
    canvas.height = dims.height;
    context.fillStyle = bg;
    context.fillRect(0, 0, dims.width, dims.height);
    context.drawImage(state.image, x, y, drawWidth, drawHeight);
    return canvas;
  }

  function runPassport() {
    drawPassportPreview();
    var targetKb = Number(qs("[data-target-kb]").value) || 0;
    var dims = passportDimensions();

    return core.createPassportPhoto(state.image, {
      width: dims.width,
      height: dims.height,
      zoom: Number(qs("[data-zoom]").value) || 1,
      offsetX: Number(qs("[data-offset-x]").value) || 0,
      offsetY: Number(qs("[data-offset-y]").value) || 0,
      background: qs("[data-bg-color]").value || "#ffffff",
      targetKb: targetKb
    }).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-passport-photo.jpg");
      setStats([
        ["Photo size", formatBytes(blob.size)],
        ["Target", targetKb ? "Under " + targetKb + " KB" : "Best quality"]
      ]);
      setStatus("Downloaded passport photo: " + formatBytes(blob.size), "success");
    });
  }

  function runCrop() {
    var cropX = Math.max(0, Number(qs("[data-crop-x]").value) || 0);
    var cropY = Math.max(0, Number(qs("[data-crop-y]").value) || 0);
    var cropWidth = Math.min(state.image.naturalWidth - cropX, Number(qs("[data-crop-width]").value) || state.image.naturalWidth);
    var cropHeight = Math.min(state.image.naturalHeight - cropY, Number(qs("[data-crop-height]").value) || state.image.naturalHeight);
    var type = qs("[data-output-format]").value;
    var canvas = makeCanvas(cropWidth, cropHeight);
    var context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });

    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(state.image, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    return canvasToBlob(canvas, type, 0.9).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-cropped." + extensionFor(type));
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Crop", cropWidth + " x " + cropHeight]
      ]);
      setStatus("Downloaded cropped image: " + formatBytes(blob.size), "success");
    });
  }

  function runRotate() {
    var degrees = Number(qs("[data-rotate]").value) || 0;
    var flipX = qs("[data-flip-x]").checked ? -1 : 1;
    var flipY = qs("[data-flip-y]").checked ? -1 : 1;
    var type = qs("[data-output-format]").value;
    var rightAngle = Math.abs(degrees % 180) === 90;
    var canvas = makeCanvas(rightAngle ? state.image.naturalHeight : state.image.naturalWidth, rightAngle ? state.image.naturalWidth : state.image.naturalHeight);
    var context = canvas.getContext("2d", { alpha: type !== "image/jpeg" });

    if (type === "image/jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.translate(canvas.width / 2, canvas.height / 2);
    context.rotate(degrees * Math.PI / 180);
    context.scale(flipX, flipY);
    context.drawImage(state.image, -state.image.naturalWidth / 2, -state.image.naturalHeight / 2);

    return canvasToBlob(canvas, type, 0.9).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-rotated." + extensionFor(type));
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Dimensions", canvas.width + " x " + canvas.height]
      ]);
      setStatus("Downloaded rotated image: " + formatBytes(blob.size), "success");
    });
  }

  function runSignature() {
    var width = Number(qs("[data-width]").value) || 300;
    var height = Number(qs("[data-height]").value) || 100;
    var targetKb = Number(qs("[data-target-kb]").value) || 0;
    var background = qs("[data-bg-color]").value || "#ffffff";
    var canvas = makeCanvas(width, height);
    var context = canvas.getContext("2d", { alpha: false });
    var scale = Math.min(width / state.image.naturalWidth, height / state.image.naturalHeight);
    var drawWidth = Math.round(state.image.naturalWidth * scale);
    var drawHeight = Math.round(state.image.naturalHeight * scale);

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.drawImage(state.image, Math.round((width - drawWidth) / 2), Math.round((height - drawHeight) / 2), drawWidth, drawHeight);

    return core.exportCanvasWithTarget(canvas, {
      type: "image/jpeg",
      quality: 0.88,
      targetKb: targetKb,
      minQuality: 0.28
    }).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-signature.jpg");
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Dimensions", width + " x " + height],
        ["Target", targetKb ? "Under " + targetKb + " KB" : "Best quality"]
      ]);
      setStatus("Downloaded signature image: " + formatBytes(blob.size), "success");
    });
  }

  function runBackground() {
    var canvas = drawBackgroundCanvas();
    var width = canvas.width;
    var height = canvas.height;
    var targetKb = Number(qs("[data-target-kb]").value) || 0;

    return core.exportCanvasWithTarget(canvas, {
      type: "image/jpeg",
      quality: 0.88,
      targetKb: targetKb,
      minQuality: 0.3
    }).then(function (blob) {
      downloadBlob(blob, "protectmyphoto-background.jpg");
      setStats([
        ["Output", formatBytes(blob.size)],
        ["Canvas", width + " x " + height],
        ["Target", targetKb ? "Under " + targetKb + " KB" : "Best quality"]
      ]);
      setStatus("Downloaded background photo: " + formatBytes(blob.size), "success");
    });
  }

  function drawBackgroundCanvas() {
    var width = Number(qs("[data-width]").value) || state.image.naturalWidth;
    var height = Number(qs("[data-height]").value) || state.image.naturalHeight;
    var background = qs("[data-bg-color]").value || "#ffffff";
    var fitMode = qs("[data-fit-mode]").value;
    var cleanControl = qs("[data-clean-bg]");
    var toleranceControl = qs("[data-tolerance]");
    var softnessControl = qs("[data-softness]");
    var canvas = makeCanvas(width, height);
    var context = canvas.getContext("2d", { alpha: false });
    var scale = fitMode === "cover"
      ? Math.max(width / state.image.naturalWidth, height / state.image.naturalHeight)
      : Math.min(width / state.image.naturalWidth, height / state.image.naturalHeight);
    var drawWidth = Math.round(state.image.naturalWidth * scale);
    var drawHeight = Math.round(state.image.naturalHeight * scale);

    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.drawImage(state.image, Math.round((width - drawWidth) / 2), Math.round((height - drawHeight) / 2), drawWidth, drawHeight);
    applyPlainBackgroundCleanup(canvas, background, {
      mode: cleanControl ? cleanControl.value : "off",
      tolerance: toleranceControl ? toleranceControl.value : 0,
      softness: softnessControl ? softnessControl.value : 0
    });

    return canvas;
  }

  function drawBackgroundPreview() {
    var canvas = qs("[data-background-canvas]");
    if (!canvas || !state.image) return;

    var output = drawBackgroundCanvas();
    canvas.width = output.width;
    canvas.height = output.height;
    canvas.getContext("2d").drawImage(output, 0, 0);
  }

  function runTool() {
    if (!state.image && tool !== "pdf") {
      setStatus("Please choose an image first.", "error");
      return;
    }

    if (tool === "pdf" && !state.files.length) {
      setStatus("Please choose at least one image first.", "error");
      return;
    }

    if (!runButton) {
      return;
    }

    runButton.disabled = true;
    runButton.textContent = "Preparing...";
    setStatus("Processing in your browser.", "");

    var action = {
      compress: runCompress,
      resize: runResize,
      convert: runConvert,
      metadata: runMetadata,
      pdf: runPdf,
      passport: runPassport,
      crop: runCrop,
      rotate: runRotate,
      signature: runSignature,
      background: runBackground
    }[tool];

    action().catch(function (error) {
      setStatus(error.message || "Something went wrong while processing this image.", "error");
    }).finally(function () {
      runButton.disabled = false;
      runButton.textContent = runButton.dataset.originalText;
    });
  }

  if (chooseFile && fileInput && runButton) {
    runButton.dataset.originalText = runButton.textContent;

    chooseFile.addEventListener("click", function () {
      fileInput.click();
    });

    fileInput.addEventListener("change", function () {
      handleFiles(fileInput.files);
    });

    if (uploadZone) {
      uploadZone.addEventListener("dragover", function (event) {
        event.preventDefault();
        uploadZone.classList.add("is-dragging");
      });

      uploadZone.addEventListener("dragleave", function () {
        uploadZone.classList.remove("is-dragging");
      });

      uploadZone.addEventListener("drop", function (event) {
        event.preventDefault();
        uploadZone.classList.remove("is-dragging");
        handleFiles(event.dataTransfer.files);
      });
    }

    if (clearButton) {
      clearButton.addEventListener("click", clearAll);
    }
    runButton.addEventListener("click", runTool);
  }

  var lockAspect = qs("[data-lock-aspect]");
  var widthInput = qs("[data-width]");
  var heightInput = qs("[data-height]");

  if (lockAspect && widthInput && heightInput) {
    widthInput.addEventListener("input", function () {
      if (lockAspect.checked && state.image) {
        heightInput.value = Math.round(Number(widthInput.value) * state.image.naturalHeight / state.image.naturalWidth);
      }
    });

    heightInput.addEventListener("input", function () {
      if (lockAspect.checked && state.image) {
        widthInput.value = Math.round(Number(heightInput.value) * state.image.naturalWidth / state.image.naturalHeight);
      }
    });
  }

  if (tool === "passport") {
    ["[data-passport-preset]", "[data-width]", "[data-height]", "[data-zoom]", "[data-offset-x]", "[data-offset-y]", "[data-bg-color]"].forEach(function (selector) {
      var control = qs(selector);
      if (control) {
        control.addEventListener("input", drawPassportPreview);
        control.addEventListener("change", drawPassportPreview);
      }
    });
  }

  if (tool === "background") {
    ["[data-width]", "[data-height]", "[data-bg-color]", "[data-fit-mode]", "[data-clean-bg]", "[data-tolerance]", "[data-softness]"].forEach(function (selector) {
      var control = qs(selector);
      if (control) {
        control.addEventListener("input", drawBackgroundPreview);
        control.addEventListener("change", drawBackgroundPreview);
      }
    });
  }
}());
