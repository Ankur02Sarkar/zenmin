const { ipcRenderer } = require("electron");
const webviews = require("webviews.js");

const permissionRequests = {
    requests: [],
    listeners: [],
    grantPermission: (permissionId) => {
        permissionRequests.requests.forEach((request) => {
            if (request.permissionId && request.permissionId === permissionId) {
                ipcRenderer.send("permissionGranted", permissionId);
            }
        });
    },
    getIcons: (request) => {
        if (request.permission === "notifications") {
            return ["carbon:chat"];
        } else if (request.permission === "pointerLock") {
            return ["carbon:cursor-1"];
        } else if (
            request.permission === "media" &&
            request.details.mediaTypes
        ) {
            var mediaIcons = {
                video: "carbon:video",
                audio: "carbon:microphone",
            };
            return request.details.mediaTypes.map((t) => mediaIcons[t]);
        }
        return [];
    },
    getButtons: (tabId) => {
        var buttons = [];
        permissionRequests.requests.forEach((request) => {
            const icons = permissionRequests.getIcons(request);
            //don't display buttons for unsupported permission types
            if (icons.length === 0) {
                return;
            }

            if (request.tabId === tabId) {
                var button = document.createElement("button");
                button.className = "tab-icon permission-request-icon";
                if (request.granted) {
                    button.classList.add("active");
                }
                icons.forEach((icon) => {
                    var el = document.createElement("i");
                    el.className = "i " + icon;
                    button.appendChild(el);
                });
                button.addEventListener("click", (e) => {
                    e.stopPropagation();
                    if (request.granted) {
                        webviews.callAsync(tabId, "reload");
                    } else {
                        permissionRequests.grantPermission(
                            request.permissionId,
                        );
                        button.classList.add("active");
                    }
                });
                buttons.push(button);
            }
        });
        return buttons;
    },
    onChange: (listener) => {
        permissionRequests.listeners.push(listener);
    },
    initialize: () => {
        ipcRenderer.on("updatePermissions", (e, data) => {
            var oldData = permissionRequests.requests;
            permissionRequests.requests = data;
            oldData.forEach((req) => {
                permissionRequests.listeners.forEach((listener) =>
                    listener(req.tabId),
                );
            });
            permissionRequests.requests.forEach((req) => {
                permissionRequests.listeners.forEach((listener) =>
                    listener(req.tabId),
                );
            });
        });
    },
};

permissionRequests.initialize();

module.exports = permissionRequests;
