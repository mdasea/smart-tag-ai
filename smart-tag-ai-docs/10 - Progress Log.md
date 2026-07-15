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
