import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useRegister } from "@/features/auth/model/useRegister"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function RegisterPage() {
  const { handleRegister, isLoading, error } = useRegister()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLocalError(null)

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.")
      return
    }

    try {
      await handleRegister(email.trim(), password)
      navigate(`/confirm-email?email=${encodeURIComponent(email.trim())}`)
    } catch {
      // Errors are surfaced by hook state.
    }
  }

  return (
    <AuthPageLayout
      title="Create account"
      subtitle="Sign up with your email to get started. You will confirm it with a code sent by email."
      footer={
        <div className="auth-links">
          <Link to="/login">I already have an account</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="register-email">Email</label>
          <input
            id="register-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-password">Password</label>
          <input
            id="register-password"
            type="password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="register-password-confirm">Confirm password</label>
          <input
            id="register-password-confirm"
            type="password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        {localError ? <p className="auth-feedback auth-feedback--error">{localError}</p> : null}
        {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

        <button className="auth-btn" disabled={isLoading} type="submit">
          {isLoading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
