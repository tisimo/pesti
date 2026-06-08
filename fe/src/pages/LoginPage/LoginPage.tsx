import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useLogin } from "@/features/auth/model/useLogin"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function LoginPage() {
  const { login, isLoading, error } = useLogin()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      const step = await login(email.trim(), password)
      if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
        navigate("/SetPasswordPage")
        return
      }

      if (step === "CONFIRM_SIGN_IN_WITH_SMS_CODE") {
        navigate("/mfa")
        return
      }

      navigate("/dashboard")
    } catch { }
  }
  return (
    <AuthPageLayout
      title="Backoffice access"
      subtitle="Sign in to manage operational workspaces, reviews, finance, and audit activity."
      footer={
        <div className="auth-links">
          <Link to="/forgot-password" data-testid="login-forgot-password-link">Forgot password</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit} data-testid="login-form">
        <div className="auth-field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            data-testid="login-email-input"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="login-password">Password</label>
          <div className="auth-password-field">
            <input
              id="login-password"
              data-testid="login-password-input"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((current) => !current)}
            >
              <i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`} />
            </button>
          </div>
        </div>

        {error ? (
          <p className="auth-feedback auth-feedback--error" data-testid="login-error-message" role="alert">
            {error}
          </p>
        ) : null}

        <button className="auth-btn" disabled={isLoading} type="submit" data-testid="login-submit-button">
          {isLoading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
