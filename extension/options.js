(function () {
  var DEFAULTS = {
    enabled: true,
    showInIframes: false,
    minDisplayMs: 600,
    safetyTimeoutMs: 8000,
    bgColor: "#0d1117",
    excludedDomains: [],
    tips: [
      "Tip: You can pin this extension for quick access.",
      "Tip: Right-click any image to reverse-search it.",
      "Tip: Press Ctrl+Shift+L to toggle the overlay.",
      "Did you know? Loading Tips works on every website automatically."
    ]
  };

  var els = {
    enabled: document.getElementById("enabled"),
    showInIframes: document.getElementById("showInIframes"),
    minDisplayMs: document.getElementById("minDisplayMs"),
    minDisplayMsVal: document.getElementById("minDisplayMsValue"),
    safetyTimeoutMs: document.getElementById("safetyTimeoutMs"),
    bgColor: document.getElementById("bgColor"),
    excludedDomains: document.getElementById("excludedDomains"),
    tips: document.getElementById("tips"),
    save: document.getElementById("save"),
    reset: document.getElementById("resetDefaults"),
    status: document.getElementById("status")
  };

  function populateUI(settings) {
    els.enabled.checked = settings.enabled;
    els.showInIframes.checked = settings.showInIframes;
    els.minDisplayMs.value = settings.minDisplayMs;
    els.minDisplayMsVal.textContent = settings.minDisplayMs + " ms";
    els.safetyTimeoutMs.value = settings.safetyTimeoutMs;
    els.bgColor.value = settings.bgColor;
    els.excludedDomains.value = settings.excludedDomains.join("\n");
    els.tips.value = settings.tips.join("\n");
  }

  function gatherSettings() {
    return {
      enabled: els.enabled.checked,
      showInIframes: els.showInIframes.checked,
      minDisplayMs: parseInt(els.minDisplayMs.value, 10),
      safetyTimeoutMs: parseInt(els.safetyTimeoutMs.value, 10),
      bgColor: els.bgColor.value,
      excludedDomains: els.excludedDomains.value
        .split("\n")
        .map(function (s) { return s.trim().toLowerCase(); })
        .filter(Boolean),
      tips: els.tips.value
        .split("\n")
        .map(function (s) { return s.trim(); })
        .filter(Boolean)
    };
  }

  function showStatus(msg) {
    els.status.textContent = msg;
    els.status.classList.add("visible");
    setTimeout(function () {
      els.status.classList.remove("visible");
    }, 2000);
  }

  // Load settings on open
  chrome.storage.sync.get(DEFAULTS, function (items) {
    populateUI(items);
  });

  // Slider live update
  els.minDisplayMs.addEventListener("input", function () {
    els.minDisplayMsVal.textContent = this.value + " ms";
  });

  // Preset color swatches
  document.querySelectorAll(".preset-swatch").forEach(function (btn) {
    btn.style.background = btn.dataset.color;
    btn.addEventListener("click", function () {
      els.bgColor.value = btn.dataset.color;
    });
  });

  // Save
  els.save.addEventListener("click", function () {
    chrome.storage.sync.set(gatherSettings(), function () {
      showStatus("Settings saved.");
    });
  });

  // Reset to defaults
  els.reset.addEventListener("click", function () {
    populateUI(DEFAULTS);
    chrome.storage.sync.set(DEFAULTS, function () {
      showStatus("Reset to defaults.");
    });
  });
})();
