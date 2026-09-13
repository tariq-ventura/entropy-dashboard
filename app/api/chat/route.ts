import { NextRequest, NextResponse } from "next/server";

interface ChatRequest {
  message: string;
  sessionId: string;
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

    const reply =
      data?.output ??
      data?.text ??
      data?.message ??
      data?.[0]?.output;

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