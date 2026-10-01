import { execFileSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });

if (!fs.existsSync("ios")) run("npx", ["cap", "add", "ios"]);
if (!fs.existsSync("android")) run("npx", ["cap", "add", "android"]);
fs.mkdirSync("android/app/src/main/assets", { recursive: true });
run("npm", ["run", "mobile:assets"]);
run("npx", ["capacitor-assets", "generate"]);
run("npx", ["cap", "sync"]);

const iosInfoPlist = "ios/App/App/Info.plist";
if (fs.existsSync(iosInfoPlist)) {
  let plist = fs.readFileSync(iosInfoPlist, "utf8");
  if (!plist.includes("<key>NSCameraUsageDescription</key>")) {
    plist = plist.replace(
      "</dict>\n</plist>",
      "\t<key>NSCameraUsageDescription</key>\n\t<string>Safe Scan Eats usa la fotocamera per scansionare codici a barre, confezioni e ingredienti dei prodotti.</string>\n</dict>\n</plist>"
    );
    fs.writeFileSync(iosInfoPlist, plist);
  }
}

console.log("Native iOS and Android projects are ready.");
