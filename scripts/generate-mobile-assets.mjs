import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const iconSource = path.join(root, "public", "EF8350B8-C51F-4A7C-9DA9-C6711ADD1ECB.png");
const resources = path.join(root, "resources");
await fs.mkdir(resources, { recursive: true });

await sharp(iconSource).resize(1024, 1024).png().toFile(path.join(resources, "icon.png"));
await sharp(iconSource)
  .resize(512, 512, { fit: "contain", background: "#F7FAF5" })
  .extend({ top: 600, bottom: 600, left: 200, right: 200, background: "#F7FAF5" })
  .resize(2732, 2732, { fit: "contain", background: "#F7FAF5" })
  .png()
  .toFile(path.join(resources, "splash.png"));

console.log("Generated resources/icon.png and resources/splash.png");
