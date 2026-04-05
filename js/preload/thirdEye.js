/* Third Eye - Preload script for DOM keyword scanning
   Injected into every webview to scan page content for blocked keywords */

(function () {
    var electron = require("electron");
    var ipc = electron.ipcRenderer;

    // Don't run on internal pages
    if (window.location.protocol === "zenmin:") {
        return;
    }

    var scanTimeout = null;
    var lastScanResult = null;
    var scanEnabled = false;
    var blockedKeywords = [];
    var whitelistedDomains = [];
    var observer = null;

    function isCurrentPageWhitelisted() {
        try {
            var hostname = window.location.hostname
                .toLowerCase()
                .replace(/^www\./, "");
            for (var i = 0; i < whitelistedDomains.length; i++) {
                var entry = whitelistedDomains[i];
                if (entry.startsWith("regex:")) {
                    try {
                        var pattern = entry.substring(6);
                        var regex = new RegExp(pattern, "i");
                        if (regex.test(hostname)) {
                            return true;
                        }
                    } catch (e) {
                        // invalid regex, skip
                    }
                } else {
                    if (hostname === entry || hostname.endsWith("." + entry)) {
                        return true;
                    }
                }
            }
        } catch (e) {
            // ignore
        }
        return false;
    }

    // Fetch blocking rules from main process
    function fetchRules() {
        ipc.invoke("thirdEye-getBlockingRules")
            .then(function (rules) {
                if (rules && rules.active && rules.keywords.length > 0) {
                    scanEnabled = true;
                    blockedKeywords = rules.keywords;
                    whitelistedDomains = rules.whitelist || [];
                    // Do initial scan once DOM is ready
                    if (
                        document.readyState === "complete" ||
                        document.readyState === "interactive"
                    ) {
                        debouncedScan();
                    } else {
                        window.addEventListener(
                            "DOMContentLoaded",
                            function () {
                                debouncedScan();
                            },
                        );
                    }
                    startObserving();
                } else {
                    scanEnabled = false;
                    blockedKeywords = [];
                    stopObserving();
                }
            })
            .catch(function () {
                // IPC not available yet or error, retry later
                setTimeout(fetchRules, 2000);
            });
    }

    function scanContent() {
        if (!scanEnabled || blockedKeywords.length === 0) {
            return;
        }

        // Skip scanning for whitelisted domains
        if (isCurrentPageWhitelisted()) {
            return;
        }

        try {
            var bodyText = document.body ? document.body.innerText : "";
            var metaTags = document.querySelectorAll(
                "meta[name], meta[property]",
            );
            var metaContent = "";
            metaTags.forEach(function (meta) {
                metaContent += " " + (meta.getAttribute("content") || "");
            });

            var fullText = (
                bodyText +
                " " +
                metaContent +
                " " +
                window.location.href
            ).toLowerCase();

            for (var i = 0; i < blockedKeywords.length; i++) {
                if (fullText.includes(blockedKeywords[i])) {
                    // Found a match - only report if different from last scan
                    var matchKey = blockedKeywords[i];
                    if (lastScanResult !== matchKey) {
                        lastScanResult = matchKey;
                        ipc.send("thirdEye-contentBlocked", {
                            keyword: matchKey,
                            url: window.location.href,
                        });
                    }
                    return;
                }
            }
            lastScanResult = null;
        } catch (e) {
            // DOM might not be ready
        }
    }

    function debouncedScan() {
        clearTimeout(scanTimeout);
        scanTimeout = setTimeout(scanContent, 500);
    }

    function startObserving() {
        if (observer) {
            return;
        }

        // Wait for body to exist
        function attachObserver() {
            if (!document.body) {
                setTimeout(attachObserver, 100);
                return;
            }

            observer = new MutationObserver(function () {
                if (scanEnabled) {
                    debouncedScan();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true,
            });
        }

        if (
            document.readyState === "complete" ||
            document.readyState === "interactive"
        ) {
            attachObserver();
        } else {
            window.addEventListener("DOMContentLoaded", attachObserver);
        }
    }

    function stopObserving() {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    }

    // Listen for rule updates
    ipc.on("thirdEye-rulesUpdated", function (event, rules) {
        if (rules && rules.active && rules.keywords.length > 0) {
            scanEnabled = true;
            blockedKeywords = rules.keywords;
            whitelistedDomains = rules.whitelist || [];
            debouncedScan();
            startObserving();
        } else {
            scanEnabled = false;
            blockedKeywords = [];
            whitelistedDomains = [];
            stopObserving();
        }
    });

    // Initial fetch
    setTimeout(fetchRules, 0);
})();
