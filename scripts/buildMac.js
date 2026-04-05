const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const archiver = require("archiver");
const builder = require("electron-builder");
const Arch = builder.Arch;

const packageFile = require("./../package.json");
const version = packageFile.version;
const appName = packageFile.productName || packageFile.name;
const platform = process.argv
    .find((arg) => arg.match("platform"))
    .split("=")[1];

function toArch(platform) {
    switch (platform) {
        case "x86":
            return Arch.x64;
        case "arm64":
            return Arch.arm64;
    }
}

require("./createPackage.js")("mac", { arch: toArch(platform) }).then(
    (packagePath) => {
        if (platform === "arm64" && process.env.CI !== "true") {
            execSync(
                "codesign -s - -a arm64 -f --deep " +
                    packagePath +
                    "/" +
                    appName +
                    ".app",
            );
        }

        /* create output directory if it doesn't exist */

        if (!fs.existsSync("dist/app")) {
            fs.mkdirSync("dist/app");
        }

        /* create zip file */

        return new Promise((resolve, reject) => {
            var output = fs.createWriteStream(
                "dist/app/" +
                    appName.toLowerCase() +
                    "-v" +
                    version +
                    "-mac-" +
                    platform +
                    ".zip",
            );
            var archive = archiver("zip", {
                zlib: { level: 9 },
            });

            output.on("close", () => {
                console.log(
                    "Zip created: " + archive.pointer() + " total bytes",
                );
                resolve();
            });

            archive.on("error", (err) => {
                reject(err);
            });

            archive.directory(
                path.resolve(packagePath, appName + ".app"),
                appName + ".app",
            );

            archive.pipe(output);
            archive.finalize();
        });
    },
);
