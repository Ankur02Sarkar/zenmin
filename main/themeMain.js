function isNightTime() {
    var hours = new Date().getHours();
    return hours > 21 || hours < 6;
}

var themeInterval = null;

function themeSettingsChanged(value) {
    /*
    value is the value of the darkMode pref
    -1: never (light mode, default)
    0: at night
    1: always (dark mode)
    2: follow system
    true / false: legacy pref values, translate to always/light
    */
    clearInterval(themeInterval);

    // 1 or true: dark mode is always enabled
    if (value === 1 || value === true) {
        nativeTheme.themeSource = "dark";
        return;
    }

    // 2: follow system
    if (value === 2) {
        nativeTheme.themeSource = "system";
        return;
    }

    // 0: automatic dark mode at night
    if (value === 0) {
        if (isNightTime()) {
            nativeTheme.themeSource = "dark";
        } else {
            nativeTheme.themeSource = "light";
        }

        themeInterval = setInterval(function () {
            if (isNightTime()) {
                nativeTheme.themeSource = "dark";
            } else {
                nativeTheme.themeSource = "light";
            }
        }, 10000);
        return;
    }

    // -1, undefined, false, or anything else: light mode (default)
    nativeTheme.themeSource = "light";
}

app.on("ready", function () {
    settings.listen("darkMode", themeSettingsChanged);

    if (settings.get("darkThemeIsActive") !== nativeTheme.shouldUseDarkColors) {
        settings.set("darkThemeIsActive", nativeTheme.shouldUseDarkColors);
    }

    nativeTheme.on("updated", function () {
        settings.set("darkThemeIsActive", nativeTheme.shouldUseDarkColors);
    });
});
