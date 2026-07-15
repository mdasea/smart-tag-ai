# Quick Commands

## Hermes Agent
- Start: `hermes --profile smart-tag-ai`
- MCP status: `hermes mcp list`
- Reload MCP: `/reload-mcp`
- Config edit: `hermes config edit`
- Test MCP: `hermes mcp test obsidian`

## OpenCode
- Start: `opencode`
- MCP tools: `obsidian_get_note`, `obsidian_search_notes`, `obsidian_write_note`, `obsidian_list_files`

## Shopify App
- Dev server: `npm run dev` (or `shopify app dev`)
- Typecheck: `npm run typecheck`
- Prisma generate: `npx prisma generate`
- Prisma migrate dev: `npx prisma migrate dev --name <name>`
- Prisma studio: `npx prisma studio`

## n8n
- Start: `n8n start`
- Docker: `docker run -d --name n8n -p 5678:5678 n8nio/n8n`
- UI: http://localhost:5678

## Git
- Commit: `git commit -m "type: description"` (types: feat, fix, refactor, docs, chore)
- Branch: `main` (default)

## Environment
- OpenCode Go subscription: https://opencode.ai/auth
- Shopify Partners: https://partners.shopify.com
- Firecrawl: https://firecrawl.dev
- GoHighLevel: https://marketplace.gohighlevel.com

## Obsidian Vault Structure
```
smart-tag-ai-docs/
├── 00 - Project Overview.md
├── 01 - Shopify App Spec.md
├── 02 - n8n Workflow.md
├── 03 - Agent Configuration.md
├── 10 - Progress Log.md
├── 20 - Architecture Decisions.md
├── 30 - API Reference.md
├── 99 - Quick Commands.md
└── _archive/
```
