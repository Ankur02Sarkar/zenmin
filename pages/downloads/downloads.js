const downloadsList = document.getElementById("downloads-list");
const emptyState = document.getElementById("empty-state");
const loadingState = document.getElementById("loading-state");

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const iconMap = {
    pdf: "carbon:pdf-file",
    doc: "carbon:doc",
    docx: "carbon:doc",
    xls: "carbon:spreadsheet",
    xlsx: "carbon:spreadsheet",
    ppt: "carbon:ppt-file",
    pptx: "carbon:ppt-file",
    txt: "carbon:document",
    jpg: "carbon:image",
    jpeg: "carbon:image",
    png: "carbon:image",
    gif: "carbon:image",
    svg: "carbon:image",
    mp3: "carbon:audio-file",
    wav: "carbon:audio-file",
    mp4: "carbon:video-file",
    mov: "carbon:video-file",
    avi: "carbon:video-file",
    zip: "carbon:zip-file",
    rar: "carbon:zip-file",
    "7z": "carbon:zip-file",
    exe: "carbon:exe-file",
    dmg: "carbon:exe-file",
    app: "carbon:app",
  };
  return iconMap[ext] || "carbon:file";
}

function formatFileSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(timestamp) {
  const date = new Date(timestamp * 1000);
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

function renderDownloads(files) {
  downloadsList.innerHTML = "";

  if (files.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  files.forEach(function (file) {
    const el = document.createElement("div");
    el.className = "download-item";
    el.innerHTML =
      '<div class="icon"><i class="i ' +
      getFileIcon(file.name) +
      '"></i></div>' +
      '<div class="info">' +
      '<div class="name">' +
      file.name +
      "</div>" +
      '<div class="details">' +
      formatFileSize(file.size) +
      "</div>" +
      "</div>" +
      '<div class="time">' +
      formatDate(file.mtime) +
      "</div>";
    el.addEventListener("click", function () {
      window.open("file://" + file.path);
    });
    downloadsList.appendChild(el);
  });
}

function loadDownloads() {
  const downloadsPath = ipc.sendSync("get-downloads-directory");

  if (!downloadsPath) {
    loadingState.hidden = true;
    emptyState.hidden = false;
    return;
  }

  fetch("file://" + downloadsPath + "?t=" + Date.now())
    .then(function (response) {
      return response.text();
    })
    .then(function (html) {
      loadingState.hidden = true;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const links = doc.querySelectorAll("a");

      const files = [];
      links.forEach(function (link) {
        const href = link.getAttribute("href");
        if (href && !href.endsWith("/") && !href.includes("?t=")) {
          const name = link.textContent || href.split("/").pop();
          if (name && name !== "Parent Directory" && name !== "../") {
            files.push({
              name: name,
              path: downloadsPath + "/" + name,
            });
          }
        }
      });

      files.sort(function (a, b) {
        return b.name.localeCompare(a.name);
      });

      renderDownloads(files);
    })
    .catch(function (err) {
      console.error("Error loading downloads:", err);
      emptyState.hidden = false;
    });
}

window.addEventListener("load", function () {
  loadDownloads();
});
