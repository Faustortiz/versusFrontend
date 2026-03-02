// src/pages/LandingPage.jsx
import { Link } from "react-router-dom";
import heroImg from "../assets/hero-versus.png";

export default function LandingPage() {
  return (
    <div
      style={{
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid #e6eef8",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        background: "#fff",
      }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={heroImg}
          alt="Versus Reparaciones"
          style={{ width: "100%", height: "auto", display: "block" }}
        />

        {/* Botones sobre la imagen */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: "44%",
            display: "flex",
            justifyContent: "center",
            gap: 14,
            padding: "0 14px",
            flexWrap: "wrap",
          }}
        >
          <Link to="/crear" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "14px 18px",
                borderRadius: 14,
                border: "1px solid #1f8f3a",
                background: "linear-gradient(180deg, #38c463 0%, #1f8f3a 100%)",
                color: "white",
                fontWeight: 900,
                fontSize: 18,
                cursor: "pointer",
                minWidth: 220,
                boxShadow: "0 10px 18px rgba(31,143,58,0.25)",
              }}
            >
              ✅ Crear solicitud
            </button>
          </Link>

          <Link to="/seguimiento" style={{ textDecoration: "none" }}>
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
                minWidth: 220,
                boxShadow: "0 10px 18px rgba(27,100,198,0.25)",
              }}
            >
              🔑 Ingresar código
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}