import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useConfirmSignUp = () => {
  const { confirmSignUp, resendSignUpCode } = useAuth()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleConfirmSignUp = async (email: string, code: string) => {
    setIsConfirming(true)
    setError(null)

    try {
      await confirmSignUp(email, code)
      return "success"
    } catch (err: any) {
      setError(err?.message ?? "Failed to confirm code.")
      throw err
    } finally {
      setIsConfirming(false)
    }
  }

  const handleResendSignUpCode = async (email: string) => {
    setIsResending(true)
    setError(null)

    try {
      await resendSignUpCode(email)
      return "success"
    } catch (err: any) {
      setError(err?.message ?? "Failed to resend code.")
      throw err
    } finally {
      setIsResending(false)
    }
  }

  return {
    confirmSignUp: handleConfirmSignUp,
    resendSignUpCode: handleResendSignUpCode,
    isConfirming,
    isResending,
    error,
  }
}
