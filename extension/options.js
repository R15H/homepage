(function () {
  var registry = window.__ltScreens;

  var DEFAULTS = {
    enabled: true,
    showInIframes: false,
    minDisplayMs: 0,
    safetyTimeoutMs: 8000,
    slowLoadThresholdMs: 5000,
    bgColor: "#0d1117",
    excludedDomains: [],
    enabledScreens: ["quotes"],
    rotationMode: "random",
    screenConfig: {}
  };

  var currentDomains = [];
  var currentEnabledScreens = [];
  var currentScreenConfig = {};

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
    screenGallery: document.getElementById("screenGallery"),
    screenConfigContainer: document.getElementById("screenConfigContainer"),
    rotationMode: document.getElementById("rotationMode"),
    save: document.getElementById("save"),
    reset: document.getElementById("resetDefaults"),
    status: document.getElementById("status")
  };

  // ── Screen Gallery ──

  function renderScreenGallery() {
    els.screenGallery.innerHTML = "";
    var allScreens = registry.getAll();

    allScreens.forEach(function (screen) {
      var id = screen.manifest.id;
      var isActive = currentEnabledScreens.indexOf(id) !== -1;

      var card = document.createElement("div");
      card.className = "screen-card" + (isActive ? " active" : "");
      card.innerHTML =
        '<span class="screen-check">&#10003;</span>' +
        '<div class="screen-name">' + escapeHtml(screen.manifest.name) + "</div>" +
        '<div class="screen-desc">' + escapeHtml(screen.manifest.description) + "</div>";

      card.addEventListener("click", function () {
        toggleScreen(id);
      });

      els.screenGallery.appendChild(card);
    });
  }

  function toggleScreen(id) {
    var idx = currentEnabledScreens.indexOf(id);
    if (idx !== -1) {
      // Don't allow disabling the last screen
      if (currentEnabledScreens.length <= 1) return;
      currentEnabledScreens.splice(idx, 1);
    } else {
      currentEnabledScreens.push(id);
    }
    renderScreenGallery();
    renderScreenConfigs();
  }

  // ── Per-Screen Config ──

  function renderScreenConfigs() {
    els.screenConfigContainer.innerHTML = "";

    currentEnabledScreens.forEach(function (screenId) {
      var screen = registry.get(screenId);
      if (!screen) return;
      var schema = screen.manifest.configSchema || [];
      if (schema.length === 0) return;

      var section = document.createElement("section");
      section.className = "screen-config-section";
      section.innerHTML = '<div class="config-title">' + escapeHtml(screen.manifest.name) + ' Settings</div>';

      var config = currentScreenConfig[screenId] || {};

      schema.forEach(function (field) {
        var value = config[field.key] !== undefined ? config[field.key] : field.default;
        var fieldEl = createConfigField(screenId, field, value);
        section.appendChild(fieldEl);
      });

      // Add pomodoro session controls if this is the pomodoro screen
      if (screenId === "pomodoro") {
        var controls = document.createElement("div");
        controls.className = "pomo-controls";

        var startBtn = document.createElement("button");
        startBtn.className = "btn-primary";
        startBtn.textContent = "Start Session";
        startBtn.addEventListener("click", function () {
          chrome.storage.local.set({
            pomodoroState: {
              phase: "work",
              phaseStartedAt: Date.now(),
              sessionCount: 0
            }
          }, function () {
            showStatus("Pomodoro session started.");
          });
        });

        var resetBtn = document.createElement("button");
        resetBtn.className = "btn-secondary";
        resetBtn.textContent = "Reset Timer";
        resetBtn.addEventListener("click", function () {
          chrome.storage.local.remove("pomodoroState", function () {
            showStatus("Pomodoro timer reset.");
          });
        });

        controls.appendChild(startBtn);
        controls.appendChild(resetBtn);
        section.appendChild(controls);
      }

      els.screenConfigContainer.appendChild(section);
    });
  }

  function createConfigField(screenId, field, value) {
    var wrapper = document.createElement("div");
    wrapper.className = "config-field";

    if (field.type === "boolean") {
      var row = document.createElement("div");
      row.className = "config-toggle-row";

      var label = document.createElement("label");
      label.textContent = field.label;

      var input = document.createElement("input");
      input.type = "checkbox";
      input.checked = !!value;
      input.addEventListener("change", function () {
        setScreenConfigValue(screenId, field.key, input.checked);
      });

      row.appendChild(label);
      row.appendChild(input);
      wrapper.appendChild(row);
    } else if (field.type === "stringArray") {
      var label2 = document.createElement("label");
      label2.textContent = field.label;
      wrapper.appendChild(label2);

      if (field.description) {
        var desc = document.createElement("div");
        desc.className = "config-desc";
        desc.textContent = field.description;
        wrapper.appendChild(desc);
      }

      var textarea = document.createElement("textarea");
      textarea.rows = 6;
      textarea.value = Array.isArray(value) ? value.join("\n") : "";
      textarea.addEventListener("input", function () {
        setScreenConfigValue(screenId, field.key,
          textarea.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
        );
      });
      wrapper.appendChild(textarea);
    } else {
      // date, number, text
      var label3 = document.createElement("label");
      label3.textContent = field.label;
      wrapper.appendChild(label3);

      if (field.description) {
        var desc2 = document.createElement("div");
        desc2.className = "config-desc";
        desc2.textContent = field.description;
        wrapper.appendChild(desc2);
      }

      var input2 = document.createElement("input");
      input2.type = field.type === "number" ? "number" : field.type === "date" ? "date" : "text";
      input2.value = value !== undefined && value !== null ? value : "";
      input2.addEventListener("input", function () {
        var val = input2.value;
        if (field.type === "number") val = parseFloat(val);
        setScreenConfigValue(screenId, field.key, val);
      });
      wrapper.appendChild(input2);
    }

    return wrapper;
  }

  function setScreenConfigValue(screenId, key, value) {
    if (!currentScreenConfig[screenId]) {
      currentScreenConfig[screenId] = {};
    }
    currentScreenConfig[screenId][key] = value;
  }

  // ── Domain List ──

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
        currentDomains.splice(index, 1);
        renderDomainList(currentDomains);
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

  // ── Populate / Gather ──

  function populateUI(settings) {
    els.enabled.checked = settings.enabled;
    els.showInIframes.checked = settings.showInIframes;
    els.minDisplayMs.value = settings.minDisplayMs;
    els.minDisplayMsVal.textContent = settings.minDisplayMs + " ms";
    els.safetyTimeoutMs.value = settings.safetyTimeoutMs;
    els.slowLoadThresholdMs.value = settings.slowLoadThresholdMs;
    els.slowLoadThresholdMsVal.textContent = settings.slowLoadThresholdMs === 0 ? "Off" : settings.slowLoadThresholdMs + " ms";
    els.bgColor.value = settings.bgColor;
    els.rotationMode.value = settings.rotationMode || "random";
    renderDomainList(settings.excludedDomains);

    currentEnabledScreens = (settings.enabledScreens || ["quotes"]).slice();
    currentScreenConfig = JSON.parse(JSON.stringify(settings.screenConfig || {}));

    // Ensure each enabled screen has its defaults filled in
    currentEnabledScreens.forEach(function (id) {
      var screen = registry.get(id);
      if (!screen) return;
      var defaults = registry.getDefaultConfig(screen);
      if (!currentScreenConfig[id]) currentScreenConfig[id] = {};
      for (var k in defaults) {
        if (currentScreenConfig[id][k] === undefined) {
          currentScreenConfig[id][k] = defaults[k];
        }
      }
    });

    renderScreenGallery();
    renderScreenConfigs();
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
      enabledScreens: currentEnabledScreens.slice(),
      rotationMode: els.rotationMode.value,
      screenConfig: JSON.parse(JSON.stringify(currentScreenConfig))
    };
  }

  function showStatus(msg) {
    els.status.textContent = msg;
    els.status.classList.add("visible");
    setTimeout(function () {
      els.status.classList.remove("visible");
    }, 2000);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ── Init ──

  chrome.storage.sync.get(DEFAULTS, function (items) {
    populateUI(items);
  });

  chrome.storage.onChanged.addListener(function (changes) {
    if (changes.excludedDomains) {
      renderDomainList(changes.excludedDomains.newValue || []);
    }
  });

  // ── Event Listeners ──

  els.addDomain.addEventListener("click", function () {
    addDomain(els.domainInput.value);
    els.domainInput.value = "";
    els.domainInput.focus();
  });

  els.domainInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      addDomain(els.domainInput.value);
      els.domainInput.value = "";
    }
  });

  els.minDisplayMs.addEventListener("input", function () {
    els.minDisplayMsVal.textContent = this.value + " ms";
  });

  els.slowLoadThresholdMs.addEventListener("input", function () {
    var val = parseInt(this.value, 10);
    els.slowLoadThresholdMsVal.textContent = val === 0 ? "Off" : val + " ms";
  });

  document.querySelectorAll(".preset-swatch").forEach(function (btn) {
    btn.style.background = btn.dataset.color;
    btn.addEventListener("click", function () {
      els.bgColor.value = btn.dataset.color;
    });
  });

  els.save.addEventListener("click", function () {
    chrome.storage.sync.set(gatherSettings(), function () {
      showStatus("Settings saved.");
    });
  });

  els.reset.addEventListener("click", function () {
    currentEnabledScreens = DEFAULTS.enabledScreens.slice();
    currentScreenConfig = {};
    populateUI(DEFAULTS);
    chrome.storage.sync.set(gatherSettings(), function () {
      showStatus("Reset to defaults.");
    });
  });
})();
