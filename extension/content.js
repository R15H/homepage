(function () {
  // Do not run inside iframes (belt-and-suspenders with all_frames:false)
  if (window !== window.top) return;

  var MINIMUM_DISPLAY_MS = 600;

  var tips = [
    "Tip: You can pin this extension for quick access.",
    "Tip: Right-click any image to reverse-search it.",
    "Tip: Press Ctrl+Shift+L to toggle the overlay.",
    "Did you know? Loading Tips works on every website automatically."
  ];

  var tip = tips[Math.floor(Math.random() * tips.length)];

  // At document_start, document.body is null but documentElement exists
  var overlay = document.createElement("div");
  overlay.id = "__loading-tips-overlay";
  overlay.innerHTML =
    '<div class="brand">Loading Tips</div>' +
    '<div class="tip-text">' + tip + "</div>";

  document.documentElement.appendChild(overlay);

  var insertedAt = Date.now();

  function removeOverlay() {
    var elapsed = Date.now() - insertedAt;
    var remaining = Math.max(0, MINIMUM_DISPLAY_MS - elapsed);

    setTimeout(function () {
      overlay.classList.add("fade-out");
      overlay.addEventListener("transitionend", function () {
        overlay.remove();
      });
      // Fallback removal if transitionend never fires
      setTimeout(function () {
        if (overlay.parentNode) overlay.remove();
      }, 500);
    }, remaining);
  }

  // Remove overlay when the page finishes loading
  window.addEventListener("load", removeOverlay, { once: true });

  // Safety timeout: remove after 8 seconds no matter what
  setTimeout(function () {
    if (overlay.parentNode) {
      overlay.classList.add("fade-out");
      setTimeout(function () {
        if (overlay.parentNode) overlay.remove();
      }, 400);
    }
  }, 8000);
})();
