# Testing Strategy Design — Prelegal NDA Creator

**Date:** 2026-03-18
**Scope:** Backend (FastAPI/Python) + Frontend (Next.js 14/TypeScript) + E2E (Playwright) + CI (GitHub Actions) + Manual test plan
**Chosen option:** Option B — Comprehensive layered testing

---

## 1. Goals

- Catch regressions in rendering logic (placeholder substitution, checkbox toggling, XSS escaping)
- Verify Pydantic model validation rejects invalid payloads with correct HTTP status codes
- Confirm the 5-step wizard navigates correctly and validates inputs before advancing
- Provide a written manual test plan committed to the repo and mirrored in Jira (PL-3)

---

## 2. Backend Tests (pytest)

### Setup

New file: `backend/requirements-dev.txt`

```
pytest
pytest-asyncio
httpx
```

Shared fixture: `backend/tests/conftest.py` — provides an `AsyncClient` pointed at the FastAPI app using `httpx.AsyncClient(app=app, base_url="http://test")`.

### Test files

| File | What it tests |
|---|---|
| `backend/tests/test_models.py` | Pydantic validation: required fields, signature must start with `data:image/`, `mnda_term_years` required when type is `expires`, `confidentiality_term_years` required when type is `years` |
| `backend/tests/test_renderer.py` | Unit tests for `_format_date`, `_build_mnda_term_text`, `_build_confidentiality_term_text`, checkbox toggling (expires vs perpetual, years vs perpetual), `render_standard_terms` span replacement for all 6 field types |
| `backend/tests/test_api.py` | `GET /api/health` → 200; `GET /api/templates/coverpage` → 200 plain text; `GET /api/templates/unknown` → 404; `POST /api/generate` valid payload → 200 HTML containing party names; `POST /api/generate` missing `mnda_term_years` → 422 |

---

## 3. Frontend Tests (Vitest + React Testing Library)

### Setup

New devDependencies in `frontend/package.json`:

```
vitest, @vitest/ui, jsdom, @testing-library/react,
@testing-library/user-event, @testing-library/jest-dom
```

New files:
- `frontend/vitest.config.ts` — jsdom environment, `@/` path alias
- `frontend/src/test/setup.ts` — imports `@testing-library/jest-dom`

### Test files

| File | What it tests |
|---|---|
| `src/lib/__tests__/templateRenderer.test.ts` | Purpose placeholder, effective date formatting, MNDA term checkbox toggling, confidentiality term toggling, governing law + jurisdiction substitution, `<label>` stripping, signature table HTML, XSS escaping (`<script>` → `&lt;script&gt;`), `renderStandardTerms` span replacement for all 6 field types |
| `src/lib/__tests__/apiClient.test.ts` | `toApiPayload` maps camelCase → snake_case; `generateNda` calls correct URL with JSON body; `fetchTemplate` throws on non-200 |
| `src/lib/__tests__/printDocument.test.ts` | `window.open` called; `document.write` receives HTML; `window.print()` called via onload; `alert` shown when popup is blocked |
| `src/components/__tests__/StepIndicator.test.tsx` | Completed steps show checkmark SVG; current step has ring class; connector between completed and current step is blue |
| `src/components/__tests__/fields.test.tsx` | Smoke renders for `TextInput`, `DateInput`, `RadioGroup`, `TextareaInput` — labels render, inputs are accessible |

---

## 4. E2E Tests (Playwright)

### Setup

New devDependency: `@playwright/test`
New file: `frontend/playwright.config.ts` — Chromium only, `baseURL: http://localhost:3000`, `webServer` auto-starts `next dev`

### Test files

| File | What it tests |
|---|---|
| `e2e/happy-path.spec.ts` | Fill all 5 steps, inject fake base64 signature via `page.evaluate`, verify preview shows party names, click Download, assert no error |
| `e2e/validation.spec.ts` | Empty purpose on step 1 → error; expires with no years on step 2 → error; no signature on step 4 → error |
| `e2e/navigation.spec.ts` | Back button returns to previous step; StepIndicator shows correct active step; completed steps show checkmark |
| `e2e/preview.spec.ts` | Step 5 preview HTML contains governing law state and party company names typed by user |

---

## 5. CI (GitHub Actions)

**File:** `.github/workflows/ci.yml`
**Trigger:** push and pull_request on all branches

Three parallel jobs:

| Job | Runtime | Steps |
|---|---|---|
| `backend-tests` | ubuntu-latest, Python 3.12 | Install deps → `pytest backend/tests/ -v` |
| `frontend-tests` | ubuntu-latest, Node 20 | Install deps → `vitest run` |
| `playwright-tests` | ubuntu-latest, Node 20 + Python 3.12 | Install both → start FastAPI on :8001 → `playwright test` (Next.js started via webServer) |

---

## 6. Manual Test Plan

Two outputs:
- `docs/manual-tests.md` — structured Markdown checklist of test cases with steps and expected results
- Jira test cases attached to issue PL-3

### Manual test case areas

1. **Wizard navigation** — step progression, back button, step indicator state
2. **Step 1 validation** — purpose required, effective date required
3. **Step 2 validation** — term years required when "expires" selected
4. **Step 3 validation** — all party fields required, governing law and jurisdiction required
5. **Step 4 — Signature pad** — draw signature, clear signature, error if unsigned
6. **Step 5 — Preview** — document shows filled data, both parties visible
7. **Download** — PDF print dialog opens, document renders correctly in print preview
8. **Edge cases** — special characters in party names, very long purpose text, past effective date

---

## 7. File Map (new files to create)

```
backend/
  requirements-dev.txt
  tests/
    __init__.py
    conftest.py
    test_models.py
    test_renderer.py
    test_api.py

frontend/
  vitest.config.ts
  src/
    test/
      setup.ts
    lib/
      __tests__/
        templateRenderer.test.ts
        apiClient.test.ts
        printDocument.test.ts
    components/
      __tests__/
        StepIndicator.test.tsx
        fields.test.tsx
  e2e/
    happy-path.spec.ts
    validation.spec.ts
    navigation.spec.ts
    preview.spec.ts
  playwright.config.ts

.github/
  workflows/
    ci.yml

docs/
  manual-tests.md
```
