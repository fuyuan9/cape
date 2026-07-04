# Testing Guide

Cape Framework provides an automated testing environment using Vitest to ensure type safety and verify API endpoint correctness.

## Running Tests

### Install Dependencies

```bash
npm install
```

### Run All Tests

```bash
npm run test
```

---

## Test Structure

### 1. Core Unit Tests (`packages/core/tests/`)

Verifies the immutability of `ColumnBuilder` and `FieldBuilder`, metadata parsing from `defineResource`, and the behavior of dynamically generated Zod validation schemas.

- `resource.test.ts`: Detailed tests for value parsing and required field control via Zod validation schemas.

### 2. Hono Integration Tests (`packages/hono/tests/`)

Uses Hono's `app.request()` (in-memory HTTP test utility) to verify request/response behavior when accessing each endpoint.

- Verifies that the metadata endpoint (`GET /metadata`) returns the correct JSON.
- Verifies that queries (search, filtering, etc.) are correctly passed to the `DbAdapter`.
- Verifies that submitting invalid data during record creation results in a `400 Bad Request` response with error details, enforced by the auto-generated Zod schema.
