import { execFileSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });

if (!fs.existsSync("ios")) run("npx", ["cap", "add", "ios"]);
if (!fs.existsSync("android")) run("npx", ["cap", "add", "android"]);
run("npm", ["run", "mobile:assets"]);
run("npx", ["capacitor-assets", "generate"]);
run("npx", ["cap", "sync"]);

console.log("Native iOS and Android projects are ready.");
