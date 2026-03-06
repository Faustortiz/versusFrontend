import { Navigate } from "react-router-dom";

const ADMIN_TOKEN_KEY = "versus_admin_token";

export default function ProtectedRouter({ children }) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}