# Testing Documentation - Master Reference

## Quick Start

### Unit Tests
```bash
npm test -- unit
```

### Integration Tests
```bash
# Terminal 1
npm run start

# Terminal 2
npm test -- integration
```

### All Tests
```bash
npm test
```

```bash
npm run test:coverage -- --runInBand
```
---

## Documentation

- Unit guide: `src/__tests__/unit/README_UNIT.md`
- Integration guide: `src/__tests__/integration/README_INTEGRATION.md`
- Integration per-endpoint docs: `src/__tests__/integration/api/*.integration.md`

---

## Where Tests Live

### Unit
- `src/__tests__/unit/controllers/*.test.ts`
- `src/__tests__/unit/domain/*.test.ts`
- `src/__tests__/unit/services/*.test.ts`

### Integration
- `src/__tests__/integration/api/*.integration.test.ts`

---

## Notes

- Posts tests use `TEST_POSTS_API_URL` when the Posts API is external.
- If `/api/posts` is not available, posts tests skip automatically.

---

## Folder Structure

```
src/__tests__/
  unit/
    controllers/
    domain/
    services/
    README_UNIT.md
  integration/
    api/
    README_INTEGRATION.md
```

---

## Add New Tests

- Unit: create `*.test.ts` under the correct unit folder.
- Integration: create `*.integration.test.ts` under `integration/api` and document it in a matching `.integration.md` file.

Last updated: 2026-01-26
