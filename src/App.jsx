import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ClientePage from "./pages/ClientePage";
import AdminPage from "./pages/AdminPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import LandingPage from "./pages/LandingPage";
import AppShell from "./ui/AppShell";
import ProtectedRoute from "./components/ProtectedRouter";

function Layout() {
  return (
    <AppShell>
      <div style={{ width: "100%" }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/crear" element={<ClientePage mode="crear" />} />
          <Route path="/seguimiento" element={<ClientePage mode="seguimiento" />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
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