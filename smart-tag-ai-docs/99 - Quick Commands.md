# Quick Commands

## Hermes Agent
- Start: `hermes --profile smart-tag-ai`
- Skills: `/skills`
- MCP status: `hermes mcp list`
- Reload MCP: `/reload-mcp`

## OpenCode
- Start: `opencode`
- MCP tools: `obsidian_get_note`, `obsidian_search_notes`, `obsidian_write_note`, `obsidian_list_files`, `obsidian_manage_frontmatter`, `obsidian_manage_tags`, `obsidian_append_to_note`, `obsidian_patch_note`

## Shopify App
- Dev server: `npm run dev` or `shopify app dev`
- Prisma studio: `npx prisma studio`
- Typecheck: `npm run typecheck`
- Migrate: `npx prisma migrate dev`

## n8n
- Start: `n8n start` (or Docker: `docker run -d --name n8n -p 5678:5678 n8nio/n8n`)
- UI: http://localhost:5678

## Obsidian
- Vault: `smart-tag-ai-docs/`
- Local REST API: http://localhost:27124
- Plugin: Settings → Community Plugins → "Local REST API" (by coddingtonbear)

## Environment
- Profile config: `hermes config edit`
- Secrets: `.env` (OPENCODE_GO_API_KEY, APP_INGEST_SECRET, etc.)
