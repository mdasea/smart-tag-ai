# n8n Workflow Architecture

## Pipeline (5 Micro-Components)

### 1. Cron Trigger
- Schedule: Weekly (0 0 * * 1)
- Triggers the full pipeline

### 2. Firecrawl Scraper Pod
- Input: Target URL
- Output: Clean Markdown
- Config: POST to `https://api.firecrawl.dev/v1/scrape`
- Auth: Bearer token header

### 3. OpenCode Go Normalizer
- Input: Raw Markdown
- Output: Structured JSON `{ title, price, body_html }`
- Endpoint: `https://opencode.ai/zen/go/v1/chat/completions`
- Model: `qwen3.7-plus` ($0.40/$1.60 per 1M tokens)
- Prompt: Extract structured product data from markdown

### 4. Shopify Push Connector
- Input: Structured JSON
- Action: POST to `https://your-app-domain.com/api/ingest-product`
- Auth: Bearer APP_INGEST_SECRET

### 5. GoHighLevel CRM Sync
- Input: Product metadata
- Action: POST to `https://rest.gohighlevel.com/v1/contacts/`
- Updates: Tags + custom fields with last synced product

### 6. Notification Hub (optional)
- Slack: Completion/failure alerts
- ClickUp: Auto-create audit tickets

## Visual Layout
```
[Cron] → [Firecrawl] → [OpenCode Go] → [Shopify Push]
                                      ↘ [GHL Sync]
                                      ↘ [Slack/ClickUp]
```
