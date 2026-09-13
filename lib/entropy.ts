import "server-only";

import type {
  DashboardSummary,
  EquipmentDetail,
  EquipmentType,
  InitialPayload,
  ListEnvelope,
  SyncConflict,
  SyncState,
  UnifiedAssignment,
  UnifiedEquipment,
  UnifiedRequest,
} from "./types";

/**
 * Única puerta hacia entropy-mcp-server.
 *
 * El import "server-only" de arriba hace que el build falle si alguien
 * importa este módulo desde un componente de cliente — es la salvaguarda
 * que impide que la llave termine en el bundle del navegador por descuido.
 */

export class EntropyError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly kind: "unconfigured" | "unauthorized" | "unreachable" | "api",
  ) {
    super(message);
    this.name = "EntropyError";
  }
}

/**
 * Se lee en cada llamada, no al cargar el módulo. Así rotar la llave es
 * cambiar la variable de entorno y reiniciar el proceso: nunca queda
 * horneada en el bundle de producción.
 */
function config() {
  const baseUrl = (process.env.ENTROPY_API_URL ?? "").trim().replace(/\/+$/, "");
  const apiKey = (process.env.ENTROPY_API_KEY ?? "").trim();
  const timeoutMs = Number(process.env.ENTROPY_TIMEOUT_MS ?? 15000);
  return { baseUrl, apiKey, timeoutMs };
}

export function baseUrlForDisplay(): string {
  return config().baseUrl || "(ENTROPY_API_URL sin definir)";
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(baseUrl: string, path: string, params?: QueryParams): string {
  const url = new URL(`${baseUrl}/api/v1${path.startsWith("/") ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "" || value === false) continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function entropyFetch<T>(
  path: string,
  params?: QueryParams,
  init?: { method?: "GET" | "POST" },
): Promise<T> {
  const { baseUrl, apiKey, timeoutMs } = config();

  if (!baseUrl) {
    throw new EntropyError("Falta ENTROPY_API_URL en el entorno.", 0, "unconfigured");
  }
  if (!apiKey) {
    throw new EntropyError("Falta ENTROPY_API_KEY en el entorno.", 0, "unconfigured");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(baseUrl, path, params), {
      method: init?.method ?? "GET",
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      signal: controller.signal,
      // Un panel de operación no puede servir una proyección cacheada.
      cache: "no-store",
    });
  } catch (cause) {
    const aborted = cause instanceof Error && cause.name === "AbortError";
    throw new EntropyError(
      aborted ? `El backend no respondió en ${timeoutMs} ms.` : "No se pudo alcanzar el backend.",
      0,
      "unreachable",
    );
  } finally {
    clearTimeout(timer);
  }

  const body = await response.text();
  let parsed: unknown = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch {
    /* el backend devolvió algo que no es JSON */
  }

  if (!response.ok) {
    const payload = parsed as { message?: string; error?: string } | null;
    const message = payload?.message ?? payload?.error ?? `HTTP ${response.status}`;
    throw new EntropyError(
      message,
      response.status,
      response.status === 401 ? "unauthorized" : "api",
    );
  }

  return parsed as T;
}

/* ── Lecturas tipadas ──────────────────────────────────────────────────── */

export const getDashboard = () =>
  entropyFetch<{ data: DashboardSummary }>("/dashboard").then((r) => r.data);

export const getSyncStatus = () =>
  entropyFetch<{ data: SyncState }>("/sync-status").then((r) => r.data);

export const getEquipmentTypes = () =>
  entropyFetch<{ data: EquipmentType[] }>("/equipment-types").then((r) => r.data ?? []);

export const listEquipments = (params: QueryParams) =>
  entropyFetch<ListEnvelope<UnifiedEquipment>>("/equipments", params);

export const getEquipment = (key: string) =>
  entropyFetch<{ data: EquipmentDetail }>(`/equipments/${encodeURIComponent(key)}`).then(
    (r) => r.data,
  );

export const listRequests = (params: QueryParams) =>
  entropyFetch<ListEnvelope<UnifiedRequest>>("/requests", params);

export const listAssignments = (params: QueryParams) =>
  entropyFetch<ListEnvelope<UnifiedAssignment>>("/assignments", params);

export const listConflicts = (params: QueryParams) =>
  entropyFetch<ListEnvelope<SyncConflict>>("/conflicts", params);

/** POST /sync dispara un ciclo real contra Prisma y Startrack. */
export const triggerSync = () =>
  entropyFetch<{ data: SyncState }>("/sync", undefined, { method: "POST" }).then((r) => r.data);

/**
 * Carga inicial del panel, en paralelo.
 *
 * Las dos "muestras" sin filtrar existen porque el panel pagina pero los
 * agregados no deben: alimentan el gráfico por tipo, el reparto por estado
 * y el vocabulario real de los selectores. pageSize tope del backend: 100.
 */
export async function loadInitialPayload(): Promise<InitialPayload> {
  const [
    dashboard,
    sync,
    types,
    equipments,
    equipmentSample,
    requests,
    requestSample,
    assignments,
    conflicts,
  ] = await Promise.all([
    getDashboard(),
    getSyncStatus(),
    getEquipmentTypes(),
    listEquipments({ page: 1, pageSize: 12 }),
    listEquipments({ pageSize: 100 }),
    listRequests({ page: 1, pageSize: 8 }),
    listRequests({ pageSize: 100 }),
    listAssignments({ pageSize: 100 }),
    listConflicts({ pageSize: 20 }),
  ]);

  return {
    dashboard,
    sync,
    types,
    equipments: equipments.data ?? [],
    equipmentsPagination: equipments.pagination,
    equipmentSample: equipmentSample.data ?? [],
    requests: requests.data ?? [],
    requestsPagination: requests.pagination,
    requestSample: requestSample.data ?? [],
    assignments: assignments.data ?? [],
    conflicts: conflicts.data ?? [],
  };
}
