import { num } from "@/lib/format";
import type { UnifiedEquipment } from "@/lib/types";
import HBars, { type Bar } from "./HBars";

export default function TypeChart({
  sample,
  total,
}: {
  sample: UnifiedEquipment[];
  total: number;
}) {
  const counts = new Map<string, number>();
  for (const equipment of sample) {
    const key = equipment.type || equipment.startrackType || equipment.equipmentTypeCode || "Sin tipo";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const bars: Bar[] = [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  return (
    <section className="panel col-5" aria-label="Equipos por tipo">
      <div className="panel-head">
        <h2>Equipos por tipo</h2>
        <span className="sub">
          {num(sample.length)} de {num(total)}
        </span>
      </div>
      <div className="chart-box">
        <HBars bars={bars} unit="equipos" />
        <p className="chart-note">
          {sample.length < total
            ? `Agregado sobre los primeros ${num(sample.length)} equipos: el API limita pageSize a 100.`
            : "Agregado sobre la flota completa de la proyección."}
        </p>
      </div>
    </section>
  );
}
