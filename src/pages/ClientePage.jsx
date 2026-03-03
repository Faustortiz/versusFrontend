// src/pages/ClientePage.jsx
import { useEffect, useMemo, useState } from "react";
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

const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";
const LS_LAST_CODE_KEY = "versus_last_tracking_code";

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

function PageShell({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 120px)",
        padding: "24px 0",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 34, fontWeight: 950, color: "#0b2a4a", lineHeight: 1.05 }}>
          {title}
        </div>
        {subtitle ? (
          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 800, color: "#2b4b66" }}>{subtitle}</div>
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

export default function ClientePage({ mode }) {
     console.log("MODE RECIBIDO:", mode);

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
    imei: "",
    descripcionFalla: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]); // 0..3

  const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

  const isMobile = window.matchMedia("(max-width: 640px)").matches;

  const showCrear = !mode || mode === "crear";
  const showSeg = !mode || mode === "seguimiento";

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
    if (!form.direccionRetiro.trim()) return setError("Falta dirección de retiro - barrio");
    if (!form.marca.trim()) return setError("Falta marca del telefono");
    if (!form.modelo.trim()) return setError("Falta modelo del telefono");
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

      if (code) await buscar(code);
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

  const estado = useMemo(() => data?.estado, [data]);

  return (
    <PageShell
      title={showCrear && !showSeg ? "Crear solicitud" : "Seguimiento"}
      subtitle="Versus Reparaciones · Retiro y entrega en el día"
    >
      {error && <div style={{ margin: "0 auto 12px", maxWidth: 980, color: "crimson", fontWeight: 800 }}>{error}</div>}

      {/* Top Nav interna (volver a landing) */}
      <div style={{ maxWidth: 980, margin: "0 auto 12px", display: "flex", justifyContent: "space-between" }}>
        <Link to="/" style={{ textDecoration: "none", fontWeight: 900, color: "#0b2a4a" }}>
          ← Volver
        </Link>
        {copiado ? <span style={{ color: "green", fontWeight: 900 }}>Copiado ✅</span> : <span />}
      </div>

      {/* CREAR */}
      {showCrear && (
        <TechCard>
          <h2 style={{ marginTop: 0, color: "#0b2a4a" }}>Crear solicitud</h2>

          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr": "1fr 1fr", gap: 10 }}>
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
            <input
              placeholder="Marca del telefono"
              value={form.marca}
              onChange={(e) => setField("marca", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
            />
            <input
              placeholder="Modelo del telefono"
              value={form.modelo}
              onChange={(e) => setField("modelo", e.target.value)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(27,100,198,0.25)" }}
            />
            <input
              placeholder="IMEI (opcional)"
              value={form.imei}
              onChange={(e) => setField("imei", e.target.value)}
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
            <div style={{ fontWeight: 900, color: "#0b2a4a" }}>Fotos/Video (opcional, máx 3)</div>
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
              <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800 }}>
                Seleccionados: {mediaFiles.map((f) => f.name).join(", ")}
              </div>
            )}
          </div>

          <button
            onClick={onCrearSolicitud}
            disabled={loading}
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

                {data.presupuestoMonto && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Presupuesto</div>
                    <div>Monto: ${data.presupuestoMonto}</div>
                    <div>Detalle: {data.presupuestoDetalle}</div>
                  </div>
                )}

                {!loading && !error && (
                  <div style={{ marginTop: 10, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                    Método de pago: <b>{data.metodoPago || "SIN_ELEGIR"}</b>
                  </div>
                )}

                {data.estado === "PRESUPUESTADO" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button onClick={onAceptar} disabled={loading}>
                      Aceptar
                    </button>
                    <button onClick={onRechazar} disabled={loading}>
                      Rechazar
                    </button>
                  </div>
                )}

                {(data.estado === "LISTO_PARA_ENTREGA" || data.estado === "PAGO_PENDIENTE_VERIFICACION") && (
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
                            <div style={{ color: "#2b4b66", fontWeight: 800 }}>
                              Elegí cómo vas a pagar para continuar:
                            </div>

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

                              <button onClick={() => onElegirMetodoPago("EFECTIVO")} disabled={loading} style={{ marginTop: 8, marginLeft: 8 }}>
                                Cambiar a efectivo
                              </button>
                            </div>
                          </div>
                        )}

                        {data.metodoPago === "EFECTIVO" && (
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago en efectivo (local)</div>
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
                            <div style={{ width: 170, border: "1px solid rgba(27,100,198,0.20)", borderRadius: 14, overflow: "hidden", background: "white" }}>
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

                <div style={{ marginTop: 14, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                  Tip: si cambiaste estado desde el taller, tocá “Buscar” para refrescar.
                </div>
              </div>
            )}
          </TechCard>
        </div>
      )}
    </PageShell>
  );
}