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
httpx>=0.23
```

New file: `backend/pytest.ini`:

```ini
[pytest]
asyncio_mode = auto
```

**Invocation:** Always run pytest from the **repo root** with `PYTHONPATH=backend`:

```bash
PYTHONPATH=backend pytest backend/tests/ -v
```

This ensures `Path(__file__).parent.parent.parent / "templates"` in `renderer.py` resolves to `<repo_root>/templates/` correctly. The CI job must set `PYTHONPATH=backend` before running pytest.

Shared fixture: `backend/tests/conftest.py` — uses `ASGITransport` (the current httpx API; `app=` kwarg was removed in httpx 0.23):

```python
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c
```

### Test files

| File | What it tests |
|---|---|
| `backend/tests/test_models.py` | Pydantic validation: required fields, signature must start with `data:image/`, `mnda_term_years` required when type is `expires`, `confidentiality_term_years` required when type is `years`, valid full payload passes |
| `backend/tests/test_renderer.py` | `_format_date` (valid date → "Month DD, YYYY", invalid passthrough), `_build_mnda_term_text` (expires N years / perpetual), `_build_confidentiality_term_text` (years / perpetual), checkbox toggling in `render_cover_page` (expires vs perpetual, years vs perpetual), `render_standard_terms` span replacement for all 6 field types (Purpose, Effective Date, MNDA Term, Term of Confidentiality, Governing Law, Jurisdiction), **XSS passthrough test**: purpose `<script>alert(1)</script>` passes through unescaped (backend does not HTML-escape — documents current behaviour) |
| `backend/tests/test_api.py` | `GET /api/health` → 200 `{"status":"ok"}`; `GET /api/templates/coverpage` → 200 plain text; `GET /api/templates/unknown` → 404; `POST /api/generate` valid payload → 200 HTML containing party print names; `POST /api/generate` missing `mnda_term_years` when `expires` → 422 |

> **Note on XSS:** `renderer.py` does not HTML-escape user inputs before Markdown conversion. The frontend handles escaping for the live preview. The backend output goes directly to the browser's print renderer. The XSS test in `test_renderer.py` documents this intentional boundary so future changes are caught.

---

## 3. Frontend Tests (Vitest + React Testing Library)

### Setup

Install dev dependencies:

```bash
cd frontend
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

Add test scripts to `frontend/package.json`:

```json
"test": "vitest run",
"test:ui": "vitest --ui"
```

New file: `frontend/vitest.config.ts`

```ts
import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
  resolve: {
    // REQUIRED: Vitest does not read tsconfig.json paths automatically.
    // Without this, every import of @/types/nda, @/lib/*, etc. fails.
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // NEXT_PUBLIC_* vars are injected by Next.js build, not Vitest.
    // Define explicitly so apiClient.ts uses a deterministic test base URL.
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://test-api"),
  },
});
```

New file: `frontend/src/test/setup.ts`

```ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// react-signature-canvas uses HTMLCanvasElement APIs not implemented in jsdom.
// Without this mock, any component that imports SignaturePad will throw
// "Not implemented: HTMLCanvasElement.prototype.getContext".
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => "data:image/png;base64,abc123"
);
```

### Test files

| File | What it tests |
|---|---|
| `src/lib/__tests__/templateRenderer.test.ts` | Purpose placeholder, effective date formatting, MNDA term checkbox toggling (expires/perpetual), confidentiality term toggling (years/perpetual), governing law + jurisdiction substitution, `<label>` tag stripping, signature table HTML structure, XSS escaping for purpose, party name, and `modifications` fields (`<script>` → `&lt;script&gt;`), `renderStandardTerms` span replacement for all 6 field types. All return values verified to be `typeof result === "string"` (guards against `marked` v17 async regression). **Note:** the `modifications` XSS test requires a one-line fix to `templateRenderer.ts` — replace `data.modifications.trim()` with `escapeHtml(data.modifications.trim())` on line 167. This fix must be applied as part of the implementation step before the test can pass. |
| `src/lib/__tests__/apiClient.test.ts` | Uses `vi.stubGlobal('fetch', vi.fn())`. Tests: `generateNda` calls `http://test-api/api/generate` with correct JSON body (snake_case keys, camelCase→snake_case mapping); `generateNda` throws on non-200; `fetchTemplate('coverpage')` calls correct URL; `fetchTemplate` throws on non-200 |
| `src/lib/__tests__/printDocument.test.ts` | Uses `vi.useFakeTimers()`. Three test paths: (1) **Primary**: mock `window.open` returns object, manually invoke `onload`, assert `print()` called; (2) **Fallback**: mock returns object, `onload` NOT invoked, advance timers `500ms` via `vi.advanceTimersByTime(500)`, assert `print()` called; (3) **Blocked popup**: mock returns `null`, assert `alert()` called |
| `src/hooks/__tests__/useTemplateRenderer.test.ts` | Import from `@/hooks/useTemplateRenderer` (file lives in `src/hooks/`, not `src/lib/`). Uses `renderHook` + mocked `fetchTemplate`. Tests: (a) `isLoading` true initially → false after resolve; (b) `error` set when `fetchTemplate` rejects; (c) unmounting before resolve does not trigger state update (cancel flag) |
| `src/components/__tests__/StepIndicator.test.tsx` | Completed steps show checkmark SVG; current step has ring class; left connector of current step has `bg-blue-600`; future steps have `bg-gray-200` connector |
| `src/components/__tests__/fields.test.tsx` | Smoke renders for `TextInput`, `DateInput`, `RadioGroup`, `TextareaInput` — labels render, inputs present and accessible. `SignaturePad.tsx` **excluded** (tested via E2E only) |

---

## 4. E2E Tests (Playwright)

### Setup

Install:

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

New file: `frontend/playwright.config.ts` (lives inside `frontend/`, not repo root):

```ts
import path from "path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: [
    {
      // Next.js dev server — cwd defaults to frontend/ (where this config lives)
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      // FastAPI backend — must be started from repo root
      command: "uvicorn main:app --port 8001",
      url: "http://localhost:8001/api/health",
      reuseExistingServer: !process.env.CI,
      env: { PYTHONPATH: path.resolve(__dirname, "../backend") },
      cwd: path.resolve(__dirname, ".."),
    },
  ],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
```

> Both `webServer` entries are needed: the frontend fetches templates from the backend at runtime, and E2E tests of the preview/download steps require the backend to be running.

The CI `playwright-tests` job uses `working-directory: frontend` so `npx playwright test` resolves relative to `frontend/`.

### Signature injection in E2E

`react-signature-canvas` stores signature data via `sigRef.current.toDataURL()` triggered on the canvas `onEnd` event, which calls `setValue("party1.signature", dataUrl)` in React Hook Form. There is no DOM input to set via `fill()`.

**Chosen approach:** Mouse draw simulation on the canvas element:

```ts
const canvas = page.locator("canvas").first();
await canvas.hover();
await page.mouse.down();
await page.mouse.move(10, 10);
await page.mouse.move(50, 30);
await page.mouse.up();
```

Applied to both party1 and party2 canvases (step 4 has two canvases).

### Test files

| File | What it tests |
|---|---|
| `e2e/happy-path.spec.ts` | Fill steps 1–3, draw both signatures on step 4 via mouse simulation, step 5 verifies preview shows party names, click Download, assert no error toast |
| `e2e/validation.spec.ts` | Empty purpose on step 1 → error visible; `mndaTermType = expires` with no years → error; no signature on step 4 → error; cannot advance while errors shown |
| `e2e/navigation.spec.ts` | Back button returns to previous step; `StepIndicator` shows correct active step number; completed steps show checkmark icon |
| `e2e/preview.spec.ts` | Step 5 `div.nda-content` contains the governing law state and both party company names typed by user |

---

## 5. CI (GitHub Actions)

**File:** `.github/workflows/ci.yml`
**Trigger:** `push` and `pull_request` on all branches

Three parallel jobs:

| Job | Runtime | Key steps |
|---|---|---|
| `backend-tests` | ubuntu-latest, Python 3.12 | `pip install -r backend/requirements.txt -r backend/requirements-dev.txt` → `PYTHONPATH=backend pytest backend/tests/ -v` |
| `frontend-tests` | ubuntu-latest, Node 20 | `cd frontend && npm ci` → `npm test` |
| `playwright-tests` | ubuntu-latest, Node 20 + Python 3.12 | Install backend + frontend deps → `cd frontend && npx playwright install --with-deps chromium` → `npx playwright test` (both servers started via `webServer` in `playwright.config.ts`) |

> The `playwright-tests` job does **not** need to manually start uvicorn — `playwright.config.ts` declares both `webServer` entries, so Playwright starts and waits for both servers before running tests.

---

## 6. Manual Test Plan

Two outputs:
- `docs/manual-tests.md` — structured Markdown checklist with test ID, preconditions, steps, and expected results
- Jira test cases attached to issue PL-3

### Manual test case areas

| Area | Cases |
|---|---|
| Wizard navigation | Progress through all 5 steps; Back button; step indicator reflects state |
| Step 1 validation | Purpose required; effective date required |
| Step 2 validation | Term years required when "expires" selected; confidentiality years required when "years" |
| Step 3 validation | All party fields required; governing law and jurisdiction required |
| Step 4 — Signature pad | Draw signature; Clear resets; error if unsigned on Next |
| Step 5 — Preview | Preview shows all filled data; both parties visible; modifications section |
| Download | PDF print dialog opens; document renders correctly; signature images present |
| Edge cases | `<`, `>`, `&` in party names render escaped; very long purpose text; past effective date accepted |

---

## 7. File Map (all new files)

```
backend/
  requirements-dev.txt
  pytest.ini
  tests/
    __init__.py
    conftest.py
    test_models.py
    test_renderer.py
    test_api.py

frontend/
  vitest.config.ts
  playwright.config.ts
  src/
    test/
      setup.ts
    lib/
      __tests__/
        templateRenderer.test.ts
        apiClient.test.ts
        printDocument.test.ts
    hooks/
      __tests__/
        useTemplateRenderer.test.ts
    components/
      __tests__/
        StepIndicator.test.tsx
        fields.test.tsx
  e2e/
    happy-path.spec.ts
    validation.spec.ts
    navigation.spec.ts
    preview.spec.ts

.github/
  workflows/
    ci.yml

docs/
  manual-tests.md
```
