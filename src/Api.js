// Api.js
const API_BASE = "http://localhost:9090";

export async function crearSolicitud(payload) {
  const res = await fetch(`${API_BASE}/public/solicitudes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("No se pudo crear la solicitud");
  return res.json();
}

// files: array de File (0..3)
export async function subirMediaCliente(codigo, files) {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/media`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("No se pudo subir la media");
  return res.json(); // lista de URLs
}

export async function getSolicitud(codigo) {
  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Error consultando solicitud");
  return res.json();
}

export async function aceptarPresupuesto(codigo) {
  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/presupuesto/aceptar`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("No se pudo aceptar presupuesto");
  return res.json();
}

export async function rechazarPresupuesto(codigo) {
  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/presupuesto/rechazar`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("No se pudo rechazar presupuesto");
  return res.json();
}

export async function getMedia(codigo) {
  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/media`);
  if (!res.ok) throw new Error("No se pudo obtener media");
  return res.json(); // lista de urls
}

export async function subirComprobante(codigo, file, referencia) {
  const form = new FormData();
  form.append("file", file);
  if (referencia) form.append("referencia", referencia);

  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/pago/comprobante`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "No se pudo subir comprobante");
  }
  return res.json();
}

/**
 * NUEVO: Elegir método de pago (cliente)
 * POST /public/solicitudes/{codigo}/pago/metodo
 * body: { metodoPago: "EFECTIVO" | "TRANSFERENCIA" }
 */
export async function elegirMetodoPago(codigo, metodoPago) {
  const res = await fetch(`${API_BASE}/public/solicitudes/${codigo}/pago/metodo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metodoPago }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || "No se pudo elegir método de pago");
  }
  return res.json();
}

export async function adminListarSolicitudes(estado) {
  const qs = estado ? `?estado=${encodeURIComponent(estado)}` : "";
  const res = await fetch(`${API_BASE}/admin/solicitudes${qs}`);
  if (!res.ok) throw new Error("No se pudo listar solicitudes (admin)");
  return res.json();
}

// Helper
async function apiPatch(url, body) {
  const opts = { method: "PATCH" };
  if (body !== undefined) {
    opts.headers = { "Content-Type": "application/json" };
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${url}`, opts);
  if (!res.ok) throw new Error(`Error ${res.status} en ${url}`);
  return res.json();
}

// --- ADMIN actions ---
export function adminPresupuestar(codigo, { monto, detalle }) {
  return apiPatch(`/admin/solicitudes/${codigo}/presupuesto`, { monto, detalle });
}

export function adminProgramarRetiro(codigo, { retiroProgramadoPara }) {
  // fechaHora string ISO: "2026-02-25T18:00"
  return apiPatch(`/admin/solicitudes/${codigo}/retiro/programar`, { retiroProgramadoPara });
}

export function adminMarcarRetirado(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/retiro/marcar-retirado`);
}

export function adminIniciarReparacion(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/reparacion/iniciar`);
}

export function adminMarcarListo(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/entrega/marcar-listo`);
}

export function adminConfirmarPago(codigo, { metodo, monto, referencia }) {
  // metodo: "EFECTIVO" | "TRANSFERENCIA"
  return apiPatch(`/admin/solicitudes/${codigo}/pago/confirmar`, { metodo, monto, referencia });
}

export function adminMarcarEntregado(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/entrega/marcar-entregado`);
}

export function adminMarcarRecibidoEnTaller(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/taller/marcar-recibido`);
}

export function adminConfirmarPagoDesdeComprobante(codigo) {
  return apiPatch(`/admin/solicitudes/${codigo}/pago/confirmar-desde-comprobante`);
}