/* Third Eye - Preload script for DOM keyword scanning and iframe blocking
   Injected into every webview to scan page content for blocked keywords
   and monitor iframes for blocked URLs */

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
    var iframeObserver = null;

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

    // Check if URL should be blocked (mirrors main process logic)
    function isURLBlocked(url) {
        try {
            var normalized = url
                .toLowerCase()
                .replace(/^https?:\/\//, "")
                .replace(/^www\./, "");
            var domain = normalized.split("/")[0].split(":")[0];

            // Check against blocked keywords in URL
            for (var i = 0; i < blockedKeywords.length; i++) {
                if (normalized.includes(blockedKeywords[i])) {
                    return {
                        blocked: true,
                        reason: "keyword_url",
                        match: blockedKeywords[i],
                    };
                }
            }
        } catch (e) {
            // ignore
        }
        return { blocked: false };
    }

    // Check if iframe src should be blocked
    function checkIframeSrc(src) {
        if (!src || !src.startsWith("http")) {
            return;
        }

        // Skip whitelisted domains
        try {
            var hostname = new URL(src).hostname
                .toLowerCase()
                .replace(/^www\./, "");
            for (var i = 0; i < whitelistedDomains.length; i++) {
                var entry = whitelistedDomains[i];
                if (entry.startsWith("regex:")) {
                    try {
                        var pattern = entry.substring(6);
                        var regex = new RegExp(pattern, "i");
                        if (regex.test(hostname)) {
                            return;
                        }
                    } catch (e) {
                        // invalid regex
                    }
                } else {
                    if (hostname === entry || hostname.endsWith("." + entry)) {
                        return;
                    }
                }
            }
        } catch (e) {
            // invalid URL
        }

        var blockResult = isURLBlocked(src);
        if (blockResult.blocked) {
            ipc.send("thirdEye-iframeBlocked", {
                iframeSrc: src,
                reason: blockResult.reason,
                match: blockResult.match,
                pageUrl: window.location.href,
            });
        }
    }

    // Scan all existing iframes and check their sources
    function scanIframes() {
        if (!scanEnabled || whitelistedDomains.length === 0) {
            return;
        }

        // Even if current page is whitelisted, still check iframes
        // because iframe src might not be whitelisted
        if (isCurrentPageWhitelisted()) {
            // Current page is whitelisted, skip scanning but still allow iframe checks
            return;
        }

        try {
            var iframes = document.querySelectorAll("iframe");
            for (var i = 0; i < iframes.length; i++) {
                var src = iframes[i].getAttribute("src");
                if (src) {
                    checkIframeSrc(src);
                }
            }
        } catch (e) {
            // Ignore errors - might be cross-origin restrictions
        }
    }

    // Start observing iframes for new ones added
    function startIframeObserver() {
        if (iframeObserver) {
            return;
        }

        function attachObserver() {
            if (!document.body) {
                setTimeout(attachObserver, 100);
                return;
            }

            iframeObserver = new MutationObserver(function (mutations) {
                if (!scanEnabled || whitelistedDomains.length === 0) {
                    return;
                }

                // Even if current page is whitelisted, still check iframes
                // because iframe src might not be whitelisted

                mutations.forEach(function (mutation) {
                    if (mutation.addedNodes) {
                        mutation.addedNodes.forEach(function (node) {
                            // Check if the added node is an iframe
                            if (node.nodeName === "IFRAME") {
                                var src = node.getAttribute("src");
                                if (src) {
                                    checkIframeSrc(src);
                                }
                            }
                            // Check if added node contains iframes
                            if (node.querySelectorAll) {
                                var iframes = node.querySelectorAll("iframe");
                                iframes.forEach(function (iframe) {
                                    var src = iframe.getAttribute("src");
                                    if (src) {
                                        checkIframeSrc(src);
                                    }
                                });
                            }
                        });
                    }
                });
            });

            iframeObserver.observe(document.body, {
                childList: true,
                subtree: true,
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

    function stopIframeObserver() {
        if (iframeObserver) {
            iframeObserver.disconnect();
            iframeObserver = null;
        }
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
                        scanIframes();
                    } else {
                        window.addEventListener(
                            "DOMContentLoaded",
                            function () {
                                debouncedScan();
                                scanIframes();
                            },
                        );
                    }
                    startObserving();
                    startIframeObserver();
                } else {
                    scanEnabled = false;
                    blockedKeywords = [];
                    stopObserving();
                    stopIframeObserver();
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
            scanIframes();
            startObserving();
            startIframeObserver();
        } else {
            scanEnabled = false;
            blockedKeywords = [];
            whitelistedDomains = [];
            stopObserving();
            stopIframeObserver();
        }
    });

    // Initial fetch
    setTimeout(fetchRules, 0);
})();
