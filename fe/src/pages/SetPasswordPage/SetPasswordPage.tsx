import { useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "@/app/providers/AuthProvider"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function SetPasswordPage() {
  const { confirmNewPassword, signInAndSetPassword } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Email link flow: /SetPasswordPage?email=xxx
  const emailFromLink = searchParams.get("email") ?? ""
  const isEmailLinkFlow = emailFromLink.length > 0

  const [email, setEmail] = useState(emailFromLink)
  const [tempPassword, setTempPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (isEmailLinkFlow) {
        await signInAndSetPassword(email.trim(), tempPassword, newPassword)
      } else {
        await confirmNewPassword(newPassword)
      }
      navigate("/dashboard")
    } catch (err: any) {
      setError(err?.message ?? "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthPageLayout
      title="Set your password"
      subtitle={
        isEmailLinkFlow
          ? "Enter the temporary password from your welcome email and choose a new password."
          : "You must change your temporary password before continuing."
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {isEmailLinkFlow && (
          <>
            <div className="auth-field">
              <label htmlFor="set-email">Email</label>
              <input
                id="set-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!emailFromLink}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="set-temp-password">Temporary password</label>
              <input
                id="set-temp-password"
                type="password"
                placeholder="From your welcome email"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                required
              />
            </div>
          </>
        )}

        <div className="auth-field">
          <label htmlFor="set-new-password">New password</label>
          <input
            id="set-new-password"
            type="password"
            placeholder="Choose a strong password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="set-confirm-password">Confirm password</label>
          <input
            id="set-confirm-password"
            type="password"
            placeholder="Repeat your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p className="auth-feedback auth-feedback--error">{error}</p>
        )}

        <button className="auth-btn" disabled={isLoading} type="submit">
          {isLoading ? "Saving..." : "Set password"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
