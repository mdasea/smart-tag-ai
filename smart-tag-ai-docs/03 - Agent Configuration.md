# Agent Configuration & Multi-Agent Architecture

## Hermes Agent
- Profile: `smart-tag-ai`
- Config: `C:\Users\desie\AppData\Local\hermes\profiles\smart-tag-ai\config.yaml`
- Provider: `opencode-go`
- SOUL.md: `.hermes/SOUL.md` (project identity)

## Multi-Agent Pipeline

```
                    ┌──────────────────┐
                    │    Architect     │  deepseek-v4-pro
                    │  (Decision Agent)│
                    └────────┬─────────┘
                             │ delegates
               ┌─────────────┼─────────────┐
               ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Builder  │  │ Builder  │  │ Builder  │  deepseek-v4-flash
        │ (Phase3) │  │ (Phase4) │  │ (Phase5) │
        └─────┬────┘  └────┬─────┘  └────┬─────┘
              │ complete    │ complete    │ complete
              ▼             ▼             ▼
        ┌──────────────────────────────────────┐
        │              Scribe                  │  deepseek-v4-flash
        │  (Listens → Documents in Obsidian)   │
        └────────────┬─────────────────────────┘
                     │ sync complete
                     ▼
              ┌──────────────┐
              │ Cron Heartbeat│  Every 6h: health check
              │ (Monitor)    │  Alerts if build broken
              └──────────────┘
```

## Agent Roles

### 1. Architect (deepseek-v4-pro)
- **Model:** deepseek-v4-pro (OpenCode Go)
- **Role:** Strategic decision-making
- **Responsibilities:**
  - Plan phases and break into tasks
  - Dispatch Builder subagents with full context
  - Review Builder output before committing
  - Approve architecture changes
  - Dispatch Scribe after each phase completes
  - Escalate only critical decisions to you

### 2. Builder (deepseek-v4-flash)
- **Model:** deepseek-v4-flash (OpenCode Go, via delegation config)
- **Role:** Tactical execution
- **Responsibilities:**
  - Write code following Architect's spec
  - Run `npm run typecheck` until green
  - Report results + verification evidence back
  - Does NOT make architecture decisions
  - Does NOT update docs (Scribe handles that)

### 3. Scribe (deepseek-v4-flash)
- **Model:** deepseek-v4-flash
- **Role:** Documentation synchronization
- **Responsibilities:**
  - Update [[10 - Progress Log]] with completed work
  - Update [[30 - API Reference]] with new routes/endpoints
  - Write ADRs for architecture decisions to [[20 - Architecture Decisions]]
  - Update [[00 - Project Overview]] status table
  - Sync MCP vault after each phase

## Listener Mechanisms

### A. Event Chain (Built-in via delegate_task)
- `delegate_task` runs in background; result auto-enters conversation
- Architect receives Builder's result → reviews → dispatches Scribe
- Scribe completes → Architect dispatches next Builder
- This creates a natural event-driven pipeline without polling

### B. Cron Heartbeat (Health Monitor)
- Schedule: Every 6 hours
- Checks: `npm run typecheck` passes, Prisma schema matches DB, Obsidian docs referenced correctly
- Alerts: If build broken, writes warning to `10 - Progress Log.md` via MCP
- Model: deepseek-v4-flash (cheap, just reading + reporting)

## Cross-Agent Communication
- **Primary channel:** `delegate_task` return values (structured summaries)
- **Shared state:** Obsidian vault via MCP (all agents read/write)
- **Escalation:** Architect reviews all output before user sees anything
- **No polling:** Event-driven — completion triggers next step automatically

## Running the System
1. Open Obsidian vault `smart-tag-ai-docs/` (enables Local REST API for MCP)
2. Start Hermes: `hermes --profile smart-tag-ai`
3. Architect (this session) runs continuously, dispatching Builders + Scribes
4. Check progress anytime via Obsidian vault → `10 - Progress Log.md`
