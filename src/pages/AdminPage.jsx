// src/pages/AdminPage.jsx
import { useState } from "react";
import {
  getSolicitud,
  getMedia,
  adminListarSolicitudes,
  adminPresupuestar,
  adminProgramarRetiro,
  adminMarcarRetirado,
  adminMarcarRecibidoEnTaller,
  adminIniciarReparacion,
  adminMarcarListo,
  adminConfirmarPago,
  adminConfirmarPagoDesdeComprobante,
  adminMarcarEntregado,
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

export default function AdminPage() {
  const [adminEstado, setAdminEstado] = useState("");
  const [adminLista, setAdminLista] = useState([]);

  // detalle
  const [codigo, setCodigo] = useState("");
  const [data, setData] = useState(null);
  const [media, setMedia] = useState([]);

  // inputs admin
  const [admPresMonto, setAdmPresMonto] = useState("");
  const [admPresDetalle, setAdmPresDetalle] = useState("");
  const [admRetiroFechaHora, setAdmRetiroFechaHora] = useState("");
  const [admPagoMetodo, setAdmPagoMetodo] = useState("EFECTIVO");
  const [admPagoMonto, setAdmPagoMonto] = useState("");
  const [admPagoRef, setAdmPagoRef] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function fullFileUrl(relativeUrl) {
    if (!relativeUrl) return null;
    return `${API_HOST}${relativeUrl}`;
  }

  function adminComprobanteUrlFromEntity(s) {
    if (!s) return null;
    if (s.comprobanteUrl) return s.comprobanteUrl;

    const path = s.comprobantePath;
    if (!path) return null;

    const p = String(path).replaceAll("\\", "/");
    if (p.startsWith("uploads/")) return "/files/" + p.substring("uploads/".length);
    if (p.startsWith("comprobantes/")) return "/files/" + p;
    return "/files/" + p;
  }

  async function cargarAdminLista() {
    setError("");
    setLoading(true);
    try {
      const estado = adminEstado.trim() ? adminEstado.trim() : null;
      const list = await adminListarSolicitudes(estado);
      setAdminLista(list);
    } catch (e) {
      setError(e?.message || "Error cargando listado admin");
    } finally {
      setLoading(false);
    }
  }

  async function buscarDetalle(cod = null) {
    const c = (cod ?? codigo).trim();
    if (!c) return;

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

  async function adminRun(fn) {
    setError("");
    setLoading(true);
    try {
      const updated = await fn();
      setData(updated);
      await buscarDetalle(updated.codigoSeguimiento);
      await cargarAdminLista();
    } catch (e) {
      setError(e?.message || "Error en acción admin");
    } finally {
      setLoading(false);
    }
  }

  function parseNumberOrThrow(v, msg) {
    const n = Number(String(v).replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) throw new Error(msg);
    return n;
  }

  const estado = data?.estado;

  return (
    <div>
      {error && <div style={{ marginTop: 12, color: "crimson" }}>{error}</div>}

      {/* Panel listado */}
      <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2 style={{ marginTop: 0 }}>Admin – Solicitudes</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value={adminEstado}
            onChange={(e) => setAdminEstado(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
          >
            <option value="">Todos</option>
            <option value="SOLICITADO">SOLICITADO</option>
            <option value="PRESUPUESTADO">PRESUPUESTADO</option>
            <option value="ACEPTADO">ACEPTADO</option>
            <option value="RETIRO_PROGRAMADO">RETIRO_PROGRAMADO</option>
            <option value="RETIRADO">RETIRADO</option>
            <option value="RECIBIDO_EN_TALLER">RECIBIDO_EN_TALLER</option>
            <option value="EN_REPARACION">EN_REPARACION</option>
            <option value="LISTO_PARA_ENTREGA">LISTO_PARA_ENTREGA</option>
            <option value="PAGO_PENDIENTE_VERIFICACION">PAGO_PENDIENTE_VERIFICACION</option>
            <option value="PAGADO">PAGADO</option>
            <option value="ENTREGADO">ENTREGADO</option>
          </select>

          <button onClick={cargarAdminLista} disabled={loading} style={{ padding: "8px 12px" }}>
            {loading ? "Cargando..." : "Refrescar listado"}
          </button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Código (ej: VS-XXXXXX)"
              style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc", minWidth: 260 }}
            />
            <button onClick={() => buscarDetalle()} disabled={loading || !codigo.trim()}>
              Ver detalle
            </button>
          </div>
        </div>

        {adminLista.length === 0 ? (
          <div style={{ marginTop: 12, color: "#666" }}>
            No hay solicitudes cargadas (tocá “Refrescar listado”).
          </div>
        ) : (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Código", "Cliente", "Estado", "Marca", "Modelo", "Acción"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        borderBottom: "1px solid #eee",
                        padding: 10,
                        fontSize: 13,
                        color: "#333",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {adminLista.map((s) => (
                  <tr key={s.id ?? s.codigoSeguimiento} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 10, fontWeight: 700 }}>{s.codigoSeguimiento}</td>
                    <td style={{ padding: 10 }}>{s.nombreCliente}</td>
                    <td style={{ padding: 10 }}>{s.estado}</td>
                    <td style={{ padding: 10 }}>{s.marca}</td>
                    <td style={{ padding: 10 }}>{s.modelo}</td>
                    <td style={{ padding: 10 }}>
                      <button
                        onClick={async () => {
                          setCodigo(s.codigoSeguimiento);
                          await buscarDetalle(s.codigoSeguimiento);
                        }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
              Tip: tocá “Ver” para cargar el detalle abajo.
            </div>
          </div>
        )}
      </div>

      {/* Detalle + acciones */}
      {data && (
        <div style={{ marginTop: 16, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginTop: 0 }}>Detalle</h2>

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Código</div>
              <div style={{ fontWeight: 700 }}>{data.codigoSeguimiento}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#666" }}>Estado</div>
              <EstadoBadge estado={estado} />
            </div>
          </div>

          {data.presupuestoMonto && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700 }}>Presupuesto</div>
              <div>Monto: ${data.presupuestoMonto}</div>
              <div>Detalle: {data.presupuestoDetalle}</div>
            </div>
          )}

          <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed #ccc" }}>
            <h3 style={{ margin: 0 }}>Acciones Admin</h3>
            <div style={{ marginTop: 10, color: "#666", fontSize: 12 }}>
              Se muestran solo las acciones posibles según el estado.
            </div>

            {/* SOLICITADO -> PRESUPUESTADO */}
            {estado === "SOLICITADO" && (
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Cargar presupuesto</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <input
                    value={admPresMonto}
                    onChange={(e) => setAdmPresMonto(e.target.value)}
                    placeholder="Monto (ej: 25000)"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 180 }}
                  />
                  <input
                    value={admPresDetalle}
                    onChange={(e) => setAdmPresDetalle(e.target.value)}
                    placeholder="Detalle (ej: módulo + mano de obra)"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", flex: 1, minWidth: 240 }}
                  />
                  <button
                    disabled={loading}
                    onClick={() =>
                      adminRun(() => {
                        const monto = parseNumberOrThrow(admPresMonto, "Monto inválido");
                        const detalle = admPresDetalle.trim();
                        if (!detalle) throw new Error("Detalle requerido");
                        return adminPresupuestar(codigo.trim(), { monto, detalle });
                      })
                    }
                  >
                    Presupuestar
                  </button>
                </div>
              </div>
            )}

            {/* ACEPTADO -> Programar retiro */}
            {estado === "ACEPTADO" && (
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Programar retiro</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <input
                    type="datetime-local"
                    value={admRetiroFechaHora}
                    onChange={(e) => setAdmRetiroFechaHora(e.target.value)}
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                  />
                  <button
                    disabled={loading}
                    onClick={() =>
                      adminRun(() => {
                        if (!admRetiroFechaHora) throw new Error("Elegí fecha/hora");
                        return adminProgramarRetiro(codigo.trim(), { retiroProgramadoPara: admRetiroFechaHora });
                      })
                    }
                  >
                    Programar
                  </button>
                </div>
              </div>
            )}

            {/* RETIRO_PROGRAMADO -> RETIRADO */}
            {estado === "RETIRO_PROGRAMADO" && (
              <div style={{ marginTop: 12 }}>
                <button disabled={loading} onClick={() => adminRun(() => adminMarcarRetirado(codigo.trim()))}>
                  Marcar RETIRADO
                </button>
              </div>
            )}

            {/* RETIRADO -> RECIBIDO_EN_TALLER */}
            {estado === "RETIRADO" && (
              <div style={{ marginTop: 12 }}>
                <button
                  disabled={loading}
                  onClick={() => adminRun(() => adminMarcarRecibidoEnTaller(codigo.trim()))}
                >
                  Marcar RECIBIDO EN TALLER
                </button>
              </div>
            )}

            {/* RECIBIDO_EN_TALLER -> EN_REPARACION */}
            {estado === "RECIBIDO_EN_TALLER" && (
              <div style={{ marginTop: 12 }}>
                <button disabled={loading} onClick={() => adminRun(() => adminIniciarReparacion(codigo.trim()))}>
                  Iniciar reparación
                </button>
              </div>
            )}

            {/* EN_REPARACION -> LISTO_PARA_ENTREGA */}
            {estado === "EN_REPARACION" && (
              <div style={{ marginTop: 12 }}>
                <button disabled={loading} onClick={() => adminRun(() => adminMarcarListo(codigo.trim()))}>
                  Marcar LISTO PARA ENTREGA
                </button>
              </div>
            )}

            {/* PAGO_PENDIENTE_VERIFICACION -> Confirmar desde comprobante */}
            {estado === "PAGO_PENDIENTE_VERIFICACION" && (
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Pago pendiente de verificación</div>

                {adminComprobanteUrlFromEntity(data) && (
                  <div style={{ marginTop: 8 }}>
                    Comprobante:{" "}
                    <a
                      href={fullFileUrl(adminComprobanteUrlFromEntity(data))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver archivo
                    </a>
                  </div>
                )}

                <button
                  disabled={loading}
                  onClick={() => adminRun(() => adminConfirmarPagoDesdeComprobante(codigo.trim()))}
                  style={{ marginTop: 10 }}
                >
                  Confirmar pago (transferencia)
                </button>
              </div>
            )}

            {/* LISTO_PARA_ENTREGA -> Confirmar pago manual */}
            {estado === "LISTO_PARA_ENTREGA" && (
              <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 700 }}>Confirmar pago (manual)</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  <select
                    value={admPagoMetodo}
                    onChange={(e) => setAdmPagoMetodo(e.target.value)}
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
                  >
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </select>

                  <input
                    value={admPagoMonto}
                    onChange={(e) => setAdmPagoMonto(e.target.value)}
                    placeholder="Monto cobrado"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", width: 160 }}
                  />

                  <input
                    value={admPagoRef}
                    onChange={(e) => setAdmPagoRef(e.target.value)}
                    placeholder="Referencia (opcional)"
                    style={{ padding: 8, borderRadius: 8, border: "1px solid #ccc", flex: 1, minWidth: 200 }}
                  />

                  <button
                    disabled={loading}
                    onClick={() =>
                      adminRun(() => {
                        const monto = parseNumberOrThrow(admPagoMonto, "Monto inválido");
                        return adminConfirmarPago(codigo.trim(), {
                          metodo: admPagoMetodo,
                          monto,
                          referencia: admPagoRef.trim() || null,
                        });
                      })
                    }
                  >
                    Confirmar pago
                  </button>
                </div>
              </div>
            )}

            {/* PAGADO -> ENTREGADO */}
            {estado === "PAGADO" && (
              <div style={{ marginTop: 12 }}>
                <button disabled={loading} onClick={() => adminRun(() => adminMarcarEntregado(codigo.trim()))}>
                  Marcar ENTREGADO
                </button>
              </div>
            )}
          </div>

          {/* Media cliente */}
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
            Tip: tocá “Ver” o “Ver detalle” para refrescar.
          </div>
        </div>
      )}
    </div>
  );
}