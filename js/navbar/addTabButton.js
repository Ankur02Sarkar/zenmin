var browserUI = require("browserUI.js");

var addTabButton = document.getElementById("add-tab-button");

function initialize() {
    addTabButton.addEventListener("click", (e) => {
        browserUI.addTab();
    });
}

module.exports = { initialize };
