"use client";

import { useMemo, useState } from "react";
import { equipmentLabel, equipmentTone, num } from "@/lib/format";
import type {
  EquipmentType,
  Pagination,
  UnifiedAssignment,
  UnifiedEquipment,
} from "@/lib/types";

type Tab = "maquinaria" | "operadores" | "tipos";

export default function EquipmentPanel({
  equipments,
  sample,
  assignments,
  types,
  type,
  onType,
  onlyAvailable,
  onOnlyAvailable,
  pagination,
  onPage,
  onOpenEquipment,
}: {
  equipments: UnifiedEquipment[];
  sample: UnifiedEquipment[];
  assignments: UnifiedAssignment[];
  types: EquipmentType[];
  type: string;
  onType: (value: string) => void;
  onlyAvailable: boolean;
  onOnlyAvailable: (value: boolean) => void;
  pagination: Pagination;
  onPage: (page: number) => void;
  onOpenEquipment: (key: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("maquinaria");

  /* El API no expone un catálogo de operadores: se deriva de equipment.driver
     y assignment.assignee. El pie del panel lo declara. */
  const operators = useMemo(() => {
    const map = new Map<string, { name: string; equipos: string[]; tareas: number }>();
    for (const equipment of sample) {
      const name = equipment.driver?.trim();
      if (!name) continue;
      const entry = map.get(name) ?? { name, equipos: [], tareas: 0 };
      entry.equipos.push(equipment.assetNumber ?? equipment.equipmentKey);
      map.set(name, entry);
    }
    for (const assignment of assignments) {
      const name = assignment.assignee?.trim();
      if (!name) continue;
      const entry = map.get(name) ?? { name, equipos: [], tareas: 0 };
      entry.tareas += 1;
      map.set(name, entry);
    }
    return [...map.values()].sort(
      (a, b) => b.tareas - a.tareas || a.name.localeCompare(b.name, "es"),
    );
  }, [sample, assignments]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const equipment of sample) {
      const key = equipment.equipmentTypeCode || "—";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [sample]);

  return (
    <section className="panel col-7" id="sec-eq" aria-label="Equipos, operadores y tipos">
      <div className="panel-head">
        <h2>Equipos</h2>
        <span className="sub">GET /equipments · {num(pagination.total)}</span>
        <div className="head-actions">
          <select
            className="ghost-select"
            value={type}
            onChange={(event) => onType(event.target.value)}
            aria-label="Filtrar por tipo de equipo"
          >
            <option value="">Todos los tipos</option>
            {types.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            className={onlyAvailable ? "ghost-btn on" : "ghost-btn"}
            aria-pressed={onlyAvailable}
            onClick={() => onOnlyAvailable(!onlyAvailable)}
          >
            Solo disponibles
          </button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ["maquinaria", "Maquinaria", pagination.total],
            ["operadores", "Operadores", operators.length],
            ["tipos", "Tipos", types.length],
          ] as [Tab, string, number][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            className="tab"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {label} <span className="n">{num(count)}</span>
          </button>
        ))}
      </div>

      {tab === "maquinaria" ? (
        equipments.length === 0 ? (
          <div className="state-box">
            <h3>Sin equipos</h3>
            <p>Ningún equipo coincide con el tipo, la búsqueda o el filtro de disponibilidad.</p>
          </div>
        ) : (
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Unidad</th>
                  <th>Tipo</th>
                  <th>Operador</th>
                  <th>Correlación</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {equipments.map((equipment) => {
                  const conflicts = equipment.conflicts?.length ?? 0;
                  const identity =
                    [equipment.brand, equipment.model, equipment.year].filter(Boolean).join(" · ") ||
                    equipment.company ||
                    "—";
                  return (
                    <tr
                      key={equipment.equipmentKey}
                      className="clickable"
                      tabIndex={0}
                      onClick={() => onOpenEquipment(equipment.equipmentKey)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onOpenEquipment(equipment.equipmentKey);
                      }}
                    >
                      <td>
                        <div className="eq">
                          <span
                            className="eq-code"
                            title={equipment.assetNumber ?? equipment.equipmentKey}
                          >
                            {equipment.assetNumber ?? equipment.equipmentKey}
                          </span>
                          <span>
                            <span className="eq-name">{equipment.name || "Sin nombre"}</span>
                            <br />
                            <span className="eq-sub">{identity}</span>
                          </span>
                        </div>
                      </td>
                      <td>{equipment.type || equipment.startrackType || "—"}</td>
                      <td>
                        {equipment.driver ?? <span className="muted">Sin asignar</span>}
                      </td>
                      <td>
                        {equipment.linked ? (
                          <span className="chip good">vinculado</span>
                        ) : (
                          <span className="chip crit">solo una fuente</span>
                        )}
                        {conflicts ? <span className="chip copper"> {conflicts}</span> : null}
                      </td>
                      <td>
                        <span className={`state ${equipmentTone(equipment)}`}>
                          <i />
                          {equipmentLabel(equipment)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {tab === "operadores" ? (
        operators.length === 0 ? (
          <div className="state-box">
            <h3>Sin operadores registrados</h3>
            <p>Ningún equipo trae el campo driver ni ninguna asignación trae assignee.</p>
          </div>
        ) : (
          <>
            <div className="tbl-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Operador</th>
                    <th>Equipos a cargo</th>
                    <th style={{ textAlign: "right" }}>Tareas asignadas</th>
                  </tr>
                </thead>
                <tbody>
                  {operators.map((operator) => (
                    <tr key={operator.name}>
                      <td>
                        <div className="eq">
                          <span
                            className="avatar"
                            style={{ background: "var(--surface-3)", color: "var(--ink-2)" }}
                          >
                            {operator.name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((word) => word[0])
                              .join("")
                              .toUpperCase()}
                          </span>
                          <span className="eq-name">{operator.name}</span>
                        </div>
                      </td>
                      <td>
                        {operator.equipos.length ? (
                          operator.equipos.map((code) => (
                            <span className="eq-code" key={code} title={code}>
                              {code}
                            </span>
                          ))
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }} className="tnum">
                        {num(operator.tareas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="panel-note">
              Derivado de <span className="mono">equipment.driver</span> y{" "}
              <span className="mono">assignment.assignee</span>: el API no expone un catálogo propio
              de operadores.
            </p>
          </>
        )
      ) : null}

      {tab === "tipos" ? (
        types.length === 0 ? (
          <div className="state-box">
            <h3>Sin catálogo de tipos</h3>
            <p>GET /equipment-types no devolvió registros activos.</p>
          </div>
        ) : (
          <div className="tbl-scroll">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th style={{ textAlign: "right" }}>Equipos en la muestra</th>
                </tr>
              </thead>
              <tbody>
                {types.map((item) => (
                  <tr key={item.code}>
                    <td>
                      <span className="eq-code" title={item.code}>
                        {item.code}
                      </span>
                    </td>
                    <td>{item.name}</td>
                    <td style={{ textAlign: "right" }} className="tnum">
                      {num(typeCounts.get(item.code) ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}

      {tab === "maquinaria" && pagination.totalPages > 1 ? (
        <div className="pager">
          <span>
            Página {pagination.page} de {pagination.totalPages} · {num(pagination.total)} equipos
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
