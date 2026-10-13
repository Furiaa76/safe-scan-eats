// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    define: {
      __APP_BUILD__: JSON.stringify(
        process.env["VERCEL_GIT_COMMIT_SHA"] || "local",
      ),
    },
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
