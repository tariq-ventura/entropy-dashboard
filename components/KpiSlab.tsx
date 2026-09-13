import { num, pct } from "@/lib/format";
import type { DashboardSummary, SyncState, UnifiedEquipment } from "@/lib/types";

interface Cell {
  label: string;
  value: string;
  suffix?: string;
  meter?: number;
  note: string;
  tone?: "warn" | "crit";
}

export default function KpiSlab({
  summary,
  sync,
  sample,
}: {
  summary: DashboardSummary;
  sync: SyncState;
  sample: UnifiedEquipment[];
}) {
  const availability = pct(summary.equipmentAvailable, summary.equipmentTotal);
  const linked = sample.filter((item) => item.linked).length;
  const linkedPct = sample.length ? pct(linked, sample.length) : null;

  const cells: Cell[] = [
    {
      label: "Equipos en proyección",
      value: num(summary.equipmentTotal),
      note: "Prisma + Startrack unificados",
    },
    {
      label: "Disponibles ahora",
      value: num(summary.equipmentAvailable),
      meter: availability,
      note: `${availability} % de la flota`,
    },
    {
      label: "Peticiones pendientes",
      value: num(summary.requestsPending),
      note: `${num(sync.requestCount)} solicitudes sincronizadas`,
      tone: summary.requestsPending > 0 ? "warn" : undefined,
    },
    {
      label: "Asignaciones activas",
      value: num(summary.assignmentsActive),
      note: `${num(sync.assignmentCount)} tareas en la proyección`,
    },
    {
      label: "Conflictos de datos",
      value: num(summary.conflicts),
      note: summary.conflicts ? "requieren conciliación manual" : "sin divergencias",
      tone: summary.conflicts > 0 ? "crit" : undefined,
    },
    {
      label: "Correlación con Startrack",
      value: linkedPct === null ? "—" : String(linkedPct),
      suffix: linkedPct === null ? undefined : "%",
      meter: linkedPct ?? undefined,
      note: sample.length
        ? `${num(linked)} de ${num(sample.length)} equipos vinculados`
        : "sin muestra disponible",
    },
  ];

  return (
    <section className="kpi-slab" id="kpis" aria-label="Indicadores de la proyección unificada">
      {cells.map((cell) => (
        <div className="kpi" key={cell.label}>
          <div className="kpi-label">{cell.label}</div>
          <div className="kpi-val">
            {cell.value}
            {cell.suffix ? <small>{cell.suffix}</small> : null}
          </div>
          {cell.meter !== undefined ? (
            <div className={cell.meter < 50 ? "meter warnfill" : "meter"}>
              <span style={{ width: `${Math.max(2, Math.min(100, cell.meter))}%` }} />
            </div>
          ) : null}
          <div className="kpi-foot">
            {cell.tone ? <span className={`chip ${cell.tone}`}>atención</span> : null}
            <span className="kpi-note">{cell.note}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
