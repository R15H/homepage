(function () {
  var DEFAULTS = {
    enabled: true,
    showInIframes: false,
    minDisplayMs: 600,
    safetyTimeoutMs: 8000,
    slowLoadThresholdMs: 5000,
    bgColor: "#0d1117",
    excludedDomains: [],
    tips: [
      "Tip: You can pin this extension for quick access.",
      "Tip: Right-click any image to reverse-search it.",
      "Tip: Press Ctrl+Shift+L to toggle the overlay.",
      "Did you know? Loading Tips works on every website automatically."
    ]
  };

  // Current in-memory domain list (kept in sync with the UI)
  var currentDomains = [];

  var els = {
    enabled: document.getElementById("enabled"),
    showInIframes: document.getElementById("showInIframes"),
    minDisplayMs: document.getElementById("minDisplayMs"),
    minDisplayMsVal: document.getElementById("minDisplayMsValue"),
    safetyTimeoutMs: document.getElementById("safetyTimeoutMs"),
    slowLoadThresholdMs: document.getElementById("slowLoadThresholdMs"),
    slowLoadThresholdMsVal: document.getElementById("slowLoadThresholdMsValue"),
    bgColor: document.getElementById("bgColor"),
    domainInput: document.getElementById("excludedDomainInput"),
    addDomain: document.getElementById("addDomain"),
    domainList: document.getElementById("excludedDomainList"),
    noDomains: document.getElementById("noDomains"),
    tips: document.getElementById("tips"),
    save: document.getElementById("save"),
    reset: document.getElementById("resetDefaults"),
    status: document.getElementById("status")
  };

  // --- Domain list management ---

  function renderDomainList(domains) {
    currentDomains = domains;
    els.domainList.innerHTML = "";
    els.noDomains.style.display = domains.length === 0 ? "block" : "none";

    domains.forEach(function (domain, index) {
      var item = document.createElement("div");
      item.className = "domain-item";

      var label = document.createElement("span");
      label.textContent = domain;

      var removeBtn = document.createElement("button");
      removeBtn.className = "domain-remove";
      removeBtn.textContent = "\u00d7";
      removeBtn.title = "Re-enable " + domain;
      removeBtn.addEventListener("click", function () {
        removeDomain(index);
      });

      item.appendChild(label);
      item.appendChild(removeBtn);
      els.domainList.appendChild(item);
    });
  }

  function addDomain(domain) {
    domain = domain.trim().toLowerCase();
    if (!domain) return;
    if (currentDomains.indexOf(domain) !== -1) return;
    currentDomains.push(domain);
    renderDomainList(currentDomains);
  }

  function removeDomain(index) {
    currentDomains.splice(index, 1);
    renderDomainList(currentDomains);
  }

  // --- Populate / Gather ---

  function populateUI(settings) {
    els.enabled.checked = settings.enabled;
    els.showInIframes.checked = settings.showInIframes;
    els.minDisplayMs.value = settings.minDisplayMs;
    els.minDisplayMsVal.textContent = settings.minDisplayMs + " ms";
    els.safetyTimeoutMs.value = settings.safetyTimeoutMs;
    els.slowLoadThresholdMs.value = settings.slowLoadThresholdMs;
    els.slowLoadThresholdMsVal.textContent = settings.slowLoadThresholdMs === 0 ? "Off" : settings.slowLoadThresholdMs + " ms";
    els.bgColor.value = settings.bgColor;
    renderDomainList(settings.excludedDomains);
    els.tips.value = settings.tips.join("\n");
  }

  function gatherSettings() {
    return {
      enabled: els.enabled.checked,
      showInIframes: els.showInIframes.checked,
      minDisplayMs: parseInt(els.minDisplayMs.value, 10),
      safetyTimeoutMs: parseInt(els.safetyTimeoutMs.value, 10),
      slowLoadThresholdMs: parseInt(els.slowLoadThresholdMs.value, 10),
      bgColor: els.bgColor.value,
      excludedDomains: currentDomains.slice(),
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

  // --- Init ---

  chrome.storage.sync.get(DEFAULTS, function (items) {
    populateUI(items);
  });

  // Listen for external storage changes (e.g. domain added via slow-load banner)
  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.excludedDomains) {
      renderDomainList(changes.excludedDomains.newValue || []);
    }
  });

  // --- Event listeners ---

  // Add domain button
  els.addDomain.addEventListener("click", function () {
    addDomain(els.domainInput.value);
    els.domainInput.value = "";
    els.domainInput.focus();
  });

  // Enter key in domain input
  els.domainInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain(els.domainInput.value);
      els.domainInput.value = "";
    }
  });

  // Slider live updates
  els.minDisplayMs.addEventListener("input", function () {
    els.minDisplayMsVal.textContent = this.value + " ms";
  });

  els.slowLoadThresholdMs.addEventListener("input", function () {
    var val = parseInt(this.value, 10);
    els.slowLoadThresholdMsVal.textContent = val === 0 ? "Off" : val + " ms";
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
