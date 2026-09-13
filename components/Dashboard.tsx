"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  fetchAssignments,
  fetchConflicts,
  fetchDashboard,
  fetchEquipments,
  fetchRequests,
  fetchSyncStatus,
  runSync,
} from "@/lib/client";
import type { InitialPayload, Pagination } from "@/lib/types";
import Rail from "./Rail";
import Topbar from "./Topbar";
import KpiSlab from "./KpiSlab";
import MapPanel from "./MapPanel";
import RequestsPanel from "./RequestsPanel";
import EquipmentPanel from "./EquipmentPanel";
import ConflictsPanel from "./ConflictsPanel";
import TypeChart from "./TypeChart";
import RequestStatusChart from "./RequestStatusChart";
import SyncPanel from "./SyncPanel";
import EquipmentDrawer from "./EquipmentDrawer";
import EpaChat from "./EpaChat";

const EQUIPMENTS_PAGE_SIZE = 12;
const REQUESTS_PAGE_SIZE = 8;
const REFRESH_MS = 60_000;

export default function Dashboard({
  initial,
  baseUrl,
}: {
  initial: InitialPayload;
  baseUrl: string;
}) {
  const [data, setData] = useState(initial);
  const [banner, setBanner] = useState<{ text: string; error: boolean } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [drawerKey, setDrawerKey] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [equipmentType, setEquipmentType] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [requestStatus, setRequestStatus] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("");
  const [equipmentPage, setEquipmentPage] = useState(1);
  const [requestPage, setRequestPage] = useState(1);

  const firstRender = useRef(true);

  const report = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      setBanner({
        text:
          error.status === 401
            ? "El backend rechazó la credencial (401). Revisa ENTROPY_API_KEY en el entorno del servidor."
            : error.message,
        error: true,
      });
      return;
    }
    setBanner({ text: "Fallo inesperado al consultar el API.", error: true });
  }, []);

  /* Equipos: tipo, disponibilidad, búsqueda y página se resuelven en el backend. */
  useEffect(() => {
    if (firstRender.current) return;
    let cancelled = false;
    fetchEquipments({
      page: equipmentPage,
      pageSize: EQUIPMENTS_PAGE_SIZE,
      type: equipmentType,
      search,
      onlyAvailable,
    })
      .then((result) => {
        if (cancelled) return;
        setData((previous) => ({
          ...previous,
          equipments: result.data ?? [],
          equipmentsPagination: result.pagination,
        }));
        setBanner(null);
      })
      .catch(report);
    return () => {
      cancelled = true;
    };
  }, [equipmentPage, equipmentType, onlyAvailable, search, report]);

  useEffect(() => {
    if (firstRender.current) return;
    let cancelled = false;
    fetchRequests({
      page: requestPage,
      pageSize: REQUESTS_PAGE_SIZE,
      status: requestStatus,
      search,
    })
      .then((result) => {
        if (cancelled) return;
        setData((previous) => ({
          ...previous,
          requests: result.data ?? [],
          requestsPagination: result.pagination,
        }));
        setBanner(null);
      })
      .catch(report);
    return () => {
      cancelled = true;
    };
  }, [requestPage, requestStatus, search, report]);

  /* Las asignaciones se traen sin filtrar por estado: el filtro del mapa se
     aplica en cliente, así el selector conoce el vocabulario completo. */
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    let cancelled = false;
    fetchAssignments({ pageSize: 100, search })
      .then((result) => {
        if (cancelled) return;
        setData((previous) => ({ ...previous, assignments: result.data ?? [] }));
      })
      .catch(report);
    return () => {
      cancelled = true;
    };
  }, [search, report]);

  /* Refresco de fondo: solo las cifras de cabecera, y nunca con la pestaña oculta. */
  useEffect(() => {
    const timer = setInterval(async () => {
      if (document.hidden) return;
      try {
        const [dashboard, sync, conflicts] = await Promise.all([
          fetchDashboard(),
          fetchSyncStatus(),
          fetchConflicts({ pageSize: 20 }),
        ]);
        setData((previous) => ({
          ...previous,
          dashboard,
          sync,
          conflicts: conflicts.data ?? [],
        }));
      } catch {
        /* un fallo puntual del refresco no debe romper la vista cargada */
      }
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const reload = useCallback(async () => {
    try {
      const [dashboard, sync, equipments, requests, assignments, conflicts] = await Promise.all([
        fetchDashboard(),
        fetchSyncStatus(),
        fetchEquipments({
          page: equipmentPage,
          pageSize: EQUIPMENTS_PAGE_SIZE,
          type: equipmentType,
          search,
          onlyAvailable,
        }),
        fetchRequests({
          page: requestPage,
          pageSize: REQUESTS_PAGE_SIZE,
          status: requestStatus,
          search,
        }),
        fetchAssignments({ pageSize: 100, search }),
        fetchConflicts({ pageSize: 20 }),
      ]);
      setData((previous) => ({
        ...previous,
        dashboard,
        sync,
        equipments: equipments.data ?? [],
        equipmentsPagination: equipments.pagination,
        requests: requests.data ?? [],
        requestsPagination: requests.pagination,
        assignments: assignments.data ?? [],
        conflicts: conflicts.data ?? [],
      }));
      setBanner(null);
    } catch (error) {
      report(error);
    }
  }, [equipmentPage, equipmentType, onlyAvailable, requestPage, requestStatus, search, report]);

  /* POST /sync corre un ciclo real contra Prisma y Startrack: solo por clic. */
  const onSync = useCallback(async () => {
    setSyncing(true);
    try {
      const sync = await runSync();
      setData((previous) => ({ ...previous, sync }));
      await reload();
    } catch (error) {
      report(error);
    } finally {
      setSyncing(false);
    }
  }, [reload, report]);

  /* Estable a propósito: Topbar la usa como dependencia de su efecto de
     debounce, y una closure nueva en cada render reiniciaría el temporizador. */
  const onSearchChange = useCallback((value: string) => {
    setSearch(value);
    setEquipmentPage(1);
    setRequestPage(1);
  }, []);

  const visibleAssignments = useMemo(
    () =>
      assignmentStatus
        ? data.assignments.filter((item) => item.status === assignmentStatus)
        : data.assignments,
    [data.assignments, assignmentStatus],
  );

  const pagination = (value: Pagination | undefined, fallbackLength: number) =>
    value ?? { page: 1, pageSize: fallbackLength, total: fallbackLength, totalPages: 1 };

  return (
    <>
      <div className="shell">
        <Rail
          equipmentTotal={data.dashboard.equipmentTotal}
          requestsPending={data.dashboard.requestsPending}
          conflicts={data.dashboard.conflicts}
          baseUrl={baseUrl}
        />

        <div className="main">
          <Topbar
            sync={data.sync}
            search={search}
            onSearch={onSearchChange}
            onReload={reload}
            onSync={onSync}
            syncing={syncing}
          />

          {banner ? (
            <div className={banner.error ? "banner err" : "banner"} role="status">
              <span>{banner.text}</span>
            </div>
          ) : null}

          <main className="canvas">
            <KpiSlab
              summary={data.dashboard}
              sync={data.sync}
              sample={data.equipmentSample}
            />

            <MapPanel
              assignments={visibleAssignments}
              totalAssignments={data.assignments.length}
              statuses={data.assignments}
              status={assignmentStatus}
              onStatus={setAssignmentStatus}
              onOpenEquipment={setDrawerKey}
            />

            <RequestsPanel
              requests={data.requests}
              sample={data.requestSample}
              status={requestStatus}
              onStatus={(value) => {
                setRequestStatus(value);
                setRequestPage(1);
              }}
              pagination={pagination(data.requestsPagination, data.requests.length)}
              onPage={setRequestPage}
              onOpenEquipment={setDrawerKey}
            />

            <EquipmentPanel
              equipments={data.equipments}
              sample={data.equipmentSample}
              assignments={data.assignments}
              types={data.types}
              type={equipmentType}
              onType={(value) => {
                setEquipmentType(value);
                setEquipmentPage(1);
              }}
              onlyAvailable={onlyAvailable}
              onOnlyAvailable={(value) => {
                setOnlyAvailable(value);
                setEquipmentPage(1);
              }}
              pagination={pagination(data.equipmentsPagination, data.equipments.length)}
              onPage={setEquipmentPage}
              onOpenEquipment={setDrawerKey}
            />

            <ConflictsPanel conflicts={data.conflicts} />

            <TypeChart sample={data.equipmentSample} total={data.dashboard.equipmentTotal} />

            <RequestStatusChart
              sample={data.requestSample}
              total={pagination(data.requestsPagination, data.requests.length).total}
            />

            <SyncPanel sync={data.sync} />
          </main>
        </div>
      </div>

      {drawerKey ? (
        <EquipmentDrawer equipmentKey={drawerKey} onClose={() => setDrawerKey(null)} />
      ) : null}

      <EpaChat
        summary={data.dashboard}
        sync={data.sync}
        equipmentSample={data.equipmentSample}
        requestSample={data.requestSample}
        conflicts={data.conflicts}
      />
    </>
  );
}
