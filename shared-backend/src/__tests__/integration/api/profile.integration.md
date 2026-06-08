# Profile API Integration Tests

## Overview

Covers profile completion and public profile routes.

## Test File
`src/__tests__/integration/api/profile.integration.test.ts`

## Endpoints Tested

- `GET /api/profile/completion-data`
- `POST /api/profile/completion` (auth required)
- `GET /api/profile/me` (auth required)
- `GET /api/profile/verify` (auth required)
- `POST /api/profile/verify` (auth required)
- `GET /api/profile/username/check`
- `GET /api/profile/username/:username`
- `GET /api/profile/username/:username/stats`
- `GET /api/profile/username/:username/supporters`

## Notes

- Authenticated routes return 401/500 when auth/config is missing.
- Username endpoints validate format via celebrate.

Last updated: 2026-01-26
