/**
 * Formas de respuesta del API de integración.
 * Calcadas de internal/projection/models.go — si cambia un struct allá,
 * este archivo es el único lugar que hay que tocar acá.
 */

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Envelope<T> {
  data: T;
}

export interface ListEnvelope<T> {
  data: T[];
  pagination?: Pagination;
}

export interface EquipmentType {
  code: string;
  name: string;
  active: boolean;
  syncedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UnifiedEquipment {
  equipmentKey: string;
  equipmentTypeCode: string;
  linked: boolean;
  available: boolean;
  name: string;
  assetNumber?: string;
  type: string;
  startrackType?: string;
  prismaStatus?: string;
  trackingStatus?: string;
  company?: string;
  year?: number;
  color?: string;
  brand?: string;
  model?: string;
  /** El struct Go lo serializa como "group" aunque la columna sea group_name. */
  group?: string;
  tags?: string;
  driver?: string;
  remoteId?: string;
  startrackDescription?: string;
  prismaId?: string;
  startrackId?: string;
  conflicts?: string[];
  syncedAt: string;
}

export interface UnifiedRequest {
  id: string;
  project: string;
  type: string;
  equipmentTypeCode: string;
  requester: string;
  startDate: string;
  endDate: string;
  /** Vocabulario del backend: "Pendiente", "Aprobada", … No asumir valores. */
  status: string;
  machinery?: string | null;
  equipmentKey?: string | null;
  sourceCreatedAt?: string;
  sourceUpdatedAt?: string;
  syncedAt: string;
}

export interface UnifiedMaintenance {
  id: string;
  equipmentKey: string;
  vehicle: string;
  reference: string;
  /** Llega como RFC3339 completo, no como fecha corta. */
  serviceDate: string;
  odometer: number;
  serviceTime: string;
  hourMeter: number;
  repairReason: string;
  provider?: string;
  mechanic?: string;
  serviceType?: string;
  syncedAt: string;
}

export interface UnifiedAssignment {
  id: string;
  requestId: string;
  equipmentKey: string;
  taskExternalId: string;
  /** "ACTIVE" | "COMPLETED" | "CANCELLED" según lo observado. */
  status: string;
  title: string;
  description: string;
  taskType: string;
  scheduledDate: string;
  origin: string;
  destination: string;
  /** Enteros escalados: el backend no declara la escala. Ver toDegrees(). */
  latitude: number;
  longitude: number;
  assignee: string;
  prismaStatus: string;
  startrackStatus: string;
  inconsistent: boolean;
  syncedAt: string;
}

export interface SyncConflict {
  id: string;
  entityType: string;
  entityKey: string;
  field: string;
  prismaValue?: string;
  startrackValue?: string;
  message: string;
  detectedAt: string;
}

export interface SyncState {
  status: string;
  lastStartedAt?: string;
  lastSucceededAt?: string;
  lastError?: string;
  equipmentCount: number;
  requestCount: number;
  assignmentCount: number;
  maintenanceCount: number;
  conflictCount: number;
  updatedAt: string;
}

export interface DashboardSummary {
  equipmentTotal: number;
  equipmentAvailable: number;
  requestsPending: number;
  assignmentsActive: number;
  conflicts: number;
  lastSyncedAt?: string;
}

export interface EquipmentDetail {
  equipment: UnifiedEquipment;
  maintenance: UnifiedMaintenance[];
}

/** Lo que el Server Component entrega al árbol de cliente en el primer render. */
export interface InitialPayload {
  dashboard: DashboardSummary;
  sync: SyncState;
  types: EquipmentType[];
  equipments: UnifiedEquipment[];
  equipmentsPagination?: Pagination;
  equipmentSample: UnifiedEquipment[];
  requests: UnifiedRequest[];
  requestsPagination?: Pagination;
  requestSample: UnifiedRequest[];
  assignments: UnifiedAssignment[];
  conflicts: SyncConflict[];
}

export interface LoadFailure {
  kind: "unconfigured" | "unauthorized" | "unreachable";
  message: string;
  baseUrl: string;
}
