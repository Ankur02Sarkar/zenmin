var settings = {
    filePath:
        window.globalArgs["user-data-path"] +
        (process.platform === "win32" ? "\\" : "/") +
        "settings.json",
    list: {},
    onChangeCallbacks: [],
    runChangeCallbacks(key) {
        settings.onChangeCallbacks.forEach((listener) => {
            if (!key || !listener.key || listener.key === key) {
                if (listener.key) {
                    listener.cb(settings.list[listener.key]);
                } else {
                    listener.cb(key);
                }
            }
        });
    },
    get: (key) => settings.list[key],
    listen: (key, cb) => {
        if (key && cb) {
            cb(settings.get(key));
            settings.onChangeCallbacks.push({ key, cb });
        } else if (key) {
            // global listener
            settings.onChangeCallbacks.push({ cb: key });
        }
    },
    set: (key, value) => {
        settings.list[key] = value;
        ipc.send("settingChanged", key, value);
        settings.runChangeCallbacks(key);
    },
    initialize: () => {
        var fileData;
        try {
            fileData = fs.readFileSync(settings.filePath, "utf-8");
        } catch (e) {
            if (e.code !== "ENOENT") {
                console.warn(e);
            }
        }
        if (fileData) {
            settings.list = JSON.parse(fileData);
        }

        settings.runChangeCallbacks();

        ipc.on("settingChanged", (e, key, value) => {
            settings.list[key] = value;
            settings.runChangeCallbacks(key);
        });
    },
};

settings.initialize();
module.exports = settings;
