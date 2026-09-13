"use client";

import { distinct, fecha, num, requestTone } from "@/lib/format";
import type { Pagination, UnifiedRequest } from "@/lib/types";

export default function RequestsPanel({
  requests,
  sample,
  status,
  onStatus,
  pagination,
  onPage,
  onOpenEquipment,
}: {
  requests: UnifiedRequest[];
  sample: UnifiedRequest[];
  status: string;
  onStatus: (value: string) => void;
  pagination: Pagination;
  onPage: (page: number) => void;
  onOpenEquipment: (key: string) => void;
}) {
  /* El vocabulario de estados sale de los datos, no de una lista escrita a mano:
     el backend usa "Pendiente" y "Aprobada", y podría cambiar. */
  const options = distinct(sample, "status");

  return (
    <section className="panel col-4" id="sec-req" aria-label="Peticiones de equipo">
      <div className="panel-head">
        <h2>Peticiones</h2>
        <span className="sub">GET /requests · {num(pagination.total)}</span>
        <div className="head-actions">
          <select
            className="ghost-select"
            value={status}
            onChange={(event) => onStatus(event.target.value)}
            aria-label="Filtrar peticiones por estado"
          >
            <option value="">Todos los estados</option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="req-list">
        {requests.length === 0 ? (
          <div className="state-box">
            <h3>Sin peticiones</h3>
            <p>Ninguna solicitud coincide con el filtro actual.</p>
          </div>
        ) : (
          requests.map((request) => {
            const tone = requestTone(request.status);
            const assigned = request.machinery ?? request.equipmentKey;
            return (
              <article className="req" key={request.id}>
                <div className={`req-sev ${tone.severity}`} />
                <div>
                  <div className="req-id">
                    {request.id.slice(0, 18)} · {fecha(request.startDate)}
                  </div>
                  <div className="req-title">{request.type || "Equipo sin tipo"}</div>
                  <div className="req-meta">
                    {request.project || "Sin proyecto"}
                    <span className="dot-sep" />
                    {request.requester || "sin solicitante"}
                  </div>
                  <div className="req-meta">
                    <span className={`chip ${tone.chip}`}>{request.status || "—"}</span>
                    {assigned ? (
                      <span className="chip info">{assigned}</span>
                    ) : (
                      <span className="chip">sin asignar</span>
                    )}
                    <span className="chip">hasta {fecha(request.endDate)}</span>
                  </div>
                </div>
                <div>
                  {request.equipmentKey ? (
                    <button
                      className="mini-btn"
                      onClick={() => onOpenEquipment(request.equipmentKey as string)}
                    >
                      Ver equipo
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>

      {pagination.totalPages > 1 ? (
        <div className="pager">
          <span>
            Página {pagination.page} de {pagination.totalPages} · {num(pagination.total)} peticiones
          </span>
          <span className="grow">
            <button
              className="mini-btn"
              disabled={pagination.page <= 1}
              onClick={() => onPage(pagination.page - 1)}
            >
              Anterior
            </button>
            <button
              className="mini-btn"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPage(pagination.page + 1)}
            >
              Siguiente
            </button>
          </span>
        </div>
      ) : null}
    </section>
  );
}
