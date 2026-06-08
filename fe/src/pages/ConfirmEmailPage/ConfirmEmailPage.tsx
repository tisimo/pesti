import { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useConfirmSignUp } from "@/features/auth/model/useConfirmSignUp"
import AuthPageLayout from "@/features/auth/ui/AuthPageLayout"

export default function ConfirmEmailPage() {
  const { confirmSignUp, resendSignUpCode, isConfirming, isResending, error } =
    useConfirmSignUp()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [email, setEmail] = useState(searchParams.get("email") ?? "")
  const [code, setCode] = useState("")
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setSuccessMessage(null)
    setLocalError(null)

    if (!email.trim()) {
      setLocalError("Enter an email to confirm.")
      return
    }

    try {
      await confirmSignUp(email.trim(), code.trim())
      navigate("/login")
    } catch {
      // Errors are surfaced by hook state.
    }
  }

  async function handleResendCode() {
    setSuccessMessage(null)
    setLocalError(null)

    if (!email.trim()) {
      setLocalError("Enter an email to resend the code.")
      return
    }

    try {
      await resendSignUpCode(email.trim())
      setSuccessMessage("Code resent. Check your email.")
    } catch {
      // Errors are surfaced by hook state.
    }
  }

  return (
    <AuthPageLayout
      title="Confirm email"
      subtitle="Enter the code sent by email to activate your account."
      footer={
        <div className="auth-links">
          <Link to="/register">Back to sign up</Link>
          <Link to="/login">I have already confirmed</Link>
        </div>
      }
    >
      <form className="auth-form" onSubmit={handleConfirm}>
        <div className="auth-field">
          <label htmlFor="confirm-email">Email</label>
          <input
            id="confirm-email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="confirm-code">Confirmation code</label>
          <input
            id="confirm-code"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>

        <p className="auth-code-note">
          If you did not receive the email, use the resend code button.
        </p>

        {localError ? <p className="auth-feedback auth-feedback--error">{localError}</p> : null}
        {error ? <p className="auth-feedback auth-feedback--error">{error}</p> : null}
        {successMessage ? <p className="auth-feedback auth-feedback--success">{successMessage}</p> : null}

        <button className="auth-btn" disabled={isConfirming} type="submit">
          {isConfirming ? "Confirming..." : "Confirm email"}
        </button>

        <button
          className="auth-btn auth-btn--ghost"
          disabled={isResending}
          onClick={handleResendCode}
          type="button"
        >
          {isResending ? "Resending..." : "Resend code"}
        </button>
      </form>
    </AuthPageLayout>
  )
}
