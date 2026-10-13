import { useEffect, useState } from "react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  installClientDiagnostics,
  reportClientError,
} from "@/lib/client-diagnostics";
export function ClientDiagnostics() {
  useEffect(installClientDiagnostics, []);
  return null;
}
export function AppRouteError({ error, reset }: ErrorComponentProps) {
  useEffect(() => {
    reportClientError("route", error, "render");
  }, [error]);
  const [en, setEnglish] = useState(false);
  useEffect(() => {
    setEnglish(document.documentElement.lang === "en");
  }, []);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-extrabold">
        {en
          ? "Unable to open this page"
          : "Non riesco ad aprire questa schermata"}
      </h1>
      <p>
        {en
          ? "Please try again or return to the home page."
          : "Riprova oppure torna alla pagina iniziale."}
      </p>
      <button
        type="button"
        className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground"
        onClick={() => reset()}
      >
        {en ? "Try again" : "Riprova"}
      </button>
      <a className="underline" href="/">
        {en ? "Home" : "Torna alla home"}
      </a>
    </main>
  );
}
