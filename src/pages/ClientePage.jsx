// src/pages/ClientePage.jsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
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
const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin;

function buildTrackingUrl(code) {
  return `${PUBLIC_BASE}/seguimiento?codigo=${encodeURIComponent(code)}`;
}

function fullFileUrl(relativeUrl) {
  if (!relativeUrl) return null;
  return `${API_HOST}${relativeUrl}`;
}

/* ---------- UI helpers (tech style) ---------- */
function TechCard({ children, style }) {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(20, 80, 160, 0.18)",
        background: "rgba(255,255,255,0.75)",
        backdropFilter: "blur(10px)",
        boxShadow: "0 14px 32px rgba(0,0,0,0.08)",
        padding: 18,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 18, fontWeight: 950, color: "#0b2a4a" }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 4, color: "#2b4b66", fontWeight: 700, fontSize: 13 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function Input({ style, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(27,100,198,0.25)",
        outline: "none",
        background: "rgba(255,255,255,0.85)",
        ...style,
      }}
    />
  );
}

function TextArea({ style, ...props }) {
  return (
    <textarea
      {...props}
      style={{
        width: "100%",
        padding: 12,
        borderRadius: 12,
        border: "1px solid rgba(27,100,198,0.25)",
        outline: "none",
        background: "rgba(255,255,255,0.85)",
        minHeight: 100,
        resize: "vertical",
        ...style,
      }}
    />
  );
}

function Button({ variant = "primary", style, ...props }) {
  const base = {
    padding: "12px 14px",
    borderRadius: 14,
    fontWeight: 900,
    cursor: "pointer",
    border: "1px solid transparent",
    boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
  };

  const variants = {
    primary: {
      border: "1px solid #1b64c6",
      background: "linear-gradient(180deg, #2e8bff 0%, #1b64c6 100%)",
      color: "white",
      boxShadow: "0 10px 18px rgba(27,100,198,0.25)",
    },
    success: {
      border: "1px solid #1f8f3a",
      background: "linear-gradient(180deg, #38c463 0%, #1f8f3a 100%)",
      color: "white",
      boxShadow: "0 10px 18px rgba(31,143,58,0.25)",
    },
    ghost: {
      border: "1px solid rgba(27,100,198,0.30)",
      background: "rgba(255,255,255,0.75)",
      color: "#0b2a4a",
    },
    danger: {
      border: "1px solid rgba(220, 38, 38, 0.35)",
      background: "rgba(255,255,255,0.75)",
      color: "#b91c1c",
    },
  };

  return <button {...props} style={{ ...base, ...variants[variant], ...style }} />;
}

function Badge({ children }) {
  return (
    <span
      style={{
        padding: "6px 10px",
        border: "1px solid rgba(27,100,198,0.25)",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 900,
        color: "#0b2a4a",
        background: "rgba(255,255,255,0.7)",
      }}
    >
      {children}
    </span>
  );
}

/* ---------- Page ---------- */
export default function ClientePage({ mode }) {
  const location = useLocation();

  // Seguimiento
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(null);
  const [media, setMedia] = useState([]);

  // UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Feedback copiar
  const [copiado, setCopiado] = useState(false);

  // Comprobante
  const [comprobanteFile, setComprobanteFile] = useState(null);
  const [referenciaComprobante, setReferenciaComprobante] = useState("");

  // Crear solicitud
  const [form, setForm] = useState({
    nombreCliente: "",
    telefonoCliente: "",
    direccionRetiro: "",
    marca: "",
    modelo: "",
    imei: "",
    descripcionFalla: "",
  });
  const [mediaFiles, setMediaFiles] = useState([]);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function copiarTexto(texto) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      setError("No se pudo copiar. Copialo manualmente.");
    }
  }

  function compartirWhatsapp(code) {
    const link = buildTrackingUrl(code);
    const mensaje =
      `Hola 👋\n\n` +
      `Seguimiento Versus Reparaciones:\n\n` +
      `🔧 Código: ${code}\n` +
      `🔗 Link: ${link}\n\n` +
      `Guardalo para consultar el estado.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
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

  // ✅ Al entrar a /seguimiento?codigo=...
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

  const estado = data?.estado;

  const showCrear = mode === "crear" || !mode;
  const showSeg = mode === "seguimiento" || !mode;

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error ? (
        <TechCard style={{ borderColor: "rgba(220,38,38,0.25)" }}>
          <div style={{ color: "#b91c1c", fontWeight: 900 }}>{error}</div>
        </TechCard>
      ) : null}

      {showCrear ? (
        <TechCard>
          <SectionTitle title="Crear solicitud" subtitle="Completá los datos. Te damos un código para seguimiento." />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Input
              placeholder="Nombre"
              value={form.nombreCliente}
              onChange={(e) => setField("nombreCliente", e.target.value)}
            />
            <Input
              placeholder="Teléfono"
              value={form.telefonoCliente}
              onChange={(e) => setField("telefonoCliente", e.target.value)}
            />

            <Input
              placeholder="Dirección retiro"
              value={form.direccionRetiro}
              onChange={(e) => setField("direccionRetiro", e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />

            <Input placeholder="Marca" value={form.marca} onChange={(e) => setField("marca", e.target.value)} />
            <Input placeholder="Modelo" value={form.modelo} onChange={(e) => setField("modelo", e.target.value)} />

            <Input
              placeholder="IMEI (opcional)"
              value={form.imei}
              onChange={(e) => setField("imei", e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />

            <TextArea
              placeholder="Descripción de la falla"
              value={form.descripcionFalla}
              onChange={(e) => setField("descripcionFalla", e.target.value)}
              style={{ gridColumn: "1 / -1" }}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Fotos/Video (opcional, máx 3)</div>
            <input
              type="file"
              multiple
              accept="image/*,video/mp4"
              onChange={(e) => {
                const arr = Array.from(e.target.files || []);
                setMediaFiles(arr.slice(0, 3));
              }}
              style={{ marginTop: 8 }}
            />
            {mediaFiles.length ? (
              <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 700, fontSize: 12 }}>
                Seleccionados: {mediaFiles.map((f) => f.name).join(", ")}
              </div>
            ) : null}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button variant="success" onClick={onCrearSolicitud} disabled={loading}>
              {loading ? "Creando..." : "✅ Crear solicitud"}
            </Button>
          </div>

          {data?.codigoSeguimiento ? (
            <TechCard style={{ marginTop: 14, padding: 14 }}>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Código generado</div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#0b2a4a" }}>{data.codigoSeguimiento}</div>
                </div>
                <Badge>{estado || "CREADA"}</Badge>
              </div>

              <div style={{ marginTop: 8, fontSize: 13, color: "#2b4b66", fontWeight: 800 }}>
                Link de seguimiento:{" "}
                <a href={buildTrackingUrl(data.codigoSeguimiento)} target="_blank" rel="noreferrer">
                  {buildTrackingUrl(data.codigoSeguimiento)}
                </a>
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="ghost" onClick={() => copiarTexto(data.codigoSeguimiento)} disabled={loading}>
                  Copiar código
                </Button>
                <Button variant="ghost" onClick={() => copiarTexto(buildTrackingUrl(data.codigoSeguimiento))} disabled={loading}>
                  Copiar link
                </Button>
                <Button variant="primary" onClick={() => compartirWhatsapp(data.codigoSeguimiento)} disabled={loading}>
                  WhatsApp
                </Button>
                {copiado ? <span style={{ color: "#166534", fontWeight: 950 }}>Copiado ✅</span> : null}
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: "#2b4b66", fontWeight: 700 }}>
                Tip: el código queda guardado automáticamente en este dispositivo.
              </div>
            </TechCard>
          ) : null}

          <style>{`
            @media (max-width: 720px) {
              .grid2 { grid-template-columns: 1fr !important; }
            }
          `}</style>
        </TechCard>
      ) : null}

      {showSeg ? (
        <TechCard>
          <SectionTitle
            title="Seguimiento por código"
            subtitle="Ingresá tu código para ver el estado y la información disponible."
          />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ingresá tu código (ej: VS-XXXXXX)"
              />
            </div>

            <Button variant="primary" onClick={() => buscar()} disabled={loading || !codigo.trim()}>
              {loading ? "Cargando..." : "Buscar"}
            </Button>

            <Button variant="ghost" onClick={borrarCodigoGuardado} disabled={loading}>
              Borrar
            </Button>

            <Button variant="ghost" onClick={() => copiarTexto(codigo.trim())} disabled={loading || !codigo.trim()}>
              Copiar código
            </Button>

            <Button
              variant="ghost"
              onClick={() => copiarTexto(buildTrackingUrl(codigo.trim()))}
              disabled={loading || !codigo.trim()}
            >
              Copiar link
            </Button>

            <Button variant="primary" onClick={() => compartirWhatsapp(codigo.trim())} disabled={loading || !codigo.trim()}>
              WhatsApp
            </Button>

            {copiado ? <span style={{ color: "#166534", fontWeight: 950 }}>Copiado ✅</span> : null}
          </div>

          {data ? (
            <TechCard style={{ marginTop: 14, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Código</div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#0b2a4a" }}>{data.codigoSeguimiento}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Estado</div>
                  <Badge>{data.estado}</Badge>
                </div>
              </div>

              {data.presupuestoMonto ? (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Presupuesto</div>
                  <div style={{ color: "#2b4b66", fontWeight: 700, marginTop: 6 }}>
                    Monto: ${data.presupuestoMonto}
                  </div>
                  <div style={{ color: "#2b4b66", marginTop: 4 }}>{data.presupuestoDetalle}</div>
                </div>
              ) : null}

              <div style={{ marginTop: 10, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                Método de pago: <b>{data.metodoPago || "SIN_ELEGIR"}</b>
              </div>

              {data.estado === "PRESUPUESTADO" ? (
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <Button variant="success" onClick={onAceptar} disabled={loading}>
                    Aceptar
                  </Button>
                  <Button variant="danger" onClick={onRechazar} disabled={loading}>
                    Rechazar
                  </Button>
                </div>
              ) : null}

              {(data.estado === "LISTO_PARA_ENTREGA" || data.estado === "PAGO_PENDIENTE_VERIFICACION") ? (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago</div>

                  {data.estado === "PAGO_PENDIENTE_VERIFICACION" ? (
                    <div style={{ marginTop: 8, color: "#2b4b66" }}>
                      <div style={{ fontWeight: 900 }}>Comprobante enviado</div>
                      <div style={{ marginTop: 4 }}>Estamos verificando el pago.</div>

                      {data.comprobanteUrl ? (
                        <div style={{ marginTop: 8 }}>
                          Comprobante:{" "}
                          <a href={fullFileUrl(data.comprobanteUrl)} target="_blank" rel="noreferrer">
                            Ver archivo
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {data.estado === "LISTO_PARA_ENTREGA" ? (
                    <div style={{ marginTop: 10 }}>
                      {!data.metodoPago ? (
                        <>
                          <div style={{ color: "#2b4b66", fontWeight: 700 }}>
                            Elegí cómo vas a pagar para continuar:
                          </div>

                          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
                            <Button variant="success" disabled={loading} onClick={() => onElegirMetodoPago("EFECTIVO")}>
                              Efectivo (local)
                            </Button>
                            <Button variant="primary" disabled={loading} onClick={() => onElegirMetodoPago("TRANSFERENCIA")}>
                              Transferencia
                            </Button>
                          </div>
                        </>
                      ) : null}

                      {data.metodoPago === "TRANSFERENCIA" ? (
                        <TechCard style={{ marginTop: 12, padding: 14 }}>
                          <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Datos de transferencia</div>
                          <div style={{ marginTop: 8, color: "#2b4b66" }}>
                            <div>Alias: <b>{data.alias}</b></div>
                            <div>CBU: <b>{data.cbu}</b></div>
                            <div>Titular: <b>{data.titular}</b></div>
                          </div>

                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Subir comprobante</div>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => setComprobanteFile(e.target.files?.[0] || null)}
                              style={{ marginTop: 8 }}
                            />

                            <div style={{ marginTop: 8, maxWidth: 420 }}>
                              <Input
                                value={referenciaComprobante}
                                onChange={(e) => setReferenciaComprobante(e.target.value)}
                                placeholder="Referencia / N° operación (opcional)"
                              />
                            </div>

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <Button variant="primary" onClick={onSubirComprobante} disabled={loading || !comprobanteFile}>
                                Subir comprobante
                              </Button>

                              <Button variant="ghost" onClick={() => onElegirMetodoPago("EFECTIVO")} disabled={loading}>
                                Cambiar a efectivo
                              </Button>
                            </div>
                          </div>
                        </TechCard>
                      ) : null}

                      {data.metodoPago === "EFECTIVO" ? (
                        <TechCard style={{ marginTop: 12, padding: 14 }}>
                          <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago en efectivo</div>
                          <div style={{ marginTop: 8, color: "#2b4b66" }}>
                            <div>Dirección: <b>{data.direccionLocal}</b></div>
                            <div>Horario: <b>{data.horarioLocal}</b></div>
                            {data.mapsLocal ? (
                              <div>
                                Mapa:{" "}
                                <a href={data.mapsLocal} target="_blank" rel="noreferrer">
                                  Abrir mapa
                                </a>
                              </div>
                            ) : null}
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <Button variant="ghost" onClick={() => onElegirMetodoPago("TRANSFERENCIA")} disabled={loading}>
                              Cambiar a transferencia
                            </Button>
                          </div>
                        </TechCard>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Fotos/Videos enviados</div>
                {media.length === 0 ? (
                  <div style={{ color: "#2b4b66", fontWeight: 700, marginTop: 6 }}>No hay archivos.</div>
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
                              borderRadius: 14,
                              overflow: "hidden",
                              border: "1px solid rgba(27,100,198,0.20)",
                              background: "rgba(255,255,255,0.7)",
                              boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
                            }}
                          >
                            {isVideo ? (
                              <div style={{ padding: 12, fontWeight: 900, color: "#0b2a4a" }}>🎥 Ver video</div>
                            ) : isPdf ? (
                              <div style={{ padding: 12, fontWeight: 900, color: "#0b2a4a" }}>📄 Ver PDF</div>
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

              <div style={{ marginTop: 12, color: "#2b4b66", fontSize: 12, fontWeight: 800 }}>
                Tip: si cambiaste estado desde el taller, tocá “Buscar” para refrescar.
              </div>
            </TechCard>
          ) : null}
        </TechCard>
      ) : null}

      {/* Responsive de la grilla */}
      <style>{`
        @media (max-width: 720px) {
          .grid2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}