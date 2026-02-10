# Unit Tests

## Purpose

Unit tests cover domain, service, and controller logic in isolation. No HTTP calls and no real database.

## What Is Covered

- Domain validation and value objects
- Service behavior with mocked dependencies
- Controller logic with mocked services

## Structure

```
src/__tests__/unit/
  controllers/
    AccountController.test.ts
    campaignController.test.ts
    RecoveryCodesController.test.ts
    userProfileController.test.ts
  domain/
    Account.test.ts
    Campaign.test.ts
    RecoveryCode.test.ts
    UserEmail.test.ts
    userProfile.test.ts
  services/
    AccountService.test.ts
    CampaignService.test.ts
    RecoveryCodesService.test.ts
    userProfileService.test.ts
  README_UNIT.md
```

## Run Tests

```bash
# All unit tests
npm test -- unit

# One file
npm test -- unit AccountController.test.ts

# Watch mode
npm test -- unit --watch
```

## Add New Unit Tests

1. Pick the layer (domain, services, controllers).
2. Create `*.test.ts` in the matching folder.
3. Keep tests independent and fast.
4. Update this file if you add new folders or rename files.

## Notes

- Unit tests do not require the backend to be running.
- Use mocks for external dependencies.

Last updated: 2026-01-23
