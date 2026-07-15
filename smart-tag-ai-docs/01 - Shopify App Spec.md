# Shopify App — Technical Specification

## Routes
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/webhooks` | Receive PRODUCTS_CREATE events, generate tags via OpenCode Go, queue in DB |
| GET | `/app` | Merchant approval panel (Polaris DataTable) |
| POST | `/app` | Approve/reject tags, update product, create usage charge |
| POST | `/api/ingest-product` | External product ingestion from n8n (authenticated) |
| GET | `/app/metrics` | Revenue and usage dashboard |

## Database (Prisma)

### PendingTag
| Field | Type | Description |
|-------|------|-------------|
| id | String (UUID) | Primary key |
| shop | String | Shopify store domain (multi-tenant) |
| productId | String (GraphQL ID) | Unique product identifier |
| productTitle | String | Product name |
| imageUrl | String? | Product image URL |
| suggestedTags | String | Comma-separated AI-generated tags |
| tagQualityScore | Float? | 0-100 AI quality rating |
| status | String (ENUM) | PENDING, APPROVED, REJECTED |
| createdAt | DateTime | Auto-generated timestamp |

## Billing
- Plan: "Pay-As-You-Go AI Tagging"
- Rate: $0.10 per approved product
- First 10 products: free per merchant
- Billing mode: Usage (Shopify Billing API)

## API Endpoints

### POST /api/ingest-product
- Auth: Bearer token (APP_INGEST_SECRET)
- Body: `{ title, body_html, price, image_url }`
- Action: Creates product in Shopify sandbox → queues for tagging

### POST /api/webhooks
- Auth: Shopify webhook HMAC verification
- Triggers: PRODUCTS_CREATE
- Action: OpenCode Go tag generation → saves PendingTag
