import type { UnifiedEquipment } from "./types";

/** Helpers compartidos por servidor y cliente. Sin dependencias. */

export function num(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("es-SV");
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function fecha(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });
}

export function fechaHora(iso?: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return String(iso);
  return date.toLocaleString("es-SV", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hace(iso?: string | null): string {
  if (!iso) return "sin registro";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (Number.isNaN(seconds)) return "sin registro";
  if (seconds < 90) return `hace ${Math.max(0, Math.round(seconds))} s`;
  if (seconds < 5400) return `hace ${Math.round(seconds / 60)} min`;
  if (seconds < 172800) return `hace ${Math.round(seconds / 3600)} h`;
  return `hace ${Math.round(seconds / 86400)} d`;
}

export type Tone = "good" | "warn" | "copper" | "info" | "mute" | "crit";

/**
 * El API entrega el texto crudo de cada fuente (Prisma y Startrack usan
 * vocabularios distintos), así que se clasifica por patrón y se muestra
 * siempre la etiqueta original sin reescribirla.
 */
export function equipmentTone(equipment: UnifiedEquipment): Tone {
  const text = `${equipment.prismaStatus ?? ""} ${equipment.trackingStatus ?? ""}`.toLowerCase();
  if (equipment.available) return "good";
  if (/manten|taller|repar|averi/.test(text)) return "copper";
  if (/ruta|movimiento|transit/.test(text)) return "info";
  if (/ralent|deten|parad/.test(text)) return "warn";
  return "mute";
}

export function equipmentLabel(equipment: UnifiedEquipment): string {
  return (
    equipment.prismaStatus ??
    equipment.trackingStatus ??
    (equipment.available ? "Disponible" : "Sin estado")
  );
}

export function requestTone(status?: string): { severity: string; chip: string } {
  const text = (status ?? "").toLowerCase();
  if (/pendiente/.test(text)) return { severity: "mid", chip: "warn" };
  if (/asignad|aprobad/.test(text)) return { severity: "ok", chip: "good" };
  if (/cancelad|rechazad/.test(text)) return { severity: "hi", chip: "crit" };
  return { severity: "", chip: "" };
}

export function assignmentTone(status?: string): string {
  switch ((status ?? "").toUpperCase()) {
    case "ACTIVE":
      return "good";
    case "CANCELLED":
      return "crit";
    case "COMPLETED":
      return "";
    default:
      return "info";
  }
}

export function distinct<T>(rows: T[], field: keyof T): string[] {
  const seen = new Set<string>();
  for (const row of rows) {
    const value = String(row[field] ?? "").trim();
    if (value) seen.add(value);
  }
  return [...seen].sort();
}

/**
 * latitude/longitude llegan como enteros y el backend no declara la escala.
 * Se elige la menor potencia que deje TODO el conjunto dentro de rangos
 * geográficos válidos. Con los datos de development da 1e7
 * (139942000 → 13.9942 °N, que es Santa Ana).
 */
export function pickCoordinateScale(points: { lat: number; lng: number }[]): number {
  for (const scale of [1, 1e5, 1e6, 1e7]) {
    const fits = points.every(
      (point) => Math.abs(point.lat / scale) <= 90 && Math.abs(point.lng / scale) <= 180,
    );
    if (fits) return scale;
  }
  return 1e7;
}
