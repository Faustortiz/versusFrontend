import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import AdminPage from "./pages/AdminPage";
import ClientePage from "./pages/ClientePage";
import LandingPage from "./pages/LandingPage";

function Layout() {
  const loc = useLocation();
  const isAdmin = loc.pathname.startsWith("/admin");

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Versus – Web v1</h1>

        {isAdmin ? <Link to="/" style={{ textDecoration: "none" }}>Volver a Cliente</Link> : null}
      </header>

      <div style={{ marginTop: 16 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/crear" element={<ClientePage mode="crear" />} />
          <Route path="/seguimiento" element={<ClientePage mode="seguimiento" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}