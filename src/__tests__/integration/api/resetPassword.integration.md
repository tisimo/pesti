# Reset Password API Integration Tests

## Overview

Real HTTP tests for password reset functionality. Tests both request and reset flows with token validation and security checks. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/resetPassword.integration.test.ts`

## Endpoints Tested

### POST /api/auth/forgot-password
- **Purpose:** Request password reset (send email with token)
- **Request Body:** `{ email }`
- **Response:** Confirmation message or error
- **Status Codes:** 200 (sent), 400+ (failure)

### POST /api/auth/reset-password
- **Purpose:** Complete password reset with token
- **Request Body:** `{ token, password, passwordConfirm }`
- **Response:** Success message or error
- **Status Codes:** 200 (reset), 400+ (failure)

## Test Categories

### Forgot Password Request (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid email | Request reset for existing account | Status 200, email sent |
| Missing email | Email is required | Status 400+ |
| Empty email | Empty string rejected | Status 400+ |
| Invalid format | Not a valid email | Status 400+ |

### Token Validation (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing token | Token is required | Status 400+ |
| Empty token | Empty string rejected | Status 400+ |
| Invalid token | Malformed token | Status 400+ |
| Expired token | Token past expiration | Status 400+ |

### New Password Validation (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing password | Password required | Status 400+ |
| Password too short | Less than 8 characters | Status 400+ |
| Password requirements | Must meet strength rules | Validated |

### Password Confirmation (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing confirmation | Confirm password required | Status 400+ |
| Non-matching | Passwords don't match | Status 400+ |

### Complete Reset Flow (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Request then reset | Full two-step flow | Both endpoints succeed |
| Invalid reset after use | Token single-use | Second use fails |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration resetPassword.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 11 |
| Test Categories | 5 |
| Average Duration | ~400ms |
| Coverage | Complete reset flow |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **Database:** User storage with reset token table
- **Email:** Reset email delivery system

## Notes

- Token is single-use (cannot reset twice)
- Token must be valid and non-expired
- Password strength requirements enforced
- Confirmation password must match
- No plaintext passwords/tokens in responses
- Complete flow tested (request + reset)
- Security focus on token validation

---

**Last Updated:** January 22, 2026
