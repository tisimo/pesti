import { Navigate, Outlet } from "react-router-dom"
import { useAuthUser } from "@/features/auth/model/useAuthUser"

export default function PublicRoute() {
  const { isAuthenticated, loading } = useAuthUser()

  if (loading) return null

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}