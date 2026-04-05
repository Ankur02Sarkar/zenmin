/* Third Eye - Configuration page logic
   Uses postMessage IPC to communicate with main process via preload bridge */

var thirdEyeData = null;
var timerInterval = null;

// DOM references
var statusBanner = document.getElementById("status-banner");
var statusLabel = document.getElementById("status-label");
var statusTimer = document.getElementById("status-timer");
var timerDateInput = document.getElementById("timer-date");
var timerTimeInput = document.getElementById("timer-time");
var btnSetTimer = document.getElementById("btn-set-timer");
var btnExtendTimer = document.getElementById("btn-extend-timer");
var timerError = document.getElementById("timer-error");
var timerSuccess = document.getElementById("timer-success");
var urlInput = document.getElementById("url-input");
var btnAddUrl = document.getElementById("btn-add-url");
var urlError = document.getElementById("url-error");
var urlList = document.getElementById("url-list");
var keywordInput = document.getElementById("keyword-input");
var btnAddKeyword = document.getElementById("btn-add-keyword");
var keywordError = document.getElementById("keyword-error");
var keywordList = document.getElementById("keyword-list");
var adultToggle = document.getElementById("adult-toggle");

// Set default date/time to now + 1 hour
function setDefaultDateTime() {
    var now = new Date();
    now.setHours(now.getHours() + 1);
    var dateStr = now.toISOString().split("T")[0];
    var timeStr = now.toTimeString().slice(0, 5);
    timerDateInput.value = dateStr;
    timerTimeInput.value = timeStr;
}

setDefaultDateTime();

// Show/hide message
function showMessage(el, text) {
    el.textContent = text;
    el.style.display = "block";
    setTimeout(function () {
        el.style.display = "none";
    }, 5000);
}

function hideMessage(el) {
    el.style.display = "none";
}

// Request data from main process
function requestData() {
    window.postMessage({ message: "thirdEye-getData" }, "*");
}

// Listen for responses
window.addEventListener("message", function (e) {
    if (!e.data || !e.data.message) return;

    if (e.data.message === "thirdEye-receiveData") {
        thirdEyeData = e.data.data;
        renderAll();
    }

    if (e.data.message === "thirdEye-response") {
        var result = e.data.result;
        var action = e.data.action;

        if (action === "setTimer" || action === "extendTimer") {
            if (result.success) {
                showMessage(
                    timerSuccess,
                    "Timer " +
                        (action === "extendTimer" ? "extended" : "set") +
                        " successfully!",
                );
                hideMessage(timerError);
                requestData();
            } else {
                showMessage(timerError, result.error);
            }
        }

        if (action === "addURL") {
            if (result.success) {
                urlInput.value = "";
                hideMessage(urlError);
                requestData();
            } else {
                showMessage(urlError, result.error);
            }
        }

        if (action === "removeURL") {
            if (result.success) {
                requestData();
            }
        }

        if (action === "addKeyword") {
            if (result.success) {
                keywordInput.value = "";
                hideMessage(keywordError);
                requestData();
            } else {
                showMessage(keywordError, result.error);
            }
        }

        if (action === "removeKeyword") {
            if (result.success) {
                requestData();
            }
        }

        if (action === "toggleAdult") {
            if (!result.success) {
                // Revert toggle
                adultToggle.checked = !adultToggle.checked;
            }
            requestData();
        }
    }
});

// Render all UI
function renderAll() {
    if (!thirdEyeData) return;

    renderStatus();
    renderURLList();
    renderKeywordList();
    renderAdultToggle();
    updateInputStates();
}

function renderStatus() {
    if (thirdEyeData.timerActive) {
        statusBanner.className = "status-banner status-active";
        statusLabel.textContent = "Status: ACTIVE";
        btnSetTimer.style.display = "none";
        btnExtendTimer.style.display = "inline-block";
        startCountdown();
    } else {
        statusBanner.className = "status-banner status-inactive";
        statusLabel.textContent = "Status: INACTIVE";
        statusTimer.textContent = "";
        btnSetTimer.style.display = "inline-block";
        btnExtendTimer.style.display = "none";
        stopCountdown();
    }
}

function startCountdown() {
    stopCountdown();
    updateCountdown();
    timerInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateCountdown() {
    if (!thirdEyeData || !thirdEyeData.timerExpiry) {
        statusTimer.textContent = "";
        return;
    }

    var now = new Date();
    var expiry = new Date(thirdEyeData.timerExpiry);
    var diff = expiry.getTime() - now.getTime();

    if (diff <= 0) {
        statusTimer.textContent = "Expired";
        stopCountdown();
        requestData(); // Refresh to get updated state
        return;
    }

    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((diff % (1000 * 60)) / 1000);

    var parts = [];
    if (days > 0) parts.push(days + "d");
    if (hours > 0) parts.push(hours + "h");
    parts.push(minutes + "m");
    parts.push(seconds + "s");

    statusTimer.textContent = parts.join(" ");
}

function renderURLList() {
    if (!thirdEyeData.blockedURLs || thirdEyeData.blockedURLs.length === 0) {
        urlList.innerHTML = '<div class="list-empty">No blocked URLs</div>';
        return;
    }

    urlList.innerHTML = "";
    thirdEyeData.blockedURLs.forEach(function (entry) {
        var item = document.createElement("div");
        item.className = "list-item";

        var text = document.createElement("span");
        text.className = "list-item-text";
        text.textContent = entry.url;

        var removeBtn = document.createElement("button");
        removeBtn.className = "list-item-remove";
        removeBtn.textContent = "\u00D7";
        removeBtn.type = "button";
        removeBtn.disabled = thirdEyeData.timerActive;
        removeBtn.addEventListener("click", function () {
            window.postMessage(
                {
                    message: "thirdEye-action",
                    action: "removeURL",
                    data: entry.id,
                },
                "*",
            );
        });

        item.appendChild(text);
        item.appendChild(removeBtn);
        urlList.appendChild(item);
    });
}

function renderKeywordList() {
    if (
        !thirdEyeData.blockedKeywords ||
        thirdEyeData.blockedKeywords.length === 0
    ) {
        keywordList.innerHTML =
            '<div class="list-empty">No blocked keywords</div>';
        return;
    }

    keywordList.innerHTML = "";
    thirdEyeData.blockedKeywords.forEach(function (entry) {
        var item = document.createElement("div");
        item.className = "list-item";

        var text = document.createElement("span");
        text.className = "list-item-text";
        text.textContent = entry.keyword;

        var removeBtn = document.createElement("button");
        removeBtn.className = "list-item-remove";
        removeBtn.textContent = "\u00D7";
        removeBtn.type = "button";
        removeBtn.disabled = thirdEyeData.timerActive;
        removeBtn.addEventListener("click", function () {
            window.postMessage(
                {
                    message: "thirdEye-action",
                    action: "removeKeyword",
                    data: entry.id,
                },
                "*",
            );
        });

        item.appendChild(text);
        item.appendChild(removeBtn);
        keywordList.appendChild(item);
    });
}

function renderAdultToggle() {
    adultToggle.checked =
        thirdEyeData.adultSitePrevention &&
        thirdEyeData.adultSitePrevention.enabled;
    adultToggle.disabled = thirdEyeData.timerActive;
}

function updateInputStates() {
    // Adding is always allowed; only remove/edit/toggle is locked while timer is active
    urlInput.placeholder = "Enter URL or domain (e.g. facebook.com)";
    keywordInput.placeholder = "Enter keyword to block";
    btnAddUrl.disabled = false;
    urlInput.disabled = false;
    btnAddKeyword.disabled = false;
    keywordInput.disabled = false;
}

// Event handlers
btnSetTimer.addEventListener("click", function () {
    var dateVal = timerDateInput.value;
    var timeVal = timerTimeInput.value;

    if (!dateVal || !timeVal) {
        showMessage(timerError, "Please set both date and time.");
        return;
    }

    var expiryISO = new Date(dateVal + "T" + timeVal).toISOString();
    window.postMessage(
        {
            message: "thirdEye-action",
            action: "setTimer",
            data: expiryISO,
        },
        "*",
    );
});

btnExtendTimer.addEventListener("click", function () {
    var dateVal = timerDateInput.value;
    var timeVal = timerTimeInput.value;

    if (!dateVal || !timeVal) {
        showMessage(timerError, "Please set both date and time for extension.");
        return;
    }

    var expiryISO = new Date(dateVal + "T" + timeVal).toISOString();
    window.postMessage(
        {
            message: "thirdEye-action",
            action: "extendTimer",
            data: expiryISO,
        },
        "*",
    );
});

btnAddUrl.addEventListener("click", function () {
    var url = urlInput.value.trim();
    if (!url) {
        showMessage(urlError, "Please enter a URL.");
        return;
    }
    window.postMessage(
        {
            message: "thirdEye-action",
            action: "addURL",
            data: url,
        },
        "*",
    );
});

urlInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        btnAddUrl.click();
    }
});

btnAddKeyword.addEventListener("click", function () {
    var keyword = keywordInput.value.trim();
    if (!keyword) {
        showMessage(keywordError, "Please enter a keyword.");
        return;
    }
    window.postMessage(
        {
            message: "thirdEye-action",
            action: "addKeyword",
            data: keyword,
        },
        "*",
    );
});

keywordInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
        btnAddKeyword.click();
    }
});

adultToggle.addEventListener("change", function () {
    window.postMessage(
        {
            message: "thirdEye-action",
            action: "toggleAdult",
            data: adultToggle.checked,
        },
        "*",
    );
});

// Listen for live updates from main process
window.addEventListener("message", function (e) {
    if (e.data && e.data.message === "thirdEye-liveUpdate") {
        thirdEyeData = e.data.data;
        renderAll();
    }
});

// Initial data request
requestData();
