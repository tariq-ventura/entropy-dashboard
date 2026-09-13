import type { LoadFailure } from "@/lib/types";

/**
 * Lo que se ve cuando el servidor no pudo hablar con el backend. No hay datos
 * de relleno: se nombra la causa concreta y el paso que la resuelve.
 */
export default function SetupNotice({ failure }: { failure: LoadFailure }) {
  const titles: Record<LoadFailure["kind"], string> = {
    unconfigured: "Falta configurar el entorno",
    unauthorized: "El backend rechazó la credencial",
    unreachable: "No se pudo alcanzar el backend",
  };

  return (
    <div className="setup">
      <div className="setup-card">
        <h1>{titles[failure.kind]}</h1>
        <p>{failure.message}</p>

        {failure.kind === "unconfigured" ? (
          <>
            <p>
              Copia <code>.env.example</code> a <code>.env.local</code> y llena las dos variables:
            </p>
            <pre>{`ENTROPY_API_URL=https://mcp-server-development-534053084464.us-east4.run.app
ENTROPY_API_KEY=<el valor de INTEGRATION_API_KEY del servidor>`}</pre>
            <p>
              Después reinicia <code>npm run dev</code>: Next.js lee{" "}
              <code>.env.local</code> al arrancar el proceso.
            </p>
          </>
        ) : null}

        {failure.kind === "unauthorized" ? (
          <>
            <p>
              El servidor Go respondió <code>401</code>. El valor de <code>ENTROPY_API_KEY</code> no
              coincide con <code>INTEGRATION_API_KEY</code> (que cae a <code>MCP_API_KEY</code> si no
              está definida). Si acabas de rotar la llave, actualiza la variable y reinicia el proceso.
            </p>
            <pre>{`gcloud secrets versions access latest --secret=mcp-apikey-development`}</pre>
          </>
        ) : null}

        {failure.kind === "unreachable" ? (
          <>
            <p>
              La petición salió del servidor Next.js pero no obtuvo respuesta. Comprueba que el
              servicio está arriba y que <code>ENTROPY_API_URL</code> apunta al dominio correcto.
            </p>
            <pre>{`curl -s ${failure.baseUrl}/ready`}</pre>
            <p>
              CORS no interviene acá: esta llamada es servidor a servidor, así que{" "}
              <code>UI_ALLOWED_ORIGIN</code> no afecta a este frontend.
            </p>
          </>
        ) : null}

        <p style={{ marginBottom: 0 }}>
          Destino configurado: <code>{failure.baseUrl}</code>
        </p>
      </div>
    </div>
  );
}
