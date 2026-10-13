// Only fixed technical categories leave the device. Never send messages, stacks,
// URLs, query strings, product codes, preferences, or persistent identifiers.
declare const __APP_BUILD__: string;
export type DiagnosticOperation =
  | "query-load"
  | "runtime"
  | "route"
  | "resource"
  | "camera-start"
  | "photo-decode"
  | "shopping-load"
  | "shopping-save"
  | "shopping-clear"
  | "shopping-preferences"
  | "shopping-profiles"
  | "alexa-link"
  | "recipe-generate"
  | "recipe-search";
export type DiagnosticKind =
  "uncaught" | "rejection" | "handled" | "render" | "resource";
const NAMES = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "NotAllowedError",
  "SecurityError",
  "NotFoundError",
  "OverconstrainedError",
  "NotReadableError",
  "AbortError",
  "QuotaExceededError",
  "NetworkError",
  "Unsupported",
]);
const PAGES = new Set([
  "/",
  "/scan",
  "/search",
  "/recipes",
  "/shopping",
  "/history",
  "/ingredients",
  "/stores",
  "/statistics",
  "/crs",
  "/analysis",
]);
const recent = new Map<string, number>();
let reports = 0;
let budgetSince = 0;
export function diagnosticPage(path: string) {
  if (PAGES.has(path)) return path;
  return /^\/product\/[^/]+$/.test(path) ? "/product/:code" : "other";
}
export function diagnosticErrorName(error: unknown) {
  try {
    const name = (error as { name?: unknown } | null)?.name;
    return typeof name === "string" && NAMES.has(name) ? name : "Other";
  } catch {
    return "Other";
  }
}
export function reportClientError(
  operation: DiagnosticOperation,
  error: unknown,
  kind: DiagnosticKind = "handled",
) {
  try {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const now = Date.now();
    if (now - budgetSince >= 60_000) {
      reports = 0;
      budgetSince = now;
    }
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua)
      ? "edge"
      : /Firefox\//.test(ua)
        ? "firefox"
        : /Chrome\//.test(ua)
          ? "chrome"
          : /Safari\//.test(ua)
            ? "safari"
            : "other";
    const platform = /iPhone|iPad|iPod/.test(ua)
      ? "ios"
      : /Android/.test(ua)
        ? "android"
        : /Windows/.test(ua)
          ? "windows"
          : /Mac/.test(ua)
            ? "mac"
            : "other";
    const payload = {
      version: 1,
      operation,
      kind,
      page: diagnosticPage(window.location.pathname),
      error: diagnosticErrorName(error),
      browser,
      platform,
      release:
        typeof __APP_BUILD__ === "string" &&
        /^[a-f0-9]{7,40}$/.test(__APP_BUILD__)
          ? __APP_BUILD__
          : "local",
    };
    const key = JSON.stringify(payload);
    if (reports >= 10 || now - (recent.get(key) ?? 0) < 60_000) return;
    for (const [entry, time] of recent)
      if (now - time >= 60_000) recent.delete(entry);
    recent.set(key, now);
    reports++;
    void fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      keepalive: true,
      credentials: "omit",
    }).catch(() => {});
  } catch {
    /* Diagnostics must never break an app feature or recurse. */
  }
}
export function installClientDiagnostics() {
  const onError = (event: Event) => {
    if (event instanceof ErrorEvent)
      reportClientError("runtime", event.error, "uncaught");
    else if (
      event.target instanceof HTMLScriptElement ||
      event.target instanceof HTMLLinkElement
    )
      reportClientError("resource", null, "resource");
  };
  const onRejection = (event: PromiseRejectionEvent) =>
    reportClientError("runtime", event.reason, "rejection");
  window.addEventListener("error", onError, true);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError, true);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
