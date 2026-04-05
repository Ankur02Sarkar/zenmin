var webviews = require("webviews.js");
var browserUI = require("browserUI.js");
var urlParser = require("util/urlParser.js");

var hamburgerMenu = {
    button: document.getElementById("hamburger-menu-button"),
    dropdown: document.getElementById("hamburger-dropdown"),
    isOpen: false,
    toggle: function () {
        if (hamburgerMenu.isOpen) {
            hamburgerMenu.close();
        } else {
            hamburgerMenu.open();
        }
    },
    open: function () {
        webviews.requestPlaceholder("hamburgerMenu");
        hamburgerMenu.dropdown.hidden = false;
        hamburgerMenu.isOpen = true;
        hamburgerMenu.loadSuggestions();
    },
    close: function () {
        hamburgerMenu.dropdown.hidden = true;
        hamburgerMenu.isOpen = false;
        webviews.hidePlaceholder("hamburgerMenu");
    },
    loadSuggestions: function () {
        var container = document.getElementById("hm-suggestions");
        // remove old suggestions but keep the label
        var items = container.querySelectorAll(".hm-suggestion");
        items.forEach(function (item) {
            item.remove();
        });

        try {
            var places = require("places/places.js");
            places.getPlaceSuggestions("").then(function (results) {
                if (!results) return;
                var shown = 0;
                for (var i = 0; i < results.length && shown < 3; i++) {
                    if (
                        results[i].url &&
                        !results[i].url.startsWith("zenmin://")
                    ) {
                        var item = document.createElement("div");
                        item.className = "hm-suggestion";
                        var hostname = "";
                        try {
                            hostname = new URL(results[i].url).hostname.replace(
                                "www.",
                                "",
                            );
                        } catch (e) {
                            hostname = results[i].url;
                        }
                        item.innerHTML =
                            '<i class="i carbon:recently-viewed"></i><span>' +
                            hostname +
                            "</span>";
                        item.setAttribute("data-url", results[i].url);
                        item.addEventListener("click", function () {
                            var url = this.getAttribute("data-url");
                            hamburgerMenu.close();
                            browserUI.addTab(tabs.add({ url: url }), {
                                enterEditMode: false,
                            });
                        });
                        container.appendChild(item);
                        shown++;
                    }
                }
            });
        } catch (e) {
            // places not available yet
        }
    },
    handleAction: function (action) {
        hamburgerMenu.close();
        var tabEditor = require("navbar/tabEditor.js");
        switch (action) {
            case "allTabs":
                var taskOverlay = require("taskOverlay/taskOverlay.js");
                taskOverlay.toggle();
                break;
            case "searchTabs":
                tabEditor.show(tabs.getSelected(), "!task ");
                break;
            case "history":
                browserUI.addTab(
                    tabs.add({ url: urlParser.parse("zenmin://history") }),
                    { enterEditMode: false },
                );
                break;
            case "downloads":
                browserUI.addTab(
                    tabs.add({ url: urlParser.parse("zenmin://downloads") }),
                    { enterEditMode: false },
                );
                break;
            case "settings":
                browserUI.addTab(
                    tabs.add({ url: urlParser.parse("zenmin://settings") }),
                    { enterEditMode: false },
                );
                break;
            case "bookmarks":
                tabEditor.show(tabs.getSelected(), "!bookmarks ");
                break;
            case "thirdeye":
                browserUI.addTab(
                    tabs.add({ url: urlParser.parse("zenmin://thirdeye") }),
                    { enterEditMode: false },
                );
                break;
            case "groups":
                browserUI.addTab(
                    tabs.add({ url: urlParser.parse("zenmin://groups") }),
                    { enterEditMode: false },
                );
                break;
        }
    },
    initialize: function () {
        hamburgerMenu.button.addEventListener("click", function (e) {
            e.stopPropagation();
            hamburgerMenu.toggle();
        });

        document.addEventListener("click", function (e) {
            if (
                hamburgerMenu.isOpen &&
                !hamburgerMenu.dropdown.contains(e.target) &&
                e.target !== hamburgerMenu.button
            ) {
                hamburgerMenu.close();
            }
        });

        var items = hamburgerMenu.dropdown.querySelectorAll(".hm-item");
        items.forEach(function (item) {
            item.addEventListener("click", function () {
                hamburgerMenu.handleAction(this.getAttribute("data-action"));
            });
        });

        // close on Escape
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && hamburgerMenu.isOpen) {
                hamburgerMenu.close();
            }
        });
    },
};

module.exports = hamburgerMenu;
