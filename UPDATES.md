# Prelegal - Technical Improvements

Potential improvements organized by priority and impact. Each item is actionable and scoped.

---

## Critical Priority (Breaks core experience)

### 1. Mobile layout is unusable

The split-pane editor (chat left, preview right) uses a fixed `w-2/5` / `flex-1` layout with no responsive breakpoint. On viewports under ~900px both panels are squashed to unusable widths. The SignaturePad has a hardcoded 400x150px canvas that overflows on mobile. The NavBar has no collapse or hamburger menu — buttons, email, and sign-out overflow horizontally.

**Fix:** Add a `flex-col` fallback at `md:` breakpoint for the split pane. Stack chat above preview on mobile with a toggle. Make SignaturePad canvas width responsive (use `100%` width). Add a mobile NavBar layout.

**Files:** `DocChatClient.tsx`, `nda/page.tsx`, `SignaturePad.tsx`, `NavBar.tsx`

---

### 2. "Download PDF" is actually a print dialog

`printDocument.ts` opens a browser popup with `window.open()` and calls `window.print()`. This is not PDF generation — it shows the browser's print dialog, which may default to a physical printer, not "Save as PDF." Additionally, `window.open()` in an async callback is blocked by most popup blockers (especially Safari).

**Fix:** Replace with a real PDF generation library. Options:
- **Backend:** Use `weasyprint` or `pdfkit` to generate PDF server-side and return it as a downloadable file
- **Frontend:** Use `html2pdf.js` or `jsPDF` + `html2canvas` to generate a client-side PDF blob and trigger `<a download>`

**Files:** `printDocument.ts`, `backend/services/doc_renderer.py`, `backend/services/renderer.py`

---

### 3. Silent error swallowing causes infinite loading states

Multiple API calls use `.catch(() => {})` with no user feedback:
- **Catalog fetch** (`page.tsx`): If it fails, "Loading templates..." shows forever
- **Template fetch** (`DocChatClient.tsx`): If it fails, "Loading document preview..." shows forever
- **Document list** (`MyDocuments.tsx`): Silently hides the section on failure

**Fix:** Add error states and retry buttons for catalog and template fetches. Show a brief error toast for non-critical failures (document list, save).

**Files:** `page.tsx`, `DocChatClient.tsx`, `MyDocuments.tsx`

---

### 4. Stored XSS via backend-rendered HTML

`services/doc_renderer.py` `_replace_spans()` inserts user-supplied field values directly into HTML without escaping. This HTML is stored in the `documents` table and rendered via `dangerouslySetInnerHTML` in the MyDocuments preview modal and the /documents page. A field value like `<script>alert(1)</script>` will execute when the preview modal opens.

The frontend `genericRenderer.ts` correctly escapes values, but the backend renderer does not.

**Fix:** HTML-escape all field values in `_replace_spans()` (both `doc_renderer.py` and `renderer.py`) before inserting into templates. Use `html.escape()`.

**Files:** `backend/services/doc_renderer.py`, `backend/services/renderer.py`

---

## High Priority (Security and accessibility)

### 5. Auth endpoints block the event loop

`routers/auth.py` declares all handlers as `async def` but performs synchronous SQLite I/O (`sqlite3.connect`, `db.execute`). This blocks uvicorn's event loop for the duration of each DB operation, stalling all other concurrent requests.

**Fix:** Change `async def signup/signin/signout/me` to `def signup/signin/signout/me`. FastAPI will automatically run `def` handlers in a threadpool.

**Files:** `backend/routers/auth.py`

---

### 6. Session cookies missing `secure` flag

`response.set_cookie("session", token, httponly=True, samesite="lax", max_age=86400)` — no `secure=True`. In production over HTTPS, the session cookie would be sent over plain HTTP if a user visits an HTTP URL. Additionally, `samesite="lax"` doesn't protect top-level cross-site POSTs.

**Fix:** Add `secure=True` conditionally based on environment (e.g., read from `ENVIRONMENT` env var). Consider `samesite="strict"` since the app only serves its own frontend.

**Files:** `backend/routers/auth.py`

---

### 7. No session expiry enforcement

The `sessions` table has no `expires_at` column. Sessions are valid forever server-side. The cookie has `max_age=86400` (client-side only), but a captured session token works until the DB is wiped.

**Fix:** Add `expires_at TIMESTAMP` to the sessions table. Set it to `created_at + 24 hours`. Add a check in `require_session` that rejects expired sessions.

**Files:** `backend/database.py`, `backend/services/auth.py`

---

### 8. No rate limiting on auth endpoints

`POST /api/auth/signup` and `POST /api/auth/signin` have no rate limiting. Brute-force password attacks and mass account creation are possible.

**Fix:** Add `slowapi` rate limiting — e.g., 10 attempts per minute per IP on signin, 5 signups per hour per IP.

**Files:** `backend/main.py`, `backend/routers/auth.py`, `backend/pyproject.toml`

---

### 9. Accessibility: no ARIA, no focus trapping, poor contrast

- Modal dialogs have no `role="dialog"`, `aria-modal`, or `aria-labelledby`
- No focus trapping on any modal — keyboard users can Tab behind the overlay
- Escape key does not close any modal
- Chat message list has no `role="log"` or `aria-live="polite"`
- Login tabs have no `role="tab"` / `role="tablist"` / `aria-selected`
- Error messages have no `role="alert"`
- `#888888` gray on white has ~3.5:1 contrast ratio (WCAG AA requires 4.5:1)

**Fix:**
- Add dialog ARIA attributes and focus trapping (e.g., `focus-trap-react` or a simple manual trap)
- Add `onKeyDown` handler for Escape on all modals
- Add `role="log"` and `aria-live="polite"` to the chat message container
- Add tab ARIA to login page
- Darken `brand-gray` to at least `#696969` for 4.5:1 contrast

**Files:** `MyDocuments.tsx`, `documents/page.tsx`, `SignatureModal.tsx`, `ChatPanel.tsx`, `login/page.tsx`, `tailwind.config.ts`

---

## Medium Priority (Code quality and UX polish)

### 10. `API_BASE` duplicated in 7 frontend files

`const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001"` appears in `page.tsx`, `login/page.tsx`, `auth.ts`, `apiClient.ts`, `chatApi.ts`, `docChatApi.ts`, and `documentsApi.ts`. Changing the port requires editing all 7.

**Fix:** Extract to a single `lib/config.ts` exporting `API_BASE`. Import everywhere else.

---

### 11. NDA editor and generic doc editor are near-identical duplicates

`nda/page.tsx` (~190 lines) and `DocChatClient.tsx` (~180 lines) share the same split-pane layout, disclaimer banner, chat error rendering, save/download buttons, and auth guard pattern. Any UI change must be made in both files.

**Fix:** Extract a shared `EditorLayout` component that accepts `chatPanel`, `previewPanel`, `rightSlot`, `title`, and `disclaimer` as props. Both pages would use it as a shell.

---

### 12. Conversation history grows without bound

`_build_messages()` in both chat services appends the entire conversation history to the LLM request on every turn. Long conversations will eventually exceed the model's context limit.

**Fix:** Implement a sliding window (e.g., keep the system prompt + last 10 turns). Alternatively, summarize older turns into a condensed context message.

**Files:** `backend/services/chat.py`, `backend/services/doc_chat.py`

---

### 13. No unsaved-changes indicator

After the "Saved" label resets (2 seconds), there is no visual indicator that the document has changed since the last save. Users in long sessions won't know if their work is unsaved.

**Fix:** Track a `dirty` flag that sets to `true` when `currentFields` changes after the last save. Show a subtle dot or "Unsaved changes" label near the Save button. Optionally, add a `beforeunload` browser warning when dirty.

**Files:** `DocChatClient.tsx`, `nda/page.tsx`

---

### 14. Chat history is not preserved on resume

When resuming a saved document via `?resume=id`, only the fields are restored. The chat message history is lost — the user sees a blank chat with "Welcome back!" and no context of what was previously discussed.

**Fix:** Save `messages` alongside `fields_json` in the documents table. Return them in the `GET /api/documents/{id}` response. Restore them on resume.

**Files:** `backend/database.py`, `backend/models/documents.py`, `backend/routers/documents.py`, `documentsApi.ts`, `DocChatClient.tsx`, `nda/page.tsx`

---

### 15. Start scripts print wrong port

`start-mac.sh` and `start-linux.sh` print `"Prelegal running at http://localhost:8000"` but `docker-compose.yml` maps `8001:8000`. Users will visit the wrong URL.

**Fix:** Change the echo to `http://localhost:8001`.

**Files:** `scripts/start-mac.sh`, `scripts/start-linux.sh`

---

### 16. `.venv` copied into Docker image

`.dockerignore` excludes `**/.next` and `**/out` but not `**/.venv`. The `COPY backend/ ./` instruction copies the local virtual environment (potentially hundreds of MB) into the build context and image layer, even though `uv sync` creates a fresh one inside the container.

**Fix:** Add `**/.venv` to `.dockerignore`.

---

### 17. No `.env.example` for new developers

There is no `.env.example` documenting required environment variables. A new developer cloning the repo won't know to create `.env` with `OPENROUTER_API_KEY`.

**Fix:** Create a `.env.example` with documented variable names and placeholder values.

---

### 18. Database reset on every container restart

`init_db()` deletes the entire SQLite database file on every startup. All user accounts and documents are lost on any `docker compose restart` or container crash. This is documented as intentional but makes demo and testing painful.

**Fix:** Use `CREATE TABLE IF NOT EXISTS` instead of dropping the database. Add a separate `scripts/reset-db.sh` for intentional resets. Consider migrating to a volume-mounted persistent DB path.

**Files:** `backend/database.py`

---

## Low Priority (Polish)

### 19. Button sizes are inconsistent

- NavBar actions: `px-4 py-1.5 text-xs`
- Login submit: `py-2 text-sm`
- Documents "Resume editing": `px-3 py-1 text-xs`
- Empty state CTA: `px-6 py-2 text-sm`

No shared button component or consistent size scale exists.

**Fix:** Define 2-3 button size variants (sm, md) and apply them consistently, or create a lightweight `<Button>` component.

---

### 20. Typing indicator dots likely animate simultaneously

`ChatPanel.tsx` uses `animate-bounce delay-100` and `delay-200` on the typing dots. Tailwind's `animate-bounce` does not compose with `delay-*` utility classes by default — `delay-100` sets `transition-delay`, not `animation-delay`. The dots likely all bounce at the same time.

**Fix:** Add custom keyframe animation with staggered delays via `tailwind.config.ts` or use inline `style={{ animationDelay: "0.1s" }}`.

**Files:** `ChatPanel.tsx`, optionally `tailwind.config.ts`

---

### 21. Page titles never update

`layout.tsx` sets a static `<title>` of "Prelegal - AI-Assisted Legal Document Drafting". All tabs show the same title, making multi-tab navigation impossible.

**Fix:** Use Next.js `metadata` exports or a `<title>` in each page to set contextual titles (e.g., "CSA Editor - Prelegal").

---

### 22. Dead dependencies

- `react-hook-form` is in `package.json` but never imported (leftover from the old wizard)
- `@playwright/test` is a devDependency with no test files
- Geist Mono font is loaded in `layout.tsx` but never used

**Fix:** Remove unused dependencies. Remove Geist Mono font loading.

---

### 23. No health check in docker-compose.yml

`GET /api/health` exists but is not wired to Docker's health monitoring. `docker compose ps` always shows "running" even if the app has crashed internally.

**Fix:** Add a `healthcheck` entry in `docker-compose.yml`:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
  interval: 30s
  timeout: 5s
  retries: 3
```

---

### 24. No LLM retry logic

If OpenRouter returns a 5xx or rate-limit response, the `completion()` call raises an exception that propagates as a 500 to the client. No retry or backoff is attempted.

**Fix:** Add exponential backoff with 2-3 retries on transient errors (5xx, 429). LiteLLM supports `num_retries` parameter.

**Files:** `backend/services/chat.py`, `backend/services/doc_chat.py`

---

### 25. `UNIQUE(user_id, doc_type)` limits to one draft per document type

Users can only save one draft per document type. If a user works on two separate CSA engagements, the second save silently overwrites the first.

**Fix (future):** Remove the UNIQUE constraint. Add a `name` or `label` field that users can set to distinguish drafts. Update the upsert logic to create new drafts or update existing ones by ID.

---

### 26. Duplicate template lookup and name mapping

`_find_templates_dir()` is duplicated in `services/renderer.py` and `services/doc_chat.py`. `DOC_NAMES` is duplicated in `services/doc_chat.py` and `DocChatClient.tsx`. Any rename requires updating multiple files.

**Fix:** Extract `_find_templates_dir()` into a shared `services/templates.py`. Serve `DOC_NAMES` from the backend catalog endpoint so the frontend doesn't hardcode them.

---

### 27. Scripts: Mac and Linux are identical, no pre-flight checks

`start-mac.sh` and `start-linux.sh` are byte-for-byte identical. Neither checks if Docker is running or `.env` exists before starting.

**Fix:** Consolidate into a single `start.sh`. Add pre-flight checks for Docker daemon and `.env` file existence.
