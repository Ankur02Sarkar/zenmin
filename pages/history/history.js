var places = null;
var allHistory = [];
var filteredHistory = [];

const searchInput = document.getElementById("search-input");
const historyList = document.getElementById("history-list");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  if (diff < 60000) return l("timeRangeJustNow");
  if (diff < 3600000) return l("timeRangeMinutes");
  if (diff < 86400000) return l("timeRangeToday");
  if (diff < 172800000) return l("timeRangeYesterday");
  if (diff < 604800000) return l("timeRangeWeek");
  if (diff < 2592000000) return l("timeRangeMonth");
  if (diff < 31536000000) return l("timeRangeYear");
  return l("timeRangeLongerAgo");
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
    const itemDate = formatDate(item.lastVisit);
    if (itemDate !== lastDate) {
      const heading = document.createElement("div");
      heading.className = "date-heading";
      heading.textContent = itemDate;
      historyList.appendChild(heading);
      lastDate = itemDate;
    }

    const el = document.createElement("div");
    el.className = "history-item";
    el.innerHTML =
      '<div class="info">' +
      '<div class="title">' +
      (item.title || item.url) +
      "</div>" +
      '<div class="url">' +
      item.url +
      "</div>" +
      "</div>";
    el.addEventListener("click", function () {
      window.location.href = item.url;
    });
    historyList.appendChild(el);
  });
}

function loadHistory() {
  if (!places) {
    places = window.places;
  }

  if (!places) {
    setTimeout(loadHistory, 500);
    return;
  }

  places
    .getHistory()
    .then(function (items) {
      loadingState.hidden = true;
      allHistory = items || [];
      allHistory.sort(function (a, b) {
        return b.lastVisit - a.lastVisit;
      });
      filteredHistory = allHistory;
      renderHistory();
    })
    .catch(function (err) {
      console.error("Error loading history:", err);
      loadingState.hidden = true;
    });
}

searchInput.addEventListener("input", function () {
  const query = searchInput.value.toLowerCase();
  if (!query) {
    filteredHistory = allHistory;
  } else {
    filteredHistory = allHistory.filter(function (item) {
      return (
        (item.title && item.title.toLowerCase().includes(query)) ||
        item.url.toLowerCase().includes(query)
      );
    });
  }
  renderHistory();
});

window.addEventListener("load", function () {
  loadHistory();
});
