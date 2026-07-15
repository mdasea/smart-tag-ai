# SmartTag AI — n8n Workflow

## Overview

This n8n workflow orchestrates the SmartTag AI pipeline: scrape supplier sites → parse with AI → push to Shopify → sync CRM.

## Architecture

```
[Cron Trigger] → [Firecrawl] → [OpenCode Go] → [Shopify Push]
                                              ↘ [GoHighLevel Sync]
```

## Prerequisites

- **n8n instance** (self-hosted or cloud)
- API keys for: Firecrawl, OpenCode Go, Shopify app ingestion, GoHighLevel

## Setup

### 1. Import Workflow

1. Open your n8n instance
2. Go to **Workflows** → **Import from File**
3. Select `n8n/smart-tag-ai-workflow.json`
4. Click **Save**

### 2. Configure Credentials

Create these credentials in n8n (Settings → Credentials):

| Credential | Type | Fields |
|------------|------|--------|
| Firecrawl API Key | Header Auth | `Authorization: Bearer fc-...` |
| OpenCode Go API Key | Header Auth | `Authorization: Bearer your-key` |
| App Ingestion Secret | Header Auth | `Authorization: Bearer <APP_INGEST_SECRET>` |
| GoHighLevel API Key | Header Auth | `Authorization: Bearer your-ghl-key` |

### 3. Configure Nodes

Update node parameters after importing:

| Node | Parameter | Value |
|------|-----------|-------|
| **Weekly Check** | Schedule | `0 0 * * 1` (Mondays) — adjust as needed |
| **Firecrawl Scraper** | URL | Target supplier product page |
| **Push to Shopify App** | URL | Your Shopify app's ngrok/production URL + `/api/ingest-product` |
| **Sync to GoHighLevel** | URL / email | Your GoHighLevel sub-account + contact email |

### 4. Activate

Toggle the workflow to **Active**. It will run on the cron schedule.

## Micro-Components

### 1. Cron Trigger
- Schedule: Weekly (Monday 00:00)
- Fires the pipeline once per week

### 2. Firecrawl Scraper
- Method: POST to `https://api.firecrawl.dev/v1/scrape`
- Input: Target URL + format `markdown`
- Output: Raw Markdown of the product page

### 3. OpenCode Go Parser
- Method: POST to `https://opencode.ai/zen/go/v1/chat/completions`
- Model: `qwen3.7-plus`
- Input: Raw Markdown from Firecrawl
- Output: Structured JSON `{ title, price, body_html }`
- Cost: ~$0.40/1M input tokens (cheap for this task)

### 4. Shopify Push
- Method: POST to your app's `/api/ingest-product`
- Auth: Bearer token (`APP_INGEST_SECRET`)
- Body: `{ title, body_html, price }`
- Result: Product queued for AI tag approval

### 5. GoHighLevel Sync
- Method: POST to `https://rest.gohighlevel.com/v1/contacts/`
- Updates: Contact tags + custom field `last_product_synced`
- Runs in parallel with Shopify Push

## Testing

1. Click **Execute Workflow** (manual trigger)
2. Watch data flow through each node
3. Verify:
   - Firecrawl returns valid Markdown
   - OpenCode Go returns valid JSON
   - Shopify app receives the product
   - GoHighLevel contact updated

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Firecrawl returns 401 | Invalid API key | Check Firecrawl credential |
| OpenCode Go returns gibberish | Model not parsing Markdown correctly | Adjust system prompt in node |
| Shopify returns 401 | Wrong ingestion secret | Match `APP_INGEST_SECRET` env var |
| GHL returns 404 | Wrong API endpoint | Verify GoHighLevel sub-account URL |
