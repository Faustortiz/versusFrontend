// src/pages/ClientPage.jsx
import { useEffect, useRef, useState } from "react";
import { useLocation, Link } from "react-router-dom";
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

function EstadoBadge({ estado }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        border: "1px solid #ccc",
        borderRadius: 999,
        fontSize: 13,
      }}
    >
      {estado}
    </span>
  );
}

const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";
const LS_LAST_CODE_KEY = "versus_last_tracking_code";

export default function ClientPage({ mode = "crear" }) {
  const location = useLocation();

  // --- Refs para foco ---
  const nombreInputRef = useRef(null);
  const codigoInputRef = useRef(null);

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
    imei: "",
    descripcionFalla: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]); // 0..3

  const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

  function buildTrackingUrl(code) {
    // Tu landing está en "/", pero el seguimiento está en "/seguimiento"
    return `${PUBLIC_BASE}/seguimiento?codigo=${encodeURIComponent(code)}`;
  }

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function fullFileUrl(relativeUrl) {
    if (!relativeUrl) return null;
    return `${API_HOST}${relativeUrl}`;
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
    const link = buildTrackingUrl(code);

    const mensaje =
      `Hola 👋\n\n` +
      `Este es mi seguimiento en Versus Reparaciones:\n\n` +
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
      setData(s);

      const m = await getMedia(c);
      setMedia(m);
    } catch (e) {
      setError(e?.message || "Error consultando solicitud");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Si estamos en seguimiento: soportar /seguimiento?codigo=...
  useEffect(() => {
    if (mode !== "seguimiento") return;

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

    // focus al input
    setTimeout(() => codigoInputRef.current?.focus(), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, mode]);

  // ✅ Si estamos en crear: foco al input nombre
  useEffect(() => {
    if (mode !== "crear") return;
    setTimeout(() => nombreInputRef.current?.focus(), 250);
  }, [mode]);

  async function onCrearSolicitud() {
    setError("");

    if (!form.nombreCliente.trim()) return setError("Falta nombre");
    if (!form.telefonoCliente.trim()) return setError("Falta teléfono");
    if (!form.direccionRetiro.trim()) return setError("Falta dirección de retiro");
    if (!form.marca.trim()) return setError("Falta marca");
    if (!form.modelo.trim()) return setError("Falta modelo");
    if (!form.descripcionFalla.trim()) return setError("Falta descripción de la falla");

    setLoading(true);
    try {
      const creada = await crearSolicitud({
        nombreCliente: form.nombreCliente.trim(),
        telefonoCliente: form.telefonoCliente.trim(),
        direccionRetiro: form.direccionRetiro.trim(),
        marca: form.marca.trim(),
        modelo: form.modelo.trim(),
        imei: form.imei.trim() || null,
        descripcionFalla: form.descripcionFalla.trim(),
      });

      const code = creada?.codigoSeguimiento;

      if (code) {
        setCodigo(code);
        localStorage.setItem(LS_LAST_CODE_KEY, code);
      }

      if (mediaFiles.length > 0 && code) {
        await subirMediaCliente(code, mediaFiles);
      }

      // Traemos data para mostrar código/links
      if (code) {
        await buscar(code);
      }
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
      const s = await subirComprobante(
        codigo.trim(),
        comprobanteFile,
        referenciaComprobante.trim() || null
      );
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

  return (
    <div>
      {/* mini nav */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <Link to="/" style={{ textDecoration: "none" }}>← Inicio</Link>
        {mode === "crear" ? <Link to="/seguimiento" style={{ textDecoration: "none" }}>Ingresar código</Link> : null}
        {mode === "seguimiento" ? <Link to="/crear" style={{ textDecoration: "none" }}>Crear solicitud</Link> : null}
      </div>

      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      {/* ===================== CREAR ===================== */}
      {mode === "crear" && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "white",
            boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Crear solicitud</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input
              ref={nombreInputRef}
              placeholder="Nombre"
              value={form.nombreCliente}
              onChange={(e) => setField("nombreCliente", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <input
              placeholder="Teléfono"
              value={form.telefonoCliente}
              onChange={(e) => setField("telefonoCliente", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <input
              placeholder="Dirección retiro"
              value={form.direccionRetiro}
              onChange={(e) => setField("direccionRetiro", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", gridColumn: "1 / -1" }}
            />
            <input
              placeholder="Marca"
              value={form.marca}
              onChange={(e) => setField("marca", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <input
              placeholder="Modelo"
              value={form.modelo}
              onChange={(e) => setField("modelo", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <input
              placeholder="IMEI (opcional)"
              value={form.imei}
              onChange={(e) => setField("imei", e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
            />
            <textarea
              placeholder="Descripción de la falla"
              value={form.descripcionFalla}
              onChange={(e) => setField("descripcionFalla", e.target.value)}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                gridColumn: "1 / -1",
                minHeight: 90,
              }}
            />
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 700 }}>Fotos/Video (opcional, máx 3)</div>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4"
              onChange={(e) => {
                const arr = Array.from(e.target.files || []);
                setMediaFiles(arr.slice(0, 3));
              }}
            />
            {mediaFiles.length > 0 && (
              <div style={{ marginTop: 6, color: "#666" }}>
                Seleccionados: {mediaFiles.map((f) => f.name).join(", ")}
              </div>
            )}
          </div>

          <button
            onClick={onCrearSolicitud}
            disabled={loading}
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #1f8f3a",
              background: "linear-gradient(180deg, #38c463 0%, #1f8f3a 100%)",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {loading ? "Creando..." : "Crear solicitud"}
          </button>

          {data?.codigoSeguimiento && (
            <div style={{ marginTop: 12 }}>
              <div>
                Código generado: <b>{data.codigoSeguimiento}</b>
              </div>

              <div style={{ marginTop: 8 }}>
                Link de seguimiento:{" "}
                <a href={buildTrackingUrl(data.codigoSeguimiento)} target="_blank" rel="noreferrer">
                  {buildTrackingUrl(data.codigoSeguimiento)}
                </a>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => copiarTexto(data.codigoSeguimiento)} disabled={loading}>
                  Copiar código
                </button>
                <button onClick={() => copiarTexto(buildTrackingUrl(data.codigoSeguimiento))} disabled={loading}>
                  Copiar link
                </button>
                <button onClick={() => compartirWhatsapp(data.codigoSeguimiento)} disabled={loading}>
                  Compartir por WhatsApp
                </button>
                {copiado && <span style={{ color: "green", fontWeight: 700 }}>Copiado ✅</span>}
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                Tip: el código queda guardado automáticamente en este dispositivo.
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== SEGUIMIENTO ===================== */}
      {mode === "seguimiento" && (
        <div
          style={{
            marginTop: 10,
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            background: "white",
            boxShadow: "0 8px 24px rgba(0,0,0,0.04)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Seguimiento por código</h2>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              ref={codigoInputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ingresá tu código (ej: VS-XXXXXX)"
              style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 220 }}
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
            {copiado && <span style={{ color: "green", fontWeight: 700, alignSelf: "center" }}>Copiado ✅</span>}
          </div>

          {data && (
            <div style={{ marginTop: 16, borderTop: "1px dashed #ccc", paddingTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Código</div>
                  <div style={{ fontWeight: 700 }}>{data.codigoSeguimiento}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: "#666" }}>Estado</div>
                  <EstadoBadge estado={data.estado} />
                </div>
              </div>

              {data.presupuestoMonto && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 700 }}>Presupuesto</div>
                  <div>Monto: ${data.presupuestoMonto}</div>
                  <div>Detalle: {data.presupuestoDetalle}</div>
                </div>
              )}

              {!loading && !error && (
                <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
                  Método de pago: <b>{data.metodoPago || "SIN_ELEGIR"}</b>
                </div>
              )}

              {data.estado === "PRESUPUESTADO" && (
                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  <button onClick={onAceptar} disabled={loading}>Aceptar</button>
                  <button onClick={onRechazar} disabled={loading}>Rechazar</button>
                </div>
              )}

              {(data.estado === "LISTO_PARA_ENTREGA" || data.estado === "PAGO_PENDIENTE_VERIFICACION") && (
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #ccc" }}>
                  <h3 style={{ margin: 0 }}>Pago</h3>

                  {data.estado === "PAGO_PENDIENTE_VERIFICACION" && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ fontWeight: 700 }}>Comprobante enviado</div>
                      <div style={{ color: "#666" }}>Estamos verificando el pago.</div>

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
                          <div style={{ color: "#666" }}>Elegí cómo vas a pagar para continuar:</div>
                          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                            <button disabled={loading} onClick={() => onElegirMetodoPago("EFECTIVO")}>
                              Pagar en efectivo en el local
                            </button>
                            <button disabled={loading} onClick={() => onElegirMetodoPago("TRANSFERENCIA")}>
                              Pagar por transferencia
                            </button>
                          </div>
                        </>
                      )}

                      {data.metodoPago === "TRANSFERENCIA" && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontWeight: 700 }}>Pago por transferencia</div>
                          <div style={{ marginTop: 8 }}>
                            <div>Alias: {data.alias}</div>
                            <div>CBU: {data.cbu}</div>
                            <div>Titular: {data.titular}</div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700 }}>Subir comprobante</div>
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
                                borderRadius: 8,
                                border: "1px solid #ccc",
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
                          <div style={{ fontWeight: 700 }}>Pago en efectivo (local)</div>
                          <div style={{ marginTop: 8 }}>
                            <div>Dirección: {data.direccionLocal}</div>
                            <div>Horario: {data.horarioLocal}</div>
                            {data.mapsLocal && (
                              <div>
                                Mapa:{" "}
                                <a href={data.mapsLocal} target="_blank" rel="noreferrer">
                                  Abrir mapa
                                </a>
                              </div>
                            )}
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

              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700 }}>Fotos/Videos enviados</div>
                {media.length === 0 ? (
                  <div style={{ color: "#666" }}>No hay archivos.</div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                    {media.map((url) => {
                      const full = fullFileUrl(url);
                      const lower = url.toLowerCase();
                      const isVideo = lower.includes(".mp4");
                      const isPdf = lower.includes(".pdf");

                      return (
                        <a key={url} href={full} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                          <div style={{ width: 170, border: "1px solid #ddd", borderRadius: 10, overflow: "hidden" }}>
                            {isVideo ? (
                              <div style={{ padding: 12 }}>🎥 Ver video</div>
                            ) : isPdf ? (
                              <div style={{ padding: 12 }}>📄 Ver PDF</div>
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

              <div style={{ marginTop: 14, color: "#666", fontSize: 12 }}>
                Tip: si cambiaste estado desde el taller, tocá “Buscar” para refrescar.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}