import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useLogout = () => {
  const { logout } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = async () => {
    setIsLoading(true)
    setError(null)

    try {
      await logout()
    } catch (err: any) {
      setError("Erro ao terminar sessão.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    logout: handleLogout,
    isLoading,
    error,
  }
}