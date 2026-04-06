const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageFile = require("./../package.json");
const version = packageFile.version;
const appName = packageFile.productName || packageFile.name;

const platformArg = process.argv.find((arg) => arg.match("platform"));
const platform = platformArg ? platformArg.split("=")[1] : "x86";

const targetPath = `/Applications/${appName}.app`;

function killRunningApp() {
    try {
        const pid = execSync(`pgrep -f "${appName}.app" | head -1`, {
            encoding: "utf-8",
        }).trim();

        if (pid) {
            console.log(`Killing running ${appName} (PID: ${pid})...`);
            execSync(`kill ${pid}`, { stdio: "ignore" });
            execSync("sleep 1");
        }
    } catch (e) {
        // No running process found
    }
}

function installApp() {
    const sourcePath = path.resolve(
        __dirname,
        "..",
        "dist",
        "app",
        "mac",
        `${appName}.app`,
    );

    if (!fs.existsSync(sourcePath)) {
        console.error(`Error: Built app not found at ${sourcePath}`);
        console.log(
            "Run 'npm run buildMacIntel' or 'npm run build' first to build the app.",
        );
        process.exit(1);
    }

    console.log(`Installing ${appName} to ${targetPath}...`);

    try {
        execSync(`cp -R "${sourcePath}" "${targetPath}"`, { stdio: "inherit" });
        console.log(
            `Successfully installed ${appName} v${version} to /Applications/`,
        );
    } catch (e) {
        console.error("Failed to copy app:", e.message);
        process.exit(1);
    }
}

// Main flow
console.log(`Building and installing ${appName} v${version} (${platform})...`);

try {
    console.log("\n[1/3] Building the app...");
    execSync("npm run build", { stdio: "inherit" });
    execSync(`node ./scripts/buildMac.js --platform=${platform}`, {
        stdio: "inherit",
    });
} catch (e) {
    console.error("Build failed:", e.message);
    process.exit(1);
}

try {
    console.log("\n[2/3] Killing any running instance...");
    killRunningApp();
} catch (e) {
    console.warn("Warning: Could not kill running instance:", e.message);
}

try {
    console.log("\n[3/3] Installing to /Applications/...");
    installApp();
} catch (e) {
    console.error("Installation failed:", e.message);
    process.exit(1);
}

console.log("\n✓ Done! ZenMin is installed at /Applications/ZenMin.app");
console.log("  To launch: open /Applications/ZenMin.app");
