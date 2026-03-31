var searchbarPlugins = require("searchbar/searchbarPlugins.js");

function initialize() {
    searchbarPlugins.register("developmentModeNotification", {
        index: 0,
        trigger: (text) => "development-mode" in window.globalArgs,
        showResults: () => {
            searchbarPlugins.reset("developmentModeNotification");
            searchbarPlugins.addResult("developmentModeNotification", {
                title: "Development Mode Enabled",
                icon: "carbon:warning-alt",
            });
        },
    });
}

module.exports = { initialize };
