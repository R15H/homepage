/**
 * Screen Registry — manages screen modules and rotation.
 * Must load before any screen module files.
 */
(function () {
  var screens = {};

  window.__ltScreens = {
    register: function (screen) {
      screens[screen.manifest.id] = screen;
    },

    get: function (id) {
      return screens[id] || null;
    },

    getAll: function () {
      return Object.keys(screens).map(function (id) { return screens[id]; });
    },

    getAllIds: function () {
      return Object.keys(screens);
    },

    /**
     * Pick a screen from the enabled list based on rotation mode.
     * @param {string[]} enabledIds - IDs of enabled screens
     * @param {string} mode - "random" or "sequential"
     * @param {number} counter - rotation counter (for sequential mode)
     * @returns {{ screen: object, nextCounter: number }}
     */
    pick: function (enabledIds, mode, counter) {
      // Filter to only screens that actually exist
      var available = enabledIds.filter(function (id) { return !!screens[id]; });
      if (available.length === 0) {
        // Fallback: pick first registered screen
        var all = Object.keys(screens);
        if (all.length === 0) return { screen: null, nextCounter: 0 };
        return { screen: screens[all[0]], nextCounter: 0 };
      }
      if (available.length === 1) {
        return { screen: screens[available[0]], nextCounter: counter };
      }

      if (mode === "sequential") {
        var index = counter % available.length;
        return {
          screen: screens[available[index]],
          nextCounter: counter + 1
        };
      }

      // Default: random
      var randomIndex = Math.floor(Math.random() * available.length);
      return {
        screen: screens[available[randomIndex]],
        nextCounter: counter
      };
    },

    /**
     * Build the context object passed to render() and hydrate().
     */
    buildContext: function () {
      return {
        now: Date.now(),
        locale: navigator.language || "en-US",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
        screenWidth: screen.width || 1920,
        screenHeight: screen.height || 1080
      };
    },

    /**
     * Collect default config for a screen from its configSchema.
     */
    getDefaultConfig: function (screenModule) {
      var config = {};
      var schema = screenModule.manifest.configSchema || [];
      schema.forEach(function (field) {
        if (field.default !== undefined) {
          config[field.key] = field.default;
        }
      });
      return config;
    }
  };
})();
