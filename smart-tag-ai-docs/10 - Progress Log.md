# Progress Log

> Sprint-by-sprint record of what was built, why, and key decisions.

---

## 2026-07-15 — Phase 0–2 Complete

### Phase 0: Project Foundation
- **Git initialized** (`main` branch), `.gitignore` covering Node/Hermes/Obsidian artifacts
- **Hermes profile** `smart-tag-ai` created with OpenCode Go provider (`deepseek-v4-flash`)
- **SOUL.md** written — project identity for the agent
- **AGENTS.md** created — portable agent instructions for any coding agent
- **OpenCode** initialized with Obsidian MCP config
- **Obsidian MCP** wired via HTTP to Local REST API plugin (port 27124, HTTPS, cert added to Hermes certifi bundle)
- **Vault starter docs** created: system overview, app spec, n8n workflow, agent config, quick commands

### Phase 1: Shopify App Scaffolding
- **Scaffold:** React Router v7 + TypeScript template (from Shopify repo)
- **Dependencies:** `@shopify/shopify-app-react-router`, Prisma, Polaris, React 18
- **Shopify config:** Scopes `read_products, write_products`, webhook registered for `products/create`
- **Billing:** "Pay-As-You-Go AI Tagging" plan at $0.10/usage (first 10 free)
- **Environment:** `.env` and `.env.example` with `OPENCODE_GO_API_KEY`, `DATABASE_URL`, `APP_INGEST_SECRET`
- **Typecheck:** PASS (0 errors)

### Phase 2: Database & Core Backend
- **Schema:** `PendingTag` model (id, shop, productId, productTitle, imageUrl, suggestedTags, tagQualityScore, status, createdAt)
- **Migration:** SQLite database created with Session + PendingTag tables
- **Webhook handler** (`api/webhooks`): Receives `PRODUCTS_CREATE`, calls OpenCode Go API (`qwen3.7-plus`) for text-only tag generation, saves as PENDING
- **Ingestion endpoint** (`api/ingest-product`): Authenticated via Bearer token, validates payload, queues for tagging
- **Note:** Using `Response.json()` instead of old Remix `json()` helper (not available in React Router v7)
- **Note:** OpenCode Go API is text-only — no image/vision analysis. Tags generated from title + description only.

### Key Architecture Decisions
See [[20 - Architecture Decisions]] for full ADRs.

- **OpenCode Go over Gemini:** Single provider for both Hermes agent + app AI
- **No image analysis:** OpenCode Go models are text-only; sufficient for SEO tag generation
- **Plain fetch over SDK:** OpenCode Go uses OpenAI-compatible API — no extra npm package needed
- **Usage billing:** Shopify Billing API with `Usage` interval at $0.10/product


---

## 2026-07-15 — Phase 3 (Autonomous Execution)

### Architecture: Subagent Pipeline
Starting with Phase 3, execution shifted to an autonomous subagent pipeline:
- **Decision model:** `deepseek-v4-pro` (OpenCode Go)
- **Execution model:** Parent agent dispatches `delegate_task` subagents with complete context
- **Each subagent** is self-contained: receives full project context, writes code, runs typecheck, reports results
- **Parent agent** reviews subagent output, commits, updates Obsidian docs
- **User** only involved for critical decisions (API keys, business terms, direction changes)

### Phase 3: Approval Panel (dispatched)
- Subagent `deleg_9f58220b` building the Polaris approval panel:
  - DataTable with PENDING products (Image, Title, Tags, Actions)
  - Approve: GraphQL productUpdate + billing.createUsageRecord($0.10)
  - Reject: status update to REJECTED
  - Empty state, billing enforcement gate
- Status: ⏳ In progress


### Phase 3: Approval Panel (complete)
- **Builder subagent** dispatched and completed
- **Architect review** fixed 4 type errors (custom element types, map callback type, secret redaction)
- **Typecheck:** PASS (0 errors)
- **Built:**
  - `app/routes/app._index.tsx` — Polaris DataTable with PENDING products
  - **Approve:** GraphQL `productUpdate` mutation + `billing.createUsageRecord($0.10)`
  - **Reject:** status update to REJECTED
  - Empty state banner, loading states on approve/reject buttons
  - Shopify custom element types (`s-app-nav`, `s-link`) declared in `globals.d.ts`
  - Navigation links in `app.tsx` shell

### What's Next
- **Phase 4:** n8n workflow deployment (Firecrawl → OpenCode Go → Shopify → GHL)
- **Phase 5:** Integration testing
- **Phase 6:** Portfolio polish


### Phase 4: n8n Workflow (complete)
- **Install:** Skipped — user has their own n8n instance on a VPS
- **Workflow JSON:** Created at `n8n/smart-tag-ai-workflow.json` — importable n8n blueprint with 5 nodes:
  1. Cron trigger (weekly Monday)
  2. Firecrawl scraper (markdown output)
  3. OpenCode Go parser (qwen3.7-plus, JSON output)
  4. Shopify push (ingestion endpoint)
  5. GoHighLevel sync (parallel branch)
- **Documentation:** `n8n/README.md` with credential setup and troubleshooting
- **Next:** User imports JSON into VPS n8n instance
# Phase 4: n8n Workflow (complete)

- **Install:** n8n v2.30.5 from npm. Docker is also available. Runs on port 5678.
- **Files created:**
  - `n8n/README.md` — full documentation with all endpoints, credential setup, testing guide
  - `n8n/smart-tag-ai-workflow.json` — validated n8n export with 7 nodes:
    1. Cron Trigger (weekly Monday 00:00)
    2. Firecrawl Scrape (HTTP POST to api.firecrawl.dev)
    3. Extract Markdown (Code node — normalizes Firecrawl response)
    4. OpenCode Go Normalizer (HTTP POST to /v1/chat/completions, qwen3.7-plus)
    5. Parse LLM Response (Code node — extracts JSON from chat completion)
    6. Shopify Push Connector (HTTP POST to app's /api/ingest-product)
    7. GoHighLevel Sync (HTTP POST to rest.gohighlevel.com/v1/contacts/)
- **Pipeline structure:** Sequential chain with parallel fan-out (Shopify + GHL run concurrently)
- **Validation:** JSON parsed and verified — 7 nodes with correct connections, all node names confirmed
- **Obsidian docs:** `02 - n8n Workflow.md` fully rewritten with installation, credential setup, all endpoints, and import instructions
- **To activate:** User imports JSON into their VPS n8n instance, creates 4 Header Auth credentials, and activates the workflow


### Phase 4: n8n Workflow (deployed via MCP)
- **Deployed directly to VPS** via n8n MCP `create_workflow_from_code`
- **Workflow ID:** `3iVv6KUSGPCcbEbH`
- **URL:** https://n8n.monching-desierto.space/workflow/3iVv6KUSGPCcbEbH
- **Nodes:** Schedule Trigger → Firecrawl → OpenCode Go → Shopify Push (parallel with GHL Sync)
- **Status:** Needs manual credential configuration for 4 HTTP nodes
- **Local file:** `n8n/smart-tag-ai-workflow.json` (kept as backup/portable version)


### Phase 6: Portfolio Polish (complete)
- **Metrics Dashboard** — `app/routes/app.metrics.tsx` with real-time KPIs (revenue, acceptance rate, quality)
- **CI/CD** — `.github/workflows/ci.yml` (typecheck on push)
- **Architecture Diagram** — `docs/architecture.md` (Mermaid)
- **README** — Full project documentation with structure, stack, links
- **Case Study** — `docs/case-study.md` outline for blog post

### Remaining
- **Phase 5: Testing** — Needs n8n credentials configured on VPS + end-to-end test
- Configure Firecrawl, OpenCode Go, Shopify, GHL credentials in n8n UI
- Push to GitHub and enable CI
- Record demo video
