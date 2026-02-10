# Login API Integration Tests

## Overview

Real HTTP tests for user login endpoint. Tests complete authentication flow with actual API responses. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/login.integration.test.ts`

## Endpoints Tested

### POST /api/auth/login
- **Purpose:** Authenticate user with email and password
- **Request Body:** `{ email, password }`
- **Response:** Authentication token, user info
- **Status Codes:** 200 (success), 400+ (failure)

## Test Categories

### Valid Login Flow (5 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid credentials | Standard login success | Status 200, token returned |
| Email case insensitive | Email should work in any case | Handles case variations |
| Token generation | Valid token is generated | Token exists in response |
| User data return | User info included in response | User object defined |
| Multiple login attempts | Can login multiple times | No session conflicts |

### Invalid Email (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing email | Email is required | Status 400+ |
| Empty email | Empty string rejected | Status 400+ |
| Invalid format | Not a valid email | Status 400+ |
| Non-existent email | Account doesn't exist | Status 400+ |

### Invalid Password (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Missing password | Password is required | Status 400+ |
| Empty password | Empty string rejected | Status 400+ |
| Wrong password | Incorrect password | Status 400+ |
| Too short password | Less than 8 characters | Status 400+ |

### Security Checks (5 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| No password in response | Password never returned | Response doesn't contain password |
| No sensitive data leaks | No internal info exposed | No credentials in response |
| Rate limiting | Brute force protection | Multiple attempts handled |
| Invalid token rejection | Bad tokens denied | Invalid token fails |
| CORS headers | Cross-origin safety | Headers present |

### Response Format (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Token format | Valid JWT or session token | Token structure correct |
| User object | User data structure | Required fields present |
| No extra fields | No unexpected data | Response is clean |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration login.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 21 |
| Test Categories | 5 |
| Average Duration | ~500ms |
| Coverage | Complete login flow |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **Database:** Test database with sample users
- **Auth:** Valid test credentials required

## Notes

- Tests use flexible assertions (status defined, not strict codes)
- No real password exposure in responses
- Rate limiting tested but configurable
- All tests isolated (no state between runs)
- Token generation validated but not cryptographically verified

---

**Last Updated:** January 22, 2026
