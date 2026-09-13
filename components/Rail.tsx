"use client";

import { useState } from "react";
import { num } from "@/lib/format";

const ITEMS = [
  { id: "kpis", label: "Indicadores", icon: "grid" },
  { id: "sec-eq", label: "Equipos", icon: "truck", counter: "equipos" },
  { id: "sec-req", label: "Peticiones", icon: "doc", counter: "peticiones" },
  { id: "sec-map", label: "Mapa de trayectos", icon: "map" },
] as const;

const INTEGRATION = [
  { id: "sec-con", label: "Conflictos", icon: "wrench", counter: "conflictos" },
  { id: "sec-sync", label: "Sincronización", icon: "sync" },
] as const;

function Icon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1.5" />
          <rect x="14" y="3" width="7" height="5" rx="1.5" />
          <rect x="14" y="12" width="7" height="9" rx="1.5" />
          <rect x="3" y="16" width="7" height="5" rx="1.5" />
        </svg>
      );
    case "truck":
      return (
        <svg {...common}>
          <path d="M3 18h4l2-7 4 3h5" />
          <circle cx="6" cy="19.5" r="1.8" />
          <circle cx="17" cy="19.5" r="1.8" />
          <path d="M13 5h5l2 5" />
        </svg>
      );
    case "doc":
      return (
        <svg {...common}>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
          <path d="M9 13h6M9 17h4" />
        </svg>
      );
    case "map":
      return (
        <svg {...common}>
          <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case "wrench":
      return (
        <svg {...common}>
          <path d="m14.7 6.3 3 3M5 19l4.5-1 8.8-8.8a2.1 2.1 0 0 0 0-3l-.5-.5a2.1 2.1 0 0 0-3 0L6 14.5z" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.6-4.2" />
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.6 4.2" />
          <path d="M20 3v5h-5M4 21v-5h5" />
        </svg>
      );
  }
}

export default function Rail({
  equipmentTotal,
  requestsPending,
  conflicts,
  baseUrl,
}: {
  equipmentTotal: number;
  requestsPending: number;
  conflicts: number;
  baseUrl: string;
}) {
  const [current, setCurrent] = useState("kpis");

  const counters: Record<string, { value: number; alert: boolean }> = {
    equipos: { value: equipmentTotal, alert: false },
    peticiones: { value: requestsPending, alert: requestsPending > 0 },
    conflictos: { value: conflicts, alert: conflicts > 0 },
  };

  const go = (id: string) => {
    setCurrent(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const render = (item: { id: string; label: string; icon: string; counter?: string }) => {
    const counter = item.counter ? counters[item.counter] : undefined;
    return (
      <button
        key={item.id}
        className="nav-item"
        aria-current={current === item.id ? "page" : undefined}
        onClick={() => go(item.id)}
      >
        <Icon name={item.icon} />
        {item.label}
        {counter ? (
          <span className={counter.alert ? "nav-count alert" : "nav-count"}>
            {num(counter.value)}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className="rail">
      <div className="brand">
        <div className="brand-mark" aria-hidden="true">
          <svg
            width="19"
            height="19"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#EAF6F4"
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 20h18" />
            <path d="M6 20V9l7-5v16" />
            <path d="M13 12h5v8" />
            <path d="M9 20v-4h2" />
          </svg>
        </div>
        <div>
          <div className="brand-name">Hub Constructora</div>
          <div className="brand-sub">SV · Flota</div>
        </div>
      </div>

      <div className="nav-label">Operación</div>
      {ITEMS.map(render)}

      <div className="nav-label">Integración</div>
      {INTEGRATION.map(render)}

      <div className="rail-foot">
        <div className="rail-user">
          <div className="avatar" aria-hidden="true">
            {baseUrl.startsWith("https:") ? "SSL" : "DEV"}
          </div>
          <div>
            <div className="rail-user-name" title={baseUrl}>
              {baseUrl.replace(/^https?:\/\//, "")}
            </div>
            <div className="rail-user-role">Servidor de integración</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
