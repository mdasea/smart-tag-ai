# Architecture Decisions

> ADRs (Architecture Decision Records) — why each tech choice was made.

---

## ADR-001: OpenCode Go over Google Gemini

**Date:** 2026-07-15
**Status:** Accepted

**Context:** The original blueprint used Google Gemini 2.5 Flash for multi-modal tag generation (text + image analysis). This required the `@google/genai` npm SDK and a separate `GEMINI_API_KEY`.

**Decision:** Replace Gemini with OpenCode Go API (OpenAI-compatible endpoint at `https://opencode.ai/zen/go/v1/chat/completions`).

**Rationale:**
- Single provider for both the Hermes agent and the Shopify app AI
- No extra SDK dependency — plain `fetch()` calls
- Flat $10/month subscription with generous limits (21,600 requests/month on `qwen3.7-plus`)
- Faster responses (<2s vs potentially longer for multi-modal)
- Tested and benchmarked for coding/analysis tasks

**Tradeoff:** No multi-modal vision — tags are text-only from title + description. For SEO tags from product metadata, this is sufficient.

---

## ADR-002: Text-Only AI Generation (No Vision)

**Date:** 2026-07-15
**Status:** Accepted

**Context:** Gemini 2.5 Flash supported inline image analysis (base64 product photos). OpenCode Go models are text-only.

**Decision:** Generate SEO tags from product title + description only. No image analysis.

**Rationale:**
- The vast majority of SEO tag information comes from title and description text
- Product images rarely contain keywords not already in the text
- Text-only is faster, cheaper, and avoids base64 encoding overhead
- Can add vision support later via a separate model if needed

---

## ADR-003: Prisma ORM with SQLite (Dev) / PostgreSQL (Prod)

**Date:** 2026-07-15
**Status:** Accepted

**Context:** Need a database for the `PendingTag` queue that works in development and scales to production.

**Decision:** Use Prisma ORM with SQLite for development, PostgreSQL for production.

**Rationale:**
- SQLite requires zero setup — just a file
- Prisma abstracts the SQL differences; schema is portable
- Session storage adapter for Prisma is provided by Shopify SDK
- Migration history tracks all schema changes

---

## ADR-004: Usage-Based Billing at $0.10/Product

**Date:** 2026-07-15
**Status:** Accepted

**Context:** Merchants need to pay per product optimized. Shopify supports one-time, recurring, and usage-based billing.

**Decision:** Shopify Usage Billing API at $0.10 per approved product, first 10 free.

**Rationale:**
- Low per-unit cost encourages trial (merchant doesn't pay upfront)
- Usage billing is the most transparent model — pay for what you use
- First 10 free removes adoption friction
- Shopify handles invoicing and collection

---

## ADR-005: React Router v7 (Flat File Routing)

**Date:** 2026-07-15
**Status:** Accepted

**Context:** Shopify recommends React Router (formerly Remix) for embedded apps. The template uses flat file routing.

**Decision:** Use `@react-router/fs-routes` with file-based routing conventions.

**Rationale:**
- Convention over configuration — route path = file path
- Shopify SDK `@shopify/shopify-app-react-router` is built for this routing system
- `flatRoutes()` auto-discovers all routes
- No manual route registration needed

**Route mapping:**
| File | URL |
|------|-----|
| `app/routes/api.webhooks.tsx` | `/api/webhooks` |
| `app/routes/api.ingest-product.tsx` | `/api/ingest-product` |
| `app/routes/app._index.tsx` | `/app` |
| `app/routes/app.tsx` | `/app` (layout) |


---

## ADR-006: Autonomous Subagent Pipeline (delegate_task)

**Date:** 2026-07-15
**Status:** Accepted

**Context:** Building a full Shopify + n8n pipeline involves many independent phases. Asking the user for every decision slows progress.

**Decision:** Use Hermes `delegate_task` to spawn autonomous subagents for each phase. Each subagent receives complete context (project paths, tech stack, conventions, verification commands) and works independently. Parent agent reviews, commits, and documents results.

**Rationale:**
- Subagents work in parallel where possible
- Each subagent has full tool access within its scope
- Parent agent maintains overall project coherence
- User only interrupted for critical decisions (API keys, pricing, architecture pivots)

**Execution flow:**
1. Parent dispatches subagent with complete phase context
2. Subagent writes code, runs typecheck, fixes errors
3. Subagent returns summary + verification evidence
4. Parent reviews, commits, documents in Obsidian
5. Parent dispatches next phase(s)
