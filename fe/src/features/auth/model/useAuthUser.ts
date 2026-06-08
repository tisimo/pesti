import { useAuth } from "@/app/providers/AuthProvider"

export const useAuthUser = () => {
  const { user, isAuthenticated, loading, mfaStep } = useAuth()

  return {
    user,
    isAuthenticated,
    loading,
    mfaStep,
  }
}