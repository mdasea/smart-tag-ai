# SmartTag AI — Case Study

> How I Built an AI-Powered Shopify App That Pays for Itself

## The Problem

E-commerce merchants spend hours manually tagging products for SEO. Poor tags mean poor discoverability. Existing solutions are either expensive per-product fees or fully automated "black box" systems that merchants don't trust.

## The Solution

**SmartTag AI** — a Shopify embedded app that:
1. Uses OpenCode Go AI to generate 5 optimized SEO tags from product data
2. Queues them for **merchant approval** (no black box)
3. Charges **$0.10 per approved product** (pay-as-you-go, first 10 free)

## The Architecture

- **Shopify App:** React Router v7 + TypeScript + Polaris + Prisma
- **AI:** OpenCode Go API (`qwen3.7-plus`, ~$0.40/1M tokens)
- **Orchestration:** n8n workflow (self-hosted VPS)
- **Scraping:** Firecrawl API for supplier site data
- **CRM:** GoHighLevel for lead synchronization

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| OpenCode Go over Gemini | Single provider for agent + app; no extra SDK |
| Usage billing at $0.10 | Low friction, transparent, Shopify handles collection |
| n8n for orchestration | Visual pipeline, easy to debug and demo |
| Text-only AI (no vision) | SEO tags come from metadata; faster + cheaper |
| Autonomous subagent pipeline | Hermes delegate_task for parallel build phases |

## The Autonomous Build

The entire app was built using a **3-agent autonomous pipeline**:
- **Architect** (deepseek-v4-pro) — Planned phases, reviewed output, dispatched work
- **Builder** (deepseek-v4-flash) — Wrote code, ran typecheck, built features
- **Scribe** (deepseek-v4-flash) — Documented everything in Obsidian via MCP

## Results

*(To be filled in when live)*

- Products optimized: TBD
- Revenue generated: TBD
- Merchant acceptance rate: TBD
- Average tag quality score: TBD

## Lessons Learned

1. **MCP is a game-changer** — Obsidian and n8n MCPs let the agent interact directly with tools, no REST API needed
2. **Autonomous pipelines work** — subagents with well-scoped context deliver faster than manual iteration
3. **Usage billing is clean** — Shopify handles all the payment complexity
4. **No vision is fine** — text-only AI is sufficient for SEO tag generation from product metadata

## Links

- [Live Workflow](https://n8n.monching-desierto.space/workflow/3iVv6KUSGPCcbEbH)
- [GitHub Repo](https://github.com/YOUR_USER/smart-tag-ai)
- [Architecture Docs](smart-tag-ai-docs/00%20-%20Project%20Overview.md)
