import { useEffect, useMemo, useState, useRef, forwardRef } from "react";
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
  adminGetSolicitud,
  adminReporteSemanalEntregados,
  getMedia,
} from "../Api";

function hasCoords(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180;
}

function googleMapsLink(lat, lng, address) {
  if (hasCoords(lat, lng)) return `https://www.google.com/maps?q=${lat},${lng}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return null;
}

function osmEmbedUrl(lat, lng) {
  const a = Number(lat);
  const b = Number(lng);
  const delta = 0.006;
  const left = b - delta;
  const right = b + delta;
  const top = a + delta;
  const bottom = a - delta;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${a}%2C${b}`;
}

function addHours(dateIso, hours) {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

function formatRemaining(ms) {
  if (ms <= 0) return "Vencido";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `Vence en ${m} min`;
  return `Vence en ${h}h ${m}m`;
}

function formatAR(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

function formatMoney(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

function onlyDigits(s) {
  return (s || "").toString().replace(/\D/g, "");
}

function normalizePhoneAR(raw) {
  let d = onlyDigits(raw);
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = "54" + d;
  return d;
}

function whatsappLinkAR(rawPhone, texto) {
  const phone = normalizePhoneAR(rawPhone);
  const msg = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${phone}${msg}`;
}

function buildWeeklyCsv(report) {
  const rows = [
    [
      "Fecha entrega",
      "Codigo",
      "Cliente",
      "Telefono",
      "Marca",
      "Modelo",
      "Falla",
      "Metodo pago",
      "Monto",
      "Referencia",
    ],
    ...(report?.items || []).map((it) => [
      formatAR(it.entregadoAt),
      it.codigoSeguimiento || "",
      it.nombreCliente || "",
      it.telefonoCliente || "",
      it.marca || "",
      it.modelo || "",
      it.descripcionFalla || "",
      it.metodoPago || "",
      it.monto ?? "",
      it.pagoReferencia || "",
    ]),
  ];

  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const API_HOST = import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";

function fullFileUrl(relativeUrl) {
  if (!relativeUrl) return null;
  return `${API_HOST}${relativeUrl}`;
}

const TechCard = forwardRef(function TechCard({ children, style }, ref) {
  return (
    <div
      ref={ref}
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
});

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

function StatCard({ title, value, subtitle }) {
  return (
    <TechCard style={{ padding: 14 }}>
      <div style={{ fontSize: 12, color: "#2b4b66", fontWeight: 800 }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 24, fontWeight: 950, color: "#0b2a4a" }}>{value}</div>
      {subtitle ? (
        <div style={{ marginTop: 4, color: "#2b4b66", fontWeight: 700, fontSize: 12 }}>{subtitle}</div>
      ) : null}
    </TechCard>
  );
}

export default function AdminPage() {
  const [estado, setEstado] = useState("");
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [selFull, setSelFull] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [presMonto, setPresMonto] = useState("");
  const [presDetalle, setPresDetalle] = useState("");
  const [retiroProgramadoPara, setRetiroProgramadoPara] = useState("");
  const [pagoMetodo, setPagoMetodo] = useState("EFECTIVO");
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoRef, setPagoRef] = useState("");

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  const selectedCode = selFull?.codigoSeguimiento;
  const canAct = useMemo(() => Boolean(selectedCode), [selectedCode]);

  const minDateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const detailRef = useRef(null);
  const [selMedia, setSelMedia] = useState([]);

  async function cargar() {
    setError("");
    setLoading(true);
    try {
      const [res, report] = await Promise.all([
        adminListarSolicitudes(estado || null),
        adminReporteSemanalEntregados(),
      ]);

      setItems(res || []);
      setWeeklyReport(report || null);

      if (sel?.codigoSeguimiento) {
        const fresh = await adminGetSolicitud(sel.codigoSeguimiento);
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

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!selFull) return;

    if (selFull.presupuestoMonto != null) {
      setPagoMonto(String(selFull.pagoMonto ?? selFull.presupuestoMonto));
    } else {
      setPagoMonto("");
    }

    if (selFull.metodoPago) {
      setPagoMetodo(selFull.metodoPago);
    } else {
      setPagoMetodo("EFECTIVO");
    }

    setPagoRef(selFull.pagoReferencia || "");
  }, [selFull]);

  async function seleccionar(item) {
    setSel(item);
    setError("");
    setLoading(true);
    try {
      const full = await adminGetSolicitud(item.codigoSeguimiento);
      setSelFull(full);

      if (window.innerWidth <= 640) {
        setTimeout(() => {
          detailRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 120);
      }

      const m = await getMedia(item.codigoSeguimiento);
      setSelMedia(m || []);
    } catch (e) {
      setError(e?.message || "No se pudo cargar detalle");
    } finally {
      setLoading(false);
    }
  }

  async function run(action) {
    if (!selectedCode) return;
    setError("");
    setLoading(true);
    try {
      await action(selectedCode);
      await cargar();
      const full = await adminGetSolicitud(selectedCode);
      setSelFull(full);
      const m = await getMedia(selectedCode);
      setSelMedia(m || []);
    } catch (e) {
      setError(e?.message || "Error ejecutando acción");
    } finally {
      setLoading(false);
    }
  }

  function exportarReporteSemanal() {
    if (!weeklyReport) return;
    const csv = buildWeeklyCsv(weeklyReport);
    const desde = weeklyReport?.desde ? weeklyReport.desde.slice(0, 10) : "semana";
    const hasta = weeklyReport?.hasta ? weeklyReport.hasta.slice(0, 10) : "actual";
    downloadCsv(`versus-entregados-${desde}-a-${hasta}.csv`, csv);
  }

  function renderPagado() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago confirmado</div>

        <div style={{ marginTop: 8, color: "#2b4b66", fontWeight: 700, fontSize: 12 }}>
          El pago ya fue registrado. Falta marcar la entrega del equipo.
        </div>

        <div style={{ marginTop: 10 }}>
          <Button
            variant="primary"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarEntregado(code))}
          >
            Marcar entregado
          </Button>
        </div>
      </TechCard>
    );
  }
  function renderPresupuestar() {
    return (
      <TechCard ref={detailRef} style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Presupuestar</div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
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
    );
  }

  function renderProgramarRetiro() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Programar retiro</div>

        <div style={{ marginTop: 8, color: "#2b4b66", fontWeight: 700, fontSize: 12 }}>
          Este bloque aparece cuando el cliente ya aceptó el presupuesto.
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <Input
            type="datetime-local"
            min={minDateTime}
            value={retiroProgramadoPara}
            onChange={(e) => setRetiroProgramadoPara(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <Button
            variant="primary"
            disabled={!canAct || loading || !retiroProgramadoPara.trim()}
            onClick={() =>
              run((code) =>
                adminProgramarRetiro(code, { retiroProgramadoPara: retiroProgramadoPara.trim() })
              )
            }
          >
            Programar retiro
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderMarcarRetirado() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Retiro</div>
        <div style={{ marginTop: 10 }}>
          <Button
            variant="ghost"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarRetirado(code))}
          >
            Marcar retirado
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderRecibidoEnTaller() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Taller</div>
        <div style={{ marginTop: 10 }}>
          <Button
            variant="ghost"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarRecibidoEnTaller(code))}
          >
            Marcar recibido en taller
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderIniciarReparacion() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Reparación</div>
        <div style={{ marginTop: 10 }}>
          <Button
            variant="ghost"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminIniciarReparacion(code))}
          >
            Iniciar reparación
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderMarcarListo() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Entrega</div>
        <div style={{ marginTop: 10 }}>
          <Button
            variant="success"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarListo(code))}
          >
            Marcar listo para entrega
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderPago() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Confirmar pago</div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
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
            variant="primary"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarEntregado(code))}
          >
            Marcar entregado
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderConfirmarDesdeComprobante() {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Pago pendiente de verificación</div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminConfirmarPagoDesdeComprobante(code))}
          >
            Confirmar desde comprobante
          </Button>

          <Button
            variant="primary"
            disabled={!canAct || loading}
            onClick={() => run((code) => adminMarcarEntregado(code))}
          >
            Marcar entregado
          </Button>
        </div>
      </TechCard>
    );
  }

  function renderInfo(text) {
    return (
      <TechCard style={{ marginTop: 14, padding: 14 }}>
        <div style={{ color: "#2b4b66", fontWeight: 800 }}>{text}</div>
      </TechCard>
    );
  }

  function renderAccionesPorEstado() {
    if (!selFull) return null;

    switch (selFull.estado) {
      case "SOLICITADO":
        return renderPresupuestar();

      case "PRESUPUESTADO":
        return renderInfo("Presupuesto enviado. Esperando que el cliente acepte o rechace.");

      case "ACEPTADO":
        return renderProgramarRetiro();

      case "RETIRO_PROGRAMADO":
        return renderMarcarRetirado();

      case "RETIRADO":
        return renderRecibidoEnTaller();

      case "RECIBIDO_EN_TALLER":
        return renderIniciarReparacion();

      case "EN_REPARACION":
        return renderMarcarListo();

      case "LISTO_PARA_ENTREGA":
        return renderPago();

      case "PAGADO":
        return renderPagado();

      case "PAGO_PENDIENTE_VERIFICACION":
        return renderConfirmarDesdeComprobante();

      case "ENTREGADO":
        return renderInfo("✅ Entregado. No hay acciones pendientes.");

      case "RECHAZADO":
        return renderInfo("⛔ El cliente rechazó el presupuesto. No hay acciones disponibles.");

      default:
        return renderInfo(`Estado actual: ${selFull.estado}. No hay acciones configuradas para este estado.`);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {error ? (
        <TechCard style={{ borderColor: "rgba(220,38,38,0.25)" }}>
          <div style={{ color: "#b91c1c", fontWeight: 900 }}>{error}</div>
        </TechCard>
      ) : null}

      {/* REPORTE SEMANAL */}
      <TechCard>
        <SectionTitle
          title="Resumen semanal"
          subtitle={
            weeklyReport?.desde && weeklyReport?.hasta
              ? `Entregados entre ${formatAR(weeklyReport.desde)} y ${formatAR(weeklyReport.hasta)}`
              : "Resumen de entregados de la semana actual."
          }
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          <StatCard
            title="Entregados"
            value={weeklyReport?.cantidadEntregados ?? 0}
          />
          <StatCard
            title="Facturación"
            value={formatMoney(weeklyReport?.totalFacturado)}
          />
          <StatCard
            title="Efectivo"
            value={formatMoney(weeklyReport?.totalEfectivo)}
          />
          <StatCard
            title="Transferencia"
            value={formatMoney(weeklyReport?.totalTransferencia)}
          />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            onClick={exportarReporteSemanal}
            disabled={!weeklyReport || !weeklyReport.items || weeklyReport.items.length === 0}
          >
            ⬇️ Exportar CSV
          </Button>

          <Badge>{weeklyReport?.items?.length || 0} registros</Badge>
        </div>
      </TechCard>

      <TechCard>
        <SectionTitle title="Admin" subtitle="Listado y acciones sobre solicitudes." />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: 260 }}>
            <Select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="SOLICITADO">SOLICITADO</option>
              <option value="ACEPTADO">ACEPTADO</option>
              <option value="RECIBIDO_EN_TALLER">RECIBIDO EN TALLER</option>
              <option value="PRESUPUESTADO">PRESUPUESTADO</option>
              <option value="RETIRO_PROGRAMADO">RETIRO PROGRAMADO</option>
              <option value="RETIRADO">RETIRADO</option>
              <option value="EN_REPARACION">EN REPARACION</option>
              <option value="LISTO_PARA_ENTREGA">LISTO PARA ENTREGA</option>
              <option value="PAGO_PENDIENTE_VERIFICACION">PAGO PENDIENTE VERIFICACION</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="RECHAZADO">RECHAZADO</option>
            </Select>
          </div>

          <Button variant="primary" onClick={cargar} disabled={loading}>
            {loading ? "Cargando..." : "Refrescar"}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              localStorage.removeItem("versus_admin_token");
              window.location.href = "/admin/login";
            }}
          >
            Cerrar sesión
          </Button>
        </div>
      </TechCard>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
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
                      border: active ? "2px solid rgba(27,100,198,0.55)" : "1px solid rgba(27,100,198,0.20)",
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
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                      Creada: {formatAR(it.createdAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TechCard>

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

              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>Cliente:</span>{" "}
                  <span>{selFull?.nombreCliente || "-"}</span>
                </div>

                <div>
                  <span style={{ fontWeight: 900 }}>Equipo:</span>{" "}
                  <span>{[selFull?.marca, selFull?.modelo].filter(Boolean).join(" ") || "-"}</span>
                </div>

                <div>
                  <span style={{ fontWeight: 900 }}>Falla:</span>{" "}
                  <span>{selFull?.descripcionFalla || "-"}</span>
                </div>
                {selFull?.presupuestoMonto != null && (
                  <div>
                    <span style={{ fontWeight: 900 }}>Presupuesto:</span>{" "}
                    <span>
                      {new Intl.NumberFormat("es-AR", {
                        style: "currency",
                        currency: "ARS",
                        maximumFractionDigits: 0,
                      }).format(Number(selFull.presupuestoMonto))}
                    </span>
                  </div>
                )}
                {selFull?.metodoPago && (
                  <div>
                    <span style={{ fontWeight: 900 }}>Método elegido:</span>{" "}
                    <span>{selFull.metodoPago}</span>
                  </div>
                )}

                <div>
                  <span style={{ fontWeight: 900 }}>Dirección retiro:</span>{" "}
                  <span>{selFull?.direccionRetiro || "-"}</span>
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>Programado Para:</span>{" "}
                  <span>
                    {selFull?.retiroProgramadoPara
                      ? new Date(selFull.retiroProgramadoPara).toLocaleDateString("es-AR")
                      : "-"}
                  </span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 950, color: "#0b2a4a" }}>📍 Ubicación cliente</div>

                  {hasCoords(selFull?.latitud, selFull?.longitud) ? (
                    <div style={{ marginTop: 8 }}>
                      <div
                        style={{
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid rgba(27,100,198,0.20)",
                          background: "white",
                        }}
                      >
                        <iframe
                          title="Mapa cliente"
                          src={osmEmbedUrl(selFull.latitud, selFull.longitud)}
                          style={{ width: "100%", height: 220, border: 0 }}
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>

                      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            const url = googleMapsLink(selFull.latitud, selFull.longitud, selFull?.direccionRetiro);
                            if (url) window.open(url, "_blank", "noopener,noreferrer");
                          }}
                        >
                          🧭 Abrir en Google Maps
                        </Button>

                        <Badge>
                          {Number(selFull.latitud).toFixed(6)}, {Number(selFull.longitud).toFixed(6)}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 6, color: "#2b4b66", fontWeight: 800 }}>
                      Sin ubicación (el cliente no marcó punto en el mapa).
                    </div>
                  )}
                </div>

                <div>
                  <span style={{ fontWeight: 900 }}>Creada:</span>{" "}
                  <span>{formatAR(selFull?.createdAt)}</span>
                </div>

                {selFull?.presupuestadoAt && (
                  <div>
                    <span style={{ fontWeight: 900 }}>Presupuestado:</span>{" "}
                    <span>{formatAR(selFull.presupuestadoAt)}</span>
                  </div>
                )}

                {selFull?.estado === "PRESUPUESTADO" && selFull?.presupuestadoAt
                  ? (() => {
                    const vence = addHours(selFull.presupuestadoAt, 48);
                    if (!vence) return null;
                    const ms = vence.getTime() - Date.now();
                    const vencido = ms <= 0;

                    return (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontWeight: 900 }}>Vence:</span>{" "}
                        <span>{formatAR(vence.toISOString())}</span>{" "}
                        <span style={{ fontWeight: 900, marginLeft: 8, color: vencido ? "#b91c1c" : "#0b2a4a" }}>
                          {vencido ? "⚠️ Presupuesto vencido" : `⏳ ${formatRemaining(ms)}`}
                        </span>
                      </div>
                    );
                  })()
                  : null}

                <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Button
                    variant="success"
                    disabled={!selFull?.telefonoCliente}
                    onClick={() => {
                      const msg =
                        `Hola ${selFull?.nombreCliente || ""} 👋\n\n` +
                        `Soy de Versus Reparaciones.\n` +
                        `Tu solicitud: ${selFull?.codigoSeguimiento}\n` +
                        `Equipo: ${[selFull?.marca, selFull?.modelo].filter(Boolean).join(" ")}\n` +
                        `Falla: ${selFull?.descripcionFalla || "-"}\n\n` +
                        `¿Cómo estás?`;
                      window.open(whatsappLinkAR(selFull?.telefonoCliente, msg), "_blank", "noopener,noreferrer");
                    }}
                  >
                    💬 Contactar (WhatsApp)
                  </Button>

                  <Button
                    variant="ghost"
                    disabled={!selFull?.telefonoCliente}
                    onClick={() => {
                      const tel = normalizePhoneAR(selFull?.telefonoCliente);
                      window.location.href = `tel:+${tel}`;
                    }}
                  >
                    📞 Llamar
                  </Button>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontWeight: 950, color: "#0b2a4a" }}>Fotos / Videos del cliente</div>

                  {selMedia.length === 0 ? (
                    <div style={{ color: "#2b4b66", fontWeight: 800, marginTop: 6 }}>
                      No hay archivos enviados.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        marginTop: 10,
                      }}
                    >
                      {selMedia.map((url) => {
                        const full = fullFileUrl(url);
                        const lower = url.toLowerCase();

                        const isVideo = lower.includes(".mp4");
                        const isPdf = lower.includes(".pdf");

                        return (
                          <a
                            key={url}
                            href={full}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: "none" }}
                          >
                            <div
                              style={{
                                width: 150,
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
                                <img
                                  src={full}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: 150,
                                    objectFit: "cover",
                                  }}
                                />
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {renderAccionesPorEstado()}
            </>
          )}
        </TechCard>
      </div>
    </div>
  );
}