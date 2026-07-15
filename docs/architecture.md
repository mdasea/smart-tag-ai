# SmartTag AI — Architecture

```mermaid
graph LR
    subgraph "External"
        A[Supplier Website] -->|Firecrawl scrape| B[Raw Markdown]
    end

    subgraph "n8n Orchestrator (VPS)"
        C[Schedule Trigger] --> D[Firecrawl HTTP]
        D --> E[OpenCode Go Parser]
        E --> F[Shopify Push Connector]
        E --> G[GoHighLevel Sync]
    end

    subgraph "Shopify App"
        H[Ingestion Endpoint] --> I[Webhook Handler]
        I --> J[OpenCode Go API]
        J --> K[(PendingTag DB)]
        K --> L[Approval Panel]
        L -->|Approve| M[GraphQL productUpdate]
        L -->|Approve| N[Usage Billing $0.10]
        L -->|Reject| O[Status: REJECTED]
    end

    subgraph "Agent Infrastructure"
        P[Hermes Agent] --> Q[delegate_task Subagents]
        P --> R[Obsidian MCP Vault]
        P --> S[n8n MCP]
    end

    D -->|Scraped HTML| A
    F -->|POST /api/ingest-product| H
    M -->|Update tags| T[Shopify Store]
    N -->|Charge| T
```

## Data Flow

```
Supplier → Firecrawl (Markdown) → OpenCode Go (JSON) → Shopify App (DB) 
→ Merchant Approves → GraphQL + $0.10 charge
```

## Component Details

| Component | Tech | Purpose |
|-----------|------|---------|
| Shopify App | React Router v7 + Polaris | Merchant UI for approval & billing |
| AI Engine | OpenCode Go (qwen3.7-plus) | Text-only tag generation |
| Database | Prisma + SQLite | PendingTag queue + session storage |
| Orchestrator | n8n (VPS) | Scrape → Parse → Push pipeline |
| Scraper | Firecrawl API | Web page → clean Markdown |
| CRM | GoHighLevel REST | Lead sync |
| Agent | Hermes + OpenCode | Autonomous build pipeline |
| Knowledge Base | Obsidian + MCP | Project docs & ADRs |
