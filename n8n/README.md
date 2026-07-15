# SmartTag AI — n8n Workflow Engine

## Overview

This directory contains the n8n workflow automation for the SmartTag AI pipeline.  
The pipeline scrapes product URLs, normalizes the data via an LLM, pushes structured products to Shopify, syncs metadata to GoHighLevel CRM, and optionally notifies Slack/ClickUp.

## Pipeline Architecture

```
[Cron Trigger] → [Firecrawl Pod] → [OpenCode Go Normalizer] → [Shopify Push Connector]
                                                                ↘ [GoHighLevel Sync]
                                                                ↘ [Notification Hub] (Slack + ClickUp)
```

## Micro-Components

### 1. Cron Trigger
- **Schedule:** Weekly, Monday at 00:00 UTC (`0 0 * * 1`)
- **Type:** `n8n-nodes-base.cronTrigger`

### 2. Firecrawl Pod
- **Purpose:** Scrapes target product URL to clean Markdown
- **Method:** `HTTP POST`
- **Endpoint:** `https://api.firecrawl.dev/v1/scrape`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{ FIRECRAWL_API_KEY }}`
- **Body:**
  ```json
  {
    "url": "{{ $json.url }}",
    "formats": ["markdown"]
  }
  ```
- **Output:** Raw Markdown of the product page
- **Credential:** n8n "Header Auth" credential for Firecrawl API key

### 3. OpenCode Go Normalizer
- **Purpose:** Parses raw Markdown → structured JSON via LLM
- **Method:** `HTTP POST`
- **Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{ OPENCODE_GO_API_KEY }}`
- **Model:** `qwen3.7-plus` ($0.40 / $1.60 per 1M tokens)
- **System Prompt:**
  ```
  You are a product data extractor. Given markdown from a product page, extract the following fields as JSON: title, price (number), body_html (HTML description), vendor, tags (array of strings), product_type. Only output valid JSON, no markdown fences.
  ```
- **Body:**
  ```json
  {
    "model": "qwen3.7-plus",
    "messages": [
      { "role": "system", "content": "You are a product data extractor..." },
      { "role": "user", "content": "{{ markdown_content }}" }
    ],
    "response_format": { "type": "json_object" },
    "temperature": 0.1
  }
  ```
- **Output:** `{ title, price, body_html, vendor, tags, product_type }`
- **Credential:** n8n "Header Auth" credential for OpenCode Go API key

### 4. Shopify Push Connector
- **Purpose:** Creates a product in Shopify via the app's ingestion endpoint
- **Method:** `HTTP POST`
- **Endpoint:** `https://{{ YOUR_APP_DOMAIN }}/api/ingest-product`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{ APP_INGEST_SECRET }}`
- **Body:** JSON from the Normalizer
- **Note:** The Shopify app's ingestion endpoint validates the secret, creates the product via Shopify REST Admin API, and logs the event.

### 5. GoHighLevel CRM Sync
- **Purpose:** Syncs a contact/lead record with product metadata tags
- **Method:** `HTTP POST`
- **Endpoint:** `https://rest.gohighlevel.com/v1/contacts/`
- **Headers:**
  - `Content-Type: application/json`
  - `Authorization: Bearer {{ GHL_API_KEY }}`
- **Body:**
  ```json
  {
    "email": "pipeline@smarttag.ai",
    "tags": ["smart-tag-ai", "product-synced", "{{ product_type }}"],
    "customField": {
      "last_synced_product": "{{ title }}",
      "last_synced_at": "{{ $now.toISOString() }}"
    }
  }
  ```

### 6. Notification Hub (Optional)
- **Slack:** Webhook POST on completion/failure
- **ClickUp:** POST to ClickUp API to create audit task

## n8n Installation

### Option A: Docker (Recommended)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_SECURE_COOKIE=false \
  -e WEBHOOK_URL=https://your-domain.com \
  n8nio/n8n
```

### Option B: npm Global Install

```bash
npm install -g n8n --legacy-peer-deps
n8n start
```

### Option C: npx (No Install)

```bash
npx n8n
```

Open the n8n editor at http://localhost:5678

## Credential Setup

After starting n8n, create the following credentials in the n8n UI:

| Credential Name   | Type              | Fields                     |
|-------------------|-------------------|----------------------------|
| Firecrawl API     | Header Auth       | API Key (Bearer token)     |
| OpenCode Go API   | Header Auth       | API Key (Bearer token)     |
| Shopify App Auth  | Header Auth       | APP_INGEST_SECRET          |
## Status

**Workflow deployed:** ✅ Live at https://n8n.monching-desierto.space/workflow/3iVv6KUSGPCcbEbH
**Workflow ID:** `3iVv6KUSGPCcbEbH`
**Project:** Monching Desierto (personal)

### Remaining: Configure Credentials

Open the workflow in n8n UI and set up credentials for each HTTP Request node:

| Node | Credential to create |
|------|---------------------|
| Firecrawl Scraper | Header Auth: `Authorization: Bearer fc-...` |
| OpenCode Go Parser | Header Auth: `Authorization: Bearer <opencode-go-key>` |
| Push to Shopify App | Header Auth: `Authorization: Bearer <APP_INGEST_SECRET>` |
| Sync to GoHighLevel | Header Auth: `Authorization: Bearer <ghl-api-key>` |
5. Activate the workflow

## Workflow Variables

The workflow expects these environment variables or n8n credentials:

| Variable               | Source              | Description                     |
|------------------------|---------------------|---------------------------------|
| FIRECRAWL_API_KEY      | n8n credential      | Firecrawl API key               |
| OPENCODE_GO_API_KEY    | n8n credential      | OpenCode Go API key             |
| APP_INGEST_SECRET      | n8n credential      | Shopify app ingestion secret    |
| GHL_API_KEY            | n8n credential      | GoHighLevel API key             |
| TARGET_URL             | Cron trigger param  | URL to scrape (editable in UI)  |

## Testing

To test the workflow without waiting for the cron schedule:

1. Open the workflow in n8n editor
2. Click **Execute Workflow** (play button)
3. Each node highlights green on success, red on failure
4. Inspect node outputs by clicking on each node

## Troubleshooting

- **Firecrawl returns 401:** Check `FIRECRAWL_API_KEY` credential
- **OpenCode Go returns 4xx:** Verify `OPENCODE_GO_API_KEY` and model name (`qwen3.7-plus`)
- **Shopify push fails:** Ensure the app's ingestion endpoint is reachable and `APP_INGEST_SECRET` matches
- **GHL sync fails:** Validate `GHL_API_KEY` and contact schema
- **Workflow not triggering:** Check the cron schedule is set and workflow is **Activated** (toggle in top bar)
