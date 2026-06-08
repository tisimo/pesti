import type { ReactNode } from "react"
import logo from "@/assets/Only-High-IQ-Logo.png"
import "./authPages.css"

interface AuthPageLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  visual?: ReactNode
}

export default function AuthPageLayout({
  title,
  subtitle,
  children,
  footer,
  visual,
}: AuthPageLayoutProps) {
  return (
    <main className={`auth-shell${visual ? " auth-shell--with-visual" : ""}`}>
      <span className="auth-shell__blob auth-shell__blob--one" aria-hidden="true" />
      <span className="auth-shell__blob auth-shell__blob--two" aria-hidden="true" />

      <section className="auth-card">
        <div className="auth-card__header">
          <img className="auth-card__logo" src={logo} alt="Only High IQ" />
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {children}

        {footer ? <div className="auth-card__footer">{footer}</div> : null}
      </section>

      {visual ? <aside className="auth-side">{visual}</aside> : null}
    </main>
  )
}
