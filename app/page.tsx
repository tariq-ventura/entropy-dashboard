import { EntropyError, baseUrlForDisplay, loadInitialPayload } from "@/lib/entropy";
import Dashboard from "@/components/Dashboard";
import SetupNotice from "@/components/SetupNotice";
import type { LoadFailure } from "@/lib/types";

/**
 * Server Component: la carga inicial ocurre en el servidor, con la llave del
 * entorno. El navegador recibe HTML ya poblado — sin parpadeo de esqueletos
 * en el primer render — y a partir de ahí las interacciones pasan por
 * /api/entropy, que también corre del lado del servidor.
 */
export const dynamic = "force-dynamic";

export default async function Page() {
  try {
    const initial = await loadInitialPayload();
    return <Dashboard initial={initial} baseUrl={baseUrlForDisplay()} />;
  } catch (error) {
    const failure: LoadFailure =
      error instanceof EntropyError
        ? {
            kind:
              error.kind === "unconfigured"
                ? "unconfigured"
                : error.kind === "unauthorized"
                  ? "unauthorized"
                  : "unreachable",
            message: error.message,
            baseUrl: baseUrlForDisplay(),
          }
        : {
            kind: "unreachable",
            message: error instanceof Error ? error.message : "Fallo desconocido.",
            baseUrl: baseUrlForDisplay(),
          };

    return <SetupNotice failure={failure} />;
  }
}
