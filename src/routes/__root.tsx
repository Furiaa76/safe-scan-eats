import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SafeFood Scan — Controlla allergeni e intolleranze" },
      { name: "description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
      { property: "og:title", content: "SafeFood Scan — Controlla allergeni e intolleranze" },
      { property: "og:description", content: "Scansiona i prodotti e scopri subito se sono compatibili con le tue intolleranze e allergie alimentari." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="text-center"><h1 className="text-6xl font-black">404</h1><p className="mt-2 text-muted-foreground">Pagina non trovata</p><Link to="/" className="mt-5 inline-block rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground">Torna alla home</Link></div></div>,
});

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="it"><head><HeadContent /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

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

    // Su iOS l'app può essere sospesa e poi riaperta sulla vecchia schermata.
    let hiddenAt = 0;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt = Date.now();
        return;
      }
      if (document.visibilityState === "visible" && hiddenAt && Date.now() - hiddenAt > 1500) {
        resetToHome();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  return <QueryClientProvider client={queryClient}><Outlet /></QueryClientProvider>;
}