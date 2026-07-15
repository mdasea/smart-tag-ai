# n8n Workflow Architecture

## Overview

n8n orchestrates the SmartTag AI scraping→normalizing→publishing pipeline. The workflow runs on a weekly cron schedule and coordinates 5 micro-components.

## Pipeline Flow

```
[Cron Trigger] → [Firecrawl Scrape] → [Extract Markdown (Code)]
                                           ↓
                                    [OpenCode Go Normalizer (LLM)]
                                           ↓
                                    [Parse LLM Response (Code)]
                                      /          \
                            [Shopify Push]   [GoHighLevel Sync]
```

## Installation

n8n can be installed via Docker or npm:

### Docker (Recommended)

```bash
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_SECURE_COOKIE=false \
  n8nio/n8n
```

### npm Global Install

```bash
npm install -g n8n --legacy-peer-deps
n8n start
```

**Status:** n8n v2.30.5 is the installed version. Runs on port 5678.
**Access:** Open http://localhost:5678 in your browser after starting.

## Micro-Components

### 1. Cron Trigger
- **Type:** `n8n-nodes-base.cronTrigger` (v1.2)
- **Schedule:** Weekly, Monday at 00:00 UTC (`0 0 * * 1`)
- **Purpose:** Initiates the full pipeline on schedule
- **Note:** Also triggerable manually via "Execute Workflow" button during testing

### 2. Firecrawl Scrape Pod
- **Type:** `n8n-nodes-base.httpRequest` (v4.2)
- **Method:** `POST`
- **Endpoint:** `https://api.firecrawl.dev/v1/scrape`
- **Auth:** Bearer token via "Firecrawl API" Header Auth credential
- **Request Body:**
  ```json
  {
    "url": "{{ target URL }}",
    "formats": ["markdown"]
  }
  ```
- **Timeout:** 30 seconds
- **Response Shape:** `{ success: boolean, data: { markdown: string, url: string, title?: string } }`
- **Credential:** `httpHeaderAuth` with Bearer `FIRECRAWL_API_KEY`

### 3. Extract Markdown (Code Node)
- **Type:** `n8n-nodes-base.code` (v2)
- **Language:** JavaScript
- **Purpose:** Extracts clean markdown from the Firecrawl API response. Firecrawl returns nested data under `data.markdown` — this node normalizes it to a flat `{ markdown, url, title }` object for the next step.

### 4. OpenCode Go Normalizer
- **Type:** `n8n-nodes-base.httpRequest` (v4.2)
- **Method:** `POST`
- **Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
- **Auth:** Bearer token via "OpenCode Go API" Header Auth credential
- **Model:** `qwen3.7-plus` ($0.40 per 1M input tokens, $1.60 per 1M output)
- **System Prompt:**
  ```
  You are a product data extractor. Given markdown from a product page, extract the following fields as JSON: title (string), price (number), body_html (string, HTML description for Shopify), vendor (string), tags (array of strings), product_type (string). Only output valid JSON. No markdown fences, no explanation.
  ```
- **Request Body:**
  ```json
  {
    "model": "qwen3.7-plus",
    "messages": [
      { "role": "system", "content": "(system prompt)" },
      { "role": "user", "content": "{{ $json.markdown }}" }
    ],
    "temperature": 0.1,
    "response_format": { "type": "json_object" }
  }
  ```
- **Timeout:** 60 seconds (LLM calls can be slow)
- **Output:** Standard OpenAI chat completions format with `choices[0].message.content` containing JSON
- **Credential:** `httpHeaderAuth` with Bearer `OPENCODE_GO_API_KEY`

### 5. Parse LLM Response (Code Node)
- **Type:** `n8n-nodes-base.code` (v2)
- **Language:** JavaScript
- **Purpose:** Parses the JSON string from the OpenCode Go response into a structured `{ title, price, body_html, vendor, tags, product_type }` object. Handles parse failures gracefully with a fallback object.

### 6. Shopify Push Connector
- **Type:** `n8n-nodes-base.httpRequest` (v4.2)
- **Method:** `POST`
- **Endpoint:** `https://{{ YOUR_APP_DOMAIN }}/api/ingest-product`
- **Auth:** Bearer token via "Shopify App Auth" Header Auth credential
- **Request Body:**
  ```json
  {
    "title": "{{ $json.title }}",
    "price": "{{ $json.price }}",
    "body_html": "{{ $json.body_html }}",
    "vendor": "{{ $json.vendor }}",
    "tags": "{{ $json.tags.join(', ') }}",
    "product_type": "{{ $json.product_type }}"
  }
  ```
- **Timeout:** 30 seconds
- **Credential:** `httpHeaderAuth` with Bearer `APP_INGEST_SECRET`

### 7. GoHighLevel CRM Sync
- **Type:** `n8n-nodes-base.httpRequest` (v4.2)
- **Method:** `POST`
- **Endpoint:** `https://rest.gohighlevel.com/v1/contacts/`
- **Auth:** Bearer token via "GoHighLevel API" Header Auth credential
- **Request Body:**
  ```json
  {
    "email": "pipeline@smarttag.ai",
    "tags": ["smart-tag-ai", "product-synced", "{{ product_type }}"],
    "customField": {
      "last_synced_product": "{{ title }}",
      "last_synced_at": "{{ ISO timestamp }}"
    }
  }
  ```
- **Timeout:** 30 seconds
- **Credential:** `httpHeaderAuth` with Bearer `GHL_API_KEY`

## Credential Requirements

The workflow uses 4 Header Auth credentials in n8n:

| Credential Name      | Auth Type    | Secret / Value              | Used By                       |
|----------------------|--------------|-----------------------------|-------------------------------|
| Firecrawl API        | Header Auth  | `FIRECRAWL_API_KEY`         | Firecrawl Scrape              |
| OpenCode Go API      | Header Auth  | `OPENCODE_GO_API_KEY`       | OpenCode Go Normalizer        |
| Shopify App Auth     | Header Auth  | `APP_INGEST_SECRET`         | Shopify Push                  |
| GoHighLevel API      | Header Auth  | `GHL_API_KEY`               | GoHighLevel Sync              |

## Workflow File

The complete workflow JSON is at `n8n/smart-tag-ai-workflow.json` in the project root.

**Structure:**
- 7 nodes connected in sequence
- Parallel fan-out from Parse LLM Response to Shopify Push + GHL Sync
- 4 credential placeholders (set IDs 1-4)
- Empty pinData and staticData for clean import

**To import:**
1. Start n8n (`docker start n8n` or `n8n start`)
2. Open http://localhost:5678
3. Click **Workflows → Import from File**
4. Select `n8n/smart-tag-ai-workflow.json`
5. Create the 4 credentials in Settings → Credentials
6. Update the credential IDs in each HTTP Request node
7. Set the Shopify app domain and target URL
8. Activate the workflow (toggle in top bar)

## Testing

1. Open the workflow in n8n editor
2. Click "Execute Workflow" (play button)
3. Each node turns green on success, red with error details on failure
4. Inspect intermediate outputs by clicking each node

## Notification Hub (Optional)

The workflow can be extended with:

- **Slack:** Add a Webhook node sending `POST` to a Slack Incoming Webhook URL with pipeline status
- **ClickUp:** Add an HTTP Request node posting to ClickUp API to create audit tasks on completion

Add these as parallel branches from the Parse LLM Response node (same pattern as GHL Sync).

## Environment Variables

The `.env.example` file documents required secrets:

```bash
OPENCODE_GO_API_KEY=your-opencode-go-api-key
APP_INGEST_SECRET=generate-a-random-secret
```

Additional secrets needed for n8n credentials:

```bash
FIRECRAWL_API_KEY=your-firecrawl-key
GHL_API_KEY=your-gohighlevel-api-key
```
