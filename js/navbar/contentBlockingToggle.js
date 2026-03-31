const webviews = require("webviews.js");
const settings = require("util/settings/settings.js");
const remoteMenu = require("remoteMenuRenderer.js");

const contentBlockingToggle = {
    enableBlocking: (url) => {
        if (!url) {
            return;
        }
        var domain = new URL(url).hostname;

        var setting = settings.get("filtering");
        if (!setting) {
            setting = {};
        }
        if (!setting.exceptionDomains) {
            setting.exceptionDomains = [];
        }
        setting.exceptionDomains = setting.exceptionDomains.filter(
            (d) => d.replace(/^www\./g, "") !== domain.replace(/^www\./g, ""),
        );
        settings.set("filtering", setting);
        webviews.callAsync(tabs.getSelected(), "reload");
    },
    disableBlocking: (url) => {
        if (!url) {
            return;
        }
        var domain = new URL(url).hostname;

        var setting = settings.get("filtering");
        if (!setting) {
            setting = {};
        }
        if (!setting.exceptionDomains) {
            setting.exceptionDomains = [];
        }
        // make sure the domain isn't already an exception
        if (
            !setting.exceptionDomains.some(
                (d) =>
                    d.replace(/^www\./g, "") === domain.replace(/^www\./g, ""),
            )
        ) {
            setting.exceptionDomains.push(domain);
        }
        settings.set("filtering", setting);
        webviews.callAsync(tabs.getSelected(), "reload");
    },
    isBlockingEnabled: (url) => {
        try {
            var domain = new URL(url).hostname;
        } catch (e) {
            return false;
        }

        var setting = settings.get("filtering");
        return (
            !setting ||
            !setting.exceptionDomains ||
            !setting.exceptionDomains.some(
                (d) =>
                    d.replace(/^www\./g, "") === domain.replace(/^www\./g, ""),
            )
        );
    },
    create: () => {
        const button = document.createElement("button");
        button.className = "tab-editor-button i carbon:manage-protection";

        button.addEventListener("click", (e) => {
            contentBlockingToggle.showMenu(button);
        });

        return button;
    },
    showMenu: (button) => {
        var url = tabs.get(tabs.getSelected()).url;
        var menu = [
            [
                {
                    type: "checkbox",
                    label: l("enableBlocking"),
                    checked: contentBlockingToggle.isBlockingEnabled(url),
                    click: () => {
                        if (contentBlockingToggle.isBlockingEnabled(url)) {
                            contentBlockingToggle.disableBlocking(url);
                        } else {
                            contentBlockingToggle.enableBlocking(url);
                        }
                        contentBlockingToggle.update(
                            tabs.getSelected(),
                            button,
                        );
                    },
                },
            ],
            [
                {
                    label: l("appMenuReportBug"),
                    click: () => {
                        var newTab = tabs.add({
                            url:
                                "https://github.com/minbrowser/min/issues/new?title=Content%20blocking%20issue%20on%20" +
                                encodeURIComponent(url),
                        });
                        require("browserUI.js").addTab(newTab, {
                            enterEditMode: false,
                        });
                    },
                },
            ],
        ];
        remoteMenu.open(menu);
    },
    update: (tabId, button) => {
        if (
            !tabs.get(tabId).url.startsWith("http") &&
            !tabs.get(tabId).url.startsWith("https")
        ) {
            button.hidden = true;
            return;
        }

        if (
            settings.get("filtering") &&
            settings.get("filtering").blockingLevel === 0
        ) {
            button.hidden = true;
            return;
        }

        button.hidden = false;
        if (contentBlockingToggle.isBlockingEnabled(tabs.get(tabId).url)) {
            button.style.opacity = 1;
        } else {
            button.style.opacity = 0.4;
        }
    },
};

module.exports = contentBlockingToggle;
