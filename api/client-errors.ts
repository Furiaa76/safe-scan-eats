// Self-contained serverless handler. Reject arbitrary fields rather than logging
// untrusted messages, stacks, request headers, or personal application data.
const OPERATIONS = new Set([
  "query-load",
  "runtime",
  "route",
  "resource",
  "camera-start",
  "photo-decode",
  "shopping-load",
  "shopping-save",
  "shopping-clear",
  "shopping-preferences",
  "shopping-profiles",
  "alexa-link",
  "recipe-generate",
  "recipe-search",
]);
const KINDS = new Set([
  "uncaught",
  "rejection",
  "handled",
  "render",
  "resource",
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
  "/product/:code",
  "other",
]);
const ERRORS = new Set([
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
  "Other",
]);
const BROWSERS = new Set(["edge", "firefox", "chrome", "safari", "other"]);
const PLATFORMS = new Set(["ios", "android", "windows", "mac", "other"]);
const FIELDS = new Set([
  "version",
  "operation",
  "kind",
  "page",
  "error",
  "browser",
  "platform",
  "release",
]);
let windowStart = 0;
let received = 0;
function reply(status: number) {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return reply(403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return reply(415);
  const now = Date.now();
  if (now - windowStart >= 60_000) {
    windowStart = now;
    received = 0;
  }
  if (++received > 100) return reply(429); // Best-effort per-instance flood limit.
  if (Number(request.headers.get("content-length") ?? 0) > 1024)
    return reply(413);
  let payload: Record<string, unknown>;
  try {
    const reader = request.body?.getReader();
    if (!reader) return reply(400);
    let bytes = 0;
    const decoder = new TextDecoder();
    let raw = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > 1024) {
        await reader.cancel();
        return reply(413);
      }
      raw += decoder.decode(chunk.value, { stream: true });
    }
    raw += decoder.decode();
    payload = JSON.parse(raw);
    if (!payload || Array.isArray(payload) || typeof payload !== "object")
      return reply(400);
  } catch {
    return reply(400);
  }
  if (
    Object.keys(payload).length !== FIELDS.size ||
    Object.keys(payload).some((key) => !FIELDS.has(key)) ||
    payload["version"] !== 1 ||
    !OPERATIONS.has(String(payload["operation"])) ||
    !KINDS.has(String(payload["kind"])) ||
    !PAGES.has(String(payload["page"])) ||
    !ERRORS.has(String(payload["error"])) ||
    !BROWSERS.has(String(payload["browser"])) ||
    !PLATFORMS.has(String(payload["platform"])) ||
    typeof payload["release"] !== "string" ||
    !/^(local|[a-f0-9]{7,40})$/.test(payload["release"]) ||
    Object.values(payload).some(
      (value) => typeof value !== "string" && typeof value !== "number",
    )
  )
    return reply(400);
  console.error("[ClientDiagnostic]", JSON.stringify(payload));
  return reply(204);
}
