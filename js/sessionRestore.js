var browserUI = require("browserUI.js");
var webviews = require("webviews.js");
var tabEditor = require("navbar/tabEditor.js");
var tabState = require("tabState.js");
var settings = require("util/settings/settings.js");
var taskOverlay = require("taskOverlay/taskOverlay.js");
const writeFileAtomic = require("write-file-atomic");
const statistics = require("js/statistics.js");

const RECENTLY_CLOSED_MAX = 50;

const sessionRestore = {
    savePath:
        window.globalArgs["user-data-path"] +
        (platformType === "windows"
            ? "\\sessionRestore.json"
            : "/sessionRestore.json"),
    previousState: null,
    recentlyClosed: [],
    save: (forceSave, sync) => {
        //only one window (the focused one) should be responsible for saving session restore data
        if (!document.body.classList.contains("focused")) {
            return;
        }

        var stateString = JSON.stringify(tasks.getStringifyableState());
        var data = {
            version: 2,
            state: JSON.parse(stateString),
            recentlyClosed: sessionRestore.recentlyClosed,
            saveTime: Date.now(),
        };

        // save all tabs that aren't private

        for (var i = 0; i < data.state.tasks.length; i++) {
            data.state.tasks[i].tabs = data.state.tasks[i].tabs.filter(
                (tab) => !tab.private,
            );
        }

        //if startupTabOption is "open a new blank task", don't save any tabs in the current task
        if (settings.get("startupTabOption") === 3) {
            for (var i = 0; i < data.state.tasks.length; i++) {
                if (tasks.get(data.state.tasks[i].id).selectedInWindow) {
                    //need to re-fetch the task because temporary properties have been removed
                    data.state.tasks[i].tabs = [];
                }
            }
        }

        if (
            forceSave === true ||
            stateString !== sessionRestore.previousState
        ) {
            if (sync === true) {
                writeFileAtomic.sync(
                    sessionRestore.savePath,
                    JSON.stringify(data),
                    {},
                );
            } else {
                writeFileAtomic(
                    sessionRestore.savePath,
                    JSON.stringify(data),
                    {},
                    (err) => {
                        if (err) {
                            console.warn(err);
                            statistics.incrementValue(
                                "sessionRestoreSaveAsyncWriteErrors",
                            );
                        }
                    },
                );
            }
            sessionRestore.previousState = stateString;
        }
    },
    restoreFromFile: () => {
        var savedStringData;
        try {
            savedStringData = fs.readFileSync(sessionRestore.savePath, "utf-8");
        } catch (e) {
            console.warn("failed to read session restore data", e);
        }

        var startupConfigOption = settings.get("startupTabOption") || 2;
        /*
    1 - reopen last task
    2 - open new task, keep old tabs in background
    3 - discard old tabs and open new task
    */

        /*
    Disabled - show a user survey on startup
    // the survey should only be shown after an upgrade from an earlier version
    var shouldShowSurvey = false
    if (savedStringData && !localStorage.getItem('1.15survey')) {
      shouldShowSurvey = true
    }
    localStorage.setItem('1.15survey', 'true')
    */

        try {
            // first run, show the tour
            if (!savedStringData) {
                tasks.setSelected(tasks.add()); // create a new task

                var homepage = settings.get("homepage");
                var newTabUrl =
                    homepage || "https://minbrowser.github.io/min/tour";
                var newTab = tasks.getSelected().tabs.add({
                    url: newTabUrl,
                });
                browserUI.addTab(newTab, {
                    enterEditMode: false,
                });
                return;
            }

            var data = JSON.parse(savedStringData);

            // the data isn't restorable
            if (
                (data.version && data.version !== 2) ||
                (data.state &&
                    data.state.tasks &&
                    data.state.tasks.length === 0)
            ) {
                tasks.setSelected(tasks.add());

                browserUI.addTab(tasks.getSelected().tabs.add());
                return;
            }

            // restore recently closed tabs
            if (Array.isArray(data.recentlyClosed)) {
                sessionRestore.recentlyClosed = data.recentlyClosed.slice(
                    0,
                    RECENTLY_CLOSED_MAX,
                );
            }

            // add the saved tasks

            data.state.tasks.forEach((task) => {
                // restore the task item
                tasks.add(task);

                /*
        If the task contained only private tabs, none of the tabs will be contained in the session restore data, but tasks must always have at least 1 tab, so create a new empty tab if the task doesn't have any.
        */
                if (task.tabs.length === 0) {
                    tasks.get(task.id).tabs.add();
                }
            });

            var mostRecentTasks = tasks.slice().sort((a, b) => {
                return (
                    tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
                );
            });
            if (mostRecentTasks.length > 0) {
                tasks.setSelected(mostRecentTasks[0].id);
            }

            // switch to the previously selected tasks

            if (
                tasks.getSelected().tabs.isEmpty() ||
                startupConfigOption === 1
            ) {
                browserUI.switchToTask(mostRecentTasks[0].id);
                if (tasks.getSelected().tabs.isEmpty()) {
                    tabEditor.show(tasks.getSelected().tabs.getSelected());
                }
            } else {
                window.createdNewTaskOnStartup = true;
                // try to reuse a previous empty task
                var lastTask = tasks.byIndex(tasks.getLength() - 1);
                if (lastTask && lastTask.tabs.isEmpty() && !lastTask.name) {
                    browserUI.switchToTask(lastTask.id);
                    tabEditor.show(lastTask.tabs.getSelected());
                } else {
                    browserUI.addTask();
                }
            }

            /* Disabled - show user survey
      // if this isn't the first run, and the survey popup hasn't been shown yet, show it
      if (shouldShowSurvey) {
        fetch('https://minbrowser.org/survey/survey15.json').then(function (response) {
          return response.json()
        }).then(function (data) {
          setTimeout(function () {
            if (data.available && data.url) {
              if (tasks.getSelected().tabs.isEmpty()) {
                webviews.update(tasks.getSelected().tabs.getSelected(), data.url)
                tabEditor.hide()
              } else {
                var surveyTab = tasks.getSelected().tabs.add({
                  url: data.url
                })
                browserUI.addTab(surveyTab, {
                  enterEditMode: false
                })
              }
            }
          }, 200)
        })
      }
      */
        } catch (e) {
            // an error occured while restoring the session data

            console.error("restoring session failed: ", e);

            var backupSavePath = require("path").join(
                window.globalArgs["user-data-path"],
                "sessionRestoreBackup-" + Date.now() + ".json",
            );

            writeFileAtomic.sync(backupSavePath, savedStringData, {});

            // destroy any tabs that were created during the restore attempt
            tabState.initialize();

            // create a new tab with an explanation of what happened
            var newTask = tasks.add();
            var newSessionErrorTab = tasks.get(newTask).tabs.add({
                url:
                    "zenmin://app/pages/sessionRestoreError/index.html?backupLoc=" +
                    encodeURIComponent(backupSavePath),
            });

            browserUI.switchToTask(newTask);
            browserUI.switchToTab(newSessionErrorTab);

            statistics.incrementValue("sessionRestorationErrors");
        }
    },
    syncWithWindow: () => {
        const data = ipc.sendSync("request-tab-state");
        console.log("got from window", data);

        data.tasks.forEach((task) => {
            // restore the task item
            tasks.add(task, undefined, false);
        });

        if (Object.hasOwn(window.globalArgs, "initial-task")) {
            browserUI.switchToTask(window.globalArgs["initial-task"]);
            return;
        }

        // reuse an existing task or create a new task in this window
        // same as windowSync.js
        var newTaskCandidates = tasks
            .filter(
                (task) =>
                    task.tabs.isEmpty() && !task.selectedInWindow && !task.name,
            )
            .sort((a, b) => {
                return (
                    tasks.getLastActivity(b.id) - tasks.getLastActivity(a.id)
                );
            });
        if (newTaskCandidates.length > 0) {
            browserUI.switchToTask(newTaskCandidates[0].id);
            tabEditor.show(tasks.getSelected().tabs.getSelected());
        } else {
            browserUI.addTask();
        }
    },
    restore: () => {
        if (Object.hasOwn(window.globalArgs, "initial-window")) {
            sessionRestore.restoreFromFile();
        } else {
            sessionRestore.syncWithWindow();
        }
        if (
            settings.get("newWindowOption") === 2 &&
            !Object.hasOwn(window.globalArgs, "launch-window") &&
            !Object.hasOwn(window.globalArgs, "initial-task")
        ) {
            taskOverlay.show();
        }
    },
    addToRecentlyClosed: (tabData, groupName) => {
        if (!tabData || !tabData.url || tabData.private) return;
        sessionRestore.recentlyClosed.unshift({
            url: tabData.url,
            title: tabData.title || "",
            closedAt: Date.now(),
            groupName: groupName || null,
            tabData: tabData,
        });
        if (sessionRestore.recentlyClosed.length > RECENTLY_CLOSED_MAX) {
            sessionRestore.recentlyClosed.length = RECENTLY_CLOSED_MAX;
        }
    },
    getRecentlyClosed: () => {
        return sessionRestore.recentlyClosed;
    },
    clearRecentlyClosed: () => {
        sessionRestore.recentlyClosed = [];
    },
    removeFromRecentlyClosed: (index) => {
        if (index >= 0 && index < sessionRestore.recentlyClosed.length) {
            return sessionRestore.recentlyClosed.splice(index, 1)[0];
        }
        return null;
    },
    initialize: () => {
        // Track closed tabs globally
        tasks.on("tab-destroyed", (tabId, taskId) => {
            var task = tasks.get(taskId);
            var groupName = task ? task.name || null : null;
            // The tab has already been removed from state by the time this event fires,
            // but the tab data was pushed to task.tabHistory in TabList.destroy().
            // We can grab it from there.
            if (task && task.tabHistory && task.tabHistory.stack.length > 0) {
                var lastClosed =
                    task.tabHistory.stack[task.tabHistory.stack.length - 1];
                if (lastClosed && lastClosed.url) {
                    sessionRestore.addToRecentlyClosed(lastClosed, groupName);
                }
            }
        });

        setInterval(sessionRestore.save, 10000);

        window.onbeforeunload = (e) => {
            sessionRestore.save(true, true);
            //workaround for notifying the other windows that the task open in this window isn't open anymore.
            //This should ideally be done in windowSync, but it needs to run synchronously, which windowSync doesn't
            ipc.send("tab-state-change", [
                [
                    "task-updated",
                    tasks.getSelected().id,
                    "selectedInWindow",
                    null,
                ],
            ]);
        };

        ipc.on("read-tab-state", (e) => {
            ipc.send("return-tab-state", tasks.getCopyableState());
        });
    },
};

module.exports = sessionRestore;
