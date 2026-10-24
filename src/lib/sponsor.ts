export interface Sponsor {
  name: string;
  url: string;
  message: string;
}

// A missing or incomplete agreement must never produce a public placeholder.
export function getSponsor(config: unknown): Sponsor | null {
  if (!config || typeof config !== "object") return null;
  const value = config as Record<string, unknown>;
  if (value["enabled"] !== true) return null;
  const name = typeof value["name"] === "string" ? value["name"].trim() : "";
  const url = typeof value["url"] === "string" ? value["url"].trim() : "";
  const message = typeof value["message"] === "string" ? value["message"].trim() : "";
  if (!name || name.length > 80 || message.length > 160) return null;
  try {
    const destination = new URL(url);
    if (destination.protocol !== "https:" || destination.username || destination.password) return null;
    return { name, url: destination.href, message };
  } catch {
    return null;
  }
}
