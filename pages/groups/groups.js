/* Groups page - manages tab groups (tasks) */

var groupsContainer = document.getElementById("groups-container");
var emptyState = document.getElementById("empty-state");
var btnNewGroup = document.getElementById("btn-new-group");
var groupsData = null;

function requestData() {
    postMessage({ message: "getGroupsData" }, "*");
}

function renderGroups() {
    if (!groupsData || groupsData.length === 0) {
        emptyState.hidden = false;
        groupsContainer.innerHTML = "";
        groupsContainer.appendChild(emptyState);
        return;
    }

    emptyState.hidden = true;
    groupsContainer.innerHTML = "";

    groupsData.forEach(function (group, groupIndex) {
        var card = document.createElement("div");
        card.className = "group-card";

        // Header
        var header = document.createElement("div");
        header.className = "group-header";

        var colorDot = document.createElement("span");
        colorDot.className = "group-color-indicator";
        colorDot.style.backgroundColor = group.color || "#4285f4";

        var nameInput = document.createElement("input");
        nameInput.className = "group-name-input";
        nameInput.value = group.name || "Group " + (groupIndex + 1);
        nameInput.placeholder = "Group name";
        nameInput.addEventListener("change", function () {
            postMessage(
                {
                    message: "groups-action",
                    action: "renameGroup",
                    data: { groupId: group.id, name: nameInput.value },
                },
                "*",
            );
        });

        var meta = document.createElement("span");
        meta.className = "group-meta";
        meta.textContent =
            group.tabCount + (group.tabCount === 1 ? " tab" : " tabs");

        var actions = document.createElement("div");
        actions.className = "group-actions";

        if (group.isCurrent) {
            var badge = document.createElement("span");
            badge.className = "current-badge";
            badge.textContent = "Active";
            actions.appendChild(badge);
        }

        var deleteBtn = document.createElement("button");
        deleteBtn.className = "group-action-btn danger";
        deleteBtn.textContent = "Delete";
        deleteBtn.type = "button";
        deleteBtn.addEventListener("click", function () {
            if (confirm("Delete this group and all its tabs?")) {
                postMessage(
                    {
                        message: "groups-action",
                        action: "deleteGroup",
                        data: { groupId: group.id },
                    },
                    "*",
                );
            }
        });
        actions.appendChild(deleteBtn);

        header.appendChild(colorDot);
        header.appendChild(nameInput);
        header.appendChild(meta);
        header.appendChild(actions);
        card.appendChild(header);

        // Tabs list
        var tabsList = document.createElement("div");
        tabsList.className = "group-tabs";

        if (!group.tabs || group.tabs.length === 0) {
            var emptyTabs = document.createElement("div");
            emptyTabs.className = "empty-tabs";
            emptyTabs.textContent = "No tabs in this group";
            tabsList.appendChild(emptyTabs);
        } else {
            group.tabs.forEach(function (tab) {
                var tabEl = document.createElement("div");
                tabEl.className = "group-tab-item";

                var tabTitle = document.createElement("span");
                tabTitle.className = "group-tab-title";
                tabTitle.textContent = tab.title || tab.url || "New Tab";

                var tabUrl = document.createElement("span");
                tabUrl.className = "group-tab-url";
                try {
                    tabUrl.textContent = tab.url
                        ? new URL(tab.url).hostname
                        : "";
                } catch (e) {
                    tabUrl.textContent = tab.url || "";
                }

                var removeBtn = document.createElement("button");
                removeBtn.className = "group-tab-remove";
                removeBtn.textContent = "\u00D7";
                removeBtn.type = "button";
                removeBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    postMessage(
                        {
                            message: "groups-action",
                            action: "closeTab",
                            data: { groupId: group.id, tabId: tab.id },
                        },
                        "*",
                    );
                });

                tabEl.appendChild(tabTitle);
                tabEl.appendChild(tabUrl);
                tabEl.appendChild(removeBtn);

                tabEl.addEventListener("click", function () {
                    postMessage(
                        {
                            message: "groups-action",
                            action: "switchToTab",
                            data: { groupId: group.id, tabId: tab.id },
                        },
                        "*",
                    );
                });

                tabsList.appendChild(tabEl);
            });
        }

        card.appendChild(tabsList);
        groupsContainer.appendChild(card);
    });
}

// Listen for responses
window.addEventListener("message", function (e) {
    if (!e.data || !e.data.message) return;

    if (e.data.message === "receiveGroupsData") {
        groupsData = e.data.data;
        renderGroups();
    }

    if (e.data.message === "groups-response") {
        // Refresh data after any action
        requestData();
    }
});

btnNewGroup.addEventListener("click", function () {
    postMessage(
        {
            message: "groups-action",
            action: "createGroup",
            data: {},
        },
        "*",
    );
});

// Initial load
requestData();
