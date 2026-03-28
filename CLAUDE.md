# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 12 document templates with AI chat for field collection.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/arcee-ai/trinity-large-preview:free` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8001 (docker-compose maps 8001→8000 inside the container; port 8000 is reserved for other local projects)

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

All core features are complete. The platform is functional end-to-end.

### PL-4: Infrastructure
- Docker multi-stage build (Node frontend + Python backend)
- FastAPI backend with SQLite (fresh DB each container start)
- Next.js 14 static export served by FastAPI at localhost:8001
- Start/stop scripts for Mac, Linux, Windows
- Backend routes: GET /api/health, GET /api/catalog, GET /api/templates/{name}, POST /api/generate

### PL-5: AI Chat & NDA Editor
- Free-form AI chat with split-pane UI (chat left, live document preview right)
- POST /api/chat: LiteLLM + OpenRouter (Cerebras, `arcee-ai/trinity-large-preview:free`), Structured Outputs
- AI greets user on load, collects all NDA text fields progressively
- Signature modal with canvas pads for both parties, then PDF download
- docker-compose.yml passes OPENROUTER_API_KEY via env_file

### PL-6: All 12 Document Templates
- Generic doc routes at /doc/[slug] with split-pane UI
- POST /api/doc-chat, GET /api/doc-templates/{slug}, POST /api/generate-doc
- Field extraction from span markers (keyterms_link, coverpage_link, orderform_link, sow_link)
- Smart apostrophe normalization and possessive-form resolution
- Bracket placeholder substitution for Mutual NDA Cover Page
- Header spans (header_2, header_3) converted to bold markdown
- Templates sourced from Common Paper (https://commonpaper.com), licensed CC BY 4.0

### PL-7: Auth, Document History & Polish
- Authentication: signup/signin with bcrypt, cookie-based sessions
- POST /api/auth/signup, POST /api/auth/signin, POST /api/auth/signout, GET /api/auth/me
- Auth guard on all pages — unauthenticated users redirected to /login
- Document history: saved to SQLite on PDF download, listed on home page
- POST /api/documents (save), GET /api/documents (list user's documents)
- My Documents: preview modal with Continue Editing, Download PDF, and Close
- Continue Editing navigates to /doc/[slug]?resume=<id> and restores document state
- Playwright-based PDF generation (headless Chromium, pixel-accurate to preview)
- XSS prevention via html.escape in all renderers
- Mobile-responsive layout with hamburger nav menu
- NavBar component across all pages (logo, user email, sign out)
- Disclaimer on login page, home page footer, editor banners, and generated PDFs
- sessions and documents tables in SQLite (ephemeral, reset on container restart)