// Clears localStorage but preserves user-scoped "bo_<userId>_*" keys.
// Since keys are user-scoped, different users never see each other's data,
// and the same user gets their navigation state back after re-login.
function clearLocalStorageExceptBo() {
  const preserved: [string, string][] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("bo_")) preserved.push([key, localStorage.getItem(key)!]);
  }
  localStorage.clear();
  for (const [key, value] of preserved) localStorage.setItem(key, value);
}

import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignIn,
  signUp,
  confirmSignUp as amplifyConfirmSignUp,
  resendSignUpCode as amplifyResendSignUpCode,
  resetPassword,
  confirmResetPassword,
} from "aws-amplify/auth";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type {
  AuthContextType,
  AuthUser,
  SignInStep,
} from "@/shared/types/authTypes";
import axios from "axios";
import { apiBackoffice } from "@/shared/lib/axios";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface Props {
  children: ReactNode;
}

export function AuthProvider({ children }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [mfaStep, setMfaStep] = useState<SignInStep | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();

      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;

      // Fetch backoffice user profile to get role, permissions, and app access
      let boUserId: string | undefined;
      let role: string | undefined;
      let roleIds: string[] | undefined;
      let roles: Array<{ roleId: string; name: string; application: string; isDefault?: boolean }> | undefined;
      let roleApplication: string | undefined;
      let roleIsDefault: boolean | undefined;
      let permissions: string[] | undefined;
      let permissionsByApplication: Record<string, string[]> | undefined;
      let appsAccessible: string[] | undefined;
      try {
        const resp = await apiBackoffice.get<{
          userId: string;
          roleIds?: string[];
          roles?: Array<{ roleId: string; name: string; application: string; isDefault?: boolean }>;
          roleName: string;
          roleApplication: string;
          roleIsDefault: boolean;
          permissions: string[];
          permissionsByApplication?: Record<string, string[]>;
          appsAccessible?: string[];
        }>("/users/me");
        boUserId = resp.data.userId;
        role = resp.data.roleName;
        roleIds = resp.data.roleIds;
        roles = resp.data.roles;
        roleApplication = resp.data.roleApplication;
        roleIsDefault = resp.data.roleIsDefault;
        permissions = resp.data.permissions;
        permissionsByApplication = resp.data.permissionsByApplication;
        appsAccessible = resp.data.appsAccessible;
      } catch {
        // User not registered in backoffice — role stays undefined
      }

      const authUser: AuthUser = {
        userId: currentUser.userId,
        boUserId,
        username: currentUser.username,
        email: idToken?.payload.email as string | undefined,
        role,
        roleIds,
        roles,
        roleApplication,
        roleIsDefault,
        permissions,
        permissionsByApplication,
        appsAccessible,
      };

      setUser(authUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function resolveIpAddress(): Promise<string> {
    let ipAddress = "unknown";

    try {
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ip-timeout")), 1500);
      });
      const ipReq = fetch("https://api.ipify.org?format=json").then(r => r.json() as Promise<{ ip?: string }>);
      const ipResp = await Promise.race([ipReq, timeout]);
      const candidate = (ipResp.ip ?? "").trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(candidate)) {
        ipAddress = candidate;
      }
    } catch {
      ipAddress = "unknown";
    }

    return ipAddress;
  }

  async function attachIpToLoginSuccess() {
    const ipAddress = await resolveIpAddress();
    if (ipAddress === "unknown") return;

    try {
      await apiBackoffice.post("/auth/login-success-ip", { ipAddress });
    } catch {
      // Best effort: this enrichment must not block auth UX.
    }
  }

  async function login(email: string, password: string): Promise<SignInStep> {
    clearLocalStorageExceptBo();

    try {
      const result = await signIn({
        username: email,
        password,
      });

      const step = result.nextStep.signInStep;

      if (step !== "DONE") {
        setMfaStep(step);
        return step;
      }

      setMfaStep(null);
      await checkUser();
      await attachIpToLoginSuccess();
      return "DONE";
    } catch (err: unknown) {
      const reason =
        err && typeof err === "object"
          ? ((err as { name?: string; message?: string }).name ??
            (err as { name?: string; message?: string }).message ??
            "Unknown error")
          : "Unknown error";

      const ipAddress = await resolveIpAddress();

      try {
        await apiBackoffice.post("/auth/login-failed", {
          email,
          reason,
          ipAddress,
        });
      } catch {
        try {
          const baseURL = import.meta.env.VITE_API_URL_BACKOFFICE || "http://localhost:4002/api";
          await axios.post(`${baseURL}/auth/login-failed`, {
            email,
            reason,
            ipAddress,
          });
        } catch {
          // Best effort: logging failures must not block auth UX.
        }
      }

      throw err;
    }
  }
  async function logout() {
    clearLocalStorageExceptBo();
    await signOut();
    setUser(null);
  }

  async function confirmMfa(code: string) {
    const result = await confirmSignIn({
      challengeResponse: code,
    });

    if (result.nextStep.signInStep === "DONE") {
      setMfaStep(null);
      await checkUser();
      await attachIpToLoginSuccess();
      return;
    }

    // Se ainda houver outro passo (raríssimo), mantém MFA ativo
    setMfaStep(result.nextStep.signInStep);
  }

  async function getAccessToken() {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString();
  }

  async function register(email: string, password: string) {
    await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
        },
      },
    });
  }

  async function confirmSignUp(email: string, code: string) {
    await amplifyConfirmSignUp({
      username: email,
      confirmationCode: code,
    });
  }

  async function resendSignUpCode(email: string) {
    await amplifyResendSignUpCode({ username: email });
  }

  async function forgotPassword(email: string) {
    await resetPassword({ username: email });
  }

  async function resetPasswordConfirm(
    email: string,
    code: string,
    newPassword: string,
  ) {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  }

  async function signInAndSetPassword(
    email: string,
    tempPassword: string,
    newPassword: string,
  ) {
    clearLocalStorageExceptBo();

    const result = await signIn({ username: email, password: tempPassword });
    if (
      result.nextStep.signInStep !==
      "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
    ) {
      throw new Error("Unexpected sign-in state. Please contact support.");
    }
    await confirmSignIn({ challengeResponse: newPassword });
    setMfaStep(null);
    await checkUser();
    await attachIpToLoginSuccess();
  }

  async function confirmNewPassword(newPassword: string) {
    const result = await confirmSignIn({
      challengeResponse: newPassword,
    });

    if (result.nextStep.signInStep === "DONE") {
      setMfaStep(null);
      await checkUser();
      await attachIpToLoginSuccess();
      return;
    }

    setMfaStep(result.nextStep.signInStep);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        mfaStep,
        login,
        logout,
        getAccessToken,
        confirmMfa,
        register,
        confirmSignUp,
        resendSignUpCode,
        forgotPassword,
        resetPasswordConfirm,
        confirmNewPassword,
        signInAndSetPassword,
        refreshUser: checkUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
