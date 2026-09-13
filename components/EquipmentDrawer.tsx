"use client";

import { useEffect, useState } from "react";
import { fecha, fechaHora, num } from "@/lib/format";
import { fetchEquipment } from "@/lib/client";
import type { EquipmentDetail } from "@/lib/types";

export default function EquipmentDrawer({
  equipmentKey,
  onClose,
}: {
  equipmentKey: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<EquipmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError(null);
    fetchEquipment(equipmentKey)
      .then((result) => {
        if (!cancelled) setDetail(result);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, [equipmentKey]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const equipment = detail?.equipment;
  const maintenance = detail?.maintenance ?? [];

  const fields: [string, string | number | undefined][] = equipment
    ? [
        ["Nombre", equipment.name],
        ["Placa / activo", equipment.assetNumber],
        ["Tipo Prisma", equipment.type],
        ["Tipo Startrack", equipment.startrackType],
        ["Estado Prisma", equipment.prismaStatus],
        ["Estado Startrack", equipment.trackingStatus],
        ["Empresa", equipment.company],
        ["Marca / modelo", [equipment.brand, equipment.model].filter(Boolean).join(" ")],
        ["Año", equipment.year],
        ["Grupo", equipment.group],
        ["Etiquetas", equipment.tags],
        ["Operador", equipment.driver],
        ["ID Prisma", equipment.prismaId],
        ["ID Startrack", equipment.startrackId],
        ["Sincronizado", equipment.syncedAt ? fechaHora(equipment.syncedAt) : undefined],
      ]
    : [];

  return (
    <div className="drawer">
      <button className="drawer-scrim" onClick={onClose} aria-label="Cerrar detalle" />
      <div className="drawer-panel" role="dialog" aria-modal="true" aria-label="Detalle de equipo">
        <div className="drawer-head">
          <div>
            <div className="crumbs">GET /equipments/{equipmentKey}</div>
            <h2 style={{ margin: "2px 0 0", fontSize: 17 }}>
              {equipment?.assetNumber ?? equipmentKey}
            </h2>
          </div>
          <button className="ghost-btn" style={{ marginLeft: "auto" }} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {error ? (
            <div className="state-box">
              <h3>No se pudo leer el equipo</h3>
              <p>{error}</p>
            </div>
          ) : !detail ? (
            <div className="state-box">
              <p>Cargando detalle…</p>
            </div>
          ) : (
            <>
              <section className="dsec">
                <h3>Identidad unificada</h3>
                <dl className="kv">
                  {fields
                    .filter(([, value]) => value !== undefined && value !== null && value !== "")
                    .map(([label, value]) => (
                      <div key={label} style={{ display: "contents" }}>
                        <dt>{label}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                </dl>
              </section>

              <section className="dsec">
                <h3>Correlación</h3>
                {equipment?.linked ? (
                  <span className="chip good">vinculado en ambas fuentes</span>
                ) : (
                  <span className="chip crit">presente en una sola fuente</span>
                )}
                {equipment?.conflicts?.length ? (
                  <ul>
                    {equipment.conflicts.map((conflict) => (
                      <li key={conflict}>{conflict}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: "9px 0 0", fontSize: 12.5, color: "var(--ink-2)" }}>
                    Sin divergencias registradas.
                  </p>
                )}
              </section>

              <section className="dsec">
                <h3>Historial de mantenimiento · {maintenance.length}</h3>
                {maintenance.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>
                    Sin registros de mantenimiento para esta unidad.
                  </p>
                ) : (
                  <div className="tbl-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Motivo</th>
                          <th style={{ textAlign: "right" }}>Horómetro</th>
                          <th style={{ textAlign: "right" }}>Odómetro</th>
                          <th>Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenance.map((record) => (
                          <tr key={record.id}>
                            {/* serviceDate llega como RFC3339 completo, no como fecha corta */}
                            <td className="tnum">{fecha(record.serviceDate)}</td>
                            <td>
                              <b>{record.repairReason || "—"}</b>
                              <br />
                              <span className="eq-sub">{record.reference?.slice(0, 70)}</span>
                            </td>
                            <td style={{ textAlign: "right" }} className="tnum">
                              {num(record.hourMeter)} <span className="unit">h</span>
                            </td>
                            <td style={{ textAlign: "right" }} className="tnum">
                              {num(record.odometer)} <span className="unit">km</span>
                            </td>
                            <td>{record.serviceType || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
