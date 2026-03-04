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

  var isIframe = window !== window.top;

  // In iframes, don't show optimistically — wait for settings
  if (isIframe) {
    chrome.storage.sync.get(DEFAULTS, function (s) {
      if (s.enabled && s.showInIframes && !isDomainExcluded(s.excludedDomains)) {
        runOverlay(s);
      }
    });
    return;
  }

  // Main frame: create overlay immediately with defaults, adjust async
  var overlay = createOverlayElement(DEFAULTS);
  document.documentElement.appendChild(overlay);
  var insertedAt = Date.now();
  var settings = DEFAULTS;
  var slowLoadTimer = null;

  // Safety timeout with default value immediately
  var safetyTimer = setTimeout(function () {
    forceRemove(overlay);
  }, DEFAULTS.safetyTimeoutMs);

  // Slow load suggestion timer with default
  if (DEFAULTS.slowLoadThresholdMs > 0) {
    slowLoadTimer = setTimeout(function () {
      showSlowLoadSuggestion(overlay);
    }, DEFAULTS.slowLoadThresholdMs);
  }

  // Load real settings and adjust
  chrome.storage.sync.get(DEFAULTS, function (s) {
    settings = s;

    // If disabled or domain excluded, remove immediately (no fade)
    if (!s.enabled || isDomainExcluded(s.excludedDomains)) {
      clearTimeout(safetyTimer);
      clearTimeout(slowLoadTimer);
      overlay.remove();
      return;
    }

    // Apply user's background color
    overlay.style.background = s.bgColor;

    // Swap tip text with user's tip set
    var tipEl = overlay.querySelector(".tip-text");
    if (tipEl && s.tips && s.tips.length > 0) {
      tipEl.textContent = s.tips[Math.floor(Math.random() * s.tips.length)];
    }

    // Reset safety timeout with user's value
    clearTimeout(safetyTimer);
    var elapsed = Date.now() - insertedAt;
    var remaining = Math.max(0, s.safetyTimeoutMs - elapsed);
    safetyTimer = setTimeout(function () {
      forceRemove(overlay);
    }, remaining);

    // Reset slow load timer with user's value
    clearTimeout(slowLoadTimer);
    if (s.slowLoadThresholdMs > 0) {
      var slowRemaining = Math.max(0, s.slowLoadThresholdMs - elapsed);
      slowLoadTimer = setTimeout(function () {
        showSlowLoadSuggestion(overlay);
      }, slowRemaining);
    }
  });

  // Remove on page load
  window.addEventListener("load", function () {
    clearTimeout(slowLoadTimer);
    var elapsed = Date.now() - insertedAt;
    var remaining = Math.max(0, settings.minDisplayMs - elapsed);
    setTimeout(function () {
      fadeOut(overlay);
    }, remaining);
  }, { once: true });

  // --- Helpers ---

  function showSlowLoadSuggestion(el) {
    if (!el.parentNode) return;
    var host = location.hostname;
    var banner = document.createElement("div");
    banner.className = "__lt-slow-banner";
    banner.innerHTML =
      '<span>This page is taking a while to load.</span>' +
      '<button class="__lt-disable-btn">Disable on ' + escapeHtml(host) + '</button>' +
      '<button class="__lt-dismiss-btn">Dismiss</button>';

    el.appendChild(banner);

    banner.querySelector(".__lt-disable-btn").addEventListener("click", function () {
      chrome.storage.sync.get(DEFAULTS, function (s) {
        var list = s.excludedDomains || [];
        if (list.indexOf(host.toLowerCase()) === -1) {
          list.push(host.toLowerCase());
        }
        chrome.storage.sync.set({ excludedDomains: list }, function () {
          // Remove overlay immediately after excluding
          clearTimeout(safetyTimer);
          el.remove();
        });
      });
    });

    banner.querySelector(".__lt-dismiss-btn").addEventListener("click", function () {
      banner.remove();
    });
  }

  function runOverlay(s) {
    var el = createOverlayElement(s);
    document.documentElement.appendChild(el);
    var start = Date.now();
    var iframeSlowTimer = null;

    if (s.slowLoadThresholdMs > 0) {
      iframeSlowTimer = setTimeout(function () {
        showSlowLoadSuggestion(el);
      }, s.slowLoadThresholdMs);
    }

    window.addEventListener("load", function () {
      clearTimeout(iframeSlowTimer);
      var elapsed = Date.now() - start;
      var remaining = Math.max(0, s.minDisplayMs - elapsed);
      setTimeout(function () { fadeOut(el); }, remaining);
    }, { once: true });

    setTimeout(function () { forceRemove(el); }, s.safetyTimeoutMs);
  }

  function createOverlayElement(s) {
    var el = document.createElement("div");
    el.id = "__loading-tips-overlay";
    var tip = s.tips[Math.floor(Math.random() * s.tips.length)];
    el.innerHTML =
      '<div class="brand">Loading Tips</div>' +
      '<div class="tip-text">' + escapeHtml(tip) + "</div>";
    el.style.background = s.bgColor;
    return el;
  }

  function isDomainExcluded(list) {
    var host = location.hostname.toLowerCase();
    return list.some(function (d) {
      return host === d || host.endsWith("." + d);
    });
  }

  function fadeOut(el) {
    if (!el.parentNode) return;
    el.classList.add("fade-out");
    el.addEventListener("transitionend", function () { el.remove(); });
    setTimeout(function () { if (el.parentNode) el.remove(); }, 500);
  }

  function forceRemove(el) {
    if (!el.parentNode) return;
    el.classList.add("fade-out");
    setTimeout(function () { if (el.parentNode) el.remove(); }, 400);
  }

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }
})();
