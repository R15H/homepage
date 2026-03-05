/**
 * Age Clock Screen — shows your exact age counting up in real time.
 * render() produces a static snapshot; hydrate() starts the live tick.
 */
(function () {
  function computeAge(birthTimestamp, now) {
    var diff = now - birthTimestamp;
    if (diff < 0) diff = 0;

    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    var years = Math.floor(days / 365.2425);

    return {
      years: years,
      days: days % 365,
      hours: hours % 24,
      minutes: minutes % 60,
      seconds: seconds % 60
    };
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function formatAge(age, showSeconds) {
    var parts = age.years + "y " + age.days + "d " +
      pad(age.hours) + "h " + pad(age.minutes) + "m";
    if (showSeconds) {
      parts += " " + pad(age.seconds) + "s";
    }
    return parts;
  }

  window.__ltScreens.register({
    manifest: {
      id: "age-clock",
      name: "Age Clock",
      description: "Shows your exact age counting up in real time.",
      author: "Loading Tips",
      version: "1.0.0",
      configSchema: [
        {
          key: "birthDate",
          type: "date",
          label: "Your birth date",
          required: true
        },
        {
          key: "showSeconds",
          type: "boolean",
          label: "Show seconds",
          default: true
        }
      ]
    },

    style: [
      ".__lt-age-clock {",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "}",
      ".__lt-age-value {",
      "  font-size: 48px;",
      "  font-weight: 200;",
      "  color: #58a6ff;",
      "  font-variant-numeric: tabular-nums;",
      "  letter-spacing: 0.02em;",
      "}",
      ".__lt-age-label {",
      "  color: #8b949e;",
      "  font-size: 14px;",
      "  margin-top: 8px;",
      "}",
      ".__lt-age-setup {",
      "  color: #8b949e;",
      "  font-size: 16px;",
      "}"
    ].join("\n"),

    render: function (config, context) {
      if (!config.birthDate) {
        return '<div class="__lt-age-clock">' +
          '<div class="__lt-age-setup">Set your birth date in extension settings</div>' +
          "</div>";
      }
      var birthTs = new Date(config.birthDate).getTime();
      var age = computeAge(birthTs, context.now);
      var showSec = config.showSeconds !== false;
      return '<div class="__lt-age-clock">' +
        '<div class="__lt-age-value">' + formatAge(age, showSec) + "</div>" +
        '<div class="__lt-age-label">You have been alive for</div>' +
        "</div>";
    },

    hydrate: function (element, config, context) {
      if (!config.birthDate) return;
      var display = element.querySelector(".__lt-age-value");
      if (!display) return;

      var birthTs = new Date(config.birthDate).getTime();
      var showSec = config.showSeconds !== false;
      var raf;

      function tick() {
        var age = computeAge(birthTs, Date.now());
        display.textContent = formatAge(age, showSec);
        raf = requestAnimationFrame(tick);
      }
      tick();

      // Return cleanup function
      return function () {
        cancelAnimationFrame(raf);
      };
    }
  });
})();
