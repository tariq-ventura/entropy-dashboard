import { num } from "@/lib/format";

export interface Bar {
  label: string;
  value: number;
  color?: string;
}

const WIDTH = 380;
const LABEL_COL = 126;
const RIGHT = 48;
const TOP = 6;

/**
 * Barras horizontales. Una sola escala coloca marcas y etiquetas, y cada
 * etiqueta nombra un valor que la barra alcanza. El texto toma color de los
 * tokens, así que se lee en ambos temas.
 */
export default function HBars({
  bars,
  unit,
  height = 230,
}: {
  bars: Bar[];
  unit: string;
  height?: number;
}) {
  if (bars.length === 0) {
    return (
      <svg className="chart-svg" viewBox={`0 0 ${WIDTH} ${height}`} role="img" aria-label="Sin datos">
        <text
          x={WIDTH / 2}
          y={height / 2}
          textAnchor="middle"
          fontFamily="var(--font-mono), monospace"
          fontSize={11}
          fill="var(--ink-3)"
        >
          sin datos
        </text>
      </svg>
    );
  }

  const rowHeight = Math.min(30, 200 / bars.length);
  const plotWidth = WIDTH - LABEL_COL - RIGHT;
  const max = Math.max(...bars.map((bar) => bar.value)) || 1;
  const barHeight = Math.min(13, rowHeight - 8);

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="img"
      aria-label={bars.map((bar) => `${bar.label}: ${bar.value}`).join(", ")}
    >
      {bars.map((bar, index) => {
        const y = TOP + index * rowHeight;
        const width = Math.max(2, (bar.value / max) * plotWidth);
        return (
          <g key={bar.label}>
            <text
              x={LABEL_COL - 9}
              y={y + barHeight - 2}
              textAnchor="end"
              fontFamily="var(--font-body), sans-serif"
              fontSize={11.5}
              fill="var(--ink-2)"
            >
              {bar.label.slice(0, 18)}
            </text>
            <rect x={LABEL_COL} y={y} width={plotWidth} height={barHeight} rx={3} fill="var(--grid)" />
            <rect
              x={LABEL_COL}
              y={y}
              width={width}
              height={barHeight}
              rx={3}
              fill={bar.color ?? "var(--s1)"}
            >
              <title>{`${bar.label}: ${num(bar.value)} ${unit}`}</title>
            </rect>
            <text
              x={LABEL_COL + width + 7}
              y={y + barHeight - 2}
              fontFamily="var(--font-mono), monospace"
              fontSize={10.5}
              fontWeight={500}
              fill="var(--ink-2)"
            >
              {num(bar.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
