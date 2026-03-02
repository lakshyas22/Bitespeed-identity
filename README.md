# Bitespeed Identity Reconciliation

A REST API service that identifies and tracks customer identity across multiple purchases using different contact information.

## Live Endpoint

```
POST https://YOUR_APP.onrender.com/identify
```

## Tech Stack

- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (production) / SQLite (development)

## Local Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Server runs at `http://localhost:3000`

## API

### POST /identify

**Request Body:**
```json
{
  "email": "string (optional)",
  "phoneNumber": "string (optional)"
}
```

At least one of `email` or `phoneNumber` is required.

**Response:**
```json
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["primary@example.com", "secondary@example.com"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

### GET /health

Returns service status.

```json
{
  "status": "ok",
  "message": "Bitespeed Identity Service is running",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": "120s"
}
```

## Database Schema

```prisma
model Contact {
  id             Int       @id @default(autoincrement())
  phoneNumber    String?
  email          String?
  linkedId       Int?
  linkPrecedence String
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  deletedAt      DateTime?
}
```

## How it works

- If no existing contact matches, a new primary contact is created.
- If an incoming request matches an existing contact but has new information, a secondary contact is created and linked to the primary.
- If two separate contact clusters get linked, the older one stays as primary and the newer one is demoted to secondary.
- The primary contact is always the oldest one in the cluster.
