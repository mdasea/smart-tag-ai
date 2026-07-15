# SmartTag AI — Agent Instructions

## Project Overview
Shopify embedded app that uses OpenCode Go AI to generate SEO tags for products.
Products are queued as "Pending" until the merchant approves them, triggering
a $0.10 usage charge. External product data flows in via n8n workflows that
scrape supplier sites with Firecrawl, syncs leads to GoHighLevel CRM, and
notifies teams via Slack/ClickUp.

## Build & Run
```bash
npm install
npm run dev           # Starts Shopify app dev server + ngrok tunnel
npx prisma migrate dev  # Apply database migrations
```

## Tech Stack
- Shopify App: React Router v7 (Remix) + TypeScript + Polaris
- Database: Prisma ORM (SQLite dev, PostgreSQL prod)
- AI: OpenCode Go API (OpenAI-compatible, text-only tag generation from title+description)
- Billing: Shopify Usage Charges ($0.10 per approved product)
- Orchestration: n8n (self-hosted)
- Scraping: Firecrawl API
- CRM: GoHighLevel REST API

## Conventions
- Use `shopify` CLI for all app management (dev, deploy, config)
- Prisma schema lives at `prisma/schema.prisma`
- App routes live under `app/routes/`
- Environment variables in `.env` (never commit)
- Secrets: OPENCODE_GO_API_KEY, FIRECRAWL_API_KEY, GHL_API_KEY

## Testing
```bash
npm test              # Run full test suite
npm run typecheck     # TypeScript validation
```

## Commit Style
feat: description
fix: description
refactor: description
docs: description
chore: description

## MCP Servers
- Obsidian vault at `smart-tag-ai-docs/` — access via `obsidian_*` MCP tools
  (requires Obsidian open with Local REST API plugin enabled)
