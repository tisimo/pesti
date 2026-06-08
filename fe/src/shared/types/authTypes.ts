import type { SignInOutput } from "aws-amplify/auth";

export type SignInStep =
  | "DONE"
  | "CONFIRM_SIGN_IN_WITH_SMS_CODE"
  | "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
  | "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
  | "CONTINUE_SIGN_IN_WITH_MFA_SELECTION"
  | "RESET_PASSWORD"
  | SignInOutput["nextStep"]["signInStep"]

export interface AuthUser {
  userId: string              // Cognito sub
  boUserId?: string           // BO_Users userId (from backoffice DB)
  username: string
  email?: string
  role?: string               // Role name (e.g. "Super Admin")
  roleIds?: string[]
  roles?: Array<{ roleId: string; name: string; application: string; isDefault?: boolean }>
  roleApplication?: string    // "backoffice" | "just_causes"
  roleIsDefault?: boolean     // true = Default role = no app access
  permissions?: string[]      // Permission names the user holds
  permissionsByApplication?: Record<string, string[]>
  appsAccessible?: string[]
}

export interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  loading: boolean
  mfaStep: SignInStep | null
  login: (email: string, password: string) => Promise<SignInStep>
  logout: () => Promise<void>
  getAccessToken: () => Promise<string | undefined>
  confirmMfa: (code: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  resendSignUpCode: (email: string) => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPasswordConfirm: (
    email: string,
    code: string,
    newPassword: string
  ) => Promise<void>
  confirmNewPassword: (password: string) => Promise<void>
  signInAndSetPassword: (email: string, tempPassword: string, newPassword: string) => Promise<void>
  refreshUser: () => Promise<void>
}
