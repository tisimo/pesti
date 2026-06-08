import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

export const useNewPassword = () => {
  const { confirmNewPassword } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      await confirmNewPassword(password)
    } catch (err: any) {
      setError(err?.message ?? "Error")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { submit, isLoading, error }
}