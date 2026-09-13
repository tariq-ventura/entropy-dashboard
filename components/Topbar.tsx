"use client";

import { useEffect, useState } from "react";
import { hace } from "@/lib/format";
import type { SyncState } from "@/lib/types";

export default function Topbar({
  sync,
  search,
  onSearch,
  onReload,
  onSync,
  syncing,
}: {
  sync: SyncState;
  search: string;
  onSearch: (value: string) => void;
  onReload: () => void;
  onSync: () => void;
  syncing: boolean;
}) {
  const [draft, setDraft] = useState(search);

  /* La búsqueda va al backend, así que se espera a que el usuario pare. */
  useEffect(() => {
    const timer = setTimeout(() => onSearch(draft.trim()), 320);
    return () => clearTimeout(timer);
  }, [draft, onSearch]);

  const dotClass =
    sync.status === "READY" ? "live-dot" : sync.status === "FAILED" ? "live-dot crit" : "live-dot warn";

  return (
    <header className="topbar">
      <div className="title-block">
        <div className="crumbs">Proyección unificada · Prisma + Startrack</div>
        <h1>Panel de flota</h1>
      </div>

      <div className="live" title="Estado del último ciclo de sincronización">
        <span className={dotClass} aria-hidden="true" />
        <span>
          {syncing ? "SINCRONIZANDO…" : `${sync.status} · ${hace(sync.lastSucceededAt)}`}
        </span>
      </div>

      <label className="search">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Buscar equipo, obra o solicitante…"
          aria-label="Buscar equipo, obra o solicitante"
        />
      </label>

      <button className="top-btn" onClick={onReload}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.6-4.2" />
          <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.6 4.2" />
          <path d="M20 3v5h-5" />
        </svg>
        Recargar
      </button>

      <button className="top-btn primary" onClick={onSync} disabled={syncing}>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 20h16" />
        </svg>
        {syncing ? "Sincronizando…" : "Sincronizar ahora"}
      </button>
    </header>
  );
}
