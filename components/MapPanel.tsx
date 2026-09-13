"use client";

import { useMemo } from "react";
import { assignmentTone, distinct, fecha, num, pickCoordinateScale } from "@/lib/format";
import type { UnifiedAssignment } from "@/lib/types";

const WIDTH = 900;
const HEIGHT = 400;
const PAD = 70;

export default function MapPanel({
  assignments,
  totalAssignments,
  statuses,
  status,
  onStatus,
  onOpenEquipment,
}: {
  assignments: UnifiedAssignment[];
  totalAssignments: number;
  statuses: UnifiedAssignment[];
  status: string;
  onStatus: (value: string) => void;
  onOpenEquipment: (key: string) => void;
}) {
  /* El backend entrega latitude/longitude como enteros sin declarar la escala. */
  const projection = useMemo(() => {
    const points = assignments
      .filter((item) => item.latitude && item.longitude)
      .map((item) => ({ lat: item.latitude, lng: item.longitude, item }));

    if (points.length === 0) return null;

    const scale = pickCoordinateScale(points);
    const placed = points.map((point) => ({
      ...point,
      x: point.lng / scale,
      y: point.lat / scale,
    }));

    const xs = placed.map((p) => p.x);
    const ys = placed.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 0.02);
    const spanY = Math.max(maxY - minY, 0.02);

    return {
      scale,
      minX,
      minY,
      maxX,
      maxY,
      markers: placed.map((point) => ({
        ...point,
        px: PAD + ((point.x - minX) / spanX) * (WIDTH - PAD * 2),
        py: HEIGHT - PAD - ((point.y - minY) / spanY) * (HEIGHT - PAD * 2),
      })),
    };
  }, [assignments]);

  /* Las tareas que declaran el mismo origen se enlazan como un corredor. */
  const corridors = useMemo(() => {
    if (!projection) return [];
    const groups = new Map<string, { px: number; py: number }[]>();
    for (const marker of projection.markers) {
      const key = marker.item.origin || "—";
      groups.set(key, [...(groups.get(key) ?? []), { px: marker.px, py: marker.py }]);
    }
    return [...groups.values()]
      .filter((group) => group.length > 1)
      .map((group) =>
        group.map((p, index) => `${index ? "L" : "M"}${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(" "),
      );
  }, [projection]);

  const options = distinct(statuses, "status");

  return (
    <section className="panel col-8" id="sec-map" aria-label="Mapa de trayectos de asignaciones">
      <div className="panel-head">
        <h2>Trayecto de equipos</h2>
        <span className="sub">
          GET /assignments · {num(assignments.length)} de {num(totalAssignments)}
        </span>
        <div className="head-actions">
          <select
            className="ghost-select"
            value={status}
            onChange={(event) => onStatus(event.target.value)}
            aria-label="Filtrar asignaciones por estado"
          >
            <option value="">Todas las asignaciones</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="map-wrap">
        {assignments.length === 0 ? (
          <div className="state-box">
            <h3>Sin asignaciones</h3>
            <p>No hay tareas con el estado seleccionado en la proyección.</p>
          </div>
        ) : !projection ? (
          <div className="state-box">
            <h3>Asignaciones sin coordenadas</h3>
            <p>
              Las {assignments.length} tareas del filtro no traen latitude/longitude. Abajo queda el
              trayecto declarado origen → destino.
            </p>
          </div>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="img"
              aria-label="Ubicación de las asignaciones sobre su propia extensión geográfica."
            >
              <defs>
                <pattern id="mgrid" width="45" height="45" patternUnits="userSpaceOnUse">
                  <path d="M45 0H0V45" fill="none" stroke="var(--grid)" strokeWidth={1} />
                </pattern>
              </defs>
              <rect width={WIDTH} height={HEIGHT} fill="url(#mgrid)" />

              {corridors.map((d, index) => (
                <path
                  key={index}
                  d={d}
                  fill="none"
                  stroke="var(--line-2)"
                  strokeWidth={2}
                  strokeDasharray="6 7"
                  strokeLinecap="round"
                />
              ))}

              {projection.markers.map((marker) => {
                const item = marker.item;
                const color = item.inconsistent
                  ? "var(--crit)"
                  : item.status === "ACTIVE"
                    ? "var(--accent)"
                    : item.status === "CANCELLED"
                      ? "var(--ink-3)"
                      : "var(--copper)";
                return (
                  <g
                    key={item.id}
                    className="marker"
                    onClick={() => item.equipmentKey && onOpenEquipment(item.equipmentKey)}
                  >
                    <title>
                      {`${item.equipmentKey} · ${item.title}\n${item.origin} → ${item.destination}\nPrisma: ${item.prismaStatus} · Startrack: ${item.startrackStatus}`}
                    </title>
                    <circle cx={marker.px} cy={marker.py} r={14} fill={color} opacity={0.16} />
                    <circle
                      className="core"
                      cx={marker.px}
                      cy={marker.py}
                      r={9}
                      fill={color}
                      stroke="var(--surface)"
                      strokeWidth={2.4}
                    />
                    <text
                      x={marker.px}
                      y={marker.py + 3.2}
                      textAnchor="middle"
                      fontFamily="var(--font-mono), monospace"
                      fontSize={8.5}
                      fontWeight={600}
                      fill="#fff"
                    >
                      {(item.equipmentKey || "··").slice(-2).toUpperCase()}
                    </text>
                    <text
                      x={marker.px}
                      y={marker.py - 18}
                      textAnchor="middle"
                      fontFamily="var(--font-body), sans-serif"
                      fontSize={11.5}
                      fontWeight={600}
                      fill="var(--ink)"
                    >
                      {(item.destination || "").slice(0, 26)}
                    </text>
                    <text
                      x={marker.px}
                      y={marker.py + 26}
                      textAnchor="middle"
                      fontFamily="var(--font-mono), monospace"
                      fontSize={9.5}
                      fill="var(--ink-3)"
                    >
                      {item.assignee}
                    </text>
                  </g>
                );
              })}

              <text
                x={WIDTH - 14}
                y={HEIGHT - 12}
                textAnchor="end"
                fontFamily="var(--font-mono), monospace"
                fontSize={9.5}
                letterSpacing={1.2}
                fill="var(--ink-3)"
              >
                {`ESCALA 1:${projection.scale.toLocaleString("es-SV")} · ${projection.minY.toFixed(3)}/${projection.minX.toFixed(3)} → ${projection.maxY.toFixed(3)}/${projection.maxX.toFixed(3)}`}
              </text>
            </svg>

            <div className="map-legend">
              <span className="lg">
                <i style={{ background: "var(--accent)" }} /> Asignación activa
              </span>
              <span className="lg">
                <i style={{ background: "var(--copper)" }} /> Completada
              </span>
              <span className="lg">
                <i style={{ background: "var(--crit)" }} /> Inconsistente entre fuentes
              </span>
              <span className="lg">
                <i style={{ background: "var(--ink-3)" }} /> Cancelada
              </span>
            </div>
          </>
        )}
      </div>

      <div className="route-list">
        {assignments.slice(0, 12).map((item) => (
          <button
            key={item.id}
            className="route"
            onClick={() => item.equipmentKey && onOpenEquipment(item.equipmentKey)}
          >
            <span className="eq-code" title={item.equipmentKey}>
              {item.equipmentKey || "—"}
            </span>
            <span>{item.origin || "origen sin dato"}</span>
            <span className="arrow">→</span>
            <span>
              <b>{item.destination || "destino sin dato"}</b>
            </span>
            <span className="r-meta">
              {item.inconsistent ? <span className="chip crit">inconsistente</span> : null}
              <span className={`chip ${assignmentTone(item.status)}`}>{item.status}</span>
              <span className="chip">{fecha(item.scheduledDate)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
