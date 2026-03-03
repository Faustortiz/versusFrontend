import { Link } from "react-router-dom";

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
          minWidth: 240,
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
          minWidth: 240,
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

export default function LandingPage() {
  return (
    <TechCard>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 950, color: "#0b2a4a", lineHeight: 1.05 }}>
          Reparación de celulares
          <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: "#2b4b66", marginTop: 10 }}>
            Retiro y entrega en el día · Seguimiento por código
          </span>
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

        <div style={{ marginTop: 14, fontSize: 13, color: "#2b4b66" }}>
          Tip: si ya tenés tu código, entrá a “Ingresar código” para ver el estado.
        </div>
      </div>
    </TechCard>
  );
}