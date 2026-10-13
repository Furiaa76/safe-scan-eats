import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { confirmedLocalStock } from "./local-stock";
const Input = z.object({
  codes: z.array(z.string().regex(/^\d{8,14}$/)).max(100),
  country: z.string().regex(/^[a-z]{2}$/),
  city: z.string().trim().min(1).max(100),
});
export const checkLocalStock = createServerFn({ method: "POST" })
  .inputValidator((data) => Input.parse(data))
  .handler(async ({ data }) => {
    // Only a trusted retailer/store inventory integration can provide these rows.
    // No integration configured means no stores are claimed to have the product.
    const source = process.env["LOCAL_STOCK_FEED_URL"];
    if (!source) return { status: "unavailable" as const, offers: [] };
    try {
      const url = new URL(source);
      if (url.protocol !== "https:")
        return { status: "unavailable" as const, offers: [] };
      url.searchParams.set("country", data.country);
      url.searchParams.set("city", data.city);
      url.searchParams.set("codes", data.codes.join(","));
      const response = await fetch(url, {
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
        redirect: "error",
      });
      if (
        !response.ok ||
        Number(response.headers.get("content-length") ?? 0) > 500_000
      )
        return { status: "unavailable" as const, offers: [] };
      const rows = await response.json();
      return {
        status: "ok" as const,
        offers: confirmedLocalStock(rows, data.codes, data.country, data.city),
      };
    } catch {
      return { status: "unavailable" as const, offers: [] };
    }
  });
