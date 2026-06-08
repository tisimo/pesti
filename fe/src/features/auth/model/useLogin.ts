import { useState } from "react"
import { useAuth } from "@/app/providers/AuthProvider"

interface UseAuthReturn {
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<string>
}

export const useLogin = (): UseAuthReturn => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const step = await login(email, password)
      return step
    } catch (err: any) {
      if (err?.name === "UserNotConfirmedException") {
        setError("Email not verified. Confirm the code before signing in.")
      } else {
        setError("Invalid credentials.")
      }
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, login: handleLogin }
}
