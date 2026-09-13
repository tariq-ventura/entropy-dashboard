# Hub Flota Constructora

Panel de operación sobre la proyección unificada de `entropy-mcp-server`
(Prisma + Startrack). Next.js 15, App Router, TypeScript.

## Cómo se maneja la llave

**La credencial nunca llega al navegador.** Ninguna variable lleva el prefijo
`NEXT_PUBLIC_`, que es lo único que Next.js inyecta en el bundle del cliente.

```
navegador  ──►  /api/entropy/*  ──►  entropy-mcp-server
              (route handler,       (Authorization: Bearer …)
               añade el bearer)
```

Esto trae tres consecuencias prácticas:

1. El token no aparece en devtools, ni en el HTML, ni en `localStorage`.
2. **CORS deja de importar para este frontend**: la llamada al servidor Go es
   servidor a servidor, así que `UI_ALLOWED_ORIGIN` no interviene.
3. Rotar la llave no toca una sola línea de código.

`lib/entropy.ts` abre con `import "server-only"`: si alguien lo importa desde un
componente de cliente, el build falla en vez de filtrar la llave.

## Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

| Variable | Requerida | Qué es |
| --- | --- | --- |
| `ENTROPY_API_URL` | sí | Dominio del backend, sin barra final y sin `/api/v1` |
| `ENTROPY_API_KEY` | sí | Valor de `INTEGRATION_API_KEY` del servidor Go |
| `ENTROPY_TIMEOUT_MS` | no | Corte de la llamada al backend (default 15000) |

Si `INTEGRATION_API_KEY` no está definida en el servidor Go, `config.go` cae a
`MCP_API_KEY`; en Cloud Run ese valor vive en el secreto
`mcp-apikey-development`:

```bash
gcloud secrets versions access latest --secret=mcp-apikey-development
```

## Rotar la llave

Se lee en cada petición, no al arrancar el módulo, así que **no queda horneada
en el build**. Basta cambiar el valor y reiniciar el proceso:

```bash
# local
#   editar .env.local y reiniciar `npm run dev`

# Vercel
vercel env rm ENTROPY_API_KEY production
vercel env add ENTROPY_API_KEY production
vercel --prod

# Cloud Run, apuntando al secreto en vez de a un literal
gcloud run services update hub-flota \
  --region us-east4 \
  --update-secrets ENTROPY_API_KEY=mcp-apikey-development:latest
```

Con `--update-secrets ...:latest`, rotar es agregar una versión al secreto y
desplegar una revisión nueva; la variable no vuelve a tocarse.

Si el backend responde `401`, la pantalla lo dice explícitamente en vez de
quedarse en blanco: ver `components/SetupNotice.tsx`.

## Correr

```bash
npm install
npm run dev
```

En <http://localhost:3000>. Para verificar tipos sin arrancar: `npm run typecheck`.

## Estructura

```
app/
  page.tsx                     Server Component: carga inicial con la llave del entorno
  layout.tsx                   Tipografías autoalojadas vía next/font
  globals.css                  Sistema visual (tokens, tema claro y oscuro)
  api/entropy/[...path]/route.ts  Proxy con allowlist de rutas y parámetros
lib/
  entropy.ts                   Cliente del servidor. server-only.
  client.ts                    Cliente del navegador. Solo habla con /api/entropy.
  types.ts                     Formas calcadas de internal/projection/models.go
  format.ts                    Formateo, clasificación de estados, escala de coordenadas
components/                    Rail, Topbar, paneles, drawer y EPA
```

## Rutas que consume

Todas bajo `/api/v1` en el backend:

| Endpoint | Dónde aparece |
| --- | --- |
| `GET /dashboard` | Franja de KPIs |
| `GET /sync-status` | Píldora del topbar y panel de sincronización |
| `POST /sync` | Botón "Sincronizar ahora" — solo por clic explícito |
| `GET /equipments` | Tabla de maquinaria, con filtros y paginación del backend |
| `GET /equipments/:key` | Drawer de detalle con historial de mantenimiento |
| `GET /equipment-types` | Selector de tipo y pestaña Tipos |
| `GET /requests` | Panel de peticiones y reparto por estado |
| `GET /assignments` | Mapa de trayectos y lista origen → destino |
| `GET /conflicts` | Panel de conflictos de integración |

`/health` y `/ready` no se consumen: no pasan por el router de Gin ni requieren
token.

## Decisiones que conviene conocer antes de tocar el código

**Los operadores son derivados, no una entidad.** El API no expone un catálogo
de operadores. La pestaña se arma con `equipment.driver` y `assignment.assignee`,
y el panel lo declara al pie. Si el backend gana una entidad propia, ese es el
lugar a cambiar.

**"Gestión de fallas" es conciliación de datos.** No hay entidad de falla
mecánica. El panel muestra `SyncConflict`: divergencias entre Prisma y Startrack.
Las fallas mecánicas reales viven en `UnifiedMaintenance` (`repairReason`,
`hourMeter`, `serviceType`) y solo se leen por equipo, vía
`GET /equipments/:key` — por eso están en el drawer. Un tablero de mantenimiento
global exigiría exponer `ListAllMaintenance`, que ya existe en el repositorio Go
pero no está ruteada.

**El mapa no es telemetría en vivo.** `UnifiedEquipment` no trae coordenadas;
quien las trae es `UnifiedAssignment`. El backend las entrega como enteros sin
declarar la escala, así que `pickCoordinateScale()` elige la menor potencia que
deje todo el conjunto en rangos geográficos válidos — con los datos de
development da `1e7` — y la escala usada se imprime en la esquina del mapa para
poder verificarla.

**Los estados nunca se escriben a mano.** El backend usa `Pendiente` y
`Aprobada` para peticiones, y `ACTIVE` / `COMPLETED` / `CANCELLED` para
asignaciones, pero eso puede cambiar. Los selectores se arman con `distinct()`
sobre los datos recibidos.

**Los agregados usan muestras sin filtrar.** Los gráficos por tipo y por estado
leen `pageSize=100` aparte de la página visible, para que el reparto no cambie al
paginar. El backend topa `pageSize` en 100: cuando la flota supere ese número, el
pie del gráfico lo declara. Un conteo exacto exigiría un endpoint de agregados.
