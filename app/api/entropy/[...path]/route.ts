import { NextResponse } from "next/server";
import { EntropyError, entropyFetch, type QueryParams } from "@/lib/entropy";

/**
 * Proxy del navegador hacia entropy-mcp-server.
 *
 * El cliente llama /api/entropy/<ruta> sin credencial alguna; este handler
 * añade el bearer del entorno y reenvía. Tres cosas salen gratis:
 *   1. La llave nunca viaja al navegador ni aparece en devtools.
 *   2. Desaparece el problema de CORS: la llamada al Go es servidor a servidor,
 *      así que UI_ALLOWED_ORIGIN deja de importar para este frontend.
 *   3. Rotar la llave es cambiar una variable de entorno, sin tocar el cliente.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Allowlist explícita. Sin esto el proxy reenviaría cualquier ruta que a
 * alguien se le ocurra pedir, autenticada con nuestra llave.
 */
const ALLOWED_GET: RegExp[] = [
  /^dashboard$/,
  /^sync-status$/,
  /^equipment-types$/,
  /^equipments$/,
  /^equipments\/[^/]+$/,
  /^requests$/,
  /^assignments$/,
  /^conflicts$/,
];

const ALLOWED_POST: RegExp[] = [/^sync$/];

/** Solo se reenvían los parámetros que el router de Gin realmente lee. */
const ALLOWED_PARAMS = new Set([
  "page",
  "pageSize",
  "type",
  "status",
  "search",
  "requester",
  "onlyAvailable",
  "onlyLinked",
]);

function statusFor(error: EntropyError): number {
  if (error.kind === "unconfigured") return 503;
  if (error.kind === "unauthorized") return 401;
  if (error.kind === "unreachable") return 502;
  return error.status || 500;
}

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
  method: "GET" | "POST",
) {
  const { path } = await context.params;
  const route = (path ?? []).join("/");
  const allowed = method === "GET" ? ALLOWED_GET : ALLOWED_POST;

  if (!allowed.some((pattern) => pattern.test(route))) {
    return NextResponse.json(
      { error: "not_allowed", message: `Ruta no permitida: ${method} /${route}` },
      { status: 404 },
    );
  }

  const params: QueryParams = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (ALLOWED_PARAMS.has(key)) params[key] = value;
  }

  try {
    const payload = await entropyFetch<unknown>(`/${route}`, params, { method });
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof EntropyError) {
      return NextResponse.json(
        { error: error.kind, message: error.message },
        { status: statusFor(error) },
      );
    }
    return NextResponse.json(
      { error: "internal", message: "Fallo inesperado en el proxy." },
      { status: 500 },
    );
  }
}

export const GET = (request: Request, context: { params: Promise<{ path: string[] }> }) =>
  handle(request, context, "GET");

export const POST = (request: Request, context: { params: Promise<{ path: string[] }> }) =>
  handle(request, context, "POST");
