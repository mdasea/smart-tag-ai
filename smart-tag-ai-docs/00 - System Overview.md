# SmartTag AI — System Overview

## Architecture
```
[Supplier Site] → [Firecrawl] → [n8n Orchestrator]
                                    ├── [OpenCode Go Parser]
                                    ├── [Shopify App] → [Shopify Store]
                                    ├── [GoHighLevel CRM]
                                    └── [Slack + ClickUp]
```

## Core Loop
1. Supplier site scraped by Firecrawl → raw Markdown
2. n8n sends Markdown to OpenCode Go API → structured JSON
3. Shopify App receives product data via ingestion endpoint
4. Gemini (via OpenCode Go) generates SEO tags from title + description
5. Product queued as "PENDING" in Prisma database
6. Merchant reviews + approves in Polaris panel
7. On approval: tags committed via GraphQL + $0.10 usage charge
8. GoHighLevel CRM synced with product updates

## Revenue Model
- $0.10 per product optimized
- First 10 products free per merchant
- Usage-based billing via Shopify Billing API

## Components
- **Shopify App:** React Router v7, TypeScript, Prisma, Polaris
- **n8n:** Self-hosted workflow engine
- **Firecrawl:** Web scraping → Markdown
- **OpenCode Go:** OpenAI-compatible API for tag generation (text-only)
- **GoHighLevel:** CRM lead sync
