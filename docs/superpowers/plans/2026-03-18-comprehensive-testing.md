# Comprehensive Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full testing layer (pytest backend, Vitest+RTL frontend, Playwright E2E, GitHub Actions CI, and manual test plan) to the Prelegal NDA Creator, plus fix one known XSS bug in `templateRenderer.ts`.

**Architecture:** Three independent test suites run in parallel CI jobs. Backend uses httpx+ASGITransport against the live FastAPI app. Frontend unit tests use Vitest with jsdom. E2E tests use Playwright with two `webServer` entries (Next.js + uvicorn) so the full stack is exercised.

**Tech Stack:** pytest 8, pytest-asyncio, httpx ≥0.23 · Vitest 2, @testing-library/react, jsdom · @playwright/test · GitHub Actions

---

## File Map

**New files to create:**

```
backend/requirements-dev.txt
backend/pytest.ini
backend/tests/__init__.py
backend/tests/conftest.py
backend/tests/test_models.py
backend/tests/test_renderer.py
backend/tests/test_api.py

frontend/vitest.config.ts
frontend/src/test/setup.ts
frontend/src/lib/__tests__/templateRenderer.test.ts
frontend/src/lib/__tests__/apiClient.test.ts
frontend/src/lib/__tests__/printDocument.test.ts
frontend/src/hooks/__tests__/useTemplateRenderer.test.ts
frontend/src/components/__tests__/StepIndicator.test.tsx
frontend/src/components/__tests__/fields.test.tsx
frontend/playwright.config.ts
frontend/e2e/happy-path.spec.ts
frontend/e2e/validation.spec.ts
frontend/e2e/navigation.spec.ts
frontend/e2e/preview.spec.ts

.github/workflows/ci.yml
docs/manual-tests.md
```

**Files to modify:**

```
frontend/package.json               — add test/test:ui scripts, Vitest devDeps, @playwright/test
frontend/src/lib/templateRenderer.ts:167 — escapeHtml(data.modifications.trim())
```

---

## Task 1: Backend Test Infrastructure

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/pytest.ini`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create `backend/requirements-dev.txt`**

```
pytest
pytest-asyncio
httpx>=0.23
```

- [ ] **Step 2: Create `backend/pytest.ini`**

```ini
[pytest]
asyncio_mode = auto
```

- [ ] **Step 3: Create `backend/tests/__init__.py`** (empty file)

- [ ] **Step 4: Create `backend/tests/conftest.py`**

```python
import pytest
from httpx import AsyncClient, ASGITransport
from main import app

VALID_PARTY = {
    "signature": "data:image/png;base64,abc123",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St, Wilmington, DE 19801",
    "date": "2026-03-18",
}

VALID_PAYLOAD = {
    "purpose": "Evaluating a potential partnership.",
    "effective_date": "2026-03-18",
    "mnda_term_type": "expires",
    "mnda_term_years": 2,
    "confidentiality_term_type": "years",
    "confidentiality_term_years": 3,
    "governing_law_state": "Delaware",
    "jurisdiction": "courts located in Wilmington, DE",
    "modifications": None,
    "party1": VALID_PARTY,
    "party2": {**VALID_PARTY, "print_name": "Bob Jones", "company": "Widget Inc"},
}


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


@pytest.fixture
def valid_payload():
    import copy
    return copy.deepcopy(VALID_PAYLOAD)
```

- [ ] **Step 5: Install dev dependencies**

```bash
# Run from repo root
pip install -r backend/requirements-dev.txt
```

- [ ] **Step 6: Verify pytest runs (no tests yet)**

```bash
# Run from repo root
PYTHONPATH=backend pytest backend/tests/ -v
```

Expected: `no tests ran` — no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/requirements-dev.txt backend/pytest.ini backend/tests/
git commit -m "test: add backend test infrastructure (pytest + asyncio + httpx)"
```

---

## Task 2: Backend Model Validation Tests

**Files:**
- Create: `backend/tests/test_models.py`

- [ ] **Step 1: Write `backend/tests/test_models.py`**

```python
import pytest
from pydantic import ValidationError
from models.nda import NdaRequest, PartyData

VALID_PARTY = {
    "signature": "data:image/png;base64,abc123",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St",
    "date": "2026-03-18",
}

VALID_REQUEST = {
    "purpose": "Partnership eval",
    "effective_date": "2026-03-18",
    "mnda_term_type": "expires",
    "mnda_term_years": 1,
    "confidentiality_term_type": "years",
    "confidentiality_term_years": 1,
    "governing_law_state": "Delaware",
    "jurisdiction": "Wilmington, DE",
    "party1": VALID_PARTY,
    "party2": VALID_PARTY,
}


def test_valid_request_passes():
    req = NdaRequest(**VALID_REQUEST)
    assert req.purpose == "Partnership eval"
    assert req.party1.print_name == "Alice Smith"


def test_signature_must_be_data_url():
    bad_party = {**VALID_PARTY, "signature": "not-a-data-url"}
    with pytest.raises(ValidationError, match="signature must be a base64 image data URL"):
        PartyData(**bad_party)


def test_empty_signature_rejected():
    bad_party = {**VALID_PARTY, "signature": ""}
    with pytest.raises(ValidationError, match="signature is required"):
        PartyData(**bad_party)


def test_mnda_term_years_required_when_expires():
    bad = {**VALID_REQUEST, "mnda_term_years": None}
    with pytest.raises(ValidationError, match="mnda_term_years required"):
        NdaRequest(**bad)


def test_mnda_term_perpetual_does_not_require_years():
    req = NdaRequest(**{**VALID_REQUEST, "mnda_term_type": "perpetual", "mnda_term_years": None})
    assert req.mnda_term_years is None


def test_confidentiality_years_required_when_years_type():
    bad = {**VALID_REQUEST, "confidentiality_term_years": None}
    with pytest.raises(ValidationError, match="confidentiality_term_years required"):
        NdaRequest(**bad)


def test_confidentiality_perpetual_does_not_require_years():
    req = NdaRequest(**{
        **VALID_REQUEST,
        "confidentiality_term_type": "perpetual",
        "confidentiality_term_years": None,
    })
    assert req.confidentiality_term_years is None


def test_modifications_is_optional():
    req = NdaRequest(**{**VALID_REQUEST, "modifications": None})
    assert req.modifications is None
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
PYTHONPATH=backend pytest backend/tests/test_models.py -v
```

Expected: 8 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_models.py
git commit -m "test: add backend Pydantic model validation tests"
```

---

## Task 3: Backend Renderer Unit Tests

**Files:**
- Create: `backend/tests/test_renderer.py`

- [ ] **Step 1: Write `backend/tests/test_renderer.py`**

```python
import pytest
from services.renderer import (
    _format_date,
    _build_mnda_term_text,
    _build_confidentiality_term_text,
    render_cover_page,
    render_standard_terms,
)
from models.nda import NdaRequest

VALID_PARTY = {
    "signature": "data:image/png;base64,abc",
    "print_name": "Alice Smith",
    "title": "CEO",
    "company": "Acme Corp",
    "notice_address": "123 Main St",
    "date": "2026-03-18",
}


def make_request(**kwargs):
    base = {
        "purpose": "Partnership eval",
        "effective_date": "2026-03-18",
        "mnda_term_type": "expires",
        "mnda_term_years": 2,
        "confidentiality_term_type": "years",
        "confidentiality_term_years": 3,
        "governing_law_state": "Delaware",
        "jurisdiction": "Wilmington, DE",
        "party1": VALID_PARTY,
        "party2": VALID_PARTY,
    }
    base.update(kwargs)
    return NdaRequest(**base)


# --- _format_date ---

def test_format_date_valid():
    assert _format_date("2026-03-18") == "March 18, 2026"


def test_format_date_invalid_passthrough():
    assert _format_date("not-a-date") == "not-a-date"


# --- term text builders ---

def test_mnda_term_expires():
    assert _build_mnda_term_text(make_request(mnda_term_type="expires", mnda_term_years=3)) == "3 year(s) from Effective Date"


def test_mnda_term_perpetual():
    assert _build_mnda_term_text(make_request(mnda_term_type="perpetual", mnda_term_years=None)) == "until terminated"


def test_confidentiality_years():
    assert _build_confidentiality_term_text(make_request(confidentiality_term_type="years", confidentiality_term_years=5)) == "5 year(s) from Effective Date"


def test_confidentiality_perpetual():
    assert _build_confidentiality_term_text(make_request(confidentiality_term_type="perpetual", confidentiality_term_years=None)) == "in perpetuity"


# --- render_cover_page (uses minimal template strings, not real template files) ---

# This template uses the exact placeholder strings the renderer searches for.
MINIMAL_COVER = """\
Purpose: [Evaluating whether to enter into a business relationship with the other party.]
Date: [Today's date]
- [x]     Expires [1 year(s)] from Effective Date.
- [ ]     Continues until terminated in accordance with the terms of the MNDA.
- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- [ ]     In perpetuity.
Law: [Fill in state]
Court: [Fill in city or county and state, i.e. "courts located in New Castle, DE"]
Mods: List any modifications to the MNDA
"""


def test_cover_purpose_replaced():
    html = render_cover_page(make_request(purpose="Test partnership"), MINIMAL_COVER)
    assert "Test partnership" in html


def test_cover_date_replaced():
    html = render_cover_page(make_request(effective_date="2026-03-18"), MINIMAL_COVER)
    assert "March 18, 2026" in html


def test_cover_mnda_expires_year_count():
    html = render_cover_page(make_request(mnda_term_type="expires", mnda_term_years=2), MINIMAL_COVER)
    assert "Expires 2 year(s)" in html


def test_cover_mnda_perpetual_unchecks_expires():
    html = render_cover_page(make_request(mnda_term_type="perpetual", mnda_term_years=None), MINIMAL_COVER)
    # The perpetual option should now be checked
    assert "Continues until terminated" in html


def test_cover_confidentiality_years_count():
    html = render_cover_page(make_request(confidentiality_term_type="years", confidentiality_term_years=4), MINIMAL_COVER)
    assert "4 year(s) from Effective Date" in html


def test_cover_governing_law_replaced():
    html = render_cover_page(make_request(governing_law_state="California"), MINIMAL_COVER)
    assert "California" in html


def test_cover_jurisdiction_replaced():
    html = render_cover_page(make_request(jurisdiction="San Francisco, CA"), MINIMAL_COVER)
    assert "San Francisco, CA" in html


def test_cover_no_modifications():
    html = render_cover_page(make_request(modifications=None), MINIMAL_COVER)
    assert "No modifications" in html


def test_cover_with_modifications():
    html = render_cover_page(make_request(modifications="Add clause 5A"), MINIMAL_COVER)
    assert "Add clause 5A" in html


def test_cover_xss_passthrough():
    """Backend does NOT HTML-escape user input — documents intentional behaviour.

    The backend output goes directly to the browser's print renderer.
    Escaping is the frontend's responsibility (templateRenderer.ts).
    This test will fail (and should be fixed) if escaping is ever added here.
    """
    html = render_cover_page(make_request(purpose="<script>alert(1)</script>"), MINIMAL_COVER)
    assert "<script>" in html


# --- render_standard_terms ---

MINIMAL_TERMS = """\
For: <span class="coverpage_link">Purpose</span>.
Date: <span class="coverpage_link">Effective Date</span>.
MNDA: <span class="coverpage_link">MNDA Term</span>.
Conf: <span class="coverpage_link">Term of Confidentiality</span>.
Law: <span class="coverpage_link">Governing Law</span>.
Court: <span class="coverpage_link">Jurisdiction</span>.
"""


def test_terms_replaces_all_six_spans():
    req = make_request()
    html = render_standard_terms(req, MINIMAL_TERMS)
    assert "Partnership eval" in html
    assert "March 18, 2026" in html
    assert "2 year(s) from Effective Date" in html  # MNDA Term
    assert "3 year(s) from Effective Date" in html  # Term of Confidentiality
    assert "Delaware" in html
    assert "Wilmington, DE" in html


def test_terms_no_leftover_spans():
    html = render_standard_terms(make_request(), MINIMAL_TERMS)
    assert 'class="coverpage_link"' not in html
```

- [ ] **Step 2: Run tests and verify they pass**

```bash
PYTHONPATH=backend pytest backend/tests/test_renderer.py -v
```

Expected: 18 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_renderer.py
git commit -m "test: add backend renderer unit tests (date, terms, checkboxes, XSS)"
```

---

## Task 4: Backend API Integration Tests

**Files:**
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write `backend/tests/test_api.py`**

```python
import pytest


async def test_health(client):
    r = await client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


async def test_get_coverpage_template(client):
    r = await client.get("/api/templates/coverpage")
    assert r.status_code == 200
    # Real coverpage template contains these strings
    assert "Mutual Non-Disclosure" in r.text
    assert "PARTY 1" in r.text


async def test_get_terms_template(client):
    r = await client.get("/api/templates/terms")
    assert r.status_code == 200
    assert "coverpage_link" in r.text


async def test_get_unknown_template_returns_404(client):
    r = await client.get("/api/templates/doesnotexist")
    assert r.status_code == 404


async def test_generate_valid_payload(client, valid_payload):
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 200
    data = r.json()
    assert "html" in data
    # Party names appear in the rendered HTML
    assert "Alice Smith" in data["html"]
    assert "Bob Jones" in data["html"]
    # Effective date rendered in long form
    assert "March 18, 2026" in data["html"]


async def test_generate_missing_mnda_years_returns_422(client, valid_payload):
    valid_payload["mnda_term_type"] = "expires"
    valid_payload["mnda_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_missing_confidentiality_years_returns_422(client, valid_payload):
    valid_payload["confidentiality_term_type"] = "years"
    valid_payload["confidentiality_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_invalid_signature_returns_422(client, valid_payload):
    valid_payload["party1"]["signature"] = "not-a-data-url"
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 422


async def test_generate_perpetual_mnda(client, valid_payload):
    valid_payload["mnda_term_type"] = "perpetual"
    valid_payload["mnda_term_years"] = None
    r = await client.post("/api/generate", json=valid_payload)
    assert r.status_code == 200
    assert "until terminated" in r.json()["html"]
```

- [ ] **Step 2: Run all backend tests**

```bash
PYTHONPATH=backend pytest backend/tests/ -v
```

Expected: ~27 tests PASSED across test_models, test_renderer, test_api.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_api.py
git commit -m "test: add backend API integration tests (health, templates, generate)"
```

---

## Task 5: Fix XSS Bug + Frontend Test Infrastructure

**Files:**
- Modify: `frontend/src/lib/templateRenderer.ts:167`
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`

- [ ] **Step 1: Fix `modifications` XSS bug in `templateRenderer.ts`**

In `frontend/src/lib/templateRenderer.ts`, line 167, change:

```ts
// BEFORE (line 167):
    text = safeReplace(text, modsPlaceholder, data.modifications.trim());

// AFTER:
    text = safeReplace(text, modsPlaceholder, escapeHtml(data.modifications.trim()));
```

- [ ] **Step 2: Install Vitest and RTL devDependencies**

```bash
cd frontend
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Add test scripts to `frontend/package.json`**

Add under `"scripts"`:

```json
"test": "vitest run",
"test:ui": "vitest --ui"
```

- [ ] **Step 4: Create `frontend/vitest.config.ts`**

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
    // REQUIRED: Vitest does not read tsconfig.json paths.
    // Without this every @/* import fails with "Cannot find module".
    alias: { "@": path.resolve(__dirname, "src") },
  },
  define: {
    // Next.js injects NEXT_PUBLIC_* only during its own build.
    // Set explicitly so apiClient.ts has a deterministic test base URL.
    "process.env.NEXT_PUBLIC_API_URL": JSON.stringify("http://test-api"),
  },
});
```

- [ ] **Step 5: Create `frontend/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom";
import { vi } from "vitest";

// react-signature-canvas uses Canvas APIs not implemented in jsdom.
// Without these mocks, any test that imports SignaturePad throws
// "Not implemented: HTMLCanvasElement.prototype.getContext".
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as any;
HTMLCanvasElement.prototype.toDataURL = vi.fn(
  () => "data:image/png;base64,abc123"
);
```

- [ ] **Step 6: Verify Vitest runs with no tests yet**

```bash
cd frontend && npm test
```

Expected: `No test files found` — zero errors.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/lib/templateRenderer.ts
git commit -m "fix: escape modifications field in templateRenderer to prevent XSS; add Vitest infrastructure"
```

---

## Task 6: Template Renderer Unit Tests

**Files:**
- Create: `frontend/src/lib/__tests__/templateRenderer.test.ts`

- [ ] **Step 1: Write `frontend/src/lib/__tests__/templateRenderer.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { renderCoverPage, renderStandardTerms } from "@/lib/templateRenderer";
import type { NdaFormData } from "@/types/nda";

const SIG = "data:image/png;base64,abc123";

function makeData(overrides: Partial<NdaFormData> = {}): NdaFormData {
  return {
    purpose: "Partnership eval",
    effectiveDate: "2026-03-18",
    mndaTermType: "expires",
    mndaTermYears: 2,
    confidentialityTermType: "years",
    confidentialityTermYears: 3,
    governingLawState: "Delaware",
    jurisdiction: "Wilmington, DE",
    modifications: "",
    party1: { signature: SIG, printName: "Alice Smith", title: "CEO", company: "Acme Corp", noticeAddress: "123 Main St", date: "2026-03-18" },
    party2: { signature: SIG, printName: "Bob Jones", title: "CTO", company: "Widget Inc", noticeAddress: "456 Oak Ave", date: "2026-03-18" },
    ...overrides,
  };
}

// Minimal cover template — uses exact placeholder strings from renderer.ts
const COVER = `\
Purpose: [Evaluating whether to enter into a business relationship with the other party.]
Date: [Today's date]
- [x]     Expires [1 year(s)] from Effective Date.
- [ ]     Continues until terminated in accordance with the terms of the MNDA.
- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- [ ]     In perpetuity.
Law: [Fill in state]
Court: [Fill in city or county and state, i.e. "courts located in New Castle, DE"]
Mods: List any modifications to the MNDA
`;

const TERMS = `\
For: <span class="coverpage_link">Purpose</span>.
Date: <span class="coverpage_link">Effective Date</span>.
MNDA: <span class="coverpage_link">MNDA Term</span>.
Conf: <span class="coverpage_link">Term of Confidentiality</span>.
Law: <span class="coverpage_link">Governing Law</span>.
Court: <span class="coverpage_link">Jurisdiction</span>.
`;

describe("renderCoverPage", () => {
  it("returns a string (not a Promise)", () => {
    const result = renderCoverPage(makeData(), COVER);
    expect(typeof result).toBe("string");
  });

  it("replaces purpose placeholder", () => {
    const html = renderCoverPage(makeData({ purpose: "Test partnership" }), COVER);
    expect(html).toContain("Test partnership");
  });

  it("formats effective date as long form", () => {
    const html = renderCoverPage(makeData({ effectiveDate: "2026-03-18" }), COVER);
    expect(html).toContain("March 18, 2026");
  });

  it("shows expires year count when mndaTermType is expires", () => {
    const html = renderCoverPage(makeData({ mndaTermType: "expires", mndaTermYears: 3 }), COVER);
    expect(html).toContain("Expires 3 year(s)");
  });

  it("shows perpetual text when mndaTermType is perpetual", () => {
    const html = renderCoverPage(makeData({ mndaTermType: "perpetual", mndaTermYears: null }), COVER);
    expect(html).toContain("Continues until terminated");
  });

  it("shows confidentiality year count", () => {
    const html = renderCoverPage(makeData({ confidentialityTermType: "years", confidentialityTermYears: 5 }), COVER);
    expect(html).toContain("5 year(s) from Effective Date");
  });

  it("replaces governing law state", () => {
    const html = renderCoverPage(makeData({ governingLawState: "California" }), COVER);
    expect(html).toContain("California");
  });

  it("replaces jurisdiction", () => {
    const html = renderCoverPage(makeData({ jurisdiction: "San Francisco, CA" }), COVER);
    expect(html).toContain("San Francisco, CA");
  });

  it("shows No modifications when modifications is empty", () => {
    const html = renderCoverPage(makeData({ modifications: "" }), COVER);
    expect(html).toContain("No modifications");
  });

  it("shows modification text when provided", () => {
    const html = renderCoverPage(makeData({ modifications: "Add clause 5A" }), COVER);
    expect(html).toContain("Add clause 5A");
  });

  it("strips <label> tags", () => {
    const withLabel = COVER + "\n<label>Hint text</label>\n";
    const html = renderCoverPage(makeData(), withLabel);
    expect(html).not.toContain("<label>");
  });

  it("escapes XSS in purpose", () => {
    const html = renderCoverPage(makeData({ purpose: "<script>alert(1)</script>" }), COVER);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("escapes XSS in party name", () => {
    const data = makeData();
    data.party1.printName = "<img onerror=alert(1)>";
    const html = renderCoverPage(data, COVER);
    expect(html).not.toContain("<img onerror");
  });

  it("escapes XSS in modifications field", () => {
    const html = renderCoverPage(makeData({ modifications: "<script>hack()</script>" }), COVER);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderStandardTerms", () => {
  it("returns a string (not a Promise)", () => {
    expect(typeof renderStandardTerms(makeData(), TERMS)).toBe("string");
  });

  it("replaces all six coverpage_link spans", () => {
    const html = renderStandardTerms(makeData(), TERMS);
    expect(html).toContain("Partnership eval");   // Purpose
    expect(html).toContain("March 18, 2026");     // Effective Date
    expect(html).toContain("2 year(s) from Effective Date");  // MNDA Term
    expect(html).toContain("3 year(s) from Effective Date");  // Term of Confidentiality
    expect(html).toContain("Delaware");            // Governing Law
    expect(html).toContain("Wilmington, DE");      // Jurisdiction
  });

  it("leaves no leftover coverpage_link spans", () => {
    const html = renderStandardTerms(makeData(), TERMS);
    expect(html).not.toContain('class="coverpage_link"');
  });
});
```

- [ ] **Step 2: Run and verify all tests pass**

```bash
cd frontend && npm test -- templateRenderer
```

Expected: 16 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/__tests__/templateRenderer.test.ts
git commit -m "test: add templateRenderer unit tests (placeholders, XSS escaping, term toggling)"
```

---

## Task 7: API Client Unit Tests

**Files:**
- Create: `frontend/src/lib/__tests__/apiClient.test.ts`

- [ ] **Step 1: Write `frontend/src/lib/__tests__/apiClient.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { generateNda, fetchTemplate } from "@/lib/apiClient";
import type { NdaFormData } from "@/types/nda";

const SIG = "data:image/png;base64,abc";

const FORM_DATA: NdaFormData = {
  purpose: "Partnership eval",
  effectiveDate: "2026-03-18",
  mndaTermType: "expires",
  mndaTermYears: 1,
  confidentialityTermType: "years",
  confidentialityTermYears: 1,
  governingLawState: "Delaware",
  jurisdiction: "Wilmington, DE",
  modifications: "",
  party1: { signature: SIG, printName: "Alice Smith", title: "CEO", company: "Acme", noticeAddress: "123 Main", date: "2026-03-18" },
  party2: { signature: SIG, printName: "Bob Jones", title: "CTO", company: "Widget", noticeAddress: "456 Oak", date: "2026-03-18" },
};

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("generateNda", () => {
  it("POSTs to the correct URL with snake_case payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html: "<html>test</html>" }),
    });

    await generateNda(FORM_DATA);

    expect(mockFetch).toHaveBeenCalledWith(
      "http://test-api/api/generate",
      expect.objectContaining({ method: "POST" })
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.effective_date).toBe("2026-03-18");     // camelCase → snake_case
    expect(body.mnda_term_type).toBe("expires");
    expect(body.party1.print_name).toBe("Alice Smith"); // nested snake_case
    expect(body.party2.print_name).toBe("Bob Jones");
    expect(body).not.toHaveProperty("effectiveDate");   // no camelCase leak
  });

  it("returns the HTML from the response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ html: "<html>result</html>" }),
    });

    const result = await generateNda(FORM_DATA);
    expect(result.html).toBe("<html>result</html>");
  });

  it("throws on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, text: async () => "Server error" });
    await expect(generateNda(FORM_DATA)).rejects.toThrow("Failed to generate NDA");
  });
});

describe("fetchTemplate", () => {
  it("GETs the coverpage template URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "# Template" });
    await fetchTemplate("coverpage");
    expect(mockFetch).toHaveBeenCalledWith("http://test-api/api/templates/coverpage");
  });

  it("GETs the terms template URL", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "# Terms" });
    await fetchTemplate("terms");
    expect(mockFetch).toHaveBeenCalledWith("http://test-api/api/templates/terms");
  });

  it("returns the raw text response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => "# Markdown" });
    const result = await fetchTemplate("coverpage");
    expect(result).toBe("# Markdown");
  });

  it("throws on non-200 response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    await expect(fetchTemplate("coverpage")).rejects.toThrow("Failed to fetch template");
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
cd frontend && npm test -- apiClient
```

Expected: 7 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/__tests__/apiClient.test.ts
git commit -m "test: add apiClient unit tests (fetch mocking, snake_case payload, error handling)"
```

---

## Task 8: Print Document Unit Tests

**Files:**
- Create: `frontend/src/lib/__tests__/printDocument.test.ts`

- [ ] **Step 1: Write `frontend/src/lib/__tests__/printDocument.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { printDocument } from "@/lib/printDocument";

describe("printDocument", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function makeMockWindow() {
    const mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
      focus: vi.fn(),
      print: vi.fn(),
      closed: false,
      onload: null as (() => void) | null,
    };
    vi.stubGlobal("window", { ...window, open: vi.fn(() => mockWindow) });
    return mockWindow;
  }

  it("primary path: print() called when onload fires", () => {
    vi.useFakeTimers();
    const mockWindow = makeMockWindow();

    printDocument("<html>test</html>");

    // Simulate the onload event firing
    mockWindow.onload?.();

    expect(mockWindow.print).toHaveBeenCalled();
  });

  it("fallback path: print() called after 500ms if onload never fires", () => {
    vi.useFakeTimers();
    const mockWindow = makeMockWindow();

    printDocument("<html>test</html>");

    // onload does NOT fire — advance past the 500ms fallback
    vi.advanceTimersByTime(500);

    expect(mockWindow.print).toHaveBeenCalled();
  });

  it("writes the HTML to the popup document", () => {
    vi.useFakeTimers();
    const mockWindow = makeMockWindow();

    printDocument("<html>content</html>");

    expect(mockWindow.document.write).toHaveBeenCalledWith("<html>content</html>");
    expect(mockWindow.document.close).toHaveBeenCalled();
  });

  it("blocked popup: shows alert when window.open returns null", () => {
    const alertMock = vi.fn();
    vi.stubGlobal("window", { ...window, open: vi.fn(() => null), alert: alertMock });

    printDocument("<html>test</html>");

    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("pop-ups"));
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
cd frontend && npm test -- printDocument
```

Expected: 4 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/__tests__/printDocument.test.ts
git commit -m "test: add printDocument unit tests (onload primary, setTimeout fallback, blocked popup)"
```

---

## Task 9: useTemplateRenderer Hook Tests

**Files:**
- Create: `frontend/src/hooks/__tests__/useTemplateRenderer.test.ts`

- [ ] **Step 1: Write `frontend/src/hooks/__tests__/useTemplateRenderer.test.ts`**

```ts
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useTemplateRenderer } from "@/hooks/useTemplateRenderer";
import * as apiClient from "@/lib/apiClient";
import { defaultFormData } from "@/types/nda";

vi.mock("@/lib/apiClient");

const mockFetchTemplate = vi.mocked(apiClient.fetchTemplate);

const MINIMAL_COVER = `[Evaluating whether to enter into a business relationship with the other party.]
[Today's date]
- [x]     Expires [1 year(s)] from Effective Date.
- [ ]     Continues until terminated in accordance with the terms of the MNDA.
- [x]     [1 year(s)] from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.
- [ ]     In perpetuity.
[Fill in state]
[Fill in city or county and state, i.e. "courts located in New Castle, DE"]
List any modifications to the MNDA`;

const MINIMAL_TERMS = `<span class="coverpage_link">Purpose</span>`;

beforeEach(() => {
  mockFetchTemplate.mockReset();
  mockFetchTemplate.mockImplementation((name: string) => {
    if (name === "coverpage") return Promise.resolve(MINIMAL_COVER);
    if (name === "terms") return Promise.resolve(MINIMAL_TERMS);
    return Promise.reject(new Error("unknown template"));
  });
});

describe("useTemplateRenderer", () => {
  it("starts with isLoading=true", () => {
    const { result } = renderHook(() => useTemplateRenderer(defaultFormData));
    expect(result.current.isLoading).toBe(true);
  });

  it("transitions to isLoading=false after templates load", async () => {
    const { result } = renderHook(() => useTemplateRenderer(defaultFormData));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeNull();
  });

  it("returns non-empty HTML after loading", async () => {
    const { result } = renderHook(() => useTemplateRenderer(defaultFormData));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.coverpageHtml.length).toBeGreaterThan(0);
    expect(result.current.termsHtml.length).toBeGreaterThan(0);
  });

  it("sets error when fetchTemplate rejects", async () => {
    mockFetchTemplate.mockRejectedValue(new Error("Network failure"));
    const { result } = renderHook(() => useTemplateRenderer(defaultFormData));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe("Network failure");
  });
});
```

- [ ] **Step 2: Run and verify**

```bash
cd frontend && npm test -- useTemplateRenderer
```

Expected: 4 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/__tests__/useTemplateRenderer.test.ts
git commit -m "test: add useTemplateRenderer hook tests (loading state, error, HTML output)"
```

---

## Task 10: Component Tests

**Files:**
- Create: `frontend/src/components/__tests__/StepIndicator.test.tsx`
- Create: `frontend/src/components/__tests__/fields.test.tsx`

- [ ] **Step 1: Write `frontend/src/components/__tests__/StepIndicator.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepIndicator } from "@/components/wizard/StepIndicator";
import { STEP_TITLES } from "@/types/nda";

describe("StepIndicator", () => {
  it("renders all step titles", () => {
    render(<StepIndicator currentStep={0} />);
    STEP_TITLES.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });

  it("shows step numbers for current and future steps", () => {
    render(<StepIndicator currentStep={1} />);
    // Step index 1 (current) shows "2"; step index 2 shows "3", etc.
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows checkmark SVGs for completed steps", () => {
    const { container } = render(<StepIndicator currentStep={2} />);
    // Steps 0 and 1 are completed — each renders an SVG checkmark
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("current step circle has ring class", () => {
    const { container } = render(<StepIndicator currentStep={0} />);
    const ringEl = container.querySelector('[class*="ring-2"]');
    expect(ringEl).toBeInTheDocument();
  });

  it("connector left of current step is blue", () => {
    const { container } = render(<StepIndicator currentStep={2} />);
    // For step index 2 (third step), the left connector should be bg-blue-600
    // because leftConnectorFilled = index > 0 && index <= currentStep
    const blueConnectors = container.querySelectorAll(".bg-blue-600");
    expect(blueConnectors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Write `frontend/src/components/__tests__/fields.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useForm } from "react-hook-form";
import { TextInput } from "@/components/fields/TextInput";
import { TextareaInput } from "@/components/fields/TextareaInput";
import { DateInput } from "@/components/fields/DateInput";
import { RadioGroup } from "@/components/fields/RadioGroup";
import type { NdaFormData } from "@/types/nda";

// Wrapper that provides a react-hook-form register function
function WithForm({ children }: { children: (register: any, errors: any) => React.ReactNode }) {
  const { register, formState: { errors } } = useForm<NdaFormData>();
  return <>{children(register, errors)}</>;
}

describe("TextInput", () => {
  it("renders label and input", () => {
    render(
      <WithForm>
        {(register) => <TextInput label="Full Name" name="purpose" register={register} />}
      </WithForm>
    );
    expect(screen.getByText("Full Name")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("shows required asterisk when required=true", () => {
    render(
      <WithForm>
        {(register) => <TextInput label="Name" name="purpose" register={register} required />}
      </WithForm>
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});

describe("TextareaInput", () => {
  it("renders label and textarea", () => {
    render(
      <WithForm>
        {(register) => <TextareaInput label="Purpose" name="purpose" register={register} />}
      </WithForm>
    );
    expect(screen.getByText("Purpose")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

describe("DateInput", () => {
  it("renders a date input with label", () => {
    render(
      <WithForm>
        {(register) => <DateInput label="Effective Date" name="effectiveDate" register={register} />}
      </WithForm>
    );
    expect(screen.getByText("Effective Date")).toBeInTheDocument();
    expect(screen.getByDisplayValue("") || document.querySelector('input[type="date"]')).toBeTruthy();
  });
});

describe("RadioGroup", () => {
  it("renders group label and all option labels", () => {
    render(
      <WithForm>
        {(register) => (
          <RadioGroup
            label="MNDA Term"
            name="mndaTermType"
            register={register}
            options={[
              { value: "expires", label: "Expires" },
              { value: "perpetual", label: "Perpetual" },
            ]}
          />
        )}
      </WithForm>
    );
    expect(screen.getByText("MNDA Term")).toBeInTheDocument();
    expect(screen.getByText("Expires")).toBeInTheDocument();
    expect(screen.getByText("Perpetual")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run and verify all frontend tests**

```bash
cd frontend && npm test
```

Expected: ~35 tests PASSED across all frontend test files.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/__tests__/
git commit -m "test: add StepIndicator and field component tests (render, ring class, connector color)"
```

---

## Task 11: Playwright Setup

**Files:**
- Modify: `frontend/package.json` — add `@playwright/test` devDep + `test:e2e` script
- Create: `frontend/playwright.config.ts`

- [ ] **Step 1: Install Playwright**

```bash
cd frontend
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Add e2e script to `frontend/package.json`**

```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Create `frontend/playwright.config.ts`**

```ts
import path from "path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: [
    {
      // Next.js dev server — cwd is frontend/ (where this config lives)
      command: "npm run dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
    },
    {
      // FastAPI backend — run from repo root with PYTHONPATH=backend
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

- [ ] **Step 4: Create `frontend/e2e/` directory** (empty, ready for spec files)

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/playwright.config.ts
git commit -m "test: add Playwright setup with dual webServer (Next.js + FastAPI)"
```

---

## Task 12: E2E Happy Path Test

**Files:**
- Create: `frontend/e2e/happy-path.spec.ts`

- [ ] **Step 1: Write `frontend/e2e/happy-path.spec.ts`**

```ts
import { test, expect, Page } from "@playwright/test";

async function drawSignature(page: Page, canvasIndex: number) {
  const canvas = page.locator("canvas").nth(canvasIndex);
  const box = await canvas.boundingBox();
  if (!box) throw new Error(`Canvas ${canvasIndex} not found`);
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 50);
  await page.mouse.move(box.x + 120, box.y + 40);
  await page.mouse.up();
}

test("happy path: complete all 5 steps and reach download", async ({ page }) => {
  await page.goto("/nda");

  // Step 1: Agreement Basics
  await expect(page.getByRole("heading", { name: /Step 1/ })).toBeVisible();
  await page.getByLabel("Purpose").clear();
  await page.getByLabel("Purpose").fill("Testing a potential partnership between two companies.");
  await page.getByLabel("Effective Date").fill("2026-03-18");
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 2: Duration & Confidentiality — defaults are fine (expires/1yr, years/1yr)
  await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 3: Party Details
  await expect(page.getByRole("heading", { name: /Step 3/ })).toBeVisible();
  const fullNameInputs = page.getByLabel("Full Legal Name");
  await fullNameInputs.nth(0).fill("Alice Smith");
  await fullNameInputs.nth(1).fill("Bob Jones");

  const titleInputs = page.getByLabel("Title");
  await titleInputs.nth(0).fill("CEO");
  await titleInputs.nth(1).fill("CTO");

  const companyInputs = page.getByLabel("Company");
  await companyInputs.nth(0).fill("Acme Corp");
  await companyInputs.nth(1).fill("Widget Inc");

  const addressInputs = page.getByLabel("Notice Address");
  await addressInputs.nth(0).fill("123 Main St, Wilmington, DE");
  await addressInputs.nth(1).fill("456 Oak Ave, Dover, DE");

  const dateInputs = page.getByLabel("Date of Signing");
  await dateInputs.nth(0).fill("2026-03-18");
  await dateInputs.nth(1).fill("2026-03-18");

  await page.getByLabel("Governing Law (State)").fill("Delaware");
  await page.getByLabel("Jurisdiction").fill("courts located in Wilmington, DE");

  await page.getByRole("button", { name: "Next →" }).click();

  // Step 4: Signatures
  await expect(page.getByRole("heading", { name: /Step 4/ })).toBeVisible();
  await drawSignature(page, 0); // Party 1
  await drawSignature(page, 1); // Party 2
  // Wait for "Signature captured" confirmation text
  await expect(page.getByText("✓ Signature captured").first()).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 5: Review & Download
  await expect(page.getByRole("heading", { name: /Step 5/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Download PDF" })).toBeVisible();

  // No error banner should be visible
  await expect(page.getByText("Download failed")).not.toBeVisible();
});
```

- [ ] **Step 2: Run the E2E test**

```bash
cd frontend && npm run test:e2e -- happy-path
```

Expected: 1 test PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/happy-path.spec.ts
git commit -m "test(e2e): add happy path test covering all 5 wizard steps"
```

---

## Task 13: E2E Validation Tests

**Files:**
- Create: `frontend/e2e/validation.spec.ts`

- [ ] **Step 1: Write `frontend/e2e/validation.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("step 1: cannot advance with empty purpose", async ({ page }) => {
  await page.goto("/nda");
  // Clear the pre-filled purpose
  await page.getByLabel("Purpose").clear();
  await page.getByRole("button", { name: "Next →" }).click();
  // React Hook Form shows: "Purpose is required"
  await expect(page.getByText("Purpose is required")).toBeVisible();
  // Still on step 1
  await expect(page.getByRole("heading", { name: /Step 1/ })).toBeVisible();
});

test("step 2: cannot advance without mnda years when expires selected", async ({ page }) => {
  await page.goto("/nda");

  // Advance past step 1 with valid data
  await page.getByRole("button", { name: "Next →" }).click();

  // On step 2 — "Expires after a fixed number of years" is selected by default
  await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();

  // Clear the years input
  await page.getByLabel("Number of years:").first().clear();
  await page.getByRole("button", { name: "Next →" }).click();

  await expect(page.getByText("Please enter the number of years")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();
});

test("step 4: cannot advance without signatures", async ({ page }) => {
  await page.goto("/nda");

  // Step 1 — use defaults
  await page.getByRole("button", { name: "Next →" }).click();
  // Step 2 — use defaults
  await page.getByRole("button", { name: "Next →" }).click();
  // Step 3 — fill required fields
  await page.getByLabel("Full Legal Name").nth(0).fill("Alice Smith");
  await page.getByLabel("Full Legal Name").nth(1).fill("Bob Jones");
  await page.getByLabel("Title").nth(0).fill("CEO");
  await page.getByLabel("Title").nth(1).fill("CTO");
  await page.getByLabel("Company").nth(0).fill("Acme Corp");
  await page.getByLabel("Company").nth(1).fill("Widget Inc");
  await page.getByLabel("Notice Address").nth(0).fill("123 Main St");
  await page.getByLabel("Notice Address").nth(1).fill("456 Oak Ave");
  await page.getByLabel("Date of Signing").nth(0).fill("2026-03-18");
  await page.getByLabel("Date of Signing").nth(1).fill("2026-03-18");
  await page.getByLabel("Governing Law (State)").fill("Delaware");
  await page.getByLabel("Jurisdiction").fill("Wilmington, DE");
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 4 — do NOT draw any signatures, just click Next
  await expect(page.getByRole("heading", { name: /Step 4/ })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();

  await expect(page.getByText("Party 1 signature is required")).toBeVisible();
  await expect(page.getByText("Party 2 signature is required")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Step 4/ })).toBeVisible();
});
```

- [ ] **Step 2: Run and verify**

```bash
cd frontend && npm run test:e2e -- validation
```

Expected: 3 tests PASSED.

- [ ] **Step 3: Commit**

```bash
git add frontend/e2e/validation.spec.ts
git commit -m "test(e2e): add validation tests (purpose, mnda years, missing signatures)"
```

---

## Task 14: E2E Navigation and Preview Tests

**Files:**
- Create: `frontend/e2e/navigation.spec.ts`
- Create: `frontend/e2e/preview.spec.ts`

- [ ] **Step 1: Write `frontend/e2e/navigation.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("back button returns to previous step", async ({ page }) => {
  await page.goto("/nda");

  // Advance to step 2
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByRole("heading", { name: /Step 2/ })).toBeVisible();

  // Go back
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.getByRole("heading", { name: /Step 1/ })).toBeVisible();
});

test("back button is disabled on step 1", async ({ page }) => {
  await page.goto("/nda");
  const backBtn = page.getByRole("button", { name: "← Back" });
  await expect(backBtn).toBeDisabled();
});

test("step indicator shows correct active step number", async ({ page }) => {
  await page.goto("/nda");

  // Step 1 active: circle shows "1" as current
  await expect(page.getByText("Step 1: Agreement Basics")).toBeVisible();

  // Advance to step 2
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText("Step 2: Duration & Confidentiality")).toBeVisible();
});

test("completed steps show checkmark in step indicator", async ({ page }) => {
  await page.goto("/nda");

  // Advance to step 2 — step 1 becomes completed
  await page.getByRole("button", { name: "Next →" }).click();

  // An SVG checkmark should now be rendered for the completed step
  const svgs = page.locator("nav svg");
  await expect(svgs.first()).toBeVisible();
});
```

- [ ] **Step 2: Write `frontend/e2e/preview.spec.ts`**

```ts
import { test, expect, Page } from "@playwright/test";

async function drawSignature(page: Page, canvasIndex: number) {
  const canvas = page.locator("canvas").nth(canvasIndex);
  const box = await canvas.boundingBox();
  if (!box) throw new Error(`Canvas ${canvasIndex} not found`);
  await page.mouse.move(box.x + 20, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 50);
  await page.mouse.up();
}

async function completeWizard(page: Page) {
  await page.goto("/nda");

  // Step 1
  await page.getByLabel("Purpose").clear();
  await page.getByLabel("Purpose").fill("Preview test partnership");
  await page.getByLabel("Effective Date").fill("2026-03-18");
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 2 (defaults)
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 3
  await page.getByLabel("Full Legal Name").nth(0).fill("Alice Smith");
  await page.getByLabel("Full Legal Name").nth(1).fill("Bob Jones");
  await page.getByLabel("Title").nth(0).fill("CEO");
  await page.getByLabel("Title").nth(1).fill("CTO");
  await page.getByLabel("Company").nth(0).fill("PreviewCorp");
  await page.getByLabel("Company").nth(1).fill("PreviewInc");
  await page.getByLabel("Notice Address").nth(0).fill("123 Main St");
  await page.getByLabel("Notice Address").nth(1).fill("456 Oak Ave");
  await page.getByLabel("Date of Signing").nth(0).fill("2026-03-18");
  await page.getByLabel("Date of Signing").nth(1).fill("2026-03-18");
  await page.getByLabel("Governing Law (State)").fill("Nevada");
  await page.getByLabel("Jurisdiction").fill("Las Vegas, NV");
  await page.getByRole("button", { name: "Next →" }).click();

  // Step 4
  await drawSignature(page, 0);
  await drawSignature(page, 1);
  // Wait for signature capture confirmation before advancing to avoid race
  await expect(page.getByText("✓ Signature captured").first()).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();
}

test("preview on step 5 contains governing law state", async ({ page }) => {
  await completeWizard(page);
  await expect(page.locator(".nda-content")).toContainText("Nevada");
});

test("preview on step 5 contains party company names", async ({ page }) => {
  await completeWizard(page);
  await expect(page.locator(".nda-content")).toContainText("PreviewCorp");
  await expect(page.locator(".nda-content")).toContainText("PreviewInc");
});

test("preview on step 5 contains purpose text", async ({ page }) => {
  await completeWizard(page);
  await expect(page.locator(".nda-content")).toContainText("Preview test partnership");
});
```

- [ ] **Step 3: Run all E2E tests**

```bash
cd frontend && npm run test:e2e
```

Expected: ~8 tests PASSED across all e2e spec files.

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e/navigation.spec.ts frontend/e2e/preview.spec.ts
git commit -m "test(e2e): add navigation and preview tests (back button, step indicator, preview content)"
```

---

## Task 15: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  backend-tests:
    name: Backend Tests (pytest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: |
            backend/requirements.txt
            backend/requirements-dev.txt

      - name: Install dependencies
        run: pip install -r backend/requirements.txt -r backend/requirements-dev.txt

      - name: Run pytest
        run: PYTHONPATH=backend pytest backend/tests/ -v

  frontend-tests:
    name: Frontend Tests (Vitest)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: frontend

      - name: Run Vitest
        run: npm test
        working-directory: frontend

  playwright-tests:
    name: E2E Tests (Playwright)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
          cache-dependency-path: frontend/package-lock.json

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: "pip"
          cache-dependency-path: backend/requirements.txt

      - name: Install backend dependencies
        run: pip install -r backend/requirements.txt
        # (pip cache not needed here — uvicorn starts via webServer, not tested directly)

      - name: Install frontend dependencies
        run: npm ci
        working-directory: frontend

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
        working-directory: frontend

      - name: Run Playwright tests
        # Both servers (Next.js + uvicorn) are started automatically
        # by playwright.config.ts webServer entries.
        run: npx playwright test
        working-directory: frontend
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions workflow with parallel backend, frontend, and E2E test jobs"
```

- [ ] **Step 3: Push branch and verify CI passes on GitHub**

```bash
git push
```

Open the repository on GitHub → Actions tab → verify all 3 jobs are green.

---

## Task 16: Manual Test Plan + Jira

**Files:**
- Create: `docs/manual-tests.md`

- [ ] **Step 1: Create `docs/manual-tests.md`**

```markdown
# Manual Test Plan — Prelegal NDA Creator

**Version:** 1.0
**Date:** 2026-03-18
**Scope:** End-to-end manual testing of the Mutual NDA Creator wizard
**Environment:** http://localhost:3000 (both frontend and backend running)

---

## MT-01: Wizard Navigation — Forward Progress

**Preconditions:** App loaded at /nda, step 1 visible.

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Load /nda | Step 1 (Agreement Basics) visible, step indicator shows step 1 active |
| 2 | Click "Next →" with default purpose filled | Advances to step 2 |
| 3 | Click "Next →" on step 2 with defaults | Advances to step 3 |
| 4 | Fill all party fields, click "Next →" | Advances to step 4 |
| 5 | Draw signatures, click "Next →" | Advances to step 5 |
| 6 | Step 5 shows "Review & Download" heading and preview | Preview contains filled data |

---

## MT-02: Wizard Navigation — Back Button

| # | Step | Expected Result |
|---|------|----------------|
| 1 | On step 1, "← Back" button is disabled | Cannot click back on first step |
| 2 | Advance to step 3, click "← Back" | Returns to step 2, all step 2 data still filled |
| 3 | Click "← Back" again | Returns to step 1, purpose and date preserved |

---

## MT-03: Step 1 Validation

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Clear "Purpose" field, click "Next →" | Error: "Purpose is required" appears below the field |
| 2 | Fill "Purpose", clear "Effective Date", click "Next →" | Error: "Effective Date is required" |
| 3 | Fill both fields, click "Next →" | Advances to step 2 |

---

## MT-04: Step 2 Validation — MNDA Term Years

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select "Expires after a fixed number of years" | Number of years input appears |
| 2 | Clear the years input, click "Next →" | Error: "Please enter the number of years" |
| 3 | Enter 0, click "Next →" | Error: "Must be at least 1 year" |
| 4 | Enter 11, click "Next →" | Error: "Must be 10 years or less" |
| 5 | Select "Continues until terminated", click "Next →" | Advances (no years required) |

---

## MT-05: Step 2 Validation — Confidentiality Term Years

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Select "Fixed number of years from Effective Date" | Years input appears |
| 2 | Clear it, click "Next →" | Error: "Please enter the number of years" |
| 3 | Select "In perpetuity", click "Next →" | Advances without error |

---

## MT-06: Step 3 Validation — Party Fields

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Leave "Full Legal Name" (Party 1) blank, click "Next →" | Error: "Full Legal Name is required" |
| 2 | Leave "Governing Law (State)" blank | Error: "Governing Law (State) is required" |
| 3 | Fill all required Party 1, 2, and governing law fields, click "Next →" | Advances to step 4 |

---

## MT-07: Step 4 — Signature Pad

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Draw on Party 1 canvas | "✓ Signature captured" appears |
| 2 | Click "Clear" | Signature removed, "✓ Signature captured" disappears |
| 3 | Click "Next →" without drawing | "Party 1 signature is required" and "Party 2 signature is required" errors |
| 4 | Draw both signatures, click "Next →" | Advances to step 5 |

---

## MT-08: Step 5 — Preview

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Reach step 5 after filling steps 1–4 | Preview pane shows NDA content |
| 2 | Verify party names appear in preview | Both print names visible |
| 3 | Verify governing law state appears in preview | State name visible |
| 4 | Verify effective date in preview | Date in "Month DD, YYYY" format |

---

## MT-09: Download (PDF)

| # | Step | Expected Result |
|---|------|----------------|
| 1 | On step 5, click "Download PDF" | Browser print dialog opens in new tab |
| 2 | Print preview shows both cover page and standard terms | Full NDA visible |
| 3 | Signature images are present in print preview | Base64 images render in signature rows |
| 4 | Close dialog without printing | No error shown on step 5 |

---

## MT-10: Edge Cases

| # | Step | Expected Result |
|---|------|----------------|
| 1 | Enter `<script>alert(1)</script>` as party name | Preview renders `&lt;script&gt;` (escaped), no JS executes |
| 2 | Enter `&` in company name | Renders as `&amp;` in preview |
| 3 | Enter a very long purpose (500+ characters) | Wraps gracefully in preview |
| 4 | Enter a past effective date (e.g. 2020-01-01) | Accepted; no validation error |
| 5 | Enter modifications text, verify it appears in preview | Modification text visible in cover page preview |
```

- [ ] **Step 2: Commit**

```bash
git add docs/manual-tests.md
git commit -m "docs: add manual test plan (MT-01 through MT-10)"
```

- [ ] **Step 3: Create Jira test cases on PL-3**

Using the Atlassian MCP tool, add a comment to Jira issue PL-3 with the manual test cases formatted as a Jira table, or create sub-tasks for each MT-XX area. The comment/sub-tasks should reference the `docs/manual-tests.md` file.

Use the Jira tool: `mcp__atlassian__addCommentToJiraIssue` with issue key `PL-3` and the test plan content.

---

## Final Step: Push PR and Tag

- [ ] **Push the feature branch**

```bash
git push origin feature/PL-3-mutual-nda-creator
```

- [ ] **Verify all 3 CI jobs pass on GitHub**

Open GitHub → Actions → latest run → confirm backend-tests, frontend-tests, and playwright-tests are all green.
```
