import { fechaHora, num } from "@/lib/format";
import type { SyncState } from "@/lib/types";

export default function SyncPanel({ sync }: { sync: SyncState }) {
  const rows: [string, string][] = [
    ["Estado", sync.status || "—"],
    ["Último ciclo OK", fechaHora(sync.lastSucceededAt)],
    ["Equipos", num(sync.equipmentCount)],
    ["Peticiones", num(sync.requestCount)],
    ["Asignaciones", num(sync.assignmentCount)],
    ["Mantenimientos", num(sync.maintenanceCount)],
    ["Conflictos", num(sync.conflictCount)],
  ];

  return (
    <section className="panel col-3" id="sec-sync" aria-label="Estado de sincronización">
      <div className="panel-head">
        <h2>Sincronización</h2>
        <span className="sub">GET /sync-status</span>
      </div>
      <div className="chart-box">
        <dl className="kv">
          {rows.map(([key, value]) => (
            <div key={key} style={{ display: "contents" }}>
              <dt>{key}</dt>
              <dd className="tnum">{value}</dd>
            </div>
          ))}
        </dl>
        {sync.lastError ? (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--crit)" }}>{sync.lastError}</p>
        ) : null}
        <p
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: "1px solid var(--line)",
            fontSize: 11.5,
            color: "var(--ink-3)",
          }}
        >
          El servidor reintenta cada SYNC_INTERVAL.
        </p>
      </div>
    </section>
  );
}
