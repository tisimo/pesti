import {
  fetchMFAPreference,
  setUpTOTP,
  verifyTOTPSetup,
  updateMFAPreference,
} from "aws-amplify/auth"

export async function getMfaState() {
  const mfa = await fetchMFAPreference()

  return {
    enabled: [
      ...(mfa.enabled?.includes("TOTP") ? ["TOTP"] : []),
      ...(mfa.enabled?.includes("SMS") ? ["SMS"] : []),
    ],
    preferred: mfa.preferred,
  }
}

export async function beginTotpSetup() {
  const result = await setUpTOTP()

  return {
    sharedSecret: result.sharedSecret,
    setupUri: result.getSetupUri("OnlyHighIQ"),
  }
}

export async function confirmTotpSetup(code: string) {
  await verifyTOTPSetup({
    code,
  })

  await updateMFAPreference({
    totp: "PREFERRED",
  })
}

export async function disableMfa(code: string) {
  await verifyTOTPSetup({ code })

  await updateMFAPreference({
    totp: "DISABLED",
  })
}