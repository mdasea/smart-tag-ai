# Shopify App — Technical Specification

## Routes
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/webhooks` | Receive PRODUCTS_CREATE events, generate tags via OpenCode Go, queue in DB | Shopify HMAC |
| GET | `/app` | Merchant approval panel — list pending AI tag suggestions in DataTable | `authenticate.admin` + `billing.require` |
| POST | `/app` | Approve (charges $0.10 usage record, updates product tags via `productUpdate` mutation) or reject a pending tag | `authenticate.admin` |
| POST | `/api/ingest-product` | External product ingestion from n8n (authenticated via Bearer token) | `APP_INGEST_SECRET` |
| GET | `/app/metrics` | Revenue and usage dashboard *(planned)* | TBD |

### Approval Panel (`app._index.tsx`)

**Loader**:
1. `authenticate.admin(request)` — validates session token
2. `billing.require({ plans: ["Pay-As-You-Go AI Tagging"] })` — ensures active billing
3. `db.pendingTag.findMany({ where: { shop, status: "PENDING" } })` — fetches pending records

**Action** (POST):
- **Approve**: calls `productUpdate` GraphQL mutation with `suggestedTags` → creates usage record via `billing.createUsageRecord({ price: { amount: 0.1, currencyCode: "USD" } })` → updates DB status to `APPROVED`
- **Reject**: updates DB status to `REJECTED`

**UI Components** (from @shopify/polaris):
- `Page`, `Card`, `DataTable`, `Button`, `Thumbnail`, `Banner`, `InlineStack`, `Text`, `BlockStack`
- Empty state shown via `Banner` when no pending items
- Each row has thumbnail, product title, suggested tags, and action buttons (Approve & Charge $0.10 / Reject)

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
