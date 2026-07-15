# SmartTag AI — Project Knowledge Base

> **Index:** Use this page as the entry point. Each section links to detailed docs.

## 🗺️ Architecture

```
[Supplier Site] → [Firecrawl] → [n8n Orchestrator]
                                    ├── [OpenCode Go Parser]
                                    ├── [Shopify App] → [Shopify Store]
                                    ├── [GoHighLevel CRM]
                                    └── [Slack + ClickUp]
```

**Core Loop:** Scrape → Parse → Queue → Approve → Charge → Sync

- **Revenue:** $0.10 per product (first 10 free per merchant)
- **AI:** OpenCode Go API (`qwen3.7-plus`, text-only)
- **Stack:** React Router v7 + TypeScript + Prisma + SQLite + Polaris

## 📚 Documentation Index

### Project Foundation
| Doc | Description |
|-----|-------------|
| [[01 - Shopify App Spec]] | Routes, database schema, billing, API endpoints |
| [[02 - n8n Workflow]] | Pipeline architecture, 5 micro-components |
| [[03 - Agent Configuration]] | Hermes + OpenCode setup, MCP, git workflow |

### Progress & Decisions
| Doc | Description |
|-----|-------------|
| [[10 - Progress Log]] | Build sprint log — what was built, decisions made |
| [[20 - Architecture Decisions]] | ADRs — why each tech choice was made |

### Reference
| Doc | Description |
|-----|-------------|
| [[30 - API Reference]] | All endpoints, request/response shapes |
| [[99 - Quick Commands]] | Cheat sheet for common operations |

## 🏗️ Current Status

| Phase | Status | What's Built |
|-------|--------|-------------|
| 0 — Foundation | ✅ | Git, Hermes profile, AGENTS.md, OpenCode config, Obsidian MCP |
| 1 — Shopify Scaffold | ✅ | React Router app, Prisma, shopify.app.toml (billing + scopes) |
| 2 — Core Backend | ✅ | PendingTag schema, webhook handler (OpenCode Go), ingestion endpoint |
| 3 — Approval Panel | 📋 | Planned |
| 4 — n8n Workflow | 📋 | Planned |
| 5 — Testing | 📋 | Planned |
| 6 — Portfolio Polish | 📋 | Planned |

---

*Last updated: 2026-07-15*
