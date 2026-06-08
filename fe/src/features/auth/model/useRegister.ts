import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useRegister = () => {
  const { register } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRegister = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)
    try {
      await register(email, password)
      return "success"
    } catch (err: any) {
      setError(err.message ?? "Registration failed.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { handleRegister, isLoading, error }
}