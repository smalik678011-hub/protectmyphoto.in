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
}());
