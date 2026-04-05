/* Third Eye - Website blocking feature for ZenMin
   Main process module: persistence, time API, IPC handlers
   Note: fs, path, app, ipc, net, userDataPath, windows, getWindowWebContents
   are all available as globals from the concatenated main build */

var thirdEyeDataPath = path.join(userDataPath, "thirdEyeData.json");

var thirdEyeData = {
    enabled: false,
    timerExpiry: null,
    blockedURLs: [],
    blockedKeywords: [],
    adultSitePrevention: {
        enabled: false,
    },
};

// Comprehensive list of known adult domains
var adultDomainsList = [
    "pornhub.com",
    "xvideos.com",
    "xnxx.com",
    "xhamster.com",
    "redtube.com",
    "youporn.com",
    "tube8.com",
    "spankbang.com",
    "beeg.com",
    "porn.com",
    "brazzers.com",
    "realitykings.com",
    "bangbros.com",
    "naughtyamerica.com",
    "mofos.com",
    "wicked.com",
    "digitalplayground.com",
    "twistys.com",
    "babes.com",
    "pornpics.com",
    "hentaihaven.xxx",
    "rule34.xxx",
    "nhentai.net",
    "e-hentai.org",
    "hanime.tv",
    "cam4.com",
    "chaturbate.com",
    "bongacams.com",
    "stripchat.com",
    "livejasmin.com",
    "myfreecams.com",
    "camsoda.com",
    "flirt4free.com",
    "streamate.com",
    "imlive.com",
    "onlyfans.com",
    "fansly.com",
    "manyvids.com",
    "clips4sale.com",
    "motherless.com",
    "ixxx.com",
    "txxx.com",
    "hclips.com",
    "drtuber.com",
    "porntrex.com",
    "eporner.com",
    "tnaflix.com",
    "pornone.com",
    "thumbzilla.com",
    "porndig.com",
    "fuq.com",
    "4tube.com",
    "fapster.xxx",
    "pornpics.de",
    "sex.com",
    "youjizz.com",
    "empflix.com",
    "sunporno.com",
    "porntube.com",
    "3movs.com",
    "gotporn.com",
    "porngo.com",
    "anyporn.com",
    "hdsex.org",
    "vporn.com",
    "nuvid.com",
    "fux.com",
    "porn300.com",
    "tubegalore.com",
    "pornmd.com",
    "ashemaletube.com",
    "trannytube.tv",
    "imagefap.com",
    "literotica.com",
    "bellesa.co",
    "daftsex.com",
    "sxyprn.com",
    "youporngay.com",
    "gaytube.com",
    "xtube.com",
    "slutload.com",
    "heavy-r.com",
    "efukt.com",
    "keezmovies.com",
    "extremetube.com",
    "pornbb.org",
    "freeones.com",
    "kindgirls.com",
    "metart.com",
    "femjoy.com",
    "hegre.com",
    "playboy.com",
    "penthouse.com",
    "hustler.com",
    "adultfriendfinder.com",
    "ashleymadison.com",
    "fetlife.com",
];

// Cached time from external API
var cachedTime = null;
var cachedTimeLocalRef = null; // Date.now() at time of cache, for interpolation
var timeRefreshInterval = null;

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function loadData() {
    try {
        var raw = fs.readFileSync(thirdEyeDataPath, "utf-8");
        var parsed = JSON.parse(raw);
        // Validate structure
        if (parsed && typeof parsed === "object") {
            thirdEyeData = {
                enabled: !!parsed.enabled,
                timerExpiry: parsed.timerExpiry || null,
                blockedURLs: Array.isArray(parsed.blockedURLs)
                    ? parsed.blockedURLs
                    : [],
                blockedKeywords: Array.isArray(parsed.blockedKeywords)
                    ? parsed.blockedKeywords
                    : [],
                adultSitePrevention: {
                    enabled: !!(
                        parsed.adultSitePrevention &&
                        parsed.adultSitePrevention.enabled
                    ),
                },
            };
        }
    } catch (e) {
        // File doesn't exist or is corrupted, use defaults
        thirdEyeData = {
            enabled: false,
            timerExpiry: null,
            blockedURLs: [],
            blockedKeywords: [],
            adultSitePrevention: {
                enabled: false,
            },
        };
    }
}

function saveData() {
    try {
        fs.writeFileSync(
            thirdEyeDataPath,
            JSON.stringify(thirdEyeData, null, 2),
            "utf-8",
        );
    } catch (e) {
        console.error("Third Eye: Failed to save data:", e);
    }
}

function broadcastUpdate() {
    // Send updated data to all windows
    windows.getAll().forEach(function (win) {
        try {
            getWindowWebContents(win).send(
                "thirdEyeDataUpdate",
                getPublicData(),
            );
        } catch (e) {
            // window might be destroyed
        }
    });
}

async function fetchExternalTime() {
    try {
        var response = await net.fetch(
            "https://aisenseapi.com/services/v1/datetime/+0530",
        );
        var json = await response.json();
        if (json && json.datetime) {
            cachedTime = new Date(json.datetime);
            cachedTimeLocalRef = Date.now();
            return cachedTime;
        }
        throw new Error("Invalid API response");
    } catch (e) {
        console.error("Third Eye: Failed to fetch external time:", e);
        return null;
    }
}

function getCurrentTime() {
    if (cachedTime && cachedTimeLocalRef) {
        // Interpolate from cached time using local elapsed time
        var elapsed = Date.now() - cachedTimeLocalRef;
        return new Date(cachedTime.getTime() + elapsed);
    }
    return null;
}

function isTimerActive() {
    if (!thirdEyeData.enabled || !thirdEyeData.timerExpiry) {
        return false;
    }
    var now = getCurrentTime();
    if (!now) {
        // Can't verify time, treat as active for safety
        return true;
    }
    var expiry = new Date(thirdEyeData.timerExpiry);
    if (now >= expiry) {
        // Timer has expired, disable
        thirdEyeData.enabled = false;
        thirdEyeData.timerExpiry = null;
        saveData();
        broadcastUpdate();
        return false;
    }
    return true;
}

function getPublicData() {
    return {
        enabled: thirdEyeData.enabled,
        timerExpiry: thirdEyeData.timerExpiry,
        blockedURLs: thirdEyeData.blockedURLs,
        blockedKeywords: thirdEyeData.blockedKeywords,
        adultSitePrevention: thirdEyeData.adultSitePrevention,
        adultDomainsList: adultDomainsList,
        timerActive: isTimerActive(),
        currentTime: getCurrentTime() ? getCurrentTime().toISOString() : null,
    };
}

// Normalize URL for matching
function normalizeURL(url) {
    try {
        url = url.toLowerCase().trim();
        url = url.replace(/^https?:\/\//, "");
        url = url.replace(/^www\./, "");
        url = url.replace(/\/+$/, "");
        return url;
    } catch (e) {
        return url;
    }
}

function extractDomain(url) {
    try {
        var normalized = normalizeURL(url);
        return normalized.split("/")[0].split(":")[0];
    } catch (e) {
        return "";
    }
}

// Check if a URL should be blocked
function shouldBlockURL(url) {
    if (!isTimerActive()) {
        return { blocked: false };
    }

    var normalizedUrl = normalizeURL(url);
    var domain = extractDomain(url);

    // Check blocked URLs
    for (var i = 0; i < thirdEyeData.blockedURLs.length; i++) {
        var entry = thirdEyeData.blockedURLs[i];
        if (!entry.enabled) continue;

        var blockedNorm = normalizeURL(entry.url);
        var blockedDomain = extractDomain(entry.url);

        // Exact match
        if (normalizedUrl === blockedNorm) {
            return { blocked: true, reason: "url", match: entry.url };
        }
        // Domain match (including subdomains)
        if (domain === blockedDomain || domain.endsWith("." + blockedDomain)) {
            return { blocked: true, reason: "domain", match: entry.url };
        }
    }

    // Check blocked keywords in URL
    for (var j = 0; j < thirdEyeData.blockedKeywords.length; j++) {
        var kwEntry = thirdEyeData.blockedKeywords[j];
        if (!kwEntry.enabled) continue;

        if (normalizedUrl.includes(kwEntry.keyword.toLowerCase())) {
            return {
                blocked: true,
                reason: "keyword_url",
                match: kwEntry.keyword,
            };
        }
    }

    // Check adult site prevention
    if (thirdEyeData.adultSitePrevention.enabled) {
        for (var k = 0; k < adultDomainsList.length; k++) {
            var adultDomain = adultDomainsList[k];
            if (domain === adultDomain || domain.endsWith("." + adultDomain)) {
                return {
                    blocked: true,
                    reason: "adult",
                    match: adultDomain,
                };
            }
        }
    }

    return { blocked: false };
}

// IPC Handlers
app.once("ready", async function () {
    loadData();

    // Fetch external time on startup
    await fetchExternalTime();

    // Refresh time every 5 minutes
    timeRefreshInterval = setInterval(
        function () {
            fetchExternalTime();
        },
        5 * 60 * 1000,
    );

    // Check timer expiry periodically (every 30 seconds)
    setInterval(function () {
        if (thirdEyeData.enabled && thirdEyeData.timerExpiry) {
            isTimerActive(); // This auto-disables if expired
        }
    }, 30 * 1000);

    // Get Third Eye data
    ipc.handle("thirdEye-getData", function () {
        return getPublicData();
    });

    // Check if URL should be blocked
    ipc.handle("thirdEye-checkURL", function (event, url) {
        return shouldBlockURL(url);
    });

    // Get current external time
    ipc.handle("thirdEye-getTime", async function () {
        var time = getCurrentTime();
        if (!time) {
            time = await fetchExternalTime();
        }
        return time ? time.toISOString() : null;
    });

    // Set timer
    ipc.handle("thirdEye-setTimer", async function (event, expiryISO) {
        var now = getCurrentTime();
        if (!now) {
            now = await fetchExternalTime();
        }
        if (!now) {
            return {
                success: false,
                error: "Cannot fetch current time. Please check your internet connection.",
            };
        }

        var expiry = new Date(expiryISO);
        var minTime = new Date(now.getTime() + 60 * 1000); // +1 minute minimum

        if (expiry < minTime) {
            return {
                success: false,
                error: "Timer must be set to at least 1 minute in the future.",
            };
        }

        // If timer is already active, only allow extension
        if (isTimerActive()) {
            var currentExpiry = new Date(thirdEyeData.timerExpiry);
            if (expiry <= currentExpiry) {
                return {
                    success: false,
                    error:
                        "Timer can only be extended, not reduced. Current expiry: " +
                        currentExpiry.toLocaleString(),
                };
            }
        }

        thirdEyeData.timerExpiry = expiry.toISOString();
        thirdEyeData.enabled = true;
        saveData();
        broadcastUpdate();

        return { success: true, expiry: thirdEyeData.timerExpiry };
    });

    // Add blocked URL (allowed even when timer is active)
    ipc.handle("thirdEye-addURL", function (event, url) {
        if (!url || !url.trim()) {
            return { success: false, error: "URL cannot be empty." };
        }

        var normalized = normalizeURL(url);
        // Check for duplicates
        var duplicate = thirdEyeData.blockedURLs.find(function (entry) {
            return normalizeURL(entry.url) === normalized;
        });
        if (duplicate) {
            return {
                success: false,
                error: "URL is already in the blocklist.",
            };
        }

        var entry = {
            id: generateId(),
            url: url.trim(),
            addedAt: new Date().toISOString(),
            enabled: true,
        };
        thirdEyeData.blockedURLs.push(entry);
        saveData();
        broadcastUpdate();
        return { success: true, entry: entry };
    });

    // Remove blocked URL
    ipc.handle("thirdEye-removeURL", function (event, id) {
        if (isTimerActive()) {
            return {
                success: false,
                error: "Cannot modify blocklist while timer is active.",
            };
        }
        var idx = thirdEyeData.blockedURLs.findIndex(function (e) {
            return e.id === id;
        });
        if (idx === -1) {
            return { success: false, error: "URL not found." };
        }
        thirdEyeData.blockedURLs.splice(idx, 1);
        saveData();
        broadcastUpdate();
        return { success: true };
    });

    // Add blocked keyword (allowed even when timer is active)
    ipc.handle("thirdEye-addKeyword", function (event, keyword) {
        if (!keyword || !keyword.trim()) {
            return { success: false, error: "Keyword cannot be empty." };
        }

        var lowerKw = keyword.trim().toLowerCase();
        var duplicate = thirdEyeData.blockedKeywords.find(function (entry) {
            return entry.keyword.toLowerCase() === lowerKw;
        });
        if (duplicate) {
            return {
                success: false,
                error: "Keyword is already in the blocklist.",
            };
        }

        var entry = {
            id: generateId(),
            keyword: keyword.trim(),
            addedAt: new Date().toISOString(),
            enabled: true,
        };
        thirdEyeData.blockedKeywords.push(entry);
        saveData();
        broadcastUpdate();
        return { success: true, entry: entry };
    });

    // Remove blocked keyword
    ipc.handle("thirdEye-removeKeyword", function (event, id) {
        if (isTimerActive()) {
            return {
                success: false,
                error: "Cannot modify blocklist while timer is active.",
            };
        }
        var idx = thirdEyeData.blockedKeywords.findIndex(function (e) {
            return e.id === id;
        });
        if (idx === -1) {
            return { success: false, error: "Keyword not found." };
        }
        thirdEyeData.blockedKeywords.splice(idx, 1);
        saveData();
        broadcastUpdate();
        return { success: true };
    });

    // Toggle adult site prevention
    ipc.handle("thirdEye-toggleAdult", function (event, enabled) {
        if (isTimerActive()) {
            return {
                success: false,
                error: "Cannot modify settings while timer is active.",
            };
        }
        thirdEyeData.adultSitePrevention.enabled = !!enabled;
        saveData();
        broadcastUpdate();
        return { success: true };
    });

    // Disable Third Eye (only when timer is not active)
    ipc.handle("thirdEye-disable", function () {
        if (isTimerActive()) {
            return {
                success: false,
                error: "Cannot disable while timer is active.",
            };
        }
        thirdEyeData.enabled = false;
        thirdEyeData.timerExpiry = null;
        saveData();
        broadcastUpdate();
        return { success: true };
    });

    // Check keyword match in DOM content (called from preload)
    ipc.handle("thirdEye-checkContent", function (event, textContent) {
        if (!isTimerActive()) {
            return { blocked: false };
        }

        var lowerContent = textContent.toLowerCase();
        for (var j = 0; j < thirdEyeData.blockedKeywords.length; j++) {
            var kwEntry = thirdEyeData.blockedKeywords[j];
            if (!kwEntry.enabled) continue;
            if (lowerContent.includes(kwEntry.keyword.toLowerCase())) {
                return {
                    blocked: true,
                    reason: "keyword_content",
                    match: kwEntry.keyword,
                };
            }
        }
        return { blocked: false };
    });

    // Get blocking rules for preload script (lightweight check data)
    ipc.handle("thirdEye-getBlockingRules", function () {
        if (!isTimerActive()) {
            return { active: false, keywords: [] };
        }
        return {
            active: true,
            keywords: thirdEyeData.blockedKeywords
                .filter(function (k) {
                    return k.enabled;
                })
                .map(function (k) {
                    return k.keyword.toLowerCase();
                }),
        };
    });
});
