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
    backgroundColor: "#F7FAF5",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#F7FAF5",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#F7FAF5",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#F7FAF5",
    },
  },
};

export default config;
