# Campaign API Integration Tests

## Overview

Real HTTP tests for campaign CRUD operations. Tests complete campaign lifecycle with actual API responses. Requires backend running at `http://localhost:4000`.

## Test File
`src/__tests__/integration/api/campaign.integration.test.ts`

## Endpoints Tested

### POST /api/campaigns
- **Purpose:** Create new campaign
- **Request Body:** Campaign details (title, description, goal, etc.)
- **Response:** Created campaign object
- **Status Codes:** 201 (created), 400+ (failure)

### GET /api/campaigns
- **Purpose:** List all campaigns (paginated)
- **Query Params:** page, limit, sort, filter
- **Response:** Array of campaigns with pagination info
- **Status Codes:** 200 (success), 400+ (failure)

### GET /api/campaigns/:id
- **Purpose:** Get single campaign by ID
- **URL Params:** Campaign ID
- **Response:** Campaign object with details
- **Status Codes:** 200 (found), 404 (not found), 400+ (failure)

### PUT /api/campaigns/:id
- **Purpose:** Update campaign details
- **Request Body:** Updated fields
- **Response:** Updated campaign object
- **Status Codes:** 200 (updated), 400+ (failure)

### DELETE /api/campaigns/:id
- **Purpose:** Delete campaign
- **URL Params:** Campaign ID
- **Response:** Success/confirmation message
- **Status Codes:** 200/204 (deleted), 400+ (failure)

## Test Categories

### Campaign Creation (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid campaign | Create with all required fields | Status 201/200, ID returned |
| Missing title | Title is required | Status 400+ |
| Missing description | Description is required | Status 400+ |
| Missing goal | Goal amount is required | Status 400+ |

### Campaign Retrieval (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| List campaigns | Get all campaigns | Status 200, array returned |
| Get single campaign | Retrieve by ID | Status 200, campaign object |
| Pagination | Limit and offset work | Results match query params |
| Non-existent ID | 404 for missing campaign | Status 404 |

### Campaign Updates (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Valid update | Update campaign fields | Status 200, changes reflected |
| Partial update | Update only some fields | Only specified fields changed |
| Invalid update | Bad data rejected | Status 400+ |

### Campaign Deletion (2 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Delete campaign | Remove campaign | Status 200/204 |
| Delete non-existent | Handle missing ID | Status 404 |

### Authorization (3 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Require auth | Authentication required | Status 401 without token |
| Owner can modify | Campaign owner can edit | Successful update |
| Other user cannot modify | Only owner can edit | Status 403 (forbidden) |

### Data Validation (4 tests)
| Test | Purpose | Validation |
|------|---------|-----------|
| Title length | Min/max length validation | Too short/long rejected |
| Description length | Min/max length validation | Too short/long rejected |
| Goal amount | Positive number required | Negative/zero rejected |
| Status values | Only valid statuses | Invalid status rejected |

## Running Tests

**Requires backend running:**
```bash
# Terminal 1: Start backend
npm run start

# Terminal 2: Run integration tests
npm test -- integration

# Or run just this test
npm test -- integration campaign.integration.test.ts
```

## Test Statistics

| Metric | Value |
|--------|-------|
| Total Tests | 20 |
| Test Categories | 6 |
| CRUD Operations | All 5 (Create, Read, Update, Delete, List) |
| Average Duration | ~1000ms |

## Dependencies

- **Backend:** Must be running at http://localhost:4000
- **Framework:** Supertest (HTTP assertions)
- **Database:** Test database with sample data
- **Auth:** Valid test user with permissions

## Notes

- Tests cover complete CRUD lifecycle
- Authorization tested (owner vs. other users)
- Pagination and filtering validated
- No hardcoded IDs (dynamic lookup)
- Clean assertions (flexible status codes)
- All tests isolated and independent

---

**Last Updated:** January 22, 2026
