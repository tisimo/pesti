import type { User } from "@/shared/types/api";

export type OAuthProvider = "google" | "facebook";

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  expiresInDays: number;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordPayload {
  email: string;
  code: string;
  password: string;
}

export interface ResetPasswordResponse {
  user: User;
  token: string;
  expiresInDays: number;
}

export interface OAuthResponse {
  redirectUrl: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: User;
  message: string;
}

export interface VerifyEmailPayload {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
}

export interface ResendVerificationPayload {
  email: string;
}

export interface ResendVerificationResponse {
  message: string;
}

export type SignInStep =
  | "DONE"
  | "CONFIRM_SIGN_IN_WITH_SMS_CODE"
  | "CONFIRM_SIGN_IN_WITH_TOTP_CODE"
  | "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
  | "CONTINUE_SIGN_IN_WITH_MFA_SELECTION"
  | "RESET_PASSWORD"