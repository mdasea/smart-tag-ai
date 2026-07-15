# Agent Configuration

## Hermes Agent
- Profile: `smart-tag-ai`
- Config: `C:\Users\desie\AppData\Local\hermes\profiles\smart-tag-ai\config.yaml`
- Provider: `opencode-go`
- Model: `deepseek-v4-flash`
- SOUL.md: `.hermes/SOUL.md` (project identity)

## OpenCode CLI
- Config: `.opencode/opencode.json`
- MCP: Obsidian vault connected via Local REST API

## MCP Servers

### Obsidian (Hermes + OpenCode)
- Server: `obsidian-mcp-server` (via npx)
- Plugin: Obsidian Local REST API (community plugin)
- Port: 27124
- Tools: get_note, search_notes, write_note, list_files, manage_frontmatter, manage_tags

## Daily Workflow
1. Open Obsidian vault `smart-tag-ai-docs/` (enables Local REST API)
2. Start Hermes: `hermes --profile smart-tag-ai`
3. Write code with OpenCode: `opencode` (separate terminal)
4. Reload MCP after config changes: `/reload-mcp`

## Git Workflow
- Branch: `main` (default)
- Commits: feat:/fix:/refactor:/docs:/chore:
- CI: GitHub Actions (typecheck + test on push)
