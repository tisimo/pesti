import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useForgotPassword = () => {
  const { forgotPassword } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleForgotPassword = async (email: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await forgotPassword(email)
      return "success"
    } catch (err: any) {
      setError(err.message ?? "Failed to send code.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    forgotPassword: handleForgotPassword,
    isLoading,
    error,
  }
}