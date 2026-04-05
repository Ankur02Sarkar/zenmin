var allHistory = [];
var filteredHistory = [];
var recentlyClosed = [];

var searchInput = document.getElementById("search-input");
var historyList = document.getElementById("history-list");
var emptyState = document.getElementById("empty-state");
var loadingState = document.getElementById("loading-state");
var errorState = document.getElementById("error-state");
var clearAllButton = document.getElementById("clear-all-button");
var retryButton = document.getElementById("retry-button");

// Tab elements
var tabHistory = document.getElementById("tab-history");
var tabClosed = document.getElementById("tab-closed");
var historyContainer = document.getElementById("history-container");
var closedContainer = document.getElementById("closed-container");
var closedList = document.getElementById("closed-list");
var closedEmpty = document.getElementById("closed-empty");

var activeTab = "history"; // "history" or "closed"

function formatDate(timestamp) {
    var date = new Date(timestamp);
    var now = new Date();
    var diff = now - date;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return "A few minutes ago";
    if (diff < 86400000) return "Today";
    if (diff < 172800000) return "Yesterday";
    if (diff < 604800000) return "This week";
    if (diff < 2592000000) return "This month";

    return date.toLocaleDateString();
}

function renderHistory() {
    historyList.innerHTML = "";

    if (filteredHistory.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    var lastDate = "";

    filteredHistory.forEach(function (item) {
        var itemDate = formatDate(item.lastVisit);
        if (itemDate !== lastDate) {
            var heading = document.createElement("div");
            heading.className = "date-heading";
            heading.textContent = itemDate;
            historyList.appendChild(heading);
            lastDate = itemDate;
        }

        var el = document.createElement("div");
        el.className = "history-item";

        var infoEl = document.createElement("div");
        infoEl.className = "info";

        var titleEl = document.createElement("div");
        titleEl.className = "title";
        titleEl.textContent = item.title || item.url;

        var urlEl = document.createElement("div");
        urlEl.className = "url";
        urlEl.textContent = item.url;

        infoEl.appendChild(titleEl);
        infoEl.appendChild(urlEl);
        el.appendChild(infoEl);

        el.addEventListener("click", function () {
            window.location.href = item.url;
        });

        historyList.appendChild(el);
    });
}

function renderRecentlyClosed() {
    closedList.innerHTML = "";

    if (recentlyClosed.length === 0) {
        closedEmpty.hidden = false;
        return;
    }

    closedEmpty.hidden = true;

    var lastDate = "";

    recentlyClosed.forEach(function (item, index) {
        var itemDate = formatDate(item.closedAt);
        if (itemDate !== lastDate) {
            var heading = document.createElement("div");
            heading.className = "date-heading";
            heading.textContent = itemDate;
            closedList.appendChild(heading);
            lastDate = itemDate;
        }

        var el = document.createElement("div");
        el.className = "history-item closed-item";

        var infoEl = document.createElement("div");
        infoEl.className = "info";

        var titleEl = document.createElement("div");
        titleEl.className = "title";
        titleEl.textContent = item.title || item.url;

        var urlEl = document.createElement("div");
        urlEl.className = "url";
        var urlText = item.url;
        if (item.groupName) {
            urlText += "  \u00B7  " + item.groupName;
        }
        urlEl.textContent = urlText;

        infoEl.appendChild(titleEl);
        infoEl.appendChild(urlEl);
        el.appendChild(infoEl);

        var restoreBtn = document.createElement("button");
        restoreBtn.className = "restore-btn";
        restoreBtn.textContent = "Restore";
        restoreBtn.type = "button";
        restoreBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            postMessage({ message: "restoreClosedTab", index: index }, "*");
            // Remove from local list and re-render
            recentlyClosed.splice(index, 1);
            renderRecentlyClosed();
        });

        el.appendChild(restoreBtn);

        el.addEventListener("click", function () {
            window.location.href = item.url;
        });

        closedList.appendChild(el);
    });
}

function switchTab(tab) {
    activeTab = tab;
    if (tab === "history") {
        tabHistory.classList.add("active");
        tabClosed.classList.remove("active");
        historyContainer.hidden = false;
        closedContainer.hidden = true;
        clearAllButton.style.display = "";
        searchInput.placeholder = "Search history...";
    } else {
        tabHistory.classList.remove("active");
        tabClosed.classList.add("active");
        historyContainer.hidden = true;
        closedContainer.hidden = false;
        clearAllButton.style.display = "none";
        searchInput.placeholder = "Search closed tabs...";
        loadRecentlyClosed();
    }
}

function loadHistory() {
    loadingState.hidden = false;
    emptyState.hidden = true;
    errorState.hidden = true;
    historyList.innerHTML = "";

    postMessage({ message: "getHistoryData" });

    var timeout = setTimeout(function () {
        if (!loadingState.hidden) {
            loadingState.hidden = true;
            errorState.hidden = false;
        }
    }, 10000);

    window._historyTimeout = timeout;
}

function loadRecentlyClosed() {
    postMessage({ message: "getRecentlyClosed" }, "*");
}

window.addEventListener("message", function (e) {
    if (e.data && e.data.message === "receiveHistoryData") {
        clearTimeout(window._historyTimeout);
        loadingState.hidden = true;
        allHistory = e.data.items || [];
        allHistory.sort(function (a, b) {
            return b.lastVisit - a.lastVisit;
        });
        filteredHistory = allHistory;
        renderHistory();
    }

    if (e.data && e.data.message === "receiveRecentlyClosed") {
        recentlyClosed = e.data.items || [];
        renderRecentlyClosed();
    }

    if (e.data && e.data.message === "closedTabRestored") {
        // Tab was restored, reload the list
        loadRecentlyClosed();
    }
});

searchInput.addEventListener("input", function () {
    var query = searchInput.value.toLowerCase();
    if (activeTab === "history") {
        if (!query) {
            filteredHistory = allHistory;
        } else {
            filteredHistory = allHistory.filter(function (item) {
                return (
                    (item.title &&
                        item.title.toLowerCase().indexOf(query) !== -1) ||
                    item.url.toLowerCase().indexOf(query) !== -1
                );
            });
        }
        renderHistory();
    } else {
        // Filter recently closed
        if (!query) {
            renderRecentlyClosed();
        } else {
            var filtered = recentlyClosed.filter(function (item) {
                return (
                    (item.title &&
                        item.title.toLowerCase().indexOf(query) !== -1) ||
                    item.url.toLowerCase().indexOf(query) !== -1
                );
            });
            closedList.innerHTML = "";
            if (filtered.length === 0) {
                closedEmpty.hidden = false;
                return;
            }
            closedEmpty.hidden = true;
            filtered.forEach(function (item) {
                var el = document.createElement("div");
                el.className = "history-item closed-item";
                var infoEl = document.createElement("div");
                infoEl.className = "info";
                var titleEl = document.createElement("div");
                titleEl.className = "title";
                titleEl.textContent = item.title || item.url;
                var urlEl = document.createElement("div");
                urlEl.className = "url";
                urlEl.textContent = item.url;
                infoEl.appendChild(titleEl);
                infoEl.appendChild(urlEl);
                el.appendChild(infoEl);
                el.addEventListener("click", function () {
                    window.location.href = item.url;
                });
                closedList.appendChild(el);
            });
        }
    }
});

tabHistory.addEventListener("click", function () {
    switchTab("history");
});

tabClosed.addEventListener("click", function () {
    switchTab("closed");
});

if (clearAllButton) {
    clearAllButton.addEventListener("click", function () {
        if (activeTab === "history") {
            if (confirm("Clear all history and browsing data?")) {
                postMessage({ message: "clearAllHistory" });
                allHistory = [];
                filteredHistory = [];
                renderHistory();
            }
        }
    });
}

if (retryButton) {
    retryButton.addEventListener("click", function () {
        loadHistory();
    });
}

window.addEventListener("load", function () {
    loadHistory();
});
