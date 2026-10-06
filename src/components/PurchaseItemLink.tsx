import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useAppLanguage } from "@/lib/language";

export function PurchaseItemLink({ name, from, className = "" }: { name: string; from: "recipes" | "shopping"; className?: string }) {
  const { t } = useAppLanguage();
  return <Link to="/search" search={{ q: name.slice(0, 120), buy: true, from }}
    aria-label={`${t("Cerca dove acquistare")}: ${t(name)}`}
    className={`inline-flex max-w-full items-center gap-2 text-primary underline decoration-primary/30 underline-offset-4 ${className}`}>
    <span className="truncate">{t(name)}</span><Search className="h-4 w-4 shrink-0" />
  </Link>;
}
