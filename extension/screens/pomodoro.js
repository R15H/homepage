/**
 * Pomodoro Screen — focus/break timer that persists across page loads.
 *
 * State is stored in chrome.storage.local:
 *   pomodoroState: { phase, phaseStartedAt, sessionCount }
 *
 * render() shows a static snapshot (placeholder until state loads).
 * hydrate() starts the live countdown and handles phase transitions.
 */
(function () {
  var STORAGE_KEY = "pomodoroState";

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function formatCountdown(totalSeconds) {
    if (totalSeconds < 0) totalSeconds = 0;
    var m = Math.floor(totalSeconds / 60);
    var s = totalSeconds % 60;
    return pad(m) + ":" + pad(s);
  }

  function computeRemaining(state, config, now) {
    if (!state || !state.phaseStartedAt) return null;
    var durationMs = (state.phase === "work"
      ? (config.workMinutes || 25)
      : (config.breakMinutes || 5)) * 60 * 1000;
    var elapsed = now - state.phaseStartedAt;
    var remainingMs = durationMs - elapsed;
    return Math.ceil(remainingMs / 1000);
  }

  function renderContent(state, config, now) {
    if (!state || !state.phaseStartedAt) {
      return '<div class="__lt-pomo">' +
        '<div class="__lt-pomo-timer">--:--</div>' +
        '<div class="__lt-pomo-phase">No active session</div>' +
        '<div class="__lt-pomo-hint">Start a session from extension settings</div>' +
        "</div>";
    }

    var remaining = computeRemaining(state, config, now);
    var phaseLabel = state.phase === "work" ? "Focus" : "Break";
    var sessions = state.sessionCount || 0;

    // If timer expired, show 00:00 (hydrate will handle transition)
    if (remaining <= 0) remaining = 0;

    return '<div class="__lt-pomo">' +
      '<div class="__lt-pomo-timer">' + formatCountdown(remaining) + "</div>" +
      '<div class="__lt-pomo-phase">' + phaseLabel + "</div>" +
      '<div class="__lt-pomo-sessions">Session #' + (sessions + 1) + "</div>" +
      "</div>";
  }

  window.__ltScreens.register({
    manifest: {
      id: "pomodoro",
      name: "Pomodoro Timer",
      description: "Focus/break countdown timer that persists across page loads.",
      author: "Loading Tips",
      version: "1.0.0",
      configSchema: [
        {
          key: "workMinutes",
          type: "number",
          label: "Work duration (minutes)",
          default: 25
        },
        {
          key: "breakMinutes",
          type: "number",
          label: "Break duration (minutes)",
          default: 5
        }
      ]
    },

    localStorageKeys: [STORAGE_KEY],

    style: [
      ".__lt-pomo {",
      "  display: flex;",
      "  flex-direction: column;",
      "  align-items: center;",
      "}",
      ".__lt-pomo-timer {",
      "  font-size: 64px;",
      "  font-weight: 200;",
      "  color: #58a6ff;",
      "  font-variant-numeric: tabular-nums;",
      "  letter-spacing: 0.05em;",
      "}",
      ".__lt-pomo-phase {",
      "  font-size: 18px;",
      "  color: #c9d1d9;",
      "  margin-top: 8px;",
      "  text-transform: uppercase;",
      "  letter-spacing: 0.15em;",
      "}",
      ".__lt-pomo-sessions {",
      "  color: #8b949e;",
      "  font-size: 14px;",
      "  margin-top: 4px;",
      "}",
      ".__lt-pomo-hint {",
      "  color: #484f58;",
      "  font-size: 14px;",
      "  margin-top: 8px;",
      "}",
      ".__lt-pomo[data-phase='work'] .__lt-pomo-timer { color: #58a6ff; }",
      ".__lt-pomo[data-phase='break'] .__lt-pomo-timer { color: #3fb950; }"
    ].join("\n"),

    render: function (config, context, localState) {
      var state = localState ? localState[STORAGE_KEY] : null;
      return renderContent(state, config, context.now);
    },

    hydrate: function (element, config, context, localState) {
      var state = localState ? localState[STORAGE_KEY] : null;
      if (!state || !state.phaseStartedAt) return;

      var timerEl = element.querySelector(".__lt-pomo-timer");
      var phaseEl = element.querySelector(".__lt-pomo-phase");
      var pomoEl = element.querySelector(".__lt-pomo");
      if (!timerEl) return;

      if (pomoEl) pomoEl.setAttribute("data-phase", state.phase);

      var raf;
      var currentState = state;

      function transitionPhase() {
        var nextPhase = currentState.phase === "work" ? "break" : "work";
        var nextCount = nextPhase === "work"
          ? currentState.sessionCount
          : (currentState.sessionCount || 0) + 1;

        currentState = {
          phase: nextPhase,
          phaseStartedAt: Date.now(),
          sessionCount: nextCount
        };

        chrome.storage.local.set({ pomodoroState: currentState });

        if (phaseEl) phaseEl.textContent = nextPhase === "work" ? "Focus" : "Break";
        if (pomoEl) pomoEl.setAttribute("data-phase", nextPhase);
      }

      function tick() {
        var remaining = computeRemaining(currentState, config, Date.now());
        if (remaining <= 0) {
          transitionPhase();
          remaining = computeRemaining(currentState, config, Date.now());
        }
        timerEl.textContent = formatCountdown(remaining);
        raf = requestAnimationFrame(tick);
      }
      tick();

      return function () {
        cancelAnimationFrame(raf);
      };
    }
  });
})();
