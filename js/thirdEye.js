/* Third Eye - Renderer module
   Handles navigation interception, URL checking, and redirect to blocked page */

var webviews = require("webviews.js");
var urlParser = require("util/urlParser.js");

var thirdEye = {
    cachedData: null,

    isWhitelisted: function (url) {
        if (!thirdEye.cachedData || !thirdEye.cachedData.whitelist)
            return false;
        try {
            var normalized = url
                .toLowerCase()
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "");
            var domain = normalized.split("/")[0].split(":")[0];
            var whitelist = thirdEye.cachedData.whitelist;
            for (var i = 0; i < whitelist.length; i++) {
                var entry = whitelist[i];
                if (entry.startsWith("regex:")) {
                    try {
                        var pattern = entry.substring(6);
                        var regex = new RegExp(pattern, "i");
                        if (regex.test(domain)) {
                            return true;
                        }
                    } catch (e) {
                        // invalid regex, skip
                    }
                } else {
                    if (domain === entry || domain.endsWith("." + entry)) {
                        return true;
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        return false;
    },

    pushRulesToViews: function () {
        // Push updated blocking rules to all non-internal webviews
        ipc.invoke("thirdEye-getBlockingRules").then(function (rules) {
            tasks.forEach(function (task) {
                task.tabs.forEach(function (tab) {
                    if (tab.url && !tab.url.startsWith("zenmin://")) {
                        try {
                            webviews.callAsync(tab.id, "send", [
                                "thirdEye-rulesUpdated",
                                rules,
                            ]);
                        } catch (e) {
                            // webview might not exist
                        }
                    }
                });
            });
        });
    },

    initialize: function () {
        // Listen for data updates from main process
        ipc.on("thirdEyeDataUpdate", function (event, data) {
            thirdEye.cachedData = data;
            // Push updated rules to all webview preload scripts
            thirdEye.pushRulesToViews();
        });

        // Fetch initial data
        ipc.invoke("thirdEye-getData").then(function (data) {
            thirdEye.cachedData = data;
        });

        // Intercept navigation events
        webviews.bindEvent(
            "did-start-navigation",
            function (tabId, url, isInPlace, isMainFrame) {
                if (!isMainFrame) return;

                // Don't block internal pages
                if (urlParser.isInternalURL(url)) return;
                if (
                    url.startsWith("about:") ||
                    url.startsWith("chrome:") ||
                    url.startsWith("data:")
                )
                    return;

                // Skip whitelisted domains
                if (thirdEye.isWhitelisted(url)) return;

                thirdEye.checkAndBlock(tabId, url);
            },
        );

        // Listen for content-based blocking from preload
        webviews.bindIPC("thirdEye-contentBlocked", function (tabId, args) {
            var data = args[0];
            if (data && data.url && data.keyword) {
                // Skip blocking for whitelisted domains
                if (thirdEye.isWhitelisted(data.url)) return;

                var blockedURL =
                    "zenmin://app/pages/thirdeye/blocked.html" +
                    "?url=" +
                    encodeURIComponent(data.url) +
                    "&reason=keyword_content" +
                    "&match=" +
                    encodeURIComponent(data.keyword);

                if (thirdEye.cachedData && thirdEye.cachedData.timerExpiry) {
                    blockedURL +=
                        "&expiry=" +
                        encodeURIComponent(thirdEye.cachedData.timerExpiry);
                }

                webviews.update(tabId, blockedURL);
            }
        });

        // Listen for iframe blocking from preload
        webviews.bindIPC("thirdEye-iframeBlocked", function (tabId, args) {
            var data = args[0];
            if (data && data.iframeSrc) {
                // Show blocked page for the iframe source
                var blockedURL =
                    "zenmin://app/pages/thirdeye/blocked.html" +
                    "?url=" +
                    encodeURIComponent(data.iframeSrc) +
                    "&reason=" +
                    encodeURIComponent(data.reason || "iframe_block") +
                    "&match=" +
                    encodeURIComponent(data.match || "");

                if (thirdEye.cachedData && thirdEye.cachedData.timerExpiry) {
                    blockedURL +=
                        "&expiry=" +
                        encodeURIComponent(thirdEye.cachedData.timerExpiry);
                }

                webviews.update(tabId, blockedURL);
            }
        });
    },

    checkAndBlock: function (tabId, url) {
        ipc.invoke("thirdEye-checkURL", url).then(function (result) {
            if (result && result.blocked) {
                var blockedURL =
                    "zenmin://app/pages/thirdeye/blocked.html" +
                    "?url=" +
                    encodeURIComponent(url) +
                    "&reason=" +
                    encodeURIComponent(result.reason) +
                    "&match=" +
                    encodeURIComponent(result.match);

                if (thirdEye.cachedData && thirdEye.cachedData.timerExpiry) {
                    blockedURL +=
                        "&expiry=" +
                        encodeURIComponent(thirdEye.cachedData.timerExpiry);
                }

                webviews.update(tabId, blockedURL);
            }
        });
    },
};

module.exports = thirdEye;
