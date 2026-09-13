import { hace, num } from "@/lib/format";
import type { SyncConflict } from "@/lib/types";

/** Severidad derivada del propio mensaje que emite internal/integration. */
function severity(message: string): string {
  const text = message.toLowerCase();
  if (/missing|multiple/.test(text)) return "fail crit";
  if (/mismatch|divergence/.test(text)) return "fail hi";
  return "fail";
}

export default function ConflictsPanel({ conflicts }: { conflicts: SyncConflict[] }) {
  return (
    <section className="panel col-5" id="sec-con" aria-label="Conflictos de integración">
      <div className="panel-head">
        <h2>Gestión de fallas de integración</h2>
        <span className="sub">GET /conflicts · {num(conflicts.length)}</span>
      </div>

      <div style={{ overflow: "auto", maxHeight: 430 }}>
        {conflicts.length === 0 ? (
          <div className="state-box">
            <h3>Sin conflictos</h3>
            <p>Las dos fuentes están conciliadas en el último ciclo de sincronización.</p>
          </div>
        ) : (
          conflicts.map((conflict) => (
            <article className={severity(conflict.message)} key={conflict.id}>
              <div className="fbar" />
              <div>
                <div className="fail-top">
                  <span className="eq-code" title={conflict.entityKey}>
                    {conflict.entityKey || "—"}
                  </span>
                  <span className="fail-t">{conflict.field || "campo"}</span>
                </div>
                <div className="fail-d">{conflict.message}</div>
                <div className="fail-m">
                  <span className="chip">{conflict.entityType || "—"}</span>
                  {conflict.prismaValue ? (
                    <span className="chip info">Prisma: {conflict.prismaValue}</span>
                  ) : (
                    <span className="chip crit">sin Prisma</span>
                  )}
                  {conflict.startrackValue ? (
                    <span className="chip copper">Startrack: {conflict.startrackValue}</span>
                  ) : (
                    <span className="chip crit">sin Startrack</span>
                  )}
                  <span className="chip">{hace(conflict.detectedAt)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
