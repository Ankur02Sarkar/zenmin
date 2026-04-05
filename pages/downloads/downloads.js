var downloadsList = document.getElementById("downloads-list");
var emptyState = document.getElementById("empty-state");
var loadingState = document.getElementById("loading-state");
var errorState = document.getElementById("error-state");
var retryButton = document.getElementById("retry-button");

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    var k = 1024;
    var sizes = ["B", "KB", "MB", "GB", "TB"];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

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

function getFileExtIcon(name) {
    var ext = (name.split(".").pop() || "").toLowerCase();
    var map = {
        pdf: "carbon:document-pdf",
        doc: "carbon:document",
        docx: "carbon:document",
        xls: "carbon:table-split",
        xlsx: "carbon:table-split",
        jpg: "carbon:image",
        jpeg: "carbon:image",
        png: "carbon:image",
        gif: "carbon:image",
        webp: "carbon:image",
        svg: "carbon:image",
        mp3: "carbon:music",
        wav: "carbon:music",
        flac: "carbon:music",
        mp4: "carbon:video",
        mov: "carbon:video",
        avi: "carbon:video",
        mkv: "carbon:video",
        zip: "carbon:zip",
        rar: "carbon:zip",
        "7z": "carbon:zip",
        gz: "carbon:zip",
        tar: "carbon:zip",
        exe: "carbon:application",
        dmg: "carbon:application",
        app: "carbon:application",
        js: "carbon:code",
        ts: "carbon:code",
        py: "carbon:code",
        html: "carbon:code",
        css: "carbon:code",
        txt: "carbon:document-blank",
        md: "carbon:document-blank",
        csv: "carbon:document-blank",
    };
    return map[ext] || "carbon:document-blank";
}

function renderDownloads(files) {
    downloadsList.innerHTML = "";

    if (!files || files.length === 0) {
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;

    files.forEach(function (file) {
        var el = document.createElement("div");
        el.className = "download-item";

        var iconEl = document.createElement("div");
        iconEl.className = "download-icon";
        iconEl.innerHTML =
            '<i class="i ' + getFileExtIcon(file.name) + '"></i>';

        var infoEl = document.createElement("div");
        infoEl.className = "download-info";

        var nameEl = document.createElement("div");
        nameEl.className = "download-name";
        nameEl.textContent = file.name;

        var detailsEl = document.createElement("div");
        detailsEl.className = "download-details";
        detailsEl.textContent =
            formatFileSize(file.size) + " \u2022 " + formatDate(file.mtime);

        infoEl.appendChild(nameEl);
        infoEl.appendChild(detailsEl);

        el.appendChild(iconEl);
        el.appendChild(infoEl);

        el.addEventListener("click", function () {
            postMessage({ message: "openPath", path: file.path });
        });

        downloadsList.appendChild(el);
    });
}

function loadDownloads() {
    loadingState.hidden = false;
    emptyState.hidden = true;
    errorState.hidden = true;
    downloadsList.innerHTML = "";

    postMessage({ message: "getDownloadsListing" });

    // timeout after 10 seconds
    var timeout = setTimeout(function () {
        if (!loadingState.hidden) {
            loadingState.hidden = true;
            errorState.hidden = false;
        }
    }, 10000);

    window._downloadsTimeout = timeout;
}

window.addEventListener("message", function (e) {
    if (e.data && e.data.message === "receiveDownloadsListing") {
        clearTimeout(window._downloadsTimeout);
        loadingState.hidden = true;
        renderDownloads(e.data.files);
    }
});

if (retryButton) {
    retryButton.addEventListener("click", function () {
        loadDownloads();
    });
}

window.addEventListener("load", function () {
    loadDownloads();
});
