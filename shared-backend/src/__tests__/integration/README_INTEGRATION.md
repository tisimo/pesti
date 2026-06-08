# Integration Tests

## Purpose

Integration tests exercise full API flows with real HTTP requests and a test database.

## Prerequisites

1. Start the backend (port 4000 by default):

```bash
cd backend
npm run start
```

2. Optional: override API URL:

```bash
$env:TEST_API_URL = 'http://localhost:4000'
```

3. Optional: Posts API URL (external service):

```bash
$env:TEST_POSTS_API_URL = 'http://posts-service:4000'
```

## Run Tests

```bash
# All integration tests
npm test -- integration

# One file
npm test -- integration login.integration.test.ts

# Watch mode
npm test -- integration --watch
```

## Structure

```
src/__tests__/integration/
  api/
    account.integration.test.ts
    campaign.integration.test.ts
    login.integration.test.ts
    oauth.integration.test.ts
    posts.integration.test.ts
    profile.integration.test.ts
    recoveryCode.integration.test.ts
    registration.integration.test.ts
    resetPassword.integration.test.ts
    status.integration.test.ts
    twoFactorAuth.integration.test.ts
    *.integration.md
  README_INTEGRATION.md
```

## Notes

- Backend must be running before tests start.
- Posts tests skip automatically if `/api/posts` is not available.
- Per-endpoint documentation lives in `src/__tests__/integration/api`.

Last updated: 2026-01-26
