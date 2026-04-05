if (typeof require !== "undefined") {
    var settings = require("util/settings/settings.js");
}

function enableDarkMode() {
    document.body.classList.add("dark-mode");
    window.isDarkMode = true;
    requestAnimationFrame(function () {
        window.dispatchEvent(new CustomEvent("themechange"));
    });
}

function disableDarkMode() {
    document.body.classList.remove("dark-mode");
    window.isDarkMode = false;
    requestAnimationFrame(function () {
        window.dispatchEvent(new CustomEvent("themechange"));
    });
}

function applyGlassTheme(theme) {
    document.body.classList.remove(
        "theme-ocean",
        "theme-sunset",
        "theme-royal",
    );
    if (theme && theme !== "default") {
        document.body.classList.add("theme-" + theme);
    } else {
        // default is ocean
        document.body.classList.add("theme-ocean");
    }
}

function initialize() {
    function themeChanged(value) {
        if (value === true) {
            enableDarkMode();
        } else {
            disableDarkMode();
        }
    }
    settings.listen("darkThemeIsActive", themeChanged);

    // glass theme
    settings.listen("glassTheme", function (value) {
        applyGlassTheme(value);
    });

    // apply default theme on startup if no setting exists
    settings.get("glassTheme", function (value) {
        if (!value) {
            applyGlassTheme("ocean");
        }
    });
}

if (typeof module !== "undefined") {
    module.exports = { initialize: initialize };
} else {
    initialize();
}
