# n8n Workflow Architecture

## Overview
n8n runs on a **VPS** (user's own instance). The workflow JSON is imported into it. No local n8n installation needed.

## Pipeline (5 Micro-Components)

### 1. Cron Trigger
- Schedule: Weekly (0 0 * * 1 — Monday 00:00)
- Triggers the full pipeline

### 2. Firecrawl Scraper Pod
- **Input:** Target URL
- **Output:** Clean Markdown
- **Method:** POST to `https://api.firecrawl.dev/v1/scrape`
- **Auth:** Bearer token (Firecrawl API key)

### 3. OpenCode Go Normalizer
- **Input:** Raw Markdown
- **Output:** Structured JSON `{ title, price, body_html }`
- **Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
- **Model:** `qwen3.7-plus`
- **Prompt:** System prompt tells it to extract structured JSON from product markdown

### 4. Shopify Push Connector
- **Input:** Structured JSON
- **Action:** POST to app's `/api/ingest-product`
- **Auth:** Bearer `APP_INGEST_SECRET` (shared secret)

### 5. GoHighLevel CRM Sync
- **Input:** Product metadata
- **Action:** POST to `https://rest.gohighlevel.com/v1/contacts/`
- **Updates:** Tags `catalog-synced`, custom field `last_product_synced`

## Visual Layout
```
[Cron] → [Firecrawl] → [OpenCode Go] → [Shopify Push]
                                      ↘ [GHL Sync]
```

## Files
| File | Purpose |
|------|---------|
| `n8n/smart-tag-ai-workflow.json` | Importable n8n workflow (valid JSON) |
| `n8n/README.md` | Setup guide: credentials, node config, troubleshooting |

## Required Credentials (in n8n)
| Credential | Type | For |
|------------|------|-----|
| Firecrawl | Header Auth (Bearer) | Firecrawl API |
| OpenCode Go | Header Auth (Bearer) | AI parsing |
| App Ingestion Secret | Header Auth (Bearer) | Shopify app auth |
| GoHighLevel | Header Auth (Bearer) | CRM sync |

## Setup
1. Open n8n VPS instance → Import `n8n/smart-tag-ai-workflow.json`
2. Create credentials for each API
3. Update node URLs (firecrawl target, shopify app URL, GHL sub-account)
4. Activate workflow
