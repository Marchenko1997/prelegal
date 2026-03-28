# Fix document preview not rendering on http://localhost:8001/nda

## Current behavior
- The right-side "Document Preview" always shows the fallback message "Preview will appear here as you fill in the form"
- On initial page load, browser console shows:
  - `GET /api/templates/coverpage` → 404 (Not Found)
  - `GET /api/templates/terms` → 404 (Not Found)
- As a result, `coverpageHtml` and `termsHtml` are empty strings, so `DocumentPreview` renders the fallback UI

## Context
- Frontend uses `useTemplateRenderer` hook which calls `fetchTemplate("coverpage")` and `fetchTemplate("terms")`
- If templates fail to load, `coverPageMd` and `termsMd` remain empty, and rendered HTML is never generated
- `DocumentPreview` explicitly returns fallback UI when both `coverpageHtml` and `termsHtml` are empty

## Expected behavior
- `GET /api/templates/coverpage` and `GET /api/templates/terms` should return `200` with markdown content
- Templates should be loaded on mount
- `coverpageHtml` and `termsHtml` should be non-empty
- Document preview should render live instead of fallback text

## Tasks

- [ ] **Fix backend routes for `/api/templates`**
  - Ensure routes exist and are correctly registered (e.g. `APIRouter(prefix="/api/templates")`)
  - Verify FastAPI app includes the router
  - Ensure correct port (`8001`) is used and no requests are hitting another backend (e.g. `8000`)

- [ ] **Fix template file loading**
  - Ensure template files exist in the container
  - Fix file path resolution (avoid absolute paths like `/templates/...`)
  - Use project-relative paths via `pathlib` (based on `__file__`)
  - Ensure templates are included in Docker image (`COPY templates/`)

- [ ] **Verify frontend API base URL**
  - Ensure `NEXT_PUBLIC_API_URL=http://localhost:8001`
  - Confirm no fallback to port `8000`

- [ ] **Add debugging**
  - Log when templates are requested
  - Log file paths used on backend
  - Log errors returned to frontend

## Goal
Templates load successfully, `coverpageHtml` and `termsHtml` are populated, and the Document Preview renders correctly instead of showing the fallback message.
