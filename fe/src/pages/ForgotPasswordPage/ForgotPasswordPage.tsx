import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useForgotPassword } from "@/features/auth/model/useForgotPassword"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error } = useForgotPassword()
  const navigate = useNavigate()
  const [email, setEmail] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await forgotPassword(email.trim())
      navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch {
      // Errors are surfaced by hook state.
    }
  }

  return (
    <AuthPageLayout
      title="Forgot password"
      subtitle="We will send a code to your email so you can reset access."
      footer={
        <div className="auth-links">
          <Link to="/login" data-testid="forgot-password-back-to-login-link">
            Back to login
          </Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} data-testid="forgot-password-form">
        <div className="auth-field">
          <label htmlFor="forgot-email" data-testid="forgot-password-email-label">
            Email
          </label>
          <input
            id="forgot-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-testid="forgot-password-email-input"
          />
        </div>

        {error ? (
          <p className="auth-feedback auth-feedback--error" data-testid="forgot-password-error-message">
            {error}
          </p>
        ) : null}

        <button className="auth-btn" disabled={isLoading} type="submit" data-testid="forgot-password-submit-button">
          {isLoading ? "Sending code..." : "Send code"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
