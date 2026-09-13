"use client";

import { useEffect, useRef, useState } from "react";
import { hace, num, pct } from "@/lib/format";
import type {
  DashboardSummary,
  SyncConflict,
  SyncState,
  UnifiedEquipment,
  UnifiedRequest,
} from "@/lib/types";

type Topic = "disponibles" | "pendientes" | "conflictos" | "sync" | "otro";

interface Message {
  id: number;
  from: "bot" | "me";
  text: string;
  items?: string[];
  source?: string;
}

const CHIPS: { topic: Topic; label: string }[] = [
  { topic: "disponibles", label: "Equipos disponibles" },
  { topic: "pendientes", label: "Peticiones pendientes" },
  { topic: "conflictos", label: "Conflictos abiertos" },
  { topic: "sync", label: "Estado de sincronización" },
];

function classify(text: string): Topic {
  const value = text.toLowerCase();
  if (/disponib|libre/.test(value)) return "disponibles";
  if (/pendient|petici|solicit/.test(value)) return "pendientes";
  if (/conflict|discrepan|inconsist/.test(value)) return "conflictos";
  if (/sync|sincron|actualiz/.test(value)) return "sync";
  return "otro";
}

/**
 * EPA no llama a ningún modelo: responde calculando sobre los datos que el
 * panel ya trajo del API. Cada respuesta cita su fuente y su antigüedad.
 */
export default function EpaChat({
  summary,
  sync,
  equipmentSample,
  requestSample,
  conflicts,
}: {
  summary: DashboardSummary;
  sync: SyncState;
  equipmentSample: UnifiedEquipment[];
  requestSample: UnifiedRequest[];
  conflicts: SyncConflict[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  const source = () => `proyección · ${hace(sync.lastSucceededAt)}`;

  useEffect(() => {
    if (messages.length > 0) return;
    setMessages([
      {
        id: 0,
        from: "bot",
        text: `La proyección tiene ${num(summary.equipmentTotal)} equipos, ${num(
          summary.requestsPending,
        )} peticiones pendientes y ${num(summary.conflicts)} conflictos sin conciliar.`,
        source: source(),
      },
    ]);
    // Solo para el saludo inicial: no debe reescribirse en cada refresco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.equipmentTotal]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages]);

  const answer = (topic: Topic): Omit<Message, "id" | "from"> => {
    switch (topic) {
      case "disponibles": {
        const free = equipmentSample.filter((item) => item.available);
        return {
          text: `Hay ${num(summary.equipmentAvailable)} equipos disponibles de ${num(
            summary.equipmentTotal,
          )} (${pct(summary.equipmentAvailable, summary.equipmentTotal)} %).`,
          items: free
            .slice(0, 5)
            .map(
              (item) =>
                `${item.assetNumber ?? item.equipmentKey} — ${item.type || "sin tipo"}${
                  item.linked ? "" : " · sin correlación con Startrack"
                }`,
            ),
          source: source(),
        };
      }
      case "pendientes": {
        const pending = requestSample.filter((item) => /pendiente/i.test(item.status));
        return {
          text: `${num(summary.requestsPending)} peticiones en estado pendiente.`,
          items: pending
            .slice(0, 5)
            .map(
              (item) =>
                `${item.type || "equipo"} para ${item.project || "obra sin nombre"} · solicita ${
                  item.requester || "—"
                }`,
            ),
          source: source(),
        };
      }
      case "conflictos": {
        const byField = new Map<string, number>();
        for (const conflict of conflicts) {
          const key = conflict.field || "—";
          byField.set(key, (byField.get(key) ?? 0) + 1);
        }
        return {
          text: `${num(summary.conflicts)} conflictos entre Prisma y Startrack. Los de tipo "missing" significan que la unidad existe en una sola fuente: hasta conciliarla no entra en las recomendaciones.`,
          items: [...byField.entries()].map(([field, count]) => `${field}: ${count}`),
          source: source(),
        };
      }
      case "sync":
        return {
          text: `El último ciclo terminó en ${sync.status} ${hace(sync.lastSucceededAt)}.${
            sync.lastError ? ` Último error: ${sync.lastError}` : " Sin errores registrados."
          }`,
          items: [
            `Equipos: ${num(sync.equipmentCount)}`,
            `Peticiones: ${num(sync.requestCount)}`,
            `Asignaciones: ${num(sync.assignmentCount)}`,
            `Mantenimientos: ${num(sync.maintenanceCount)}`,
          ],
          source: source(),
        };
      default:
        return {
          text: "Puedo responder sobre equipos disponibles, peticiones pendientes, conflictos de integración y estado de sincronización — todo calculado sobre lo que este panel ya trajo del API.",
        };
    }
  };

  const ask = (topic: Topic, label: string) => {
    const reply = answer(topic);
    setMessages((previous) => [
      ...previous,
      { id: nextId.current++, from: "me", text: label },
      { id: nextId.current++, from: "bot", ...reply },
    ]);
  };

  if (!open) {
    const alert = summary.conflicts > 0 || summary.requestsPending > 0;
    return (
      <button className="epa-fab" onClick={() => setOpen(true)} aria-expanded={false}>
        <span className="epa-orb" aria-hidden="true">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        Preguntar a EPA
        {alert ? <span className="badge">!</span> : null}
      </button>
    );
  }

  return (
    <section className="epa-panel" aria-label="EPA, asistente de flota">
      <header className="epa-head">
        <span className="epa-orb" style={{ width: 32, height: 32 }} aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v3" />
            <rect x="4" y="6" width="16" height="12" rx="3" />
            <circle cx="9" cy="12" r="1.4" fill="#fff" stroke="none" />
            <circle cx="15" cy="12" r="1.4" fill="#fff" stroke="none" />
          </svg>
        </span>
        <div>
          <div className="epa-name">EPA</div>
          <div className="epa-status">
            Leyendo {num(summary.equipmentTotal)} equipos y {num(summary.conflicts)} conflictos
          </div>
        </div>
        <button
          className="ghost-btn"
          style={{ marginLeft: "auto" }}
          onClick={() => setOpen(false)}
          aria-label="Cerrar chat de EPA"
        >
          ✕
        </button>
      </header>

      <div className="epa-log" ref={logRef}>
        {messages.map((message) => (
          <div className={`msg ${message.from}`} key={message.id}>
            {message.text}
            {message.items?.length ? (
              <ul>
                {message.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
            {message.source ? <div className="m-src">{message.source}</div> : null}
          </div>
        ))}
      </div>

      <div className="epa-chips">
        {CHIPS.map((chip) => (
          <button key={chip.topic} className="epa-chip" onClick={() => ask(chip.topic, chip.label)}>
            {chip.label}
          </button>
        ))}
      </div>

      <form
        className="epa-input"
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          if (!value) return;
          setDraft("");
          ask(classify(value), value);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Pregunta sobre equipos, peticiones o conflictos…"
          aria-label="Mensaje para EPA"
          autoComplete="off"
        />
        <button className="epa-send" type="submit" aria-label="Enviar">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12h13" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>
      </form>
    </section>
  );
}
