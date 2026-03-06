import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogin } from "../Api";

const ADMIN_TOKEN_KEY = "versus_admin_token";

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
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      {children}
    </div>
  );
}

export default function AdminLoginPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await adminLogin({ username, password });
      const token = res?.token;

      if (!token) {
        throw new Error("No se recibió token");
      }

      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      navigate("/admin", { replace: true });
    } catch (e2) {
      setError(e2?.message || "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <TechCard>
        <div style={{ fontSize: 26, fontWeight: 950, color: "#0b2a4a", marginBottom: 8 }}>
          Login Admin
        </div>

        <div style={{ color: "#2b4b66", fontWeight: 700, marginBottom: 16 }}>
          Ingresá con tus credenciales para acceder al panel.
        </div>

        {error ? (
          <div style={{ color: "#b91c1c", fontWeight: 900, marginBottom: 12 }}>{error}</div>
        ) : null}

        <form onSubmit={onLogin} style={{ display: "grid", gap: 10 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            autoComplete="username"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(27,100,198,0.25)",
              outline: "none",
              background: "rgba(255,255,255,0.85)",
            }}
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            autoComplete="current-password"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 12,
              border: "1px solid rgba(27,100,198,0.25)",
              outline: "none",
              background: "rgba(255,255,255,0.85)",
            }}
          />

          <button
            type="submit"
            disabled={loading || !username.trim() || !password.trim()}
            style={{
              marginTop: 6,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #1b64c6",
              background: "linear-gradient(180deg, #2e8bff 0%, #1b64c6 100%)",
              color: "white",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </TechCard>
    </div>
  );
}