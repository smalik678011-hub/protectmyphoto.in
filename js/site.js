(function () {
  "use strict";

  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.getElementById("siteNav");

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });
  }

  var searchInput = document.querySelector("[data-tool-search]");
  var filterButtons = Array.prototype.slice.call(document.querySelectorAll("[data-tool-filter]"));
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-tool-card]"));
  var emptyState = document.querySelector("[data-empty-tools]");
  var activeFilter = "all";

  function applyToolFilters() {
    var query = searchInput ? searchInput.value.trim().toLowerCase() : "";
    var visibleCount = 0;

    cards.forEach(function (card) {
      var categoryMatch = activeFilter === "all" || card.dataset.category === activeFilter;
      var haystack = (card.textContent + " " + (card.dataset.keywords || "")).toLowerCase();
      var queryMatch = !query || haystack.indexOf(query) !== -1;
      var isVisible = categoryMatch && queryMatch;

      card.hidden = !isVisible;
      if (isVisible) {
        visibleCount += 1;
      }
    });

    if (emptyState) {
      emptyState.hidden = visibleCount !== 0;
    }
  }

  if (searchInput && cards.length) {
    searchInput.addEventListener("input", applyToolFilters);
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.toolFilter;
      filterButtons.forEach(function (item) {
        item.classList.toggle("is-active", item === button);
      });
      applyToolFilters();
    });
  });

  var demoDrop = document.querySelector("[data-demo-drop]");
  var demoTitle = document.querySelector("[data-demo-title]");
  var demoSubtitle = document.querySelector("[data-demo-subtitle]");
  var demoMeter = document.querySelector("[data-demo-meter]");
  var demoSteps = Array.prototype.slice.call(document.querySelectorAll("[data-demo-steps] span"));
  var demoItems = [
    ["Select image", "Validate file safely", 18],
    ["Compress", "Reduce file size", 46],
    ["Preview", "Check output locally", 72],
    ["Download", "Save result", 100]
  ];
  var demoIndex = 0;

  function runDemo() {
    if (!demoDrop || !demoTitle || !demoSubtitle || !demoMeter) {
      return;
    }

    var item = demoItems[demoIndex % demoItems.length];
    demoTitle.textContent = item[0];
    demoSubtitle.textContent = item[1];
    demoMeter.style.width = item[2] + "%";
    demoDrop.classList.toggle("is-processing", demoIndex % 2 === 1);

    demoSteps.forEach(function (step, index) {
      step.classList.toggle("is-active", index === Math.min(demoIndex, demoSteps.length - 1));
    });

    demoIndex = (demoIndex + 1) % demoItems.length;
  }

  runDemo();
  if (demoDrop) {
    setInterval(runDemo, 1700);
  }

  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".hero, .section-band, .tool-card, .stamp-feature-strip, .content-split, .tool-workspace, .faq-section, .guide-section, .related-section, .comparison-section"));

  if ("IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    revealItems.forEach(function (item) {
      item.classList.add("reveal-item");
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) {
      return bytes + " B";
    }

    if (bytes < 1024 * 1024) {
      return Math.round(bytes / 1024) + " KB";
    }

    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function downloadBlob(blob, name) {
    var link = document.createElement("a");
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function handleHeroCompression(zone, file) {
    var status = zone.querySelector("[data-hero-compress-status]");
    var action = zone.querySelector("[data-hero-compress-button]");
    var core = window.ProtectMyPhotoCore;

    function setHeroStatus(message, type) {
      if (status) {
        status.textContent = message;
        status.dataset.state = type || "info";
      }
    }

    if (!file) {
      return;
    }

    if (!core) {
      window.location.href = "compress-image.html";
      return;
    }

    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setHeroStatus("Please choose a JPG, PNG, or WebP image.", "error");
      return;
    }

    if (file.size > 12 * 1024 * 1024) {
      setHeroStatus("This quick action supports images up to 12 MB.", "error");
      return;
    }

    if (action) {
      action.disabled = true;
    }
    zone.classList.add("is-processing");
    setHeroStatus("Compressing locally in your browser...", "info");

    core.loadImageFromBlob(file).then(function (image) {
      var maxWidth = 1600;
      var scale = Math.min(1, maxWidth / image.naturalWidth);
      return core.exportImage(image, {
        width: Math.round(image.naturalWidth * scale),
        height: Math.round(image.naturalHeight * scale),
        type: "image/jpeg",
        quality: 0.74,
        background: "#ffffff"
      });
    }).then(function (blob) {
      var baseName = file.name.replace(/\.[^.]+$/, "") || "image";
      downloadBlob(blob, baseName + "-compressed.jpg");
      setHeroStatus("Done: " + formatBytes(file.size) + " to " + formatBytes(blob.size) + ". Download started.", "success");
    }).catch(function () {
      setHeroStatus("This image could not be processed. Try the full compressor.", "error");
    }).finally(function () {
      zone.classList.remove("is-processing");
      if (action) {
        action.disabled = false;
      }
    });
  }

  Array.prototype.slice.call(document.querySelectorAll("[data-hero-compress]")).forEach(function (zone) {
    var input = zone.querySelector("[data-hero-compress-input]");
    var button = zone.querySelector("[data-hero-compress-button]");

    if (button && input) {
      button.addEventListener("click", function () {
        input.click();
      });
    }

    if (input) {
      input.addEventListener("change", function () {
        handleHeroCompression(zone, input.files && input.files[0]);
        input.value = "";
      });
    }

    ["dragenter", "dragover"].forEach(function (eventName) {
      zone.addEventListener(eventName, function (event) {
        event.preventDefault();
        zone.classList.add("is-dragging");
      });
    });

    ["dragleave", "drop"].forEach(function (eventName) {
      zone.addEventListener(eventName, function (event) {
        event.preventDefault();
        zone.classList.remove("is-dragging");
      });
    });

    zone.addEventListener("drop", function (event) {
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      handleHeroCompression(zone, file);
    });
  });
}());
