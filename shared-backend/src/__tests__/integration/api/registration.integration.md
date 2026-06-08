# Registration API Integration Tests

## Overview

Real HTTP tests for user registration endpoint. Tests account creation flow with email validation, password strength, and duplicate detection. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/registration.integration.test.ts`

## Endpoints Tested

### POST /api/auth/register
- **Purpose:** Create new user account
- **Request Body:** `{ email, password, passwordConfirm, firstName, lastName }`
- **Response:** User object, confirmation message, or error
- **Status Codes:** 201 (created), 400+ (failure)

## Test Categories

### Valid Registration (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid payload | Register with all required fields | Status 201/200, user created |
| Unique email | New email address | No duplicate errors |
| Strong password | Valid password format | Meets strength requirements |

### Email Validation (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing email | Email is required | Status 400+ |
| Empty email | Empty string rejected | Status 400+ |
| Invalid format | Not a valid email | Status 400+ |
| Duplicate email | Email already registered | Status 400+ |

### Password Validation (5 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing password | Password required | Status 400+ |
| Password too short | Less than 8 characters | Status 400+ |
| No uppercase | Missing uppercase letter | Status 400+ |
| No lowercase | Missing lowercase letter | Status 400+ |
| No numbers | Missing numeric digit | Status 400+ |

### Password Confirmation (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing confirmation | Confirm password required | Status 400+ |
| Non-matching | Passwords don't match | Status 400+ |
| Matching passwords | Both same and valid | Registration succeeds |

### Name Validation (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| First name required | firstName is mandatory | Status 400+ |
| Last name required | lastName is mandatory | Status 400+ |
| Name length valid | 1-100 characters | Accepted |
| Name length invalid | Too long (100+) | Status 400+ |

### Security Checks (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| No password in response | Password never returned | Response doesn't leak password |
| No sensitive data | Internal data hidden | No secrets exposed |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration registration.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 18 |
| Test Categories | 6 |
| Average Duration | ~500ms |
| Coverage | Complete registration flow |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **Database:** Test database for user storage
- **Email:** Optional (registration may not require email verification)

## Notes

- Duplicate email detection tested
- Password strength requirements validated
- Names must be 1-100 characters
- Password confirmation matching enforced
- No plaintext passwords in responses
- All tests isolated (database cleaned between runs)
- Dynamic email generation (no hardcoded addresses)

---

**Last Updated:** January 22, 2026
