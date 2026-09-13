"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  importLibrary,
  setOptions,
} from "@googlemaps/js-api-loader";

import {
  assignmentTone,
  distinct,
  fecha,
  num,
  pickCoordinateScale,
} from "@/lib/format";

import type { UnifiedAssignment } from "@/lib/types";

/*
 * El loader de Google Maps solo debe configurarse una vez
 * durante la vida de la aplicación.
 */
let googleMapsConfigured = false;

function configureGoogleMaps() {
  if (googleMapsConfigured) {
    return;
  }

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY no está configurada",
    );
  }

  setOptions({
    key: apiKey,
    v: "weekly",
    language: "es",
    region: "SV",
  });

  googleMapsConfigured = true;
}

type MapPoint = {
  item: UnifiedAssignment;
  position: google.maps.LatLngLiteral;
};

/*
 * Crea el texto que se muestra al pasar sobre
 * el marcador de Google Maps.
 */
function markerTitle(
  item: UnifiedAssignment,
) {
  return [
    item.equipmentKey || "Equipo",
    item.title || "Asignación",
    `${item.origin || "Origen sin dato"} → ${
      item.destination || "Destino sin dato"
    }`,
    `Estado: ${item.status || "—"}`,
    `Responsable: ${item.assignee || "—"}`,
    `Nexus: ${item.prismaStatus || "—"}`,
    `Startrack: ${item.startrackStatus || "—"}`,
  ].join("\n");
}

export default function MapPanel({
  assignments,
  totalAssignments,
  statuses,
  status,
  onStatus,
  onOpenEquipment,
}: {
  assignments: UnifiedAssignment[];
  totalAssignments: number;
  statuses: UnifiedAssignment[];
  status: string;
  onStatus: (value: string) => void;
  onOpenEquipment: (key: string) => void;
}) {
  /*
   * Contenedor HTML donde Google Maps
   * montará el mapa.
   */
  const mapContainerRef =
    useRef<HTMLDivElement>(null);

  /*
   * Instancia del mapa.
   */
  const mapInstanceRef =
    useRef<google.maps.Map | null>(null);

  /*
   * Marcadores actuales.
   *
   * Los guardamos para eliminarlos antes
   * de pintar una nueva colección.
   */
  const markerRefs =
    useRef<
      google.maps.marker.AdvancedMarkerElement[]
    >([]);

  const [mapLoading, setMapLoading] =
    useState(false);

  const [mapError, setMapError] =
    useState<string | null>(null);

  /*
   * ============================================================
   * COORDENADAS
   * ============================================================
   *
   * El backend actual puede devolver latitude / longitude
   * como enteros escalados.
   *
   * Ejemplo:
   *
   * 136929000 → 13.6929
   *
   * Mantenemos pickCoordinateScale() porque ya forma parte
   * de tu aplicación actual.
   */
  const mapPoints =
    useMemo<MapPoint[]>(() => {
      const rawPoints = assignments
        .filter((item) => {
          const latitude = Number(
            item.latitude,
          );

          const longitude = Number(
            item.longitude,
          );

          return (
            Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            latitude !== 0 &&
            longitude !== 0
          );
        })
        .map((item) => ({
          lat: Number(item.latitude),
          lng: Number(item.longitude),
          item,
        }));

      if (rawPoints.length === 0) {
        return [];
      }

      /*
       * Detectamos automáticamente si las coordenadas
       * vienen como:
       *
       * 13.6929
       *
       * o como:
       *
       * 136929000
       */
      const scale =
        pickCoordinateScale(rawPoints);

      return rawPoints
        .map((point) => ({
          item: point.item,

          position: {
            lat: point.lat / scale,
            lng: point.lng / scale,
          },
        }))
        /*
         * Protección adicional.
         *
         * Google Maps únicamente acepta:
         *
         * latitude  -90 ... 90
         * longitude -180 ... 180
         */
        .filter(
          (point) =>
            point.position.lat >= -90 &&
            point.position.lat <= 90 &&
            point.position.lng >= -180 &&
            point.position.lng <= 180,
        );
    }, [assignments]);

  /*
   * Estados para el select.
   */
  const options = useMemo(
    () => distinct(statuses, "status"),
    [statuses],
  );

  /*
   * ============================================================
   * GOOGLE MAPS
   * ============================================================
   */
  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      /*
       * Si React desmontó el div del mapa,
       * limpiamos la instancia anterior.
       */
      if (!mapContainerRef.current) {
        markerRefs.current.forEach(
          (marker) => {
            marker.map = null;
          },
        );

        markerRefs.current = [];
        mapInstanceRef.current = null;

        return;
      }

      if (mapPoints.length === 0) {
        return;
      }

      try {
        setMapLoading(true);
        setMapError(null);

        /*
         * Configurar Google Maps.
         */
        configureGoogleMaps();

        /*
         * Cargamos únicamente las librerías necesarias:
         *
         * maps
         * marker
         */
        const [
          mapsLibrary,
          markerLibrary,
        ] = await Promise.all([
          importLibrary("maps"),
          importLibrary("marker"),
        ]);

        if (cancelled) {
          return;
        }

        const {
          Map,
        } =
          mapsLibrary as google.maps.MapsLibrary;

        const {
          AdvancedMarkerElement,
          PinElement,
        } =
          markerLibrary as google.maps.MarkerLibrary;

        /*
         * Map ID.
         *
         * Advanced Markers requiere Map ID.
         *
         * DEMO_MAP_ID permite probar localmente,
         * pero en GCP debes crear uno propio.
         */
        const mapId =
          process.env
            .NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ||
          "DEMO_MAP_ID";

        const initialCenter =
          mapPoints[0].position;

        /*
         * Crear el mapa solo si todavía
         * no existe.
         */
        if (!mapInstanceRef.current) {
          mapInstanceRef.current =
            new Map(
              mapContainerRef.current,
              {
                center: initialCenter,
                zoom: 10,

                mapId,

                /*
                 * UI del mapa.
                 */
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,

                /*
                 * Permite scroll normal de la página.
                 *
                 * Para hacer zoom con el mouse el usuario
                 * puede usar Ctrl + scroll.
                 */
                gestureHandling:
                  "cooperative",
              },
            );
        }

        const map =
          mapInstanceRef.current;

        /*
         * Eliminar los marcadores anteriores.
         */
        markerRefs.current.forEach(
          (marker) => {
            marker.map = null;
          },
        );

        markerRefs.current = [];

        /*
         * Bounds permite hacer zoom automático
         * para mostrar todos los vehículos.
         */
        const bounds =
          new google.maps.LatLngBounds();

        /*
         * ======================================================
         * MARCADORES
         * ======================================================
         */
        mapPoints.forEach(
          ({ item, position }) => {
            bounds.extend(position);

            /*
             * Color del marcador.
             *
             * Mantiene aproximadamente los estados
             * visuales que ya tenías en el SVG.
             */
            let background = "#b87333";

            /*
             * Inconsistencia entre Nexus y Startrack.
             */
            if (item.inconsistent) {
              background = "#c2413b";
            }

            /*
             * Asignación activa.
             */
            else if (
              item.status === "ACTIVE"
            ) {
              background = "#2563eb";
            }

            /*
             * Cancelada.
             */
            else if (
              item.status === "CANCELLED"
            ) {
              background = "#64748b";
            }

            /*
             * Texto pequeño que aparecerá
             * dentro del pin.
             *
             * Por ejemplo:
             *
             * CF-03 → 03
             */
            const glyph =
              (
                item.equipmentKey ||
                "EQ"
              )
                .slice(-2)
                .toUpperCase();

            const pin =
              new PinElement({
                background,
                borderColor:
                  background,
                glyphColor: "#ffffff",
                glyphText: glyph,
                scale: 1.15,
              });

            /*
             * Google recomienda AdvancedMarkerElement
             * para los marcadores modernos.
             */
            const marker =
              new AdvancedMarkerElement({
                map,
                position,

                title:
                  markerTitle(item),

                /*
                 * Permite interacción mediante click
                 * y teclado.
                 */
                gmpClickable: true,
              });

            /*
             * Pin personalizado.
             */
            marker.append(pin);

            /*
             * Conservamos el comportamiento
             * que ya tenía tu SVG:
             *
             * hacer click en el punto abre
             * el detalle del equipo.
             */
            marker.addEventListener(
              "gmp-click",
              () => {
                if (
                  item.equipmentKey
                ) {
                  onOpenEquipment(
                    item.equipmentKey,
                  );
                }
              },
            );

            markerRefs.current.push(
              marker,
            );
          },
        );

        /*
         * ======================================================
         * CENTRADO AUTOMÁTICO
         * ======================================================
         */

        if (mapPoints.length === 1) {
          map.setCenter(
            mapPoints[0].position,
          );

          map.setZoom(14);
        } else {
          /*
           * Google calcula el centro y zoom necesarios
           * para mostrar todos los equipos.
           */
          map.fitBounds(bounds, 60);
        }

        if (!cancelled) {
          setMapLoading(false);
        }
      } catch (error) {
        console.error(
          "Error cargando Google Maps:",
          error,
        );

        if (!cancelled) {
          setMapLoading(false);

          setMapError(
            error instanceof Error
              ? error.message
              : "No fue posible cargar Google Maps",
          );
        }
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
    };
  }, [
    mapPoints,
    onOpenEquipment,
  ]);

  return (
    <section
      className="panel col-8"
      id="sec-map"
      aria-label="Mapa de trayectos de asignaciones"
    >
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <div className="panel-head">
        <h2>
          Trayecto de equipos
        </h2>

        <span className="sub">
          GET /assignments ·{" "}
          {num(assignments.length)} de{" "}
          {num(totalAssignments)}
        </span>

        <div className="head-actions">
          <select
            className="ghost-select"
            value={status}
            onChange={(event) =>
              onStatus(
                event.target.value,
              )
            }
            aria-label="Filtrar asignaciones por estado"
          >
            <option value="">
              Todas las asignaciones
            </option>

            {options.map(
              (option) => (
                <option
                  key={option}
                  value={option}
                >
                  {option}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {/* ===================================================== */}
      {/* MAPA                                                  */}
      {/* ===================================================== */}

      <div className="map-wrap">
        {assignments.length ===
        0 ? (
          /*
           * No existen asignaciones.
           */
          <div className="state-box">
            <h3>
              Sin asignaciones
            </h3>

            <p>
              No hay tareas con el
              estado seleccionado en
              la proyección.
            </p>
          </div>
        ) : mapPoints.length ===
          0 ? (
          /*
           * Tenemos asignaciones pero
           * ninguna tiene coordenadas.
           */
          <div className="state-box">
            <h3>
              Asignaciones sin
              coordenadas
            </h3>

            <p>
              Las{" "}
              {assignments.length}{" "}
              tareas del filtro no
              traen latitude /
              longitude.
            </p>
          </div>
        ) : (
          <>
            {/*
             * Contenedor de Google Maps.
             */}
            <div
              style={{
                position:
                  "relative",

                width: "100%",
                height: 400,

                overflow:
                  "hidden",

                borderRadius:
                  12,
              }}
            >
              <div
                ref={
                  mapContainerRef
                }
                style={{
                  width: "100%",
                  height: "100%",
                }}
                aria-label="Google Maps con ubicación de equipos"
              />

              {/*
               * Loading.
               */}
              {mapLoading ? (
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    display:
                      "grid",

                    placeItems:
                      "center",

                    background:
                      "rgba(255,255,255,.72)",

                    zIndex: 2,

                    fontWeight:
                      600,
                  }}
                >
                  Cargando mapa…
                </div>
              ) : null}

              {/*
               * Error del API.
               */}
              {mapError ? (
                <div
                  className="state-box"
                  style={{
                    position:
                      "absolute",

                    inset: 20,

                    zIndex: 3,
                  }}
                >
                  <h3>
                    No se pudo cargar
                    Google Maps
                  </h3>

                  <p>
                    {mapError}
                  </p>
                </div>
              ) : null}
            </div>

            {/* ============================================= */}
            {/* LEYENDA                                       */}
            {/* ============================================= */}

            <div className="map-legend">
              <span className="lg">
                <i
                  style={{
                    background:
                      "#2563eb",
                  }}
                />

                Asignación activa
              </span>

              <span className="lg">
                <i
                  style={{
                    background:
                      "#b87333",
                  }}
                />

                Completada
              </span>

              <span className="lg">
                <i
                  style={{
                    background:
                      "#c2413b",
                  }}
                />

                Inconsistente entre
                fuentes
              </span>

              <span className="lg">
                <i
                  style={{
                    background:
                      "#64748b",
                  }}
                />

                Cancelada
              </span>
            </div>
          </>
        )}
      </div>

      {/* ===================================================== */}
      {/* LISTA DE TRAYECTOS                                   */}
      {/* ===================================================== */}

      <div className="route-list">
        {assignments
          .slice(0, 12)
          .map((item) => (
            <button
              key={item.id}
              className="route"
              onClick={() =>
                item.equipmentKey &&
                onOpenEquipment(
                  item.equipmentKey,
                )
              }
            >
              <span
                className="eq-code"
                title={
                  item.equipmentKey
                }
              >
                {item.equipmentKey ||
                  "—"}
              </span>

              <span>
                {item.origin ||
                  "origen sin dato"}
              </span>

              <span className="arrow">
                →
              </span>

              <span>
                <b>
                  {item.destination ||
                    "destino sin dato"}
                </b>
              </span>

              <span className="r-meta">
                {item.inconsistent ? (
                  <span className="chip crit">
                    inconsistente
                  </span>
                ) : null}

                <span
                  className={`chip ${assignmentTone(
                    item.status,
                  )}`}
                >
                  {item.status}
                </span>

                <span className="chip">
                  {fecha(
                    item.scheduledDate,
                  )}
                </span>
              </span>
            </button>
          ))}
      </div>
    </section>
  );
}