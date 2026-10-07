import { Capacitor } from "@capacitor/core";
import { useAppLanguage } from "@/lib/language";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0A8F4B" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "Safe Scan Eats" },
      { title: "Safe Scan Eats — Controlla allergeni e intolleranze" },
      { name: "description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
      { property: "og:title", content: "Safe Scan Eats — Controlla allergeni e intolleranze" },
      { property: "og:description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png", sizes: "180x180" },
      { rel: "icon", href: "/app-icon.svg", type: "image/svg+xml" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootShell({ children }: { children: ReactNode }) {
  const { language } = useAppLanguage();

  return <html lang={language}><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {

  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (Capacitor.isNativePlatform() || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => { /* Browser use remains available if installation is unsupported. */ });
  }, []);

  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (!isStandalone) return;

    const resetToHome = () => {
      if (window.location.pathname !== "/") {
        window.location.replace("/");
      }
    };

    // Se l'app viene avviata da zero dalla Home di iPhone, parte sempre dalla home dell'app.
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "navigate" && window.location.pathname !== "/") {
      resetToHome();
      return;
    }

    // Se l'app va semplicemente in background, mantieni la schermata corrente.
    // Il ritorno alla home avviene solo su un nuovo avvio standalone.
  }, []);

  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}

function NotFound() {
  const { t } = useAppLanguage();
 return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="text-center"><h1 className="text-6xl font-black">{t("404")}</h1><p className="mt-2 text-muted-foreground">{t("Pagina non trovata")}</p><Link to="/" className="mt-5 inline-block rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">{t("Torna alla home")}</Link></div></div>; }
