import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.safescaneats.app",
  appName: "Safe Scan Eats",
  webDir: ".output/public",
  server: {
    url: "https://safe-scan-eats.vercel.app",
    cleartext: false,
    allowNavigation: [
      "safe-scan-eats.vercel.app",
      "*.supabase.co",
      "www.fascicolosanitario.regione.lombardia.it",
      "www.salute.gov.it",
    ],
  },
  ios: {
    contentInset: "automatic",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
