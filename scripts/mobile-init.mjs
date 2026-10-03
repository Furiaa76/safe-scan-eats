import { execFileSync } from "node:child_process";
import fs from "node:fs";

const run = (cmd, args) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });

if (!fs.existsSync("ios")) run("npx", ["cap", "add", "ios"]);
if (!fs.existsSync("android")) run("npx", ["cap", "add", "android"]);
fs.mkdirSync("android/app/src/main/assets", { recursive: true });
run("npm", ["run", "mobile:assets"]);
run("npx", ["capacitor-assets", "generate"]);
run("npx", ["cap", "sync"]);

const androidVariables = "android/variables.gradle";
if (fs.existsSync(androidVariables)) {
  let variables = fs.readFileSync(androidVariables, "utf8");
  variables = variables.replace(/minSdkVersion\s*=\s*\d+/, "minSdkVersion = 26");
  fs.writeFileSync(androidVariables, variables);
}

const androidManifest = "android/app/src/main/AndroidManifest.xml";
if (fs.existsSync(androidManifest)) {
  let manifest = fs.readFileSync(androidManifest, "utf8");
  if (!manifest.includes('android.permission.CAMERA')) {
    manifest = manifest.replace(
      "<manifest",
      '<manifest'
    );
    manifest = manifest.replace(
      /<manifest([^>]*)>/,
      '<manifest$1>\n    <uses-permission android:name="android.permission.CAMERA" />'
    );
    fs.writeFileSync(androidManifest, manifest);
  }
}

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
