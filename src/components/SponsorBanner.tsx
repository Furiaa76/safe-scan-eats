import { useRouterState } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import sponsorConfig from "@/config/sponsor.json";
import { useAppLanguage } from "@/lib/language";
import { getSponsor } from "@/lib/sponsor";

const sponsor = getSponsor(sponsorConfig);

export function SponsorBanner() {
  const { language } = useAppLanguage();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Keep camera and ingredient capture screens dedicated to scanning.
  if (!sponsor || /^\/(scan|ingredients)(\/|$)/.test(pathname)) return null;
  const english = language === "en";

  return (
    <aside
      aria-label={english ? "Advertisement" : "Pubblicità"}
      className="border-b border-border bg-secondary px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]"
    >
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold text-muted-foreground">
          {english ? "Sponsor · Advertisement" : "Sponsor · Pubblicità"}
        </span>
        <a
          href={sponsor.url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          referrerPolicy="no-referrer"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-sm font-bold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {sponsor.name}
            {sponsor.message ? <span className="font-normal"> — {sponsor.message}</span> : null}
            <span className="sr-only">{english ? " (opens a new tab)" : " (si apre in una nuova scheda)"}</span>
          </span>
          <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </a>
      </div>
    </aside>
  );
}
