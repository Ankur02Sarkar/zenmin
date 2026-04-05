var settingsButton = document.getElementById("settings-button");
var settingsDropdown = document.getElementById("settings-dropdown");
var invertSection = document.getElementById("invert-pdf-section");
var invertCheckbox = document.getElementById("invert-pdf-checkbox");

settingsButton.addEventListener("click", () => {
    settingsDropdown.hidden = !settingsDropdown.hidden;
    if (settingsDropdown.hidden) {
        settingsButton.classList.remove("force-visible");
    } else {
        settingsButton.classList.add("force-visible");
    }
});

document.addEventListener("click", (e) => {
    if (!settingsDropdown.contains(e.target) && e.target !== settingsButton) {
        settingsDropdown.hidden = true;
        settingsButton.classList.remove("force-visible");
    }
});

// Most of this is similar to readerThemeSelector

var metaThemeElement = document.getElementById("meta-theme");

var themeSelectors = document.querySelectorAll(".theme-circle");

var metaThemeValues = {
    light: "#fff",
    dark: "rgb(36, 41, 47)",
    sepia: "rgb(247, 231, 199)",
};

function isNight() {
    var hours = new Date().getHours();
    return hours > 21 || hours < 6;
}

themeSelectors.forEach((el) => {
    el.addEventListener("click", function () {
        var theme = this.getAttribute("data-theme");
        if (isNight()) {
            settings.set("pdfNightTheme", theme);
        } else {
            settings.set("pdfDayTheme", theme);
        }
        setViewerTheme(theme);
    });
});

function setViewerTheme(theme) {
    themeSelectors.forEach((el) => {
        if (el.getAttribute("data-theme") === theme) {
            el.classList.add("selected");
        } else {
            el.classList.remove("selected");
        }
    });

    metaThemeElement.content = metaThemeValues[theme];

    document.body.setAttribute("theme", theme);

    invertSection.hidden = !(theme === "dark");

    setTimeout(() => {
        document.body.classList.add("theme-loaded");
    }, 16);
}

function initializeViewerTheme() {
    settings.get("darkMode", (globalDarkModeEnabled) => {
        settings.get("pdfDayTheme", (pdfDayTheme) => {
            settings.get("pdfNightTheme", (pdfNightTheme) => {
                if (isNight() && pdfNightTheme) {
                    setViewerTheme(pdfNightTheme);
                } else if (!isNight() && pdfDayTheme) {
                    setViewerTheme(pdfDayTheme);
                } else if (
                    globalDarkModeEnabled === 1 ||
                    globalDarkModeEnabled === true ||
                    isNight()
                ) {
                    setViewerTheme("dark");
                } else {
                    setViewerTheme("light");
                }
            });
        });
    });
}

initializeViewerTheme();

settings.get("PDFInvertColors", (value) => {
    invertCheckbox.checked = value === true;
    document.body.setAttribute("data-invert", value || false);
});

invertCheckbox.addEventListener("click", function (e) {
    settings.set("PDFInvertColors", this.checked);
    document.body.setAttribute("data-invert", this.checked);
});
