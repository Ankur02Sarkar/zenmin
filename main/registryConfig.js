var regedit = require("regedit");

var installPath = process.execPath;

var keysToCreate = [
  "HKCU\\Software\\Classes\\ZenMin",
  "HKCU\\Software\\Classes\\ZenMin\\Application",
  "HKCU\\Software\\Classes\\ZenMin\\DefaulIcon",
  "HKCU\\Software\\Classes\\ZenMin\\shell\\open\\command",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\FileAssociations",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\StartMenu",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\URLAssociations",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\DefaultIcon",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\InstallInfo",
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\shell\\open\\command",
];

var registryConfig = {
  "HKCU\\Software\\RegisteredApplications": {
    ZenMin: {
      value: "Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities",
      type: "REG_SZ",
    },
  },
  "HKCU\\Software\\Classes\\ZenMin": {
    default: {
      value: "ZenMin Browser Document",
      type: "REG_DEFAULT",
    },
  },
  "HKCU\\Software\\Classes\\ZenMin\\Application": {
    ApplicationIcon: {
      value: installPath + ",0",
      type: "REG_SZ",
    },
    ApplicationName: {
      value: "ZenMin",
      type: "REG_SZ",
    },
    AppUserModelId: {
      value: "ZenMin",
      type: "REG_SZ",
    },
  },
  "HKCU\\Software\\Classes\\ZenMin\\DefaulIcon": {
    ApplicationIcon: {
      value: installPath + ",0",
      type: "REG_SZ",
    },
  },
  "HKCU\\Software\\Classes\\ZenMin\\shell\\open\\command": {
    default: {
      value: '"' + installPath + '" "%1"',
      type: "REG_DEFAULT",
    },
  },
  "HKCU\\Software\\Classes\\.htm\\OpenWithProgIds": {
    ZenMin: {
      value: "Empty",
      type: "REG_SZ",
    },
  },
  "HKCU\\Software\\Classes\\.html\\OpenWithProgIds": {
    ZenMin: {
      value: "Empty",
      type: "REG_SZ",
    },
  },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\FileAssociations":
    {
      ".htm": {
        value: "ZenMin",
        type: "REG_SZ",
      },
      ".html": {
        value: "ZenMin",
        type: "REG_SZ",
      },
    },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\StartMenu":
    {
      StartMenuInternet: {
        value: "ZenMin",
        type: "REG_SZ",
      },
    },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\Capabilities\\URLAssociations":
    {
      http: {
        value: "ZenMin",
        type: "REG_SZ",
      },
      https: {
        value: "ZenMin",
        type: "REG_SZ",
      },
    },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\DefaultIcon": {
    default: {
      value: installPath + ",0",
      type: "REG_DEFAULT",
    },
  },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\InstallInfo": {
    IconsVisible: {
      value: 1,
      type: "REG_DWORD",
    },
  },
  "HKCU\\Software\\Clients\\StartMenuInternet\\ZenMin\\shell\\open\\command": {
    default: {
      value: installPath,
      type: "REG_DEFAULT",
    },
  },
};

var registryInstaller = {
  install: function () {
    return new Promise(function (resolve, reject) {
      regedit.createKey(keysToCreate, function (err) {
        regedit.putValue(registryConfig, function (err) {
          if (err) {
            reject();
          } else {
            resolve();
          }
        });
      });
    });
  },
  uninstall: function () {
    return new Promise(function (resolve, reject) {
      regedit.deleteKey(keysToCreate, function (err) {
        if (err) {
          reject();
        } else {
          resolve();
        }
      });
    });
  },
};
