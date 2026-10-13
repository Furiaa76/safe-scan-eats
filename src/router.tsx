import { reportClientError } from "@/lib/client-diagnostics";
import { AppRouteError } from "@/components/ClientDiagnostics";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({ queryCache: new QueryCache({ onError: error => reportClientError("query-load", error) }) });
  const router = createRouter({
    routeTree,
    defaultErrorComponent: AppRouteError,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });
  return router;
};