# Recovery Codes API Integration Tests

## Overview

Covers the current recovery code routes in this backend.

## Test File
`src/__tests__/integration/api/recoveryCode.integration.test.ts`

## Endpoints Tested

- `POST /api/recovery-codes` (auth required)
- `DELETE /api/recovery-codes/:cognitoSub/:recoveryCode` (auth required)

## Notes

- Additional recovery code endpoints are not implemented in this backend.

Last updated: 2026-01-26
