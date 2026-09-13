import type {
  DashboardSummary,
  EquipmentDetail,
  ListEnvelope,
  SyncConflict,
  SyncState,
  UnifiedAssignment,
  UnifiedEquipment,
  UnifiedRequest,
} from "./types";

/**
 * Cliente del navegador. Habla únicamente con /api/entropy, nunca con el
 * backend Go directamente: la credencial vive del otro lado del proxy.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

async function get<T>(path: string, params?: Params): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  const response = await fetch(`/api/entropy${path}${query ? `?${query}` : ""}`, {
    cache: "no-store",
  });

  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    /* respuesta no JSON */
  }

  if (!response.ok) {
    const payload = parsed as { message?: string } | null;
    throw new ApiError(payload?.message ?? `HTTP ${response.status}`, response.status);
  }
  return parsed as T;
}

export const fetchDashboard = () =>
  get<{ data: DashboardSummary }>("/dashboard").then((r) => r.data);

export const fetchSyncStatus = () => get<{ data: SyncState }>("/sync-status").then((r) => r.data);

export const fetchEquipments = (params: Params) =>
  get<ListEnvelope<UnifiedEquipment>>("/equipments", params);

export const fetchEquipment = (key: string) =>
  get<{ data: EquipmentDetail }>(`/equipments/${encodeURIComponent(key)}`).then((r) => r.data);

export const fetchRequests = (params: Params) =>
  get<ListEnvelope<UnifiedRequest>>("/requests", params);

export const fetchAssignments = (params: Params) =>
  get<ListEnvelope<UnifiedAssignment>>("/assignments", params);

export const fetchConflicts = (params: Params) =>
  get<ListEnvelope<SyncConflict>>("/conflicts", params);

/** Dispara un ciclo real de sincronización. Solo desde un clic explícito. */
export async function runSync(): Promise<SyncState> {
  const response = await fetch("/api/entropy/sync", { method: "POST", cache: "no-store" });
  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    /* respuesta no JSON */
  }
  if (!response.ok) {
    const payload = parsed as { message?: string } | null;
    throw new ApiError(payload?.message ?? `HTTP ${response.status}`, response.status);
  }
  return (parsed as { data: SyncState }).data;
}
