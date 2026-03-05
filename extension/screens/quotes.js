/**
 * Quotes Screen — displays a random quote/tip.
 * Static screen, no hydration needed.
 */
(function () {
  var DEFAULT_TIPS = [
    "Tip: You can pin this extension for quick access.",
    "Tip: Right-click any image to reverse-search it.",
    "Tip: Press Ctrl+Shift+L to toggle the overlay.",
    "Did you know? Loading Tips works on every website automatically."
  ];

  function escapeHtml(str) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  window.__ltScreens.register({
    manifest: {
      id: "quotes",
      name: "Quotes",
      description: "Shows a random quote or tip each time a page loads.",
      author: "Loading Tips",
      version: "1.0.0",
      configSchema: [
        {
          key: "tips",
          type: "stringArray",
          label: "Quotes / Tips",
          description: "One per line. A random one is shown each page load.",
          default: DEFAULT_TIPS
        }
      ]
    },

    style: [
      ".__lt-quote {",
      "  max-width: 480px;",
      "  text-align: center;",
      "  line-height: 1.6;",
      "  color: #8b949e;",
      "  font-size: 16px;",
      "}"
    ].join("\n"),

    render: function (config, context) {
      var tips = (config.tips && config.tips.length > 0) ? config.tips : DEFAULT_TIPS;
      var tip = tips[Math.floor(Math.random() * tips.length)];
      return '<div class="__lt-quote">' + escapeHtml(tip) + "</div>";
    }
  });
})();
