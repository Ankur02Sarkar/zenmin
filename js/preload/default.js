/* imports common modules */

var electron = require("electron");
var ipc = electron.ipcRenderer;

var propertiesToClone = [
    "deltaX",
    "deltaY",
    "metaKey",
    "ctrlKey",
    "defaultPrevented",
    "clientX",
    "clientY",
];

function cloneEvent(e) {
    var obj = {};

    for (var i = 0; i < propertiesToClone.length; i++) {
        obj[propertiesToClone[i]] = e[propertiesToClone[i]];
    }
    return JSON.stringify(obj);
}

// workaround for Electron bug
setTimeout(() => {
    /* Used for swipe gestures */
    window.addEventListener("wheel", (e) => {
        ipc.send("wheel-event", cloneEvent(e));
    });

    var scrollTimeout = null;

    window.addEventListener("scroll", () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            ipc.send("scroll-position-change", Math.round(window.scrollY));
        }, 200);
    });
}, 0);

/* Used for picture in picture item in context menu */
ipc.on("getContextMenuData", (event, data) => {
    // check for video element to show picture-in-picture menu
    var hasVideo = Array.from(document.elementsFromPoint(data.x, data.y)).some(
        (el) => el.tagName === "VIDEO",
    );
    ipc.send("contextMenuData", { hasVideo });
});

ipc.on("enterPictureInPicture", (event, data) => {
    var videos = Array.from(document.elementsFromPoint(data.x, data.y)).filter(
        (el) => el.tagName === "VIDEO",
    );
    if (videos[0]) {
        videos[0].requestPictureInPicture();
    }
});

window.addEventListener("message", (e) => {
    if (!e.origin.startsWith("zenmin://")) {
        return;
    }

    if (e.data?.message === "showCredentialList") {
        ipc.send("showCredentialList");
    }

    if (e.data?.message === "showUserscriptDirectory") {
        ipc.send("showUserscriptDirectory");
    }

    if (e.data?.message === "downloadFile") {
        ipc.send("downloadFile", e.data.url);
    }

    if (e.data?.message === "getDownloadsListing") {
        ipc.send("getDownloadsListing");
    }

    if (e.data?.message === "openPath") {
        ipc.send("openPath", e.data.path);
    }

    if (e.data?.message === "getHistoryData") {
        ipc.send("getHistoryData");
    }

    if (e.data?.message === "deleteHistoryItem") {
        ipc.send("deleteHistoryItem", e.data.url);
    }

    if (e.data?.message === "clearAllHistory") {
        ipc.send("clearAllHistory");
    }
});

ipc.on("receiveDownloadsListing", function (e, data) {
    if (window.location.toString().startsWith("zenmin://")) {
        window.postMessage(
            { message: "receiveDownloadsListing", files: data },
            window.location.toString(),
        );
    }
});

ipc.on("receiveHistoryData", function (e, data) {
    if (window.location.toString().startsWith("zenmin://")) {
        window.postMessage(
            { message: "receiveHistoryData", items: data },
            window.location.toString(),
        );
    }
});
