var path = require("path");
var statistics = require("js/statistics.js");
var urlParser = require("util/urlParser.js");
var searchEngine = require("util/searchEngine.js");
var webviews = require("webviews.js");
var settings = require("util/settings/settings.js");

var newTabPage = {
    background: document.getElementById("ntp-background"),
    hasBackground: false,
    picker: document.getElementById("ntp-image-picker"),
    deleteBackground: document.getElementById("ntp-image-remove"),
    searchInput: document.getElementById("ntp-search-input"),
    suggestionsContainer: document.getElementById("ntp-suggestions"),
    greetingEl: document.getElementById("ntp-greeting"),
    ipInfoEl: document.getElementById("ntp-ip-info"),
    specialTabsEl: document.getElementById("ntp-special-tabs"),
    imagePath: path.join(
        window.globalArgs["user-data-path"],
        "newTabBackground",
    ),
    blobInstance: null,
    cachedUserData: null,
    cachedIPInfo: null,
    loadUserData: function () {
        if (newTabPage.cachedUserData)
            return Promise.resolve(newTabPage.cachedUserData);
        return fetch("zenmin://app/user.json")
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                newTabPage.cachedUserData = data;
                return data;
            })
            .catch(function () {
                newTabPage.cachedUserData = {};
                return {};
            });
    },
    reloadBackground: function () {
        fs.readFile(newTabPage.imagePath, function (err, data) {
            if (newTabPage.blobInstance) {
                URL.revokeObjectURL(newTabPage.blobInstance);
                newTabPage.blobInstance = null;
            }
            if (err) {
                newTabPage.background.hidden = true;
                newTabPage.hasBackground = false;
                document.body.classList.remove("ntp-has-background");
                newTabPage.deleteBackground.hidden = true;
            } else {
                var blob = new Blob([data], {
                    type: "application/octet-binary",
                });
                var url = URL.createObjectURL(blob);
                newTabPage.blobInstance = url;
                newTabPage.background.src = url;

                newTabPage.background.hidden = false;
                newTabPage.hasBackground = true;
                document.body.classList.add("ntp-has-background");
                newTabPage.deleteBackground.hidden = false;
            }
        });
    },
    updateGreeting: function () {
        var hours = new Date().getHours();
        var greeting = "Good evening";
        if (hours < 12) greeting = "Good morning";
        else if (hours < 18) greeting = "Good afternoon";

        newTabPage.loadUserData().then(function (userData) {
            var firstName = (userData.name || "").split(" ")[0];
            if (firstName) {
                greeting += ", " + firstName;
            }
            newTabPage.greetingEl.textContent = greeting;
        });
    },
    updateSearchPlaceholder: function () {
        var engine = searchEngine.getCurrent();
        var name = engine.name || "the web";
        newTabPage.searchInput.placeholder = "Search " + name + " or enter URL";
    },
    loadIPInfo: function () {
        if (!newTabPage.ipInfoEl) return;

        // Use cached data if available
        if (newTabPage.cachedIPInfo) {
            newTabPage.renderIPInfo(newTabPage.cachedIPInfo);
            return;
        }

        fetch("https://ipinfo.io/json")
            .then(function (res) {
                return res.json();
            })
            .then(function (data) {
                newTabPage.cachedIPInfo = data;
                newTabPage.renderIPInfo(data);
            })
            .catch(function () {
                // Graceful degradation - show nothing
                newTabPage.ipInfoEl.textContent = "";
            });
    },
    renderIPInfo: function (data) {
        if (!newTabPage.ipInfoEl || !data) return;

        newTabPage.ipInfoEl.innerHTML = "";

        var parts = [];
        if (data.ip) parts.push(data.ip);
        var location = [data.city, data.region, data.country]
            .filter(Boolean)
            .join(", ");
        if (location) parts.push(location);

        var textSpan = document.createElement("span");
        textSpan.textContent = parts.join(" \u00B7 ");
        newTabPage.ipInfoEl.appendChild(textSpan);

        // Add maps link if coordinates are available
        if (data.loc) {
            var coords = data.loc.split(",");
            if (coords.length === 2) {
                var separator = document.createTextNode(" \u00B7 ");
                newTabPage.ipInfoEl.appendChild(separator);

                var mapsLink = document.createElement("a");
                mapsLink.href = "#";
                mapsLink.textContent = "\uD83D\uDCCD View on Maps";
                mapsLink.addEventListener("click", function (e) {
                    e.preventDefault();
                    var mapsUrl =
                        "https://www.google.com/maps/@" +
                        coords[0] +
                        "," +
                        coords[1] +
                        ",14z";
                    webviews.update(tabs.getSelected(), mapsUrl);
                });
                newTabPage.ipInfoEl.appendChild(mapsLink);
            }
        }
    },
    loadSpecialTabs: function () {
        if (!newTabPage.specialTabsEl) return;

        newTabPage.loadUserData().then(function (userData) {
            newTabPage.specialTabsEl.innerHTML = "";

            var specialItems = [];

            if (userData.linkedin) {
                specialItems.push({
                    name: "LinkedIn",
                    url: userData.linkedin,
                    icon: "carbon:logo-linkedin",
                    gradient: "linear-gradient(135deg, #0077b5, #00a0dc)",
                });
            }

            if (userData.github) {
                specialItems.push({
                    name: "GitHub",
                    url: userData.github,
                    icon: "carbon:logo-github",
                    gradient: "linear-gradient(135deg, #24292e, #586069)",
                });
            }

            if (userData.email) {
                specialItems.push({
                    name: "Email",
                    url: "mailto:" + userData.email,
                    icon: "carbon:email",
                    gradient: "linear-gradient(135deg, #ea4335, #fbbc04)",
                });
            }

            if (userData.youtube) {
                specialItems.push({
                    name: "YouTube",
                    url: userData.youtube,
                    icon: "carbon:logo-youtube",
                    gradient: "linear-gradient(135deg, #ff0000, #cc0000)",
                });
            }

            if (userData.website) {
                specialItems.push({
                    name: "Website",
                    url: userData.website,
                    icon: "carbon:globe",
                    gradient: "linear-gradient(135deg, #667eea, #764ba2)",
                });
            }

            if (specialItems.length === 0) return;

            specialItems.forEach(function (item) {
                var card = document.createElement("div");
                card.className = "ntp-special-card";
                card.style.background = item.gradient;
                card.setAttribute("data-url", item.url);

                var icon = document.createElement("i");
                icon.className = "i " + item.icon;

                var label = document.createElement("span");
                label.textContent = item.name;

                card.appendChild(icon);
                card.appendChild(label);

                card.addEventListener("click", function () {
                    var url = this.getAttribute("data-url");
                    if (url.startsWith("mailto:")) {
                        require("electron").shell.openExternal(url);
                    } else {
                        webviews.update(tabs.getSelected(), url);
                    }
                });

                newTabPage.specialTabsEl.appendChild(card);
            });
        });
    },
    loadSuggestions: function () {
        newTabPage.suggestionsContainer.innerHTML = "";
        try {
            var places = require("places/places.js");
            places.getPlaceSuggestions("").then(function (results) {
                if (!results || results.length === 0) return;
                var shown = 0;
                for (var i = 0; i < results.length && shown < 8; i++) {
                    var item = results[i];
                    if (!item.url || item.url.startsWith("zenmin://")) continue;

                    var hostname = "";
                    try {
                        hostname = new URL(item.url).hostname.replace(
                            "www.",
                            "",
                        );
                    } catch (e) {
                        hostname = item.url;
                    }

                    var card = document.createElement("div");
                    card.className = "ntp-suggestion-card";
                    card.setAttribute("data-url", item.url);

                    var iconDiv = document.createElement("div");
                    iconDiv.className = "ntp-suggestion-icon";
                    var img = document.createElement("img");
                    img.src =
                        "https://www.google.com/s2/favicons?sz=32&domain=" +
                        hostname;
                    img.alt = "";
                    img.onerror = function () {
                        this.style.display = "none";
                    };
                    iconDiv.appendChild(img);

                    var titleDiv = document.createElement("div");
                    titleDiv.className = "ntp-suggestion-title";
                    titleDiv.textContent = hostname;

                    card.appendChild(iconDiv);
                    card.appendChild(titleDiv);

                    card.addEventListener("click", function () {
                        var url = this.getAttribute("data-url");
                        webviews.update(tabs.getSelected(), url);
                    });

                    newTabPage.suggestionsContainer.appendChild(card);
                    shown++;
                }
            });
        } catch (e) {
            // places not ready yet
        }
    },
    handleSearch: function () {
        var text = newTabPage.searchInput.value.trim();
        if (!text) return;

        var url = urlParser.parse(text);
        webviews.update(tabs.getSelected(), url);
        newTabPage.searchInput.value = "";
        newTabPage.searchInput.blur();
    },
    initialize: function () {
        newTabPage.reloadBackground();
        newTabPage.updateGreeting();
        newTabPage.updateSearchPlaceholder();
        newTabPage.loadIPInfo();
        newTabPage.loadSpecialTabs();

        // Refresh suggestions when NTP becomes visible
        var observer = new MutationObserver(function (mutations) {
            mutations.forEach(function (mutation) {
                if (mutation.attributeName === "class") {
                    if (document.body.classList.contains("is-ntp")) {
                        newTabPage.loadSuggestions();
                        newTabPage.updateGreeting();
                        newTabPage.loadIPInfo();
                    }
                }
            });
        });
        observer.observe(document.body, { attributes: true });

        // initial load
        setTimeout(function () {
            newTabPage.loadSuggestions();
        }, 1000);

        // search input
        newTabPage.searchInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter") {
                newTabPage.handleSearch();
            }
        });

        // update placeholder when search engine changes
        settings.listen("searchEngine", function () {
            setTimeout(function () {
                newTabPage.updateSearchPlaceholder();
            }, 100);
        });

        // focus search input when NTP is shown and user clicks the NTP area
        document
            .getElementById("ntp-content")
            .addEventListener("click", function (e) {
                if (
                    e.target.id === "ntp-content" ||
                    e.target.id === "ntp-main" ||
                    e.target.id === "ntp-greeting"
                ) {
                    newTabPage.searchInput.focus();
                }
            });

        newTabPage.picker.addEventListener("click", async function () {
            var filePath = await ipc.invoke("showOpenDialog", {
                filters: [
                    {
                        name: "Image files",
                        extensions: ["jpg", "jpeg", "png", "gif", "webp"],
                    },
                ],
            });
            if (!filePath) return;
            await fs.promises.copyFile(filePath[0], newTabPage.imagePath);
            newTabPage.reloadBackground();
        });

        newTabPage.deleteBackground.addEventListener(
            "click",
            async function () {
                await fs.promises.unlink(newTabPage.imagePath);
                newTabPage.reloadBackground();
            },
        );

        statistics.registerGetter("ntpHasBackground", function () {
            return newTabPage.hasBackground;
        });
    },
};

module.exports = newTabPage;
