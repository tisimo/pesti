# Account API Integration Tests

## Overview

Covers the current account routes in this backend.

## Test File
`src/__tests__/integration/api/account.integration.test.ts`

## Endpoints Tested

- `POST /api/accounts`
- `GET /api/accounts/by-cognito-sub/:cognitoSub` (auth required)
- `GET /api/accounts/by-account-id/:accountId` (auth required)
- `DELETE /api/accounts/by-cognito-sub/:cognitoSub` (auth required)

## Notes

- Create uses `{ cognitoSub, email }` only.
- Authenticated endpoints return 401/500 when auth/config is missing.

Last updated: 2026-01-26
