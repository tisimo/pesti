# OAuth API Integration Tests

## Overview

Real HTTP tests for OAuth flow with multiple providers (Google, Facebook, GitHub, Apple). Tests authorization, token exchange, and account linking. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/oauth.integration.test.ts`

## Endpoints Tested

### GET /api/oauth/authorize
- **Purpose:** Initiate OAuth authorization flow
- **Query Params:** `provider, state, redirectUri`
- **Response:** Redirect URL to OAuth provider
- **Status Codes:** 302 (redirect), 400+ (failure)

### POST /api/oauth/callback
- **Purpose:** Handle OAuth provider callback
- **Request Body:** `{ code, state, provider }`
- **Response:** User token and profile
- **Status Codes:** 200 (success), 400+ (failure)

### POST /api/oauth/link
- **Purpose:** Link OAuth account to existing user
- **Request Body:** `{ provider, code }`
- **Response:** Updated user account
- **Status Codes:** 200 (linked), 400+ (failure)

### POST /api/oauth/unlink
- **Purpose:** Remove OAuth provider link
- **Request Body:** `{ provider }`
- **Response:** Success message
- **Status Codes:** 200 (unlinked), 400+ (failure)

## Test Categories

### Authorization Flow (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Google authorize | Google OAuth init | Redirect URL contains Google domain |
| Facebook authorize | Facebook OAuth init | Redirect URL contains Facebook domain |
| GitHub authorize | GitHub OAuth init | Redirect URL contains GitHub domain |
| Apple authorize | Apple OAuth init | Redirect URL contains Apple domain |

### CSRF Protection (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| State parameter | CSRF token in auth flow | State value required |
| State validation | Callback validates state | Mismatched state fails |

### Token Exchange (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid code | Exchange code for token | Status 200, token returned |
| Invalid code | Reject bad authorization code | Status 400+ |
| Missing code | Code is required | Status 400+ |

### Account Linking (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Link new provider | Add OAuth provider to account | Status 200, linked |
| Link duplicate | Cannot link same provider twice | Status 400+ |
| Unlink provider | Remove OAuth provider | Status 200, unlinked |
| Unlink non-existent | Cannot unlink missing provider | Status 400+ |

### Provider Matrix (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| All providers supported | Google, Facebook, GitHub, Apple | All 4 work |
| Invalid provider | Reject unknown provider | Status 400+ |
| Provider case handling | Case-insensitive provider names | Normalized correctly |
| Provider metadata | Provider info in response | Profile data included |

### Redirect URI (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid redirect | Whitelisted redirect URI | Accepted |
| Invalid redirect | Non-whitelisted URI | Status 400+ |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration oauth.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 17 |
| Providers Tested | 4 (Google, Facebook, GitHub, Apple) |
| Test Categories | 6 |
| Average Duration | ~700ms |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **OAuth Providers:** Google, Facebook, GitHub, Apple credentials
- **Database:** User and OAuth linking tables
- **Secrets:** Provider client IDs and secrets

## Notes

- All 4 providers tested (Google, Facebook, GitHub, Apple)
- CSRF protection via state parameter
- Redirect URI whitelisting enforced
- Account linking prevents duplicate provider links
- Callback validates state and code
- Provider info stored and returned
- Security focus on token exchange and CSRF

---

**Last Updated:** January 22, 2026
