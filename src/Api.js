// Api.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:9090";

const LS_LAST_CODE_KEY = "versus_last_tracking_code";

const ADMIN_TOKEN_KEY = "versus_admin_token";

function getAdminToken() {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
}

async function apiFetch(path, options = {}) {
    const token = getAdminToken();

    const headers = {
        ...(options.headers || {}),
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
    });

    if (!res.ok) {
        let msg = "Error en la petición";
        try {
            const data = await res.json();
            msg = data?.message || msg;
        } catch {
            try {
                msg = await res.text();
            } catch {
                // ignore
            }
        }

        if (res.status === 401) {
            localStorage.removeItem(ADMIN_TOKEN_KEY);
        }

        throw new Error(msg);
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
        return res.json();
    }

    return res.text();
}

export async function crearSolicitud(payload) {
    const res = await fetch(`${API_BASE}/public/solicitudes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("No se pudo crear la solicitud");

    const data = await res.json();

    // ✅ guardado automático (por si el usuario cierra la pestaña)
    const code = data?.codigoSeguimiento || data?.trackingCode || data?.codigo;
    if (code) {
        localStorage.setItem(LS_LAST_CODE_KEY, code);
    }

    return data;
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
export async function adminGetSolicitud(codigo) {
    return apiFetch(`/admin/solicitudes/${encodeURIComponent(codigo)}`);
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
    const query = estado ? `?estado=${encodeURIComponent(estado)}` : "";
    return apiFetch(`/admin/solicitudes${query}`);
}

// Helper
async function apiPatch(url, body) {
    const opts = { method: "PATCH" };

    if (body !== undefined) {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
    }

    return apiFetch(url, opts);
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

export async function adminMarcarEntregado(codigo) {
    return apiFetch(`/admin/solicitudes/${encodeURIComponent(codigo)}/entrega/marcar-entregado`, {
        method: "PATCH",
    });
}

export function adminMarcarRecibidoEnTaller(codigo) {
    return apiPatch(`/admin/solicitudes/${codigo}/taller/marcar-recibido`);
}

export function adminConfirmarPagoDesdeComprobante(codigo) {
    return apiPatch(`/admin/solicitudes/${codigo}/pago/confirmar-desde-comprobante`);
}

//reporte Semanal
export async function adminReporteSemanalEntregados() {
    return apiFetch("/admin/solicitudes/reportes/entregados-semana");
}
//login
export async function adminLogin(payload) {
    return apiFetch("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });
}