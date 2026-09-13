import { NextRequest, NextResponse } from "next/server";

interface ChatRequest {
  message: string;
  sessionId: string;
}

/*
 * Claves donde n8n suele dejar la respuesta del AI Agent,
 * en orden de preferencia.
 */
const REPLY_KEYS = [
  "output",
  "text",
  "message",
  "reply",
  "json",
  "data",
];

/*
 * Reduce la respuesta de n8n a un string.
 *
 * El workflow puede devolverla de varias formas según cómo esté armado:
 * un objeto, un array de un elemento, o envuelta en `json`. Y si el nodo
 * "Respond to Webhook" manda el texto ya serializado, llega como JSON
 * dentro de un string.
 *
 * Devolver cualquier otra cosa que no sea string hace que React falle al
 * pintar la burbuja ("Objects are not valid as a React child"), así que
 * el corte se hace aquí y no en el componente.
 */
function pickReply(payload: unknown, depth = 0): string | null {
  if (payload == null || depth > 3) {
    return null;
  }

  if (typeof payload === "string") {
    const text = payload.trim();

    if (!text) {
      return null;
    }

    if (text.startsWith("{") || text.startsWith("[")) {
      try {
        return pickReply(JSON.parse(text), depth + 1);
      } catch {
        // No era JSON: es el texto que buscábamos.
        return text;
      }
    }

    return text;
  }

  if (Array.isArray(payload)) {
    return pickReply(payload[0], depth + 1);
  }

  if (typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    for (const key of REPLY_KEYS) {
      if (key in record) {
        const found = pickReply(record[key], depth + 1);

        if (found) {
          return found;
        }
      }
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ChatRequest;

    if (!body.message?.trim()) {
      return NextResponse.json(
        { error: "message es requerido" },
        { status: 400 },
      );
    }

    if (!body.sessionId?.trim()) {
      return NextResponse.json(
        { error: "sessionId es requerido" },
        { status: 400 },
      );
    }

    const n8nUrl = process.env.N8N_CHAT_URL;

    if (!n8nUrl) {
      console.error("N8N_CHAT_URL no está configurada");

      return NextResponse.json(
        { error: "Chat no configurado" },
        { status: 500 },
      );
    }

    const response = await fetch(n8nUrl, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        action: "sendMessage",
        chatInput: body.message,
        sessionId: body.sessionId,
      }),

      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();

      console.error(
        "Error llamando a n8n:",
        response.status,
        detail,
      );

      return NextResponse.json(
        {
          error: "n8n respondió con error",
        },
        {
          status: 502,
        },
      );
    }

    const data = await response.json();

    /*
     * Normalizamos la respuesta para que EpaChat
     * siempre reciba:
     *
     * {
     *   reply: "..."
     * }
     */

    const reply = pickReply(data);

    if (!reply) {
      console.error("Respuesta inesperada de n8n:", data);

      return NextResponse.json(
        {
          error: "n8n no devolvió una respuesta válida",
        },
        {
          status: 502,
        },
      );
    }

    return NextResponse.json({
      reply,
    });
  } catch (error) {
    console.error("Error en /api/chat:", error);

    return NextResponse.json(
      {
        error: "Error interno procesando el mensaje",
      },
      {
        status: 500,
      },
    );
  }
}