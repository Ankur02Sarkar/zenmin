const setupDialog = require("passwordManager/managerSetup.js");
const settings = require("util/settings/settings.js");
const PasswordManagers = require("passwordManager/passwordManager.js");

const AutofillSetup = {
    checkSettings: () => {
        const manager = PasswordManagers.getActivePasswordManager();
        if (!manager) {
            return;
        }

        manager
            .checkIfConfigured()
            .then((configured) => {
                if (!configured) {
                    setupDialog.show(manager);
                }
            })
            .catch((err) => {
                console.error(err);
            });
    },
    initialize: () => {
        settings.listen("passwordManager", (manager) => {
            if (manager) {
                // Trigger the check on browser launch and after manager is enabled
                AutofillSetup.checkSettings();
            }
        });
    },
};

module.exports = AutofillSetup;
