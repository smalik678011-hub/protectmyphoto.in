(function () {
  "use strict";

  function makeCanvas(width, height) {
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (!blob) {
          reject(new Error("The browser could not export this file."));
          return;
        }
        resolve(blob);
      }, type, quality);
    });
  }

  function loadImageFromBlob(blob) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      var url = URL.createObjectURL(blob);

      image.onload = function () {
        URL.revokeObjectURL(url);
        resolve(image);
      };

      image.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Image could not be loaded."));
      };

      image.src = url;
    });
  }

  function exportImage(image, options) {
    var canvas = makeCanvas(options.width, options.height);
    var context = canvas.getContext("2d", { alpha: !options.background });

    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvasToBlob(canvas, options.type || "image/jpeg", options.quality || 0.85);
  }

  function createPassportCanvas(image, options) {
    var canvas = makeCanvas(options.width, options.height);
    var context = canvas.getContext("2d", { alpha: false });
    var baseScale = Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    var scale = baseScale * (options.zoom || 1);
    var drawWidth = image.naturalWidth * scale;
    var drawHeight = image.naturalHeight * scale;
    var x = (canvas.width - drawWidth) / 2 + (options.offsetX || 0);
    var y = (canvas.height - drawHeight) / 2 + (options.offsetY || 0);

    context.fillStyle = options.background || "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, x, y, drawWidth, drawHeight);
    return canvas;
  }

  function exportWithTarget(canvas, targetKb) {
    var quality = 0.92;
    var targetBytes = targetKb > 0 ? targetKb * 1024 : 0;

    function attempt() {
      return canvasToBlob(canvas, "image/jpeg", quality).then(function (blob) {
        if (!targetBytes || blob.size <= targetBytes || quality <= 0.35) {
          return blob;
        }
        quality -= 0.07;
        return attempt();
      });
    }

    return attempt();
  }

  function exportCanvasWithTarget(canvas, options) {
    var quality = options.quality || 0.86;
    var minQuality = options.minQuality || 0.32;
    var targetBytes = options.targetKb > 0 ? options.targetKb * 1024 : 0;
    var type = options.type || "image/jpeg";

    function attempt() {
      return canvasToBlob(canvas, type, quality).then(function (blob) {
        if (!targetBytes || blob.size <= targetBytes || quality <= minQuality) {
          return blob;
        }
        quality -= 0.06;
        return attempt();
      });
    }

    return attempt();
  }

  function createPassportPhoto(image, options) {
    return exportWithTarget(createPassportCanvas(image, options), options.targetKb || 0);
  }

  function buildPdf(items) {
    var encoder = new TextEncoder();
    var chunks = [];
    var byteLength = 0;
    var objects = [null, null];
    var pageKids = [];

    function push(part) {
      if (typeof part === "string") {
        part = encoder.encode(part);
      }

      chunks.push(part);
      byteLength += part.length;
    }

    function addObject(parts) {
      objects.push(parts);
      return objects.length;
    }

    items.forEach(function (item, index) {
      var imageObject = addObject([
        "<< /Type /XObject /Subtype /Image /Width " + item.width + " /Height " + item.height + " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length " + item.bytes.length + " >>\nstream\n",
        item.bytes,
        "\nendstream"
      ]);
      var content = "q\n" + item.drawWidth + " 0 0 " + item.drawHeight + " " + item.x + " " + item.y + " cm\n/Im" + index + " Do\nQ";
      var contentObject = addObject(["<< /Length " + encoder.encode(content).length + " >>\nstream\n" + content + "\nendstream"]);
      var pageObject = addObject(["<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + item.pageWidth + " " + item.pageHeight + "] /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im" + index + " " + imageObject + " 0 R >> >> /Contents " + contentObject + " 0 R >>"]);
      pageKids.push(pageObject + " 0 R");
    });

    objects[0] = ["<< /Type /Catalog /Pages 2 0 R >>"];
    objects[1] = ["<< /Type /Pages /Kids [" + pageKids.join(" ") + "] /Count " + items.length + " >>"];

    var offsets = [0];
    push("%PDF-1.3\n% ProtectMyPhoto\n");

    for (var i = 1; i <= objects.length; i += 1) {
      offsets[i] = byteLength;
      push(i + " 0 obj\n");
      objects[i - 1].forEach(push);
      push("\nendobj\n");
    }

    var xref = byteLength;
    push("xref\n0 " + (objects.length + 1) + "\n0000000000 65535 f \n");

    for (var j = 1; j <= objects.length; j += 1) {
      push(String(offsets[j]).padStart(10, "0") + " 00000 n \n");
    }

    push("trailer\n<< /Size " + (objects.length + 1) + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF");
    return new Blob(chunks, { type: "application/pdf" });
  }

  function createPdfFromImages(images, options) {
    var pageSize = options.pageSize || "a4";
    var quality = options.quality || 0.82;
    var tasks = images.map(function (image) {
      if (!image || !image.naturalWidth || !image.naturalHeight) {
        console.warn("ProtectMyPhoto PDF warning: image dimensions are not ready.", image);
        return Promise.reject(new Error("Image was not ready for PDF export."));
      }

      var pageWidth = pageSize === "letter" ? 612 : 595;
      var pageHeight = pageSize === "letter" ? 792 : 842;

      if (pageSize === "fit") {
        pageWidth = Math.max(1, Math.round(image.naturalWidth * 0.75));
        pageHeight = Math.max(1, Math.round(image.naturalHeight * 0.75));
      }

      return exportImage(image, {
        width: image.naturalWidth,
        height: image.naturalHeight,
        type: "image/jpeg",
        quality: quality,
        background: "#ffffff"
      }).then(function (blob) {
        if (!blob || !blob.size) {
          console.warn("ProtectMyPhoto PDF warning: exported image blob is empty.", blob);
          throw new Error("Image export failed before PDF creation.");
        }

        return blob.arrayBuffer();
      }).then(function (buffer) {
        var bytes = new Uint8Array(buffer);
        var scale = Math.min((pageWidth - 48) / image.naturalWidth, (pageHeight - 48) / image.naturalHeight, 1);
        var drawWidth = Math.round(image.naturalWidth * scale);
        var drawHeight = Math.round(image.naturalHeight * scale);
        return {
          bytes: bytes,
          width: image.naturalWidth,
          height: image.naturalHeight,
          pageWidth: pageWidth,
          pageHeight: pageHeight,
          drawWidth: drawWidth,
          drawHeight: drawHeight,
          x: Math.round((pageWidth - drawWidth) / 2),
          y: Math.round((pageHeight - drawHeight) / 2)
        };
      });
    });

    return Promise.all(tasks).then(buildPdf);
  }

  function createSampleImageBlob() {
    var canvas = makeCanvas(900, 600);
    var context = canvas.getContext("2d");
    var gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#126b55");
    gradient.addColorStop(1, "#e45d4f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "700 64px system-ui, sans-serif";
    context.fillText("ProtectMyPhoto", 70, 180);
    context.fillRect(70, 240, 460, 180);
    context.fillStyle = "#17201b";
    context.font = "500 34px system-ui, sans-serif";
    context.fillText("Sample image", 110, 340);
    return canvasToBlob(canvas, "image/jpeg", 0.9);
  }

  window.ProtectMyPhotoCore = {
    makeCanvas: makeCanvas,
    canvasToBlob: canvasToBlob,
    loadImageFromBlob: loadImageFromBlob,
    exportImage: exportImage,
    exportCanvasWithTarget: exportCanvasWithTarget,
    createPassportPhoto: createPassportPhoto,
    createPdfFromImages: createPdfFromImages,
    createSampleImageBlob: createSampleImageBlob
  };
}());
