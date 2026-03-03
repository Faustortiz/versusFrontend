import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientePage from "./pages/ClientePage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import AppShell from "./ui/AppShell";

function Layout() {
  return (
    <AppShell>
      <div style={{ width: "100%" }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/crear" element={<ClientePage mode="crear" />} />
          <Route path="/seguimiento" element={<ClientePage mode="seguimiento" />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AppShell>
  );
}

export default function App() {
  console.log("APP RENDER")
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}