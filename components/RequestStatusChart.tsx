import { num, requestTone } from "@/lib/format";
import type { UnifiedRequest } from "@/lib/types";
import HBars, { type Bar } from "./HBars";

/** El color sigue el significado del estado, no su posición en el ranking. */
function colorFor(status: string): string {
  switch (requestTone(status).chip) {
    case "warn":
      return "var(--s3)";
    case "good":
      return "var(--s1)";
    case "crit":
      return "var(--crit)";
    default:
      return "var(--s2)";
  }
}

export default function RequestStatusChart({
  sample,
  total,
}: {
  sample: UnifiedRequest[];
  total: number;
}) {
  const counts = new Map<string, number>();
  for (const request of sample) {
    const key = request.status || "Sin estado";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const bars: Bar[] = [...counts.entries()]
    .map(([label, value]) => ({ label, value, color: colorFor(label) }))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="panel col-4" aria-label="Peticiones por estado">
      <div className="panel-head">
        <h2>Peticiones por estado</h2>
        <span className="sub">
          {num(sample.length)} de {num(total)}
        </span>
      </div>
      <div className="chart-box">
        <HBars bars={bars} unit="peticiones" height={210} />
        <p className="chart-note">
          Calculado sobre una muestra sin filtrar, para que el reparto no cambie al paginar el panel.
        </p>
      </div>
    </section>
  );
}
