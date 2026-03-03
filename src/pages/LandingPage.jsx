// src/pages/LandingPage.jsx
import { Link } from "react-router-dom";

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

function PrimaryButton({ children, to }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <button
        style={{
          padding: "14px 18px",
          borderRadius: 14,
          border: "1px solid #1b64c6",
          background: "linear-gradient(180deg, #2e8bff 0%, #1b64c6 100%)",
          color: "white",
          fontWeight: 900,
          fontSize: 18,
          cursor: "pointer",
          minWidth: 260,
          boxShadow: "0 10px 18px rgba(27,100,198,0.25)",
        }}
      >
        {children}
      </button>
    </Link>
  );
}

function SecondaryButton({ children, to }) {
  return (
    <Link to={to} style={{ textDecoration: "none" }}>
      <button
        style={{
          padding: "14px 18px",
          borderRadius: 14,
          border: "1px solid rgba(27,100,198,0.35)",
          background: "rgba(255,255,255,0.75)",
          color: "#0b2a4a",
          fontWeight: 900,
          fontSize: 18,
          cursor: "pointer",
          minWidth: 260,
          boxShadow: "0 10px 18px rgba(0,0,0,0.06)",
        }}
      >
        {children}
      </button>
    </Link>
  );
}

function Chip({ icon, text }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 999,
        border: "1px solid rgba(27,100,198,0.20)",
        background: "rgba(255,255,255,0.7)",
        boxShadow: "0 10px 18px rgba(0,0,0,0.05)",
        fontWeight: 800,
        color: "#0b2a4a",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 950, color: "#0b2a4a" }}>{title}</div>
      {subtitle ? (
        <div style={{ marginTop: 4, color: "#2b4b66", fontWeight: 700, fontSize: 13 }}>
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

export default function LandingPage() {
    console.log("LANDING RENDER")
  return (
    <div>
      {/* HERO: centrado en pantalla */}
      <div
        style={{
          minHeight: "calc(100vh - 140px)", // ajusta si querés: 120/160
          display: "grid",
          placeItems: "center",
        }}
      >
        <TechCard style={{ width: "100%", maxWidth: 820 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 950, color: "#0b2a4a", lineHeight: 1.05 }}>
              Reparación de celulares
            </div>

            <div style={{ marginTop: 10, fontSize: 16, fontWeight: 800, color: "#2b4b66" }}>
              Retiro y entrega en el día · Seguimiento por código
            </div>

            <div
              style={{
                marginTop: 18,
                display: "flex",
                justifyContent: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Chip icon="📱" text="Pantalla rota" />
              <Chip icon="🔋" text="No carga" />
              <Chip icon="⏻" text="No enciende" />
            </div>

            <div
              style={{
                marginTop: 22,
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <PrimaryButton to="/crear">✅ Crear solicitud</PrimaryButton>
              <SecondaryButton to="/seguimiento">🔑 Ingresar código</SecondaryButton>
            </div>

            <div style={{ marginTop: 14, fontSize: 13, color: "#2b4b66", fontWeight: 700 }}>
              Tip: si ya tenés tu código, entrá a “Ingresar código” para ver el estado.
            </div>
          </div>
        </TechCard>
      </div>

      {/* SECCIÓN ABAJO: completa la página */}
      <div style={{ display: "grid", gap: 14, marginTop: 12 }}>
        <TechCard>
          <SectionTitle
            title="¿Cómo funciona?"
            subtitle="Simple y rápido: solicitás, retiramos, reparás y seguís el estado con tu código."
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <TechCard
              style={{
                padding: 14,
                background: "rgba(255,255,255,0.65)",
                boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 22 }}>📝</div>
              <div style={{ fontWeight: 950, color: "#0b2a4a", marginTop: 6 }}>1) Creás la solicitud</div>
              <div style={{ color: "#2b4b66", marginTop: 6, lineHeight: 1.5 }}>
                Completás el formulario y recibís tu código de seguimiento.
              </div>
            </TechCard>

            <TechCard
              style={{
                padding: 14,
                background: "rgba(255,255,255,0.65)",
                boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 22 }}>🚚</div>
              <div style={{ fontWeight: 950, color: "#0b2a4a", marginTop: 6 }}>2) Retiro / Taller</div>
              <div style={{ color: "#2b4b66", marginTop: 6, lineHeight: 1.5 }}>
                Retiramos y lo llevamos al taller para diagnóstico y reparación.
              </div>
            </TechCard>

            <TechCard
              style={{
                padding: 14,
                background: "rgba(255,255,255,0.65)",
                boxShadow: "0 10px 22px rgba(0,0,0,0.06)",
              }}
            >
              <div style={{ fontSize: 22 }}>🔎</div>
              <div style={{ fontWeight: 950, color: "#0b2a4a", marginTop: 6 }}>3) Seguimiento</div>
              <div style={{ color: "#2b4b66", marginTop: 6, lineHeight: 1.5 }}>
                Entrás con tu código y ves el estado actualizado en todo momento.
              </div>
            </TechCard>
          </div>

          {/* responsive simple para pantallas chicas */}
          <div style={{ marginTop: 10, color: "#2b4b66", fontSize: 12, fontWeight: 700 }}>
            Si estás en celular, los pasos se acomodan uno abajo del otro automáticamente.
          </div>
        </TechCard>

        <TechCard>
          <SectionTitle title="Beneficios" subtitle="Lo importante, sin vueltas." />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip icon="⚡" text="Rápido" />
            <Chip icon="🛡️" text="Garantía" />
            <Chip icon="📍" text="Retiro y entrega" />
            <Chip icon="💬" text="Comunicación clara" />
            <Chip icon="🔐" text="Seguimiento por código" />
          </div>
        </TechCard>

        <TechCard>
          <SectionTitle title="Preguntas frecuentes" />
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 950, color: "#0b2a4a" }}>¿Dónde veo el estado?</div>
              <div style={{ color: "#2b4b66", lineHeight: 1.6 }}>
                En “Ingresar código”. Tu código queda guardado en este dispositivo.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 950, color: "#0b2a4a" }}>¿Qué pasa si pierdo el código?</div>
              <div style={{ color: "#2b4b66", lineHeight: 1.6 }}>
                Si lo generaste desde este dispositivo, lo recuperás automáticamente. Si no, pedilo por WhatsApp.
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 950, color: "#0b2a4a" }}>¿Puedo adjuntar fotos o video?</div>
              <div style={{ color: "#2b4b66", lineHeight: 1.6 }}>
                Sí, al crear la solicitud podés subir hasta 3 archivos para ver el estado del equipo.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <PrimaryButton to="/crear">✅ Crear solicitud</PrimaryButton>
            <SecondaryButton to="/seguimiento">🔑 Ingresar código</SecondaryButton>
          </div>
        </TechCard>
      </div>

      {/* Footer simple */}
      <div style={{ marginTop: 18, textAlign: "center", color: "#2b4b66", fontSize: 12, fontWeight: 700 }}>
        Versus Reparaciones · Seguimiento simple · Atención rápida
      </div>

      {/* Responsive extra: si querés FULL responsive real, lo pasamos a CSS luego */}
      <style>{`
        @media (max-width: 720px) {
          .grid3 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}