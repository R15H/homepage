/**
 * Loading Tips — Content Script
 *
 * Rendering pipeline:
 * 1. SYNC: Pick default screen, render HTML, inject into DOM → FIRST PAINT
 * 2. ASYNC: Load settings from storage → re-render if needed → hydrate
 * 3. window.load → fade out overlay
 */
(function () {
  var registry = window.__ltScreens;
  if (!registry) return;

  var DEFAULTS = {
    enabled: true,
    showInIframes: false,
    minDisplayMs: 600,
    safetyTimeoutMs: 8000,
    slowLoadThresholdMs: 5000,
    bgColor: "#0d1117",
    excludedDomains: [],
    enabledScreens: ["quotes"],
    rotationMode: "random",
    screenConfig: {}
  };

  var isIframe = window !== window.top;

  // In iframes, don't show optimistically — wait for settings
  if (isIframe) {
    chrome.storage.sync.get(DEFAULTS, function (s) {
      if (s.enabled && s.showInIframes && !isDomainExcluded(s.excludedDomains)) {
        var picked = registry.pick(s.enabledScreens, s.rotationMode, 0);
        if (picked.screen) {
          runOverlay(s, picked.screen);
        }
      }
    });
    return;
  }

  // ══════ PHASE 1: SYNC — Instant Paint ══════

  // Pick default screen (quotes is always first registered)
  var defaultScreen = registry.get("quotes") || registry.getAll()[0];
  if (!defaultScreen) return;

  var context = registry.buildContext();
  var defaultConfig = registry.getDefaultConfig(defaultScreen);

  var overlay = createOverlayElement(defaultScreen, defaultConfig, context, DEFAULTS.bgColor);
  document.documentElement.appendChild(overlay);
  // ══════ FIRST PAINT ══════

  var insertedAt = Date.now();
  var settings = DEFAULTS;
  var activeScreen = defaultScreen;
  var hydrateCleanup = null;
  var slowLoadTimer = null;

  // Safety timeout with default value
  var safetyTimer = setTimeout(function () {
    forceRemove(overlay);
  }, DEFAULTS.safetyTimeoutMs);

  // Slow load suggestion timer
  if (DEFAULTS.slowLoadThresholdMs > 0) {
    slowLoadTimer = setTimeout(function () {
      showSlowLoadSuggestion(overlay);
    }, DEFAULTS.slowLoadThresholdMs);
  }

  // ══════ PHASE 2: ASYNC — Load settings, re-render, hydrate ══════

  // Fetch sync settings + local state in parallel
  var syncSettings = null;
  var localState = null;
  var pending = 2;

  chrome.storage.sync.get(DEFAULTS, function (s) {
    syncSettings = s;
    pending--;
    if (pending === 0) onSettingsReady();
  });

  // Collect localStorageKeys from all screens
  var localKeys = {};
  registry.getAll().forEach(function (scr) {
    if (scr.localStorageKeys) {
      scr.localStorageKeys.forEach(function (k) { localKeys[k] = true; });
    }
  });
  var localKeyList = Object.keys(localKeys);

  if (localKeyList.length > 0) {
    chrome.storage.local.get(localKeyList, function (ls) {
      localState = ls;
      pending--;
      if (pending === 0) onSettingsReady();
    });
  } else {
    localState = {};
    pending--;
    if (pending === 0) onSettingsReady();
  }

  function onSettingsReady() {
    var s = syncSettings;
    settings = s;

    // If disabled or domain excluded, remove immediately
    if (!s.enabled || isDomainExcluded(s.excludedDomains)) {
      clearTimeout(safetyTimer);
      clearTimeout(slowLoadTimer);
      overlay.remove();
      return;
    }

    // Pick screen with rotation
    var counter = (localState && localState.__ltRotationCounter) || 0;
    var picked = registry.pick(s.enabledScreens, s.rotationMode, counter);
    if (!picked.screen) {
      clearTimeout(safetyTimer);
      overlay.remove();
      return;
    }

    // Save rotation counter for sequential mode
    if (s.rotationMode === "sequential" && picked.nextCounter !== counter) {
      chrome.storage.local.set({ __ltRotationCounter: picked.nextCounter });
    }

    activeScreen = picked.screen;
    var screenId = activeScreen.manifest.id;
    var userConfig = mergeConfig(activeScreen, s.screenConfig[screenId] || {});
    var ctx = registry.buildContext();

    // Apply background color
    overlay.style.background = s.bgColor;

    // Re-render with real screen + config
    var screenContent = overlay.querySelector(".__lt-screen-content");
    if (screenContent) {
      injectScreenStyle(activeScreen);
      screenContent.innerHTML = activeScreen.render(userConfig, ctx, localState);
    }

    // Hydrate (start live behavior)
    if (activeScreen.hydrate && screenContent) {
      hydrateCleanup = activeScreen.hydrate(screenContent, userConfig, ctx, localState);
    }

    // Reset safety timeout with user's value
    clearTimeout(safetyTimer);
    var elapsed = Date.now() - insertedAt;
    var remaining = Math.max(0, s.safetyTimeoutMs - elapsed);
    safetyTimer = setTimeout(function () {
      forceRemove(overlay);
    }, remaining);

    // Reset slow load timer
    clearTimeout(slowLoadTimer);
    if (s.slowLoadThresholdMs > 0) {
      var slowRemaining = Math.max(0, s.slowLoadThresholdMs - elapsed);
      slowLoadTimer = setTimeout(function () {
        showSlowLoadSuggestion(overlay);
      }, slowRemaining);
    }
  }

  // ══════ PHASE 3: Page load → fade out ══════

  window.addEventListener("load", function () {
    clearTimeout(slowLoadTimer);
    var elapsed = Date.now() - insertedAt;
    var remaining = Math.max(0, settings.minDisplayMs - elapsed);
    setTimeout(function () {
      if (typeof hydrateCleanup === "function") hydrateCleanup();
      fadeOut(overlay);
    }, remaining);
  }, { once: true });

  // ══════ Helpers ══════

  function createOverlayElement(screen, config, ctx, bgColor) {
    var el = document.createElement("div");
    el.id = "__loading-tips-overlay";
    el.style.background = bgColor;

    // Inject screen style
    injectScreenStyle(screen);

    // Brand header + screen content area
    var html = screen.render(config, ctx, {});
    el.innerHTML =
      '<div class="brand">Loading Tips</div>' +
      '<div class="__lt-screen-content">' + html + "</div>";

    return el;
  }

  var injectedStyles = {};
  function injectScreenStyle(screen) {
    var id = screen.manifest.id;
    if (injectedStyles[id]) return;
    if (!screen.style) return;
    var styleEl = document.createElement("style");
    styleEl.textContent = screen.style;
    styleEl.setAttribute("data-lt-screen", id);
    document.documentElement.appendChild(styleEl);
    injectedStyles[id] = true;
  }

  function mergeConfig(screen, userConfig) {
    var defaults = registry.getDefaultConfig(screen);
    var merged = {};
    for (var k in defaults) {
      merged[k] = defaults[k];
    }
    for (var k2 in userConfig) {
      merged[k2] = userConfig[k2];
    }
    return merged;
  }

  function runOverlay(s, screen) {
    var ctx = registry.buildContext();
    var screenId = screen.manifest.id;
    var config = mergeConfig(screen, (s.screenConfig && s.screenConfig[screenId]) || {});

    var el = document.createElement("div");
    el.id = "__loading-tips-overlay";
    el.style.background = s.bgColor;
    injectScreenStyle(screen);

    el.innerHTML =
      '<div class="brand">Loading Tips</div>' +
      '<div class="__lt-screen-content">' + screen.render(config, ctx, {}) + "</div>";

    document.documentElement.appendChild(el);
    var start = Date.now();
    var iframeSlowTimer = null;
    var cleanup = null;

    // Hydrate
    var contentEl = el.querySelector(".__lt-screen-content");
    if (screen.hydrate && contentEl) {
      cleanup = screen.hydrate(contentEl, config, ctx, {});
    }

    if (s.slowLoadThresholdMs > 0) {
      iframeSlowTimer = setTimeout(function () {
        showSlowLoadSuggestion(el);
      }, s.slowLoadThresholdMs);
    }

    window.addEventListener("load", function () {
      clearTimeout(iframeSlowTimer);
      var elapsed = Date.now() - start;
      var remaining = Math.max(0, s.minDisplayMs - elapsed);
      setTimeout(function () {
        if (typeof cleanup === "function") cleanup();
        fadeOut(el);
      }, remaining);
    }, { once: true });

    setTimeout(function () {
      if (typeof cleanup === "function") cleanup();
      forceRemove(el);
    }, s.safetyTimeoutMs);
  }

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
          clearTimeout(safetyTimer);
          if (typeof hydrateCleanup === "function") hydrateCleanup();
          el.remove();
        });
      });
    });

    banner.querySelector(".__lt-dismiss-btn").addEventListener("click", function () {
      banner.remove();
    });
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
