// src/pages/ClientePage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
    getSolicitud,
    getMedia,
    crearSolicitud,
    subirMediaCliente,
    aceptarPresupuesto,
    rechazarPresupuesto,
    subirComprobante,
    elegirMetodoPago,
} from "../Api";

const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";
const LS_LAST_CODE_KEY = "versus_last_tracking_code";
const BUDGET_EXPIRES_HOURS = 48;
const WARRANTY_DAYS = 10;

// 📍 Zona de cobertura (geofence)
const SERVICE_BASE = { lat: -26.8207735, lng: -65.0953183 }; // Ingenio La Florida
const SERVICE_RADIUS_KM = 4.5;

// Haversine distance (km)
function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;

    return 2 * R * Math.asin(Math.sqrt(a));
}

const markerIcon = new L.Icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Selector con validación por radio: si está fuera, NO guarda el punto
function LocationSelector({ setLat, setLng, setKmAway, setOutOfService }) {
    useMapEvents({
        click(e) {
            const clickedLat = e.latlng.lat;
            const clickedLng = e.latlng.lng;

            const km = haversineKm(SERVICE_BASE.lat, SERVICE_BASE.lng, clickedLat, clickedLng);
            setKmAway(km);

            const outside = km > SERVICE_RADIUS_KM;
            setOutOfService(outside);

            if (outside) return; // ❌ no guardamos punto fuera de zona

            setLat(clickedLat);
            setLng(clickedLng);
        },
    });

    return null;
}

function formatAR(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function addHoursISO(iso, hours) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(d.getHours() + hours);
    return d.toISOString();
}

function msToHuman(ms) {
    if (ms <= 0) return "Vencido";
    const totalMin = Math.floor(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}h ${m}m`;
}

function isDeliveredExpired(solicitud) {
    if (!solicitud) return false;
    if (solicitud.estado !== "ENTREGADO") return false;
    if (!solicitud.entregadoAt) return false;

    const entrega = new Date(solicitud.entregadoAt);
    if (Number.isNaN(entrega.getTime())) return false;

    const vencimiento = new Date(entrega);
    vencimiento.setDate(vencimiento.getDate() + WARRANTY_DAYS);

    return Date.now() > vencimiento.getTime();
}

function getWarrantyEndDate(iso) {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    d.setDate(d.getDate() + WARRANTY_DAYS);
    return d.toISOString();
}

function TechCard({ children }) {
    return (
        <div
            style={{
                borderRadius: 18,
                border: "1px solid rgba(20, 80, 160, 0.18)",
                background: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(10px)",
                boxShadow: "0 14px 32px rgba(0,0,0,0.08)",
                padding: 18,
            }}
        >
            {children}
        </div>
    );
}

function PageShell({ title, subtitle, children, variant = "dark" }) {
    const isDark = variant === "dark";

    return (
        <div style={{ minHeight: "calc(100vh - 120px)", padding: "24px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div
                    style={{
                        fontSize: 34,
                        fontWeight: 950,
                        lineHeight: 1.05,
                        color: isDark ? "rgba(255,255,255,0.92)" : "#0b2a4a",
                        textShadow: isDark ? "0 2px 14px rgba(0,0,0,0.55)" : "none",
                    }}
                >
                    {title}
                </div>

                {subtitle ? (
                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 14,
                            fontWeight: 800,
                            color: isDark ? "rgba(255,255,255,0.82)" : "#2b4b66",
                            textShadow: isDark ? "0 2px 12px rgba(0,0,0,0.55)" : "none",
                        }}
                    >
                        {subtitle}
                    </div>
                ) : null}
            </div>

            <div style={{ maxWidth: 980, margin: "0 auto" }}>{children}</div>
        </div>
    );
}

function EstadoBadge({ estado }) {
    return (
        <span
            style={{
                padding: "6px 10px",
                border: "1px solid rgba(27,100,198,0.28)",
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 800,
                color: "#0b2a4a",
                background: "rgba(255,255,255,0.7)",
            }}
        >
            {estado}
        </span>
    );
}

function EstadoNotaCliente({ data }) {
    if (!data) return null;

    if (data.estado === "RETIRO_PROGRAMADO") {
        return (
            <div
                style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(245, 158, 11, 0.35)",
                    background: "rgba(255, 247, 237, 0.95)",
                    color: "#9a3412",
                }}
            >
                <div style={{ fontWeight: 950, marginBottom: 4 }}>🚚 Retiro programado</div>
                <div style={{ fontWeight: 800 }}>
                    Tu retiro fue programado. Nuestro servicio pasará por tu domicilio durante el día acordado.
                </div>
            </div>
        );
    }

    if (data.estado === "ENTREGADO") {
        const warrantyEnd = getWarrantyEndDate(data.entregadoAt);

        return (
            <div
                style={{
                    marginTop: 16,
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(34, 197, 94, 0.28)",
                    background: "rgba(240, 253, 244, 0.95)",
                    color: "#166534",
                }}
            >
                <div style={{ fontWeight: 950, marginBottom: 4 }}>✅ Equipo entregado</div>
                <div style={{ fontWeight: 800 }}>
                    Tu teléfono ya fue entregado. Contás con 10 días de garantía por el servicio realizado.
                </div>
                {warrantyEnd && (
                    <div style={{ marginTop: 6, fontWeight: 800, fontSize: 12 }}>
                        Garantía visible hasta: <b>{formatAR(warrantyEnd)}</b>
                    </div>
                )}
            </div>
        );
    }

    return null;
}

export default function ClientePage({ mode }) {
    const location = useLocation();

    // --- Cliente: seguimiento ---
    const [codigo, setCodigo] = useState("");
    const [data, setData] = useState(null);
    const [media, setMedia] = useState([]);

    // --- UI state ---
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // --- Copiar feedback ---
    const [copiado, setCopiado] = useState(false);

    // --- Comprobante ---
    const [comprobanteFile, setComprobanteFile] = useState(null);
    const [referenciaComprobante, setReferenciaComprobante] = useState("");

    // --- Crear solicitud ---
    const [form, setForm] = useState({
        nombreCliente: "",
        telefonoCliente: "",
        direccionRetiro: "",
        marca: "",
        modelo: "",
        descripcionFalla: "",
    });
    const [mediaFiles, setMediaFiles] = useState([]); // 0..3

    // --- Ubicación retiro (opcional) ---
    const [lat, setLat] = useState(null);
    const [lng, setLng] = useState(null);
    const [locStatus, setLocStatus] = useState(""); // feedback simple

    // Geofence UI (solo se usa si el cliente decide marcar ubicación)
    const [outOfService, setOutOfService] = useState(false);
    const [kmAway, setKmAway] = useState(null);

    const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;
    const isMobile = window.matchMedia("(max-width: 640px)").matches;

    const showCrear = !mode || mode === "crear";
    const showSeg = !mode || mode === "seguimiento";

    // Para expiración de presupuesto: usar presupuestadoAt si existe
    const base = data?.presupuestadoAt || null;
    const expiraIso = base ? addHoursISO(base, BUDGET_EXPIRES_HOURS) : null;

    const [showMap, setShowMap] = useState(false);

    // ¿El cliente eligió usar ubicación? (si no eligió, no validamos geofence)
    const hasLocation = typeof lat === "number" && typeof lng === "number";

    const [fileInputKey, setFileInputKey] = useState(0);

    function setField(name, value) {
        setForm((prev) => ({ ...prev, [name]: value }));
    }

    function fullFileUrl(relativeUrl) {
        if (!relativeUrl) return null;
        return `${API_HOST}${relativeUrl}`;
    }

    function buildTrackingUrl(code) {
        return `${PUBLIC_BASE}/seguimiento?codigo=${encodeURIComponent(code)}`;
    }

    async function copiarTexto(texto) {
        try {
            await navigator.clipboard.writeText(texto);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1500);
        } catch {
            setError("No se pudo copiar. Copialo manualmente.");
        }
    }

    function compartirWhatsapp(code) {
        if (!code) return;
        const link = buildTrackingUrl(code);
        const mensaje =
            `Hola 👋\n\n` +
            `Seguimiento Versus Reparaciones:\n\n` +
            `🔧 Código: ${code}\n` +
            `🔗 Link: ${link}\n\n` +
            `Guardalo para consultar el estado.`;
        const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
        window.open(url, "_blank", "noopener,noreferrer");
    }

    function borrarCodigoGuardado() {
        localStorage.removeItem(LS_LAST_CODE_KEY);
        setCodigo("");
        setData(null);
        setMedia([]);
        setError("");
    }

    // 📍 GPS: ubicación para retiro (opcional). Si está fuera del radio: no guardamos.
    function obtenerUbicacion() {
        setLocStatus("");
        if (!navigator.geolocation) {
            setLocStatus("Tu navegador no soporta geolocalización");
            return;
        }

        setLocStatus("Obteniendo ubicación...");
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const newLat = pos.coords.latitude;
                const newLng = pos.coords.longitude;

                const km = haversineKm(SERVICE_BASE.lat, SERVICE_BASE.lng, newLat, newLng);
                setKmAway(km);

                const outside = km > SERVICE_RADIUS_KM;
                setOutOfService(outside);

                if (outside) {
                    setLocStatus("Aún no prestamos servicios a ese lugar… próximamente se habilitará el servicio.");
                    return;
                }

                setLat(newLat);
                setLng(newLng);
                setLocStatus("Ubicación guardada ✅");
                setTimeout(() => setLocStatus(""), 2000);
            },
            (err) => {
                console.log(err);
                setLocStatus("No se pudo obtener ubicación. Activá GPS / permisos.");
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }

    async function buscar(cod = null) {
        const c = (cod ?? codigo).trim();
        if (!c) return;

        localStorage.setItem(LS_LAST_CODE_KEY, c);

        setError("");
        setLoading(true);
        try {
            const s = await getSolicitud(c);
            if (!s) {
                setData(null);
                setMedia([]);
                setError("No se encontró ese código.");
                return;
            }

            if (isDeliveredExpired(s)) {
                setData(null);
                setMedia([]);
                setError("Este seguimiento ya no se encuentra disponible porque finalizó el período de garantía.");
                return;
            }

            setData(s);

            const m = await getMedia(c);
            setMedia(m);
        } catch (e) {
            setError(e?.message || "Error consultando solicitud");
        } finally {
            setLoading(false);
        }
    }

    // Autocargar código por query param
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const codeFromUrl = params.get("codigo");

        if (codeFromUrl && codeFromUrl.trim()) {
            const c = codeFromUrl.trim();
            setCodigo(c);
            localStorage.setItem(LS_LAST_CODE_KEY, c);
            buscar(c);
            return;
        }

        const saved = localStorage.getItem(LS_LAST_CODE_KEY);
        if (saved) setCodigo(saved);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    async function onCrearSolicitud() {
        setError("");

        if (!form.nombreCliente.trim()) return setError("Falta nombre y apellido");
        if (!form.telefonoCliente.trim()) return setError("Falta teléfono de contacto");
        {/*if (!form.direccionRetiro.trim()) return setError("Falta dirección de retiro - barrio");*/ }
        if (!form.marca.trim()) return setError("Falta marca del teléfono");
        if (!form.modelo.trim()) return setError("Falta modelo del teléfono");
        if (!form.descripcionFalla.trim()) return setError("Falta descripción de la falla");

        // ✅ Validar geofence SOLO si el cliente eligió marcar ubicación
        if (hasLocation && outOfService) {
            return setError("Aún no prestamos servicios a ese lugar… próximamente se habilitará el servicio.");
        }
        if (mediaFiles.length === 0) {
            return setError("Debés subir una foto de la parte trasera del equipo.");
        }

        setLoading(true);
        try {
            const payload = {
                nombreCliente: form.nombreCliente.trim(),
                telefonoCliente: form.telefonoCliente.trim(),
                direccionRetiro: form.direccionRetiro.trim(),
                marca: form.marca.trim(),
                modelo: form.modelo.trim(),
                descripcionFalla: form.descripcionFalla.trim(),
                // ✅ ubicación opcional
                latitud: hasLocation ? lat : null,
                longitud: hasLocation ? lng : null,
            };

            const creada = await crearSolicitud(payload);

            // 👇 para mostrar código + fecha sin esperar buscar()
            setData(creada);

            const code = creada?.codigoSeguimiento;

            if (code) {
                setCodigo(code);
                localStorage.setItem(LS_LAST_CODE_KEY, code);
            }

            if (mediaFiles.length > 0 && code) {
                await subirMediaCliente(code, mediaFiles);
            }

            if (code) await buscar(code);

            // ✅ limpiar formulario después de crear correctamente
            setForm({
                nombreCliente: "",
                telefonoCliente: "",
                direccionRetiro: "",
                marca: "",
                modelo: "",
                descripcionFalla: "",
            });
            setMediaFiles([]);
            setLat(null);
            setLng(null);
            setKmAway(null);
            setOutOfService(false);
            setLocStatus("");
            setShowMap(false);
            setFileInputKey((k) => k + 1);
        } catch (e) {
            setError(e?.message || "Error creando solicitud");
        } finally {
            setLoading(false);
        }
    }

    async function onAceptar() {
        setError("");
        setLoading(true);
        try {
            const s = await aceptarPresupuesto(codigo.trim());
            setData(s);
        } catch (e) {
            setError(e?.message || "No se pudo aceptar presupuesto");
        } finally {
            setLoading(false);
        }
    }

    async function onRechazar() {
        setError("");
        setLoading(true);
        try {
            const s = await rechazarPresupuesto(codigo.trim());
            setData(s);
        } catch (e) {
            setError(e?.message || "No se pudo rechazar presupuesto");
        } finally {
            setLoading(false);
        }
    }

    async function onSubirComprobante() {
        if (!comprobanteFile) return;

        setError("");
        setLoading(true);
        try {
            const s = await subirComprobante(codigo.trim(), comprobanteFile, referenciaComprobante.trim() || null);
            setData(s);
            setComprobanteFile(null);
            setReferenciaComprobante("");
        } catch (e) {
            setError(e?.message || "No se pudo subir comprobante");
        } finally {
            setLoading(false);
        }
    }

    async function onElegirMetodoPago(metodoPago) {
        setError("");
        setLoading(true);
        try {
            const s = await elegirMetodoPago(codigo.trim(), metodoPago);
            setData(s);
        } catch (e) {
            setError(e?.message || "No se pudo elegir método de pago");
        } finally {
            setLoading(false);
        }
    }

    const estado = useMemo(() => data?.estado, [data]);
    const isEntregado = estado === "ENTREGADO";

    return (
        <PageShell
            title={showCrear && !showSeg ? "Crear solicitud" : "Seguimiento"}
            subtitle="Versus Reparaciones · Retiro y entrega a domicilio"
        >
            {error && (
                <div style={{ margin: "0 auto 12px", maxWidth: 980, color: "crimson", fontWeight: 800 }}>
                    {error}
                </div>
            )}

            {/* Top Nav interna (volver a landing) */}
            <div style={{ maxWidth: 980, margin: "0 auto 12px", display: "flex", justifyContent: "space-between" }}>
                <Link
                    to="/"
                    style={{
                        textDecoration: "none",
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.88)",
                        textShadow: "0 2px 12px rgba(0,0,0,0.55)",
                    }}
                >
                    ← Volver
                </Link>
                {copiado ? <span style={{ color: "green", fontWeight: 900 }}>Copiado ✅</span> : <span />}
            </div>

            {/* CREAR */}
            {showCrear && (
                <TechCard>
                    <h2 style={{ marginTop: 0, color: "#0b2a4a" }}>Crear solicitud</h2>

                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                        <input
                            placeholder="Nombre y Apellido"
                            value={form.nombreCliente}
                            onChange={(e) => setField("nombreCliente", e.target.value)}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
                        />
                        <input
                            placeholder="Teléfono de Contacto"
                            value={form.telefonoCliente}
                            onChange={(e) => setField("telefonoCliente", e.target.value)}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
                        />
                        <input
                            placeholder="Dirección retiro - calle - barrio"
                            value={form.direccionRetiro}
                            onChange={(e) => setField("direccionRetiro", e.target.value)}
                            style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid rgba(27,100,198,0.25)",
                                gridColumn: "1 / -1",
                            }}
                        />

                        <div style={{ gridColumn: "1 / -1", marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <button
                                type="button"
                                onClick={() => setShowMap((v) => !v)}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 14,
                                    border: "1px solid rgba(27,100,198,0.35)",
                                    background: "rgba(255,255,255,0.85)",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                }}
                            >
                                🗺️ {showMap ? "Ocultar mapa" : "Elegir punto en mapa"}
                            </button>

                            <button
                                type="button"
                                onClick={obtenerUbicacion}
                                disabled={loading}
                                style={{
                                    padding: "10px 14px",
                                    borderRadius: 14,
                                    border: "1px solid rgba(27,100,198,0.35)",
                                    background: "rgba(255,255,255,0.85)",
                                    fontWeight: 900,
                                    cursor: "pointer",
                                }}
                            >
                                📍 Usar mi ubicación
                            </button>
                        </div>

                        {locStatus ? (
                            <div style={{ gridColumn: "1 / -1", marginTop: 6, color: "#2b4b66", fontWeight: 800, fontSize: 12 }}>
                                {locStatus}
                            </div>
                        ) : null}

                        {/* 🗺 Selección de ubicación en mapa */}
                        {showMap && (
                            <div style={{ gridColumn: "1 / -1", marginTop: 10 }}>
                                <div style={{ fontWeight: 900, color: "#0b2a4a", marginBottom: 6 }}>
                                    Ubicación exacta del retiro (si marcás ubicación, debe estar a máx {SERVICE_RADIUS_KM} km)
                                </div>

                                <div
                                    style={{
                                        height: 250,
                                        borderRadius: 12,
                                        overflow: "hidden",
                                        border: "1px solid rgba(27,100,198,0.25)",
                                    }}
                                >
                                    <MapContainer center={[-26.820947, -65.095322]} zoom={13} style={{ height: "100%", width: "100%" }}>
                                        <TileLayer attribution="© OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                                        <LocationSelector
                                            setLat={setLat}
                                            setLng={setLng}
                                            setKmAway={setKmAway}
                                            setOutOfService={setOutOfService}
                                        />

                                        {hasLocation && <Marker position={[lat, lng]} icon={markerIcon} />}
                                    </MapContainer>
                                </div>

                                <div style={{ marginTop: 6, fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>
                                    Tocá el mapa para marcar el punto exacto de retiro (opcional).
                                </div>
                            </div>
                        )}

                        {hasLocation && (
                            <div style={{ gridColumn: "1 / -1", marginTop: 8, color: "#2b4b66", fontWeight: 800 }}>
                                Punto seleccionado: <b>{lat.toFixed(6)}, {lng.toFixed(6)}</b>
                            </div>
                        )}

                        {outOfService && (
                            <div
                                style={{
                                    gridColumn: "1 / -1",
                                    marginTop: 10,
                                    padding: 12,
                                    borderRadius: 12,
                                    border: "1px solid rgba(220,38,38,0.25)",
                                    background: "rgba(255,255,255,0.85)",
                                    color: "#b91c1c",
                                    fontWeight: 900,
                                }}
                            >
                                Aún no prestamos servicios a ese lugar… próximamente se habilitará el servicio.
                                {kmAway != null ? (
                                    <div style={{ marginTop: 6, fontWeight: 800, color: "#7f1d1d" }}>
                                        Estás a {kmAway.toFixed(1)} km del área de cobertura (máx {SERVICE_RADIUS_KM} km).
                                    </div>
                                ) : null}
                            </div>
                        )}

                        <input
                            placeholder="Marca del teléfono"
                            value={form.marca}
                            onChange={(e) => setField("marca", e.target.value)}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
                        />
                        <input
                            placeholder="Modelo del teléfono"
                            value={form.modelo}
                            onChange={(e) => setField("modelo", e.target.value)}
                            style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
                        />

                        <textarea
                            placeholder="Descripción de la falla"
                            value={form.descripcionFalla}
                            onChange={(e) => setField("descripcionFalla", e.target.value)}
                            style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid rgba(27,100,198,0.25)",
                                gridColumn: "1 / -1",
                                minHeight: 90,
                            }}
                        />
                    </div>

                    <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 900, color: "#0b2a4a" }}>
                            Foto trasera del equipo (obligatoria)
                        </div>

                        <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800, fontSize: 12 }}>
                            Necesitamos una foto de la parte trasera del celular para verificar correctamente el modelo antes de avanzar.
                        </div>
                        <input
                            key={fileInputKey}
                            type="file"
                            multiple
                            accept="image/*,video/mp4"
                            onChange={(e) => {
                                const arr = Array.from(e.target.files || []);
                                setMediaFiles(arr.slice(0, 3));
                            }}
                        />
                        {mediaFiles.length > 0 && (
                            <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800 }}>
                                Seleccionados: {mediaFiles.map((f) => f.name).join(", ")}
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onCrearSolicitud}
                        disabled={loading || (hasLocation && outOfService)}
                        style={{
                            marginTop: 14,
                            padding: "12px 16px",
                            borderRadius: 14,
                            border: "1px solid #1f8f3a",
                            background: "linear-gradient(180deg, #38c463 0%, #1f8f3a 100%)",
                            color: "white",
                            fontWeight: 950,
                            cursor: "pointer",
                        }}
                    >
                        {loading ? "Creando..." : "Crear solicitud"}
                    </button>

                    {data?.codigoSeguimiento && (
                        <div style={{ marginTop: 14 }}>
                            <div style={{ fontWeight: 900, color: "#0b2a4a" }}>
                                Código generado: <span style={{ fontSize: 18 }}>{data.codigoSeguimiento}</span>
                            </div>

                            <div style={{ marginTop: 8, fontWeight: 800 }}>
                                Link de seguimiento:{" "}
                                <a href={buildTrackingUrl(data.codigoSeguimiento)} target="_blank" rel="noreferrer">
                                    {buildTrackingUrl(data.codigoSeguimiento)}
                                </a>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                                <button onClick={() => copiarTexto(data.codigoSeguimiento)} disabled={loading}>
                                    Copiar código
                                </button>
                                <button onClick={() => copiarTexto(buildTrackingUrl(data.codigoSeguimiento))} disabled={loading}>
                                    Copiar link
                                </button>
                                <button onClick={() => compartirWhatsapp(data.codigoSeguimiento)} disabled={loading}>
                                    WhatsApp
                                </button>
                                <Link to={`/seguimiento?codigo=${encodeURIComponent(data.codigoSeguimiento)}`} style={{ textDecoration: "none" }}>
                                    <button>Ir a seguimiento →</button>
                                </Link>
                            </div>

                            <div style={{ marginTop: 6, fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>
                                Tip: el código queda guardado automáticamente en este dispositivo.
                            </div>
                        </div>
                    )}

                    {/* ✅ Fecha de creación (solo mostrar esto al crear) */}
                    {data?.fechaCreacion && (
                        <div style={{ marginTop: 8, color: "#2b4b66", fontWeight: 800 }}>
                            Creada: <b>{formatAR(data.fechaCreacion)}</b>
                        </div>
                    )}

                    {/* ✅ Presupuesto expira SOLO cuando está PRESUPUESTADO */}
                    {data?.estado === "PRESUPUESTADO" && expiraIso && (
                        <div style={{ marginTop: 8, color: "#2b4b66", fontWeight: 800 }}>
                            Presupuesto expira el <b>{formatAR(expiraIso)}</b>
                        </div>
                    )}
                </TechCard>
            )}

            {/* SEGUIMIENTO */}
            {showSeg && (
                <div style={{ marginTop: showCrear ? 14 : 0 }}>
                    <TechCard>
                        <h2 style={{ marginTop: 0, color: "#0b2a4a" }}>Seguimiento por código</h2>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <input
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value)}
                                placeholder="Ingresá tu código (ej: VS-XXXXXX)"
                                style={{
                                    flex: 1,
                                    padding: 10,
                                    borderRadius: 10,
                                    border: "1px solid rgba(27,100,198,0.25)",
                                    minWidth: 220,
                                }}
                            />
                            <button onClick={() => buscar()} disabled={loading || !codigo.trim()} style={{ padding: "10px 14px" }}>
                                {loading ? "Cargando..." : "Buscar"}
                            </button>
                            <button onClick={borrarCodigoGuardado} disabled={loading} style={{ padding: "10px 14px" }}>
                                Borrar
                            </button>
                            <button onClick={() => copiarTexto(codigo.trim())} disabled={loading || !codigo.trim()} style={{ padding: "10px 14px" }}>
                                Copiar código
                            </button>
                            <button
                                onClick={() => copiarTexto(buildTrackingUrl(codigo.trim()))}
                                disabled={loading || !codigo.trim()}
                                style={{ padding: "10px 14px" }}
                            >
                                Copiar link
                            </button>
                            <button onClick={() => compartirWhatsapp(codigo.trim())} disabled={loading || !codigo.trim()} style={{ padding: "10px 14px" }}>
                                WhatsApp
                            </button>
                        </div>

                        {data && (
                            <div style={{ marginTop: 16, borderTop: "1px dashed rgba(27,100,198,0.25)", paddingTop: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Código</div>
                                        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>{data.codigoSeguimiento}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Estado</div>
                                        <EstadoBadge estado={estado} />
                                    </div>
                                </div>

                                <EstadoNotaCliente data={data} />

                                {!isEntregado && data.presupuestoMonto && (
                                    <div style={{ marginTop: 14 }}>
                                        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Presupuesto</div>
                                        <div>Monto: ${data.presupuestoMonto}</div>
                                        <div>Detalle: {data.presupuestoDetalle}</div>

                                        {data.estado === "PRESUPUESTADO" && data.presupuestadoAt && (
                                            <div
                                                style={{
                                                    marginTop: 10,
                                                    padding: 10,
                                                    borderRadius: 12,
                                                    background: "rgba(255,255,255,0.65)",
                                                    border: "1px solid rgba(27,100,198,0.18)",
                                                }}
                                            >
                                                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>⏳ Este presupuesto vence en 48hs</div>
                                                <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800 }}>
                                                    Vence: <b>{formatAR(addHoursISO(data.presupuestadoAt, BUDGET_EXPIRES_HOURS))}</b>
                                                </div>
                                                <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800 }}>
                                                    Tiempo restante:{" "}
                                                    <b>
                                                        {(() => {
                                                            const exp = addHoursISO(data.presupuestadoAt, BUDGET_EXPIRES_HOURS);
                                                            if (!exp) return "-";
                                                            return msToHuman(new Date(exp).getTime() - Date.now());
                                                        })()}
                                                    </b>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isEntregado && !loading && !error && (
                                    <div style={{ marginTop: 10, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                                        Método de pago: <b>{data.metodoPago || "SIN_ELEGIR"}</b>
                                    </div>
                                )}

                                {!isEntregado && data.estado === "PRESUPUESTADO" && (
                                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                        <button onClick={onAceptar} disabled={loading}>
                                            Aceptar
                                        </button>
                                        <button onClick={onRechazar} disabled={loading}>
                                            Rechazar
                                        </button>
                                    </div>
                                )}

                                {!isEntregado && (data.estado === "LISTO_PARA_ENTREGA" || data.estado === "PAGO_PENDIENTE_VERIFICACION") && (
                                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed rgba(27,100,198,0.25)" }}>
                                        <h3 style={{ margin: 0, color: "#0b2a4a" }}>Pago</h3>

                                        {data.estado === "PAGO_PENDIENTE_VERIFICACION" && (
                                            <div style={{ marginTop: 10 }}>
                                                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Comprobante enviado</div>
                                                <div style={{ color: "#2b4b66", fontWeight: 800 }}>Estamos verificando el pago.</div>

                                                {data.comprobanteUrl && (
                                                    <div style={{ marginTop: 8 }}>
                                                        Comprobante:{" "}
                                                        <a href={fullFileUrl(data.comprobanteUrl)} target="_blank" rel="noreferrer">
                                                            Ver archivo
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {data.estado === "LISTO_PARA_ENTREGA" && (
                                            <div style={{ marginTop: 10 }}>
                                                {!data.metodoPago && (
                                                    <>
                                                        <div style={{ color: "#2b4b66", fontWeight: 800 }}>Elegí cómo vas a pagar para continuar:</div>

                                                        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                                            <button disabled={loading} onClick={() => onElegirMetodoPago("EFECTIVO")}>
                                                                Pagar en efectivo
                                                            </button>
                                                            <button disabled={loading} onClick={() => onElegirMetodoPago("TRANSFERENCIA")}>
                                                                Pagar por transferencia
                                                            </button>
                                                        </div>
                                                    </>
                                                )}

                                                {data.metodoPago === "TRANSFERENCIA" && (
                                                    <div style={{ marginTop: 12 }}>
                                                        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago por transferencia</div>
                                                        <div style={{ marginTop: 8 }}>
                                                            <div>Alias: {data.alias}</div>
                                                            <div>CBU: {data.cbu}</div>
                                                            <div>Titular: {data.titular}</div>
                                                        </div>

                                                        <div style={{ marginTop: 12 }}>
                                                            <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Subir comprobante</div>
                                                            <input
                                                                type="file"
                                                                accept="image/*,application/pdf"
                                                                onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                                                            />
                                                            <input
                                                                value={referenciaComprobante}
                                                                onChange={(e) => setReferenciaComprobante(e.target.value)}
                                                                placeholder="Referencia / N° operación (opcional)"
                                                                style={{
                                                                    display: "block",
                                                                    marginTop: 8,
                                                                    padding: 8,
                                                                    width: "100%",
                                                                    maxWidth: 420,
                                                                    borderRadius: 10,
                                                                    border: "1px solid rgba(27,100,198,0.25)",
                                                                }}
                                                            />
                                                            <button onClick={onSubirComprobante} disabled={loading || !comprobanteFile} style={{ marginTop: 8 }}>
                                                                Subir comprobante
                                                            </button>

                                                            <button
                                                                onClick={() => onElegirMetodoPago("EFECTIVO")}
                                                                disabled={loading}
                                                                style={{ marginTop: 8, marginLeft: 8 }}
                                                            >
                                                                Cambiar a efectivo
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {data.metodoPago === "EFECTIVO" && (
                                                    <div style={{ marginTop: 12 }}>
                                                        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago en efectivo (local)</div>
                                                        <div style={{ marginTop: 8 }}>
                                                            <div>NOTA: <br /> {data.mensaje} <br /> {data.gracias}</div>
                                                        </div>

                                                        <button onClick={() => onElegirMetodoPago("TRANSFERENCIA")} disabled={loading} style={{ marginTop: 10 }}>
                                                            Cambiar a transferencia
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isEntregado && (
                                    <div style={{ marginTop: 16 }}>
                                        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Fotos/Videos enviados</div>
                                        {media.length === 0 ? (
                                            <div style={{ color: "#2b4b66", fontWeight: 800 }}>No hay archivos.</div>
                                        ) : (
                                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                                                {media.map((url) => {
                                                    const full = fullFileUrl(url);
                                                    const lower = url.toLowerCase();
                                                    const isVideo = lower.includes(".mp4");
                                                    const isPdf = lower.includes(".pdf");

                                                    return (
                                                        <a key={url} href={full} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                                                            <div
                                                                style={{
                                                                    width: 170,
                                                                    border: "1px solid rgba(27,100,198,0.20)",
                                                                    borderRadius: 14,
                                                                    overflow: "hidden",
                                                                    background: "white",
                                                                }}
                                                            >
                                                                {isVideo ? (
                                                                    <div style={{ padding: 12, fontWeight: 900 }}>🎥 Ver video</div>
                                                                ) : isPdf ? (
                                                                    <div style={{ padding: 12, fontWeight: 900 }}>📄 Ver PDF</div>
                                                                ) : (
                                                                    <img src={full} alt="" style={{ width: "100%", height: 170, objectFit: "cover" }} />
                                                                )}
                                                            </div>
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!isEntregado && (
                                    <div style={{ marginTop: 14, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                                        Tip: si cambiaste estado desde el taller, tocá “Buscar” para refrescar.
                                    </div>
                                )}
                            </div>
                        )}
                    </TechCard>
                </div>
            )}
        </PageShell>
    );
}