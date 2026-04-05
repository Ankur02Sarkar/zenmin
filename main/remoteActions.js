/*
Wraps APIs that are only available in the main process in IPC messages, so that the BrowserWindow can use them
*/

ipc.handle("startFileDrag", (e, path) => {
    app.getFileIcon(path, {}).then((icon) => {
        e.sender.startDrag({
            file: path,
            icon: icon,
        });
    });
});

function showFocusModeDialog1() {
    dialog.showMessageBox({
        type: "info",
        buttons: [l("closeDialog")],
        message: l("isFocusMode"),
        detail: l("focusModeExplanation1") + " " + l("focusModeExplanation2"),
    });
}

function showFocusModeDialog2() {
    dialog.showMessageBox({
        type: "info",
        buttons: [l("closeDialog")],
        message: l("isFocusMode"),
        detail: l("focusModeExplanation2"),
    });
}

ipc.handle("showFocusModeDialog2", showFocusModeDialog2);

ipc.handle("showOpenDialog", async (e, options) => {
    const result = await dialog.showOpenDialog(
        windows.windowFromContents(e.sender).win,
        options,
    );
    return result.filePaths;
});

ipc.handle("showSaveDialog", async (e, options) => {
    const result = await dialog.showSaveDialog(
        windows.windowFromContents(e.sender).win,
        options,
    );
    return result.filePath;
});

ipc.handle("addWordToSpellCheckerDictionary", (e, word) => {
    session
        .fromPartition("persist:webcontent")
        .addWordToSpellCheckerDictionary(word);
});

ipc.handle("clearStorageData", () =>
    session
        .fromPartition("persist:webcontent")
        .clearStorageData()
        /* It's important not to delete data from file:// from the default partition, since that would also remove internal browser data (such as bookmarks). However, HTTP data does need to be cleared, as there can be leftover data from loading external resources in the browser UI */
        .then(() =>
            session.defaultSession.clearStorageData({
                origin: "http://",
            }),
        )
        .then(() =>
            session.defaultSession.clearStorageData({
                origin: "https://",
            }),
        )
        .then(() => session.fromPartition("persist:webcontent").clearCache())
        .then(() =>
            session
                .fromPartition("persist:webcontent")
                .clearHostResolverCache(),
        )
        .then(() =>
            session.fromPartition("persist:webcontent").clearAuthCache(),
        )
        .then(() => session.defaultSession.clearCache())
        .then(() => session.defaultSession.clearHostResolverCache())
        .then(() => session.defaultSession.clearAuthCache()),
);

/* window actions */

ipc.handle("minimize", (e) => {
    windows.windowFromContents(e.sender).win.minimize();
    // workaround for https://github.com/minbrowser/min/issues/1662
    e.sender.send("minimize");
});

ipc.handle("maximize", (e) => {
    windows.windowFromContents(e.sender).win.maximize();
    // workaround for https://github.com/minbrowser/min/issues/1662
    e.sender.send("maximize");
});

ipc.handle("unmaximize", (e) => {
    windows.windowFromContents(e.sender).win.unmaximize();
    // workaround for https://github.com/minbrowser/min/issues/1662
    e.sender.send("unmaximize");
});

ipc.handle("close", (e) => {
    windows.windowFromContents(e.sender).win.close();
});

ipc.handle("setFullScreen", (e, fullScreen) => {
    windows.windowFromContents(e.sender).win.setFullScreen(e, fullScreen);
});

//workaround for https://github.com/electron/electron/issues/38540
ipc.handle("showItemInFolder", (e, path) => {
    shell.showItemInFolder(path);
});

ipc.on("newWindow", (e, customArgs) => {
    createWindow(customArgs);
});
