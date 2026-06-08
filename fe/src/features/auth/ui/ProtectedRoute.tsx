import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthUser } from "@/features/auth/model/useAuthUser"

export default function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuthUser()
  const location = useLocation()

  // Enquanto verifica sessão Cognito
  if (loading) {
    return <div>A verificar sessão...</div>
  }

  // Se não autenticado → redireciona para login
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  // Se autenticado → renderiza rota filha
  return <Outlet />
}