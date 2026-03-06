// src/ui/AppShell.jsx
import "./AppShell.css";

export default function AppShell({ children }) {
    return (
        <div
            style={{
                minHeight: "100vh",
                background:
                    "radial-gradient(1200px 600px at 20% -10%, rgba(46,139,255,0.25), transparent 60%), radial-gradient(900px 400px at 80% 10%, rgba(0,200,150,0.15), transparent 60%), linear-gradient(180deg, #0b1220 0%, #0f1b2e 100%)",
                padding: 20,
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* HEADER GLOBAL */}
            <header
                style={{
                    textAlign: "center",
                    marginBottom: 24,
                }}
            >
                <div className="versus-logo"
                    style={{
                        fontSize: 42,
                        fontWeight: 900,
                        color: "#00E5FF",
                        letterSpacing: 6,
                        textShadow: "0 0 20px rgba(0,229,255,0.7)",
                    }}
                >
                    VERSUS
                </div>
            </header>

            {/* CONTENIDO DE CADA RUTA */}
            <main
                style={{
                    flex: 1,
                    maxWidth: 1000,
                    margin: "0 auto",
                    width: "100%",
                }}
            >
                {children}
            </main>

            {/* FOOTER GLOBAL */}
            <footer
                style={{
                    textAlign: "center",
                    marginTop: 30,
                    fontSize: 12,
                    color: "rgba(255,255,255,0.6)",
                }}
            >
                © {new Date().getFullYear()} Versus Reparaciones · Servicio técnico especializado
            </footer>
        </div>
    );
}