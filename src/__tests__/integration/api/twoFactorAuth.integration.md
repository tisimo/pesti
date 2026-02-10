# Two-Factor Authentication API Integration Tests

## Overview

Real HTTP tests for 2FA setup, verification, and backup codes. Tests TOTP/SMS methods, OTP verification, and security features. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/twoFactorAuth.integration.test.ts`

## Endpoints Tested

### POST /api/2fa/setup
- **Purpose:** Initialize 2FA (TOTP or SMS)
- **Request Body:** `{ method: "totp" | "sms", phoneNumber? }`
- **Response:** QR code (TOTP) or confirmation (SMS)
- **Status Codes:** 200 (ready), 400+ (failure)

### POST /api/2fa/verify
- **Purpose:** Verify OTP code (6-digit)
- **Request Body:** `{ code }`
- **Response:** Success message or error
- **Status Codes:** 200 (verified), 400+ (failure)

### POST /api/2fa/backup-codes
- **Purpose:** Generate backup codes for account recovery
- **Request Body:** None or confirmation
- **Response:** Array of backup codes
- **Status Codes:** 200 (generated), 400+ (failure)

### POST /api/2fa/verify-backup
- **Purpose:** Use backup code instead of OTP
- **Request Body:** `{ code }`
- **Response:** Success message
- **Status Codes:** 200 (verified), 400+ (failure)

### GET /api/2fa/status
- **Purpose:** Check 2FA status and methods
- **Request Body:** None
- **Response:** 2FA status object
- **Status Codes:** 200 (success), 400+ (failure)

### POST /api/2fa/disable
- **Purpose:** Disable 2FA entirely
- **Request Body:** `{ password }` (for confirmation)
- **Response:** Success message
- **Status Codes:** 200 (disabled), 400+ (failure)

## Test Categories

### Setup Methods (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| TOTP setup | Google Authenticator setup | QR code or secret returned |
| SMS setup | SMS delivery setup | Phone number validated |

### OTP Verification (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid OTP | 6-digit code accepted | Status 200 |
| Invalid format | Non-numeric code | Status 400+ |
| Code reuse | Cannot reuse same code | Second use fails |

### Backup Codes (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Generate codes | Create backup codes | At least 10 codes |
| Use backup code | Verify with backup code | Status 200 |
| Backup reuse | Code single-use | Cannot reuse |
| Format validation | Code format correct | Codes are alphanumeric |

### Status & Management (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Check status | 2FA enabled/disabled status | Current state returned |
| Disable 2FA | Turn off 2FA | Status 200, disabled |
| Re-enable 2FA | Set up 2FA again | Can be re-enabled |

### Authentication (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Require auth | Auth required for all ops | 401 without token |
| Token validation | Valid token needed | Invalid token fails |

### Security Features (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Code expiration | Time-based code validity | Expired codes rejected |
| Timing window | Allow time sync drift | ±30 second window |
| No plaintext codes | Codes not exposed | Hashed in storage |
| Rate limiting | Brute force protection | Multiple failures blocked |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration twoFactorAuth.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 18 |
| Test Categories | 6 |
| Average Duration | ~600ms |
| Coverage | All 2FA operations |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **Database:** User and 2FA tables
- **Auth:** TOTP library (HOTP-compatible)
- **SMS:** Optional SMS provider integration

## Notes

- TOTP codes are 6-digit and time-based
- SMS method requires valid phone number
- Backup codes are single-use
- Code reuse prevention enforced
- No plaintext codes in responses
- Password required to disable 2FA
- Full setup/verify/disable lifecycle tested

---

**Last Updated:** January 22, 2026
