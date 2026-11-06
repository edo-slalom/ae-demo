# Smart Returns Portal — Technical Specification

## 1. Overview

The Smart Returns Portal is a self-service web application that allows customers to initiate product returns without calling customer support. Customers enter their order number and email to look up an order, select the items they wish to return, provide a reason, and receive a Return Authorization (RA) number along with a prepaid shipping label URL. This reduces call center volume, accelerates resolution time, and measurably improves post-purchase customer satisfaction.

## 2. Acceptance Criteria

**AC-1:** Given a customer with a valid order placed within the last 30 days, when they enter their order number and email address, then the system displays the order details and the number of return-window days remaining.

**AC-2:** Given a valid order number, when the associated order is older than 30 days, then the system returns an error indicating the return window has closed and displays the number of days since it expired.

**AC-3:** Given an order number that does not exist in the system, when the customer submits a lookup, then the system returns a 404 error with a clear message.

**AC-4:** Given a valid, eligible order, when the customer selects at least one item, chooses a return reason, and submits, then the system creates a return record and responds with a unique RA number.

**AC-5:** Given a successful return submission, when the system responds, then the response includes a prepaid shipping label URL.

**AC-6:** Given an admin user, when they navigate to `/admin`, then they see a list of all submitted return requests with RA number, order reference, items, reason, and status.

## 3. API Contracts

### POST /returns/lookup
Validates an order and checks return eligibility before the customer selects items.

**Request:**
```json
{
  "orderNumber": "ORD-1001",
  "email": "alice@example.com"
}
```

**Response 200:**
```json
{
  "order": {
    "id": "ORD-1001",
    "email": "alice@example.com",
    "date": "2024-11-01T00:00:00.000Z",
    "items": [
      { "id": "ITEM-A", "name": "Wireless Headphones", "qty": 1, "price": 89.99 }
    ],
    "status": "delivered"
  },
  "eligible": true,
  "daysRemaining": 20
}
```

**Errors:**
- `404` Order not found
- `403` Email does not match order
- `422` Return window expired (includes `daysOld` field)

---

### POST /returns
Submits a return request for eligible items.

**Request:**
```json
{
  "orderNumber": "ORD-1001",
  "email": "alice@example.com",
  "items": [
    { "id": "ITEM-A", "name": "Wireless Headphones", "qty": 1, "price": 89.99 }
  ],
  "reason": "Defective product"
}
```

**Response 201:**
```json
{
  "id": "RA-A1B2C3D4",
  "orderNumber": "ORD-1001",
  "email": "alice@example.com",
  "items": [...],
  "reason": "Defective product",
  "status": "pending",
  "shippingLabel": "https://shipping.example.com/label/RA-A1B2C3D4",
  "createdAt": "2024-11-06T10:30:00.000Z"
}
```

**Errors:** Same as /returns/lookup.

---

### GET /admin/returns
Returns all submitted return requests.

**Response 200:** Array of return records (see POST /returns response schema).

---

### GET /health
**Response 200:** `{ "status": "ok", "uptime": 42.1 }`

## 4. Data Model

### Order

| Field  | Type   | Description                          |
|--------|--------|--------------------------------------|
| id     | string | Order identifier, e.g. `ORD-1001` |
| email  | string | Customer email address               |
| date   | Date   | Date the order was placed            |
| items  | Item[] | Line items in the order              |
| status | string | `delivered` / `in-transit`      |

### Item

| Field | Type   | Description                |
|-------|--------|----------------------------|
| id    | string | Item identifier            |
| name  | string | Product display name       |
| qty   | number | Quantity ordered           |
| price | number | Unit price in USD          |

### Return

| Field         | Type   | Description                                    |
|---------------|--------|------------------------------------------------|
| id            | string | RA number, e.g. `RA-A1B2C3D4`               |
| orderNumber   | string | Reference to originating order                 |
| email         | string | Customer email                                 |
| items         | Item[] | Items being returned                           |
| reason        | string | Customer-selected return reason                |
| status        | string | `pending` / `approved` / `shipped`      |
| shippingLabel | string | Mock prepaid label URL                         |
| createdAt     | Date   | Timestamp of submission                        |

## 5. Implementation Plan

1. Set up Express server with CORS middleware and static file serving from `public/`
2. Initialise in-memory `orders` Map seeded with 3 sample orders (one recent, one at the edge, one expired)
3. Initialise in-memory `returns` Map
4. Implement `GET /health`
5. Implement `POST /returns/lookup` with order lookup, email validation, and 30-day window check
6. Implement `POST /returns` with RA number generation (UUID-based) and shipping label mock
7. Implement `GET /admin/returns`
8. Build multi-step frontend: Step 1 order lookup → Step 2 item selection + reason → Step 3 confirmation
9. Write smoke tests using `node:test` covering all four key scenarios

## 6. Out of Scope

- Actual carrier API integration — shipping label is a mock URL
- Email notifications to customers upon return submission
- Refund or credit processing
- Authentication or authorisation for the admin dashboard
- Database persistence — in-memory store only for this iteration
- Return status updates after initial submission
- Multi-language / internationalisation support
