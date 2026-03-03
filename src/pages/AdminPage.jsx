// src/pages/AdminPage.jsx
import { useEffect, useMemo, useState } from "react";
import {
  adminListarSolicitudes,
  adminPresupuestar,
  adminProgramarRetiro,
  adminMarcarRetirado,
  adminIniciarReparacion,
  adminMarcarListo,
  adminConfirmarPago,
  adminMarcarEntregado,
  adminMarcarRecibidoEnTaller,
  adminConfirmarPagoDesdeComprobante,
  getSolicitud,
} from "../Api";

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

function Select({ style, ...props }) {
  return (
    <select
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

export default function AdminPage() {
  const [estado, setEstado] = useState("");
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [selFull, setSelFull] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forms admin
  const [presMonto, setPresMonto] = useState("");
  const [presDetalle, setPresDetalle] = useState("");
  const [retiroProgramadoPara, setRetiroProgramadoPara] = useState(""); // ISO local: 2026-03-03T18:00
  const [pagoMetodo, setPagoMetodo] = useState("EFECTIVO");
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoRef, setPagoRef] = useState("");

  async function cargar() {
    setError("");
    setLoading(true);
    try {
      const res = await adminListarSolicitudes(estado || null);
      setItems(res || []);
      // si ya había seleccionado, refrescamos
      if (sel?.codigoSeguimiento) {
        const fresh = await getSolicitud(sel.codigoSeguimiento);
        setSelFull(fresh);
      }
    } catch (e) {
      setError(e?.message || "No se pudo cargar admin");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function seleccionar(item) {
    setSel(item);
    setError("");
    setLoading(true);
    try {
      const full = await getSolicitud(item.codigoSeguimiento);
      setSelFull(full);
    } catch (e) {
      setError(e?.message || "No se pudo cargar detalle");
    } finally {
      setLoading(false);
    }
  }

  const selectedCode = selFull?.codigoSeguimiento;

  const canAct = useMemo(() => Boolean(selectedCode), [selectedCode]);

  async function run(action) {
    if (!selectedCode) return;
    setError("");
    setLoading(true);
    try {
      await action(selectedCode);
      await cargar();
      const full = await getSolicitud(selectedCode);
      setSelFull(full);
    } catch (e) {
      setError(e?.message || "Error ejecutando acción");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error ? (
        <TechCard style={{ borderColor: "rgba(220,38,38,0.25)" }}>
          <div style={{ color: "#b91c1c", fontWeight: 900 }}>{error}</div>
        </TechCard>
      ) : null}

      <TechCard>
        <SectionTitle title="Admin" subtitle="Listado y acciones sobre solicitudes." />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 260 }}>
            <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="CREADA">CREADA</option>
              <option value="RECIBIDO_EN_TALLER">RECIBIDO_EN_TALLER</option>
              <option value="PRESUPUESTADO">PRESUPUESTADO</option>
              <option value="RETIRO_PROGRAMADO">RETIRO_PROGRAMADO</option>
              <option value="RETIRADO">RETIRADO</option>
              <option value="EN_REPARACION">EN_REPARACION</option>
              <option value="LISTO_PARA_ENTREGA">LISTO_PARA_ENTREGA</option>
              <option value="PAGO_PENDIENTE_VERIFICACION">PAGO_PENDIENTE_VERIFICACION</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="CANCELADO">CANCELADO</option>
            </Select>
          </div>

          <Button variant="primary" onClick={cargar} disabled={loading}>
            {loading ? "Cargando..." : "Refrescar"}
          </Button>
        </div>
      </TechCard>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 14 }}>
        {/* LISTA */}
        <TechCard>
          <SectionTitle title="Solicitudes" subtitle={`Total: ${items.length}`} />
          {items.length === 0 ? (
            <div style={{ color: "#2b4b66", fontWeight: 800 }}>No hay solicitudes.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {items.map((it) => {
                const active = sel?.codigoSeguimiento === it.codigoSeguimiento;
                return (
                  <button
                    key={it.codigoSeguimiento}
                    onClick={() => seleccionar(it)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      border: active
                        ? "2px solid rgba(27,100,198,0.55)"
                        : "1px solid rgba(27,100,198,0.20)",
                      background: active ? "rgba(46,139,255,0.08)" : "rgba(255,255,255,0.7)",
                      cursor: "pointer",
                      boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 950, color: "#0b2a4a" }}>{it.codigoSeguimiento}</div>
                      <Badge>{it.estado}</Badge>
                    </div>
                    <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 700, fontSize: 12 }}>
                      {it.marca} {it.modelo} · {it.nombreCliente}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TechCard>

        {/* DETALLE + ACCIONES */}
        <TechCard>
          <SectionTitle title="Detalle y acciones" subtitle="Seleccioná una solicitud para operar." />

          {!selFull ? (
            <div style={{ color: "#2b4b66", fontWeight: 800 }}>No hay selección.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Código</div>
                  <div style={{ fontSize: 18, fontWeight: 950, color: "#0b2a4a" }}>
                    {selFull.codigoSeguimiento}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>Estado</div>
                  <Badge>{selFull.estado}</Badge>
                </div>
              </div>

              <div style={{ marginTop: 10, color: "#2b4b66", fontWeight: 700, lineHeight: 1.6 }}>
                <div><b>Cliente:</b> {selFull.nombreCliente} · {selFull.telefonoCliente}</div>
                <div><b>Equipo:</b> {selFull.marca} {selFull.modelo} {selFull.imei ? `(IMEI: ${selFull.imei})` : ""}</div>
                <div><b>Falla:</b> {selFull.descripcionFalla}</div>
              </div>

              {/* Acciones rápidas */}
              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Button
                  variant="ghost"
                  disabled={!canAct || loading}
                  onClick={() => run((code) => adminMarcarRecibidoEnTaller(code))}
                >
                  Marcar recibido en taller
                </Button>

                <Button
                  variant="ghost"
                  disabled={!canAct || loading}
                  onClick={() => run((code) => adminMarcarRetirado(code))}
                >
                  Marcar retirado
                </Button>

                <Button
                  variant="ghost"
                  disabled={!canAct || loading}
                  onClick={() => run((code) => adminIniciarReparacion(code))}
                >
                  Iniciar reparación
                </Button>

                <Button
                  variant="success"
                  disabled={!canAct || loading}
                  onClick={() => run((code) => adminMarcarListo(code))}
                >
                  Marcar listo
                </Button>

                <Button
                  variant="primary"
                  disabled={!canAct || loading}
                  onClick={() => run((code) => adminMarcarEntregado(code))}
                >
                  Marcar entregado
                </Button>
              </div>

              {/* Presupuesto */}
              <TechCard style={{ marginTop: 14, padding: 14 }}>
                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Presupuestar</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Input
                    value={presMonto}
                    onChange={(e) => setPresMonto(e.target.value)}
                    placeholder="Monto (ej: 35000)"
                  />
                  <Input
                    value={presDetalle}
                    onChange={(e) => setPresDetalle(e.target.value)}
                    placeholder="Detalle (ej: Cambio módulo)"
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Button
                    variant="primary"
                    disabled={!canAct || loading || !presMonto.trim() || !presDetalle.trim()}
                    onClick={() =>
                      run((code) =>
                        adminPresupuestar(code, { monto: Number(presMonto), detalle: presDetalle.trim() })
                      )
                    }
                  >
                    Enviar presupuesto
                  </Button>
                </div>
              </TechCard>

              {/* Programar retiro */}
              <TechCard style={{ marginTop: 14, padding: 14 }}>
                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Programar retiro</div>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
                  <Input
                    value={retiroProgramadoPara}
                    onChange={(e) => setRetiroProgramadoPara(e.target.value)}
                    placeholder='Fecha/hora ISO (ej: 2026-03-05T18:00)'
                  />
                </div>
                <div style={{ marginTop: 10 }}>
                  <Button
                    variant="primary"
                    disabled={!canAct || loading || !retiroProgramadoPara.trim()}
                    onClick={() =>
                      run((code) => adminProgramarRetiro(code, { retiroProgramadoPara: retiroProgramadoPara.trim() }))
                    }
                  >
                    Programar retiro
                  </Button>
                </div>
              </TechCard>

              {/* Pago */}
              <TechCard style={{ marginTop: 14, padding: 14 }}>
                <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Confirmar pago</div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Select value={pagoMetodo} onChange={(e) => setPagoMetodo(e.target.value)}>
                    <option value="EFECTIVO">EFECTIVO</option>
                    <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  </Select>

                  <Input
                    value={pagoMonto}
                    onChange={(e) => setPagoMonto(e.target.value)}
                    placeholder="Monto (ej: 35000)"
                  />

                  <Input
                    value={pagoRef}
                    onChange={(e) => setPagoRef(e.target.value)}
                    placeholder="Referencia (opcional)"
                    style={{ gridColumn: "1 / -1" }}
                  />
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="success"
                    disabled={!canAct || loading || !pagoMonto.trim()}
                    onClick={() =>
                      run((code) =>
                        adminConfirmarPago(code, {
                          metodo: pagoMetodo,
                          monto: Number(pagoMonto),
                          referencia: pagoRef.trim() || null,
                        })
                      )
                    }
                  >
                    Confirmar pago
                  </Button>

                  <Button
                    variant="ghost"
                    disabled={!canAct || loading}
                    onClick={() => run((code) => adminConfirmarPagoDesdeComprobante(code))}
                  >
                    Confirmar desde comprobante
                  </Button>
                </div>
              </TechCard>
            </>
          )}
        </TechCard>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .adminGrid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}