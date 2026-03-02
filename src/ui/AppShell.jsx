import { Link, useLocation } from "react-router-dom";

export default function AppShell({ children }) {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 50% 0%, #e8f3ff 0%, #ffffff 55%, #f7fbff 100%)",
        padding: "28px 16px",
        fontFamily: "system-ui",
      }}
    >
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 16px",
            borderRadius: 18,
            border: "1px solid rgba(20, 80, 160, 0.18)",
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 14px 32px rgba(0,0,0,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "linear-gradient(180deg, #2e8bff 0%, #1b64c6 100%)",
                boxShadow: "0 10px 18px rgba(27,100,198,0.25)",
              }}
            />
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0b2a4a", lineHeight: 1 }}>
                Versus
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#2b4b66" }}>
                Reparaciones
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {isAdmin ? (
              <Link to="/" style={{ textDecoration: "none", fontWeight: 800, color: "#0b2a4a" }}>
                ← Cliente
              </Link>
            ) : (
              <Link to="/admin" style={{ textDecoration: "none", fontWeight: 800, color: "#0b2a4a" }}>
                Admin →
              </Link>
            )}
          </div>
        </header>

        <main style={{ marginTop: 16 }}>{children}</main>
      </div>
    </div>
  );
}