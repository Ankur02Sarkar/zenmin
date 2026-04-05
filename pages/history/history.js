var allHistory = [];
var filteredHistory = [];

var searchInput = document.getElementById("search-input");
var historyList = document.getElementById("history-list");
var emptyState = document.getElementById("empty-state");
var loadingState = document.getElementById("loading-state");
var errorState = document.getElementById("error-state");
var clearAllButton = document.getElementById("clear-all-button");
var retryButton = document.getElementById("retry-button");

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
});

searchInput.addEventListener("input", function () {
    var query = searchInput.value.toLowerCase();
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
});

if (clearAllButton) {
    clearAllButton.addEventListener("click", function () {
        if (confirm("Clear all history and browsing data?")) {
            postMessage({ message: "clearAllHistory" });
            allHistory = [];
            filteredHistory = [];
            renderHistory();
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
