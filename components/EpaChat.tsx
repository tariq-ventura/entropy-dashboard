"use client";

import { useEffect, useRef, useState } from "react";
import MarkdownMessage from "@/components/MarkdownMessage";
import { hace, num } from "@/lib/format";

import type {
  DashboardSummary,
  SyncConflict,
  SyncState,
  UnifiedEquipment,
  UnifiedRequest,
} from "@/lib/types";

interface Message {
  id: number;
  from: "bot" | "me";
  text: string;
  items?: string[];
  source?: string;
}

const CHIPS = [
  "Equipos disponibles",
  "Peticiones pendientes",
  "Conflictos abiertos",
  "Estado de sincronización",
];

export default function EpaChat({
  summary,
  sync,
}: {
  summary: DashboardSummary;
  sync: SyncState;

  // Se mantienen para no romper el componente padre.
  equipmentSample: UnifiedEquipment[];
  requestSample: UnifiedRequest[];
  conflicts: SyncConflict[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>("");

  const source = () => `proyección · ${hace(sync.lastSucceededAt)}`;

  /*
   * Creamos un sessionId por pestaña.
   *
   * Esto permite que n8n mantenga contexto de la conversación
   * cuando posteriormente conectes una memoria al AI Agent.
   */
  useEffect(() => {
    let id = sessionStorage.getItem("epa-session-id");

    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("epa-session-id", id);
    }

    sessionId.current = id;
  }, []);

  /*
   * Mensaje inicial.
   *
   * Se mantiene usando los datos que ya tiene el dashboard,
   * por lo que no es necesario llamar a n8n solamente para
   * mostrar el saludo.
   */
  useEffect(() => {
    if (messages.length > 0) return;

    setMessages([
      {
        id: 0,
        from: "bot",
        text: `La proyección tiene ${num(
          summary.equipmentTotal,
        )} equipos, ${num(
          summary.requestsPending,
        )} peticiones pendientes y ${num(
          summary.conflicts,
        )} conflictos sin conciliar.`,
        source: source(),
      },
    ]);

    // Solo para el saludo inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary.equipmentTotal]);

  /*
   * Scroll automático cuando aparece un mensaje nuevo.
   */
  useEffect(() => {
    logRef.current?.scrollTo({
      top: logRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  /*
   * Obtiene o crea el sessionId.
   *
   * El fallback existe por si el usuario logra enviar un mensaje
   * antes de que el primer useEffect termine de ejecutarse.
   */
  const getSessionId = () => {
    if (sessionId.current) {
      return sessionId.current;
    }

    let id = sessionStorage.getItem("epa-session-id");

    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem("epa-session-id", id);
    }

    sessionId.current = id;

    return id;
  };

  /*
   * Envía el mensaje al backend de Next.js.
   *
   * El navegador NO habla directamente con n8n.
   *
   * Browser
   *   ↓
   * /api/chat
   *   ↓
   * n8n
   *   ↓
   * AI Agent
   *   ↓
   * MCP
   */
  const ask = async (text: string) => {
    const value = text.trim();

    if (!value || loading) {
      return;
    }

    const userMessage: Message = {
      id: nextId.current++,
      from: "me",
      text: value,
    };

    setMessages((previous) => [
      ...previous,
      userMessage,
    ]);

    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          message: value,
          sessionId: getSessionId(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            `El chat respondió con HTTP ${response.status}`,
        );
      }

      if (!data.reply) {
        throw new Error(
          "El servidor no devolvió una respuesta.",
        );
      }

      setMessages((previous) => [
        ...previous,
        {
          id: nextId.current++,
          from: "bot",
          text: data.reply,
          source: "EPA · n8n",
        },
      ]);
    } catch (error) {
      console.error(
        "Error comunicándose con EPA:",
        error,
      );

      setMessages((previous) => [
        ...previous,
        {
          id: nextId.current++,
          from: "bot",
          text:
            "No pude comunicarme con EPA en este momento. " +
            "Intenta nuevamente.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /*
   * Botón flotante cuando el chat está cerrado.
   */
  if (!open) {
    const alert =
      summary.conflicts > 0 ||
      summary.requestsPending > 0;

    return (
      <button
        className="epa-fab"
        onClick={() => setOpen(true)}
        aria-expanded={false}
      >
        <span
          className="epa-orb"
          aria-hidden="true"
        >
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

        {alert ? (
          <span className="badge">!</span>
        ) : null}
      </button>
    );
  }

  return (
    <section
      className="epa-panel"
      aria-label="EPA, asistente de flota"
    >
      {/* Header */}
      <header className="epa-head">
        <span
          className="epa-orb"
          style={{
            width: 32,
            height: 32,
          }}
          aria-hidden="true"
        >
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

            <rect
              x="4"
              y="6"
              width="16"
              height="12"
              rx="3"
            />

            <circle
              cx="9"
              cy="12"
              r="1.4"
              fill="#fff"
              stroke="none"
            />

            <circle
              cx="15"
              cy="12"
              r="1.4"
              fill="#fff"
              stroke="none"
            />
          </svg>
        </span>

        <div>
          <div className="epa-name">
            EPA
          </div>

          <div className="epa-status">
            {loading
              ? "Consultando…"
              : `Leyendo ${num(
                  summary.equipmentTotal,
                )} equipos y ${num(
                  summary.conflicts,
                )} conflictos`}
          </div>
        </div>

        <button
          className="ghost-btn"
          style={{
            marginLeft: "auto",
          }}
          onClick={() => setOpen(false)}
          aria-label="Cerrar chat de EPA"
        >
          ✕
        </button>
      </header>

      {/* Mensajes */}
      <div
        className="epa-log"
        ref={logRef}
      >
        {messages.map((message) => (
          <div
            className={`msg ${message.from}`}
            key={message.id}
          >
            {/*
              * Solo EPA escribe en Markdown. El mensaje del usuario se
              * deja como texto plano: si lo pasáramos por el parser,
              * quien escriba "*urgente*" vería cursiva en su propio
              * mensaje.
              */}
            {message.from === "bot" ? (
              <MarkdownMessage text={message.text} />
            ) : (
              message.text
            )}

            {message.items?.length ? (
              <ul>
                {message.items.map((item) => (
                  <li key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            {message.source ? (
              <div className="m-src">
                {message.source}
              </div>
            ) : null}
          </div>
        ))}

        {loading ? (
          <div className="msg bot">
            EPA está consultando…
          </div>
        ) : null}
      </div>

      {/* Preguntas rápidas */}
      <div className="epa-chips">
        {CHIPS.map((label) => (
          <button
            key={label}
            className="epa-chip"
            onClick={() => {
              void ask(label);
            }}
            disabled={loading}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        className="epa-input"
        onSubmit={(event) => {
          event.preventDefault();

          const value = draft.trim();

          if (!value || loading) {
            return;
          }

          setDraft("");

          void ask(value);
        }}
      >
        <input
          value={draft}
          onChange={(event) =>
            setDraft(event.target.value)
          }
          placeholder={
            loading
              ? "EPA está consultando…"
              : "Pregunta sobre equipos, peticiones o conflictos…"
          }
          aria-label="Mensaje para EPA"
          autoComplete="off"
          disabled={loading}
        />

        <button
          className="epa-send"
          type="submit"
          aria-label="Enviar"
          disabled={loading}
        >
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