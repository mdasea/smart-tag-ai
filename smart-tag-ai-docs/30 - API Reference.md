# API Reference

> All HTTP endpoints, request/response shapes, and authentication.

---

## POST /api/webhooks

**Purpose:** Shopify webhook handler for product events.
**Auth:** Shopify HMAC verification via `authenticate.webhook()` (handled by Shopify SDK).

### Request
Triggered by Shopify when a product is created. Payload is the full [Product object](https://shopify.dev/docs/api/admin-graphql/latest/objects/Product).

### Response
`200 OK` — empty body. Webhook processed silently.

### Behavior
1. Receives `PRODUCTS_CREATE` webhook
2. Extracts `admin_graphql_api_id`, title, body_html, and first image URL
3. Calls OpenCode Go API (`qwen3.7-plus`) with system prompt:
   - _"You are an e-commerce SEO expert. Return ONLY 5 comma-separated tags."_
   - Sends product title + description as context
4. Saves result as `PendingTag` with `status: "PENDING"`

---

## POST /api/ingest-product

**Purpose:** External product ingestion from n8n workflow.
**Auth:** Bearer token matching `APP_INGEST_SECRET` env var.

### Request
```json
{
  "title": "Product Name",
  "body_html": "<p>Product description</p>",
  "price": "29.99",
  "image_url": "https://example.com/image.jpg"
}
```

### Response (200)
```json
{
  "success": true,
  "message": "Product queued for AI tagging",
  "product": { "title": "Product Name", "price": "29.99" }
}
```

### Response (400 — missing fields)
```json
{
  "success": false,
  "error": "title and body_html are required"
}
```

### Response (401)
Empty body, thrown as HTTP exception.

---

## PendingTag — Database Schema

| Field | Type | Notes |
|-------|------|-------|
| id | String (UUID) | Primary key, auto-generated |
| shop | String | Shopify store domain (multi-tenant key) |
| productId | String | Shopify GraphQL product ID (unique) |
| productTitle | String | Product name |
| imageUrl | String? | First product image URL |
| suggestedTags | String | Comma-separated AI tags |
| tagQualityScore | Float? | 0–100 quality rating (future) |
| status | String | `PENDING`, `APPROVED`, or `REJECTED` |
| createdAt | DateTime | Auto-generated timestamp |

## OpenCode Go API Integration

**Endpoint:** `https://opencode.ai/zen/go/v1/chat/completions`
**Model:** `qwen3.7-plus`
**Auth:** Bearer token via `OPENCODE_GO_API_KEY`

### Request Shape
```json
{
  "model": "qwen3.7-plus",
  "messages": [
    { "role": "system", "content": "You are an e-commerce SEO expert..." },
    { "role": "user", "content": "Product title: \"...\"\nProduct description: \"...\"\n\nGenerate exactly 5 SEO-optimized product tags:" }
  ],
  "temperature": 0.3,
  "max_tokens": 80
}
```

### Response Shape
```json
{
  "choices": [
    { "message": { "content": "tag1, tag2, tag3, tag4, tag5" } }
  ]
}
```

---

## Shopify Billing Plan

| Field | Value |
|-------|-------|
| Plan Name | Pay-As-You-Go AI Tagging |
| Amount | $10.00 (minimum commitment) |
| Interval | Usage |
| Rate | $0.10 per approved product |
| First 10 | Free (no charge) |
| Billing API | `billing.createUsageRecord({ price: 0.10 })` |
