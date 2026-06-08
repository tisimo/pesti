# Posts API Integration Tests

## Overview

Posts endpoints are not part of this backend. These tests only run if a Posts API is available at `TEST_POSTS_API_URL` (or `TEST_API_URL`). If `/api/posts` returns 404, the suite is skipped.

## Test File
`src/__tests__/integration/api/posts.integration.test.ts`

## Base URL

- `TEST_POSTS_API_URL` (preferred)
- `TEST_API_URL`
- Default: `http://localhost:4000`

## Endpoints (external service)

- `POST /api/posts`
- `GET /api/posts`
- `GET /api/posts/:id`
- `PUT /api/posts/:id`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/like`
- `POST /api/posts/:id/comment`

## Notes

- If the Posts API is hosted elsewhere, set `TEST_POSTS_API_URL`.
- The suite logs a skip message when `/api/posts` is not found.

Last updated: 2026-01-26
