import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import vm from "node:vm";
const logs = [];
const endpoint = vm.createContext({
  Request,
  Response,
  TextDecoder,
  Date,
  console: { error: (...args) => logs.push(args) },
  URL,
  Set,
});
const server = stripTypeScriptTypes(
  readFileSync(new URL("../api/client-errors.ts", import.meta.url), "utf8"),
).replace(/export /g, "");
vm.runInContext(server + "\nthis.post=POST;", endpoint);
const payload = {
  version: 1,
  operation: "shopping-save",
  kind: "handled",
  page: "/shopping",
  error: "TypeError",
  browser: "safari",
  platform: "ios",
  release: "abcdef123456",
};
const call = (body, origin = "https://example.test", headers = {}) =>
  endpoint.post(
    new Request("https://example.test/api/client-errors", {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
assert.equal((await call(payload)).status, 204);
assert.equal(logs.length, 1);
for (const bad of [
  { ...payload, message: "glutine Fabio@example.com" },
  { ...payload, page: "/product/8001234567890" },
  { ...payload, error: "secret-profile" },
  { ...payload, release: "https://private.example" },
  null,
  [],
  { ...payload, operation: ["shopping-save"] },
])
  assert.equal((await call(bad)).status, 400);
assert.equal((await call(payload, "https://attacker.test")).status, 403);
assert.equal((await call("x".repeat(1025))).status, 413);
assert.equal((await call("{broken")).status, 400);
assert.equal(logs.length, 1, "rejected payloads must never reach logs");
for (let n = 0; n < 100; n++) await call(payload);
assert.equal((await call(payload)).status, 429);

const sent = [];
const listeners = new Map();
let now = 1_800_000_000_000;
class TestErrorEvent {
  constructor(error) {
    this.error = error;
  }
}
class TestScript {}
class TestLink {}
const client = vm.createContext({
  ErrorEvent: TestErrorEvent,
  HTMLScriptElement: TestScript,
  HTMLLinkElement: TestLink,
  Set,
  Map,
  Date: { now: () => now },
  __APP_BUILD__: "abcdef123456",
  navigator: {
    onLine: true,
    userAgent: "Mozilla/5.0 (iPhone) Safari/604.1 PRIVATE",
  },
  window: {
    location: {
      pathname: "/product/8001234567890",
      search: "?profile=glutine",
    },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
  },
  fetch: async (url, init) => {
    sent.push({ url, ...init });
    return new Response(null, { status: 204 });
  },
  Response,
});
const browser = stripTypeScriptTypes(
  readFileSync(
    new URL("../src/lib/client-diagnostics.ts", import.meta.url),
    "utf8",
  ),
).replace(/export /g, "");
vm.runInContext(
  browser +
    "\nthis.report=reportClientError;this.install=installClientDiagnostics;",
  client,
);
client.report("shopping-save", {
  name: "TypeError",
  message: "Fabio glutine 8001234567890",
  stack: "secret stack",
});
assert.equal(sent.length, 1);
assert.equal(JSON.parse(sent[0].body).page, "/product/:code");
assert.ok(
  !/Fabio|glutine|8001234567890|PRIVATE|secret|profile/.test(sent[0].body),
);
client.report("shopping-save", { name: "TypeError" });
assert.equal(sent.length, 1, "duplicate reports are suppressed");
now += 60_001;
client.report("shopping-save", { name: "TypeError" });
assert.equal(sent.length, 2);
client.navigator.onLine = false;
client.report("camera-start", { name: "NotAllowedError" });
assert.equal(sent.length, 2);
client.navigator.onLine = true;
const remove = client.install();
assert.equal(listeners.size, 2);
listeners.get("error")(
  new TestErrorEvent({ name: "ReferenceError", message: "private-profile" }),
);
listeners.get("unhandledrejection")({
  reason: { name: "RangeError", message: "allergy-soia" },
});
listeners.get("error")({ target: new TestScript() });
assert.ok(sent.some((event) => JSON.parse(event.body).kind === "uncaught"));
assert.ok(sent.some((event) => JSON.parse(event.body).kind === "rejection"));
assert.ok(sent.some((event) => JSON.parse(event.body).kind === "resource"));
assert.ok(
  sent.every(
    (event) =>
      !event.body.includes("private-profile") &&
      !event.body.includes("allergy-soia"),
  ),
);
remove();
assert.equal(listeners.size, 0);
client.fetch = async () => {
  throw new Error("offline");
};
client.report("photo-decode", { name: "Error" });
await new Promise((resolve) => setTimeout(resolve, 0));
console.log(
  "Client diagnostics: accepted reports, privacy rejection, bounded bodies, origin checks, flood limiting, redaction, deduplication, listener cleanup and offline isolation passed.",
);
