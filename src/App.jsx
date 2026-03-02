import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientePage from "./pages/ClientePage";
import AdminPage from "./pages/AdminPage";
import LandingPage from "./pages/LandingPage";
import AppShell from "./ui/AppShell";

function Layout() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/crear" element={<ClientePage mode="crear" />} />
        <Route path="/seguimiento" element={<ClientePage mode="seguimiento" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}