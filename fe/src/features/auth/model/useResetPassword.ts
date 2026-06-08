import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useResetPassword = () => {
  const { resetPasswordConfirm } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async (
    email: string,
    code: string,
    newPassword: string
  ) => {
    setIsLoading(true)
    setError(null)

    try {
      await resetPasswordConfirm(email, code, newPassword)
      return "success"
    } catch (err: any) {
      setError(err.message ?? "Failed to reset password.")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return {
    resetPassword: handleResetPassword,
    isLoading,
    error,
  }
}