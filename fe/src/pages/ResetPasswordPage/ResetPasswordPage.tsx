import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useResetPassword } from "@/features/auth/model/useResetPassword"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function ResetPasswordPage() {
  const { resetPassword, isLoading, error } = useResetPassword()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const emailFromQuery = searchParams.get("email") ?? ""
  const [email, setEmail] = useState(emailFromQuery)
  const [code, setCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match.")
      return
    }
    setConfirmError(null)
    try {
      await resetPassword(email.trim(), code.trim(), newPassword)
      navigate("/login")
    } catch {
      // Errors are surfaced by hook state.
    }
  }

  return (
    <AuthPageLayout
      title="New password"
      subtitle="Enter the code from your email and create a new password."
      footer={
        <div className="auth-links">
          <Link to="/login">Back to login</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-code">Code</label>
          <input
            id="reset-code"
            placeholder="Code received by email"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="reset-password">New password</label>
          <div style={{ position: "relative" }}>
            <input
              id="reset-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setConfirmError(null) }}
              required
              style={{ paddingRight: "3rem" }}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                fontSize: "18px",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2rem",
                height: "2rem",
              }}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            >
              <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
            </button>
          </div>
          <div style={{ position: "relative" }}>
            <input
              id="reset-password"
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setConfirmError(null) }}
              required
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                fontSize: "18px",
              }}
              aria-label={showNewPassword ? "Hide new password" : "Show new password"}
            >
              <i className={`bi ${showNewPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="reset-confirm-password">Confirm password</label>
          <div style={{ position: "relative" }}>
            <input
              id="reset-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(null) }}
              required
              style={{ paddingRight: "3rem" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#64748b",
                fontSize: "18px",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "2rem",
                height: "2rem",
              }}
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
            >
              <i className={`bi ${showConfirmPassword ? "bi-eye-slash" : "bi-eye"}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {confirmError ? <p className="auth-feedback auth-feedback--error">{confirmError}</p> : null}
        {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}

        <button className="auth-btn" disabled={isLoading} type="submit">
          {isLoading ? "Confirming..." : "Confirm new password"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
