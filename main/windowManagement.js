const windows = {
    openWindows: [],
    hasEverCreatedWindow: false,
    nextId: 1,
    windowFromContents: (webContents) =>
        windows.openWindows.find(
            (w) => getWindowWebContents(w.win).id === webContents.id,
        ),
    addWindow: (window) => {
        windows.hasEverCreatedWindow = true;

        windows.openWindows.push({
            id: windows.nextId.toString(),
            win: window,
            state: {},
        });

        window.on("focus", () => {
            windows.getState(window).lastFocused = Date.now();
        });

        window.on("close", () => {
            // detach WebContentsViews to ensure they aren't destroyed when the window is closed
            window
                .getContentView()
                .children.slice(1)
                .forEach((child) =>
                    window.getContentView().removeChildView(child),
                );
            windows.openWindows.find((w) => w.win === window).closed = true;
        });

        window.on("closed", () => {
            windows.removeWindow(window);

            // Quit on last window closed (ignoring secondary and hidden windows)
            if (
                windows.openWindows.length === 0 &&
                process.platform !== "darwin"
            ) {
                app.quit();
            }
        });

        windows.nextId++;
    },
    removeWindow: (window) => {
        windows.openWindows.splice(
            windows.openWindows.findIndex((w) => w.win === window),
            1,
        );

        //unload WebContentsViews when all windows are closed
        if (windows.openWindows.length === 0) {
            destroyAllViews();
        }
    },
    getCurrent: () => {
        const lastFocused = windows.openWindows
            .filter((w) => !w.closed)
            .sort((a, b) => b.state.lastFocused - a.state.lastFocused)[0];
        if (lastFocused) {
            return lastFocused.win;
        } else {
            return null;
        }
    },
    getAll: () =>
        windows.openWindows.filter((w) => !w.closed).map((w) => w.win),
    getState: (window) =>
        windows.openWindows.find((w) => w.win === window).state,
};
