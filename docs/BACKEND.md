# ValidationCrew - Backend Standards

## Backend Overview

The backend is built using

- Node.js
- Express.js
- PostgreSQL

The backend is responsible for

- Authentication
- Authorization
- Business Logic
- Database Operations
- Payment Processing
- Notifications
- Validation
- Security

The backend should never contain frontend presentation logic.

---

# Backend Architecture

The backend follows a layered architecture.

```
Client

↓

Route

↓

Middleware

↓

Controller

↓

Service

↓

Database

↓

Response
```

Every request should follow this flow.

Never skip layers.

---

# Folder Structure

```
backend/

src/

routes/

controllers/

services/

middleware/

utils/

db.js

schema.sql
```

Each folder should have one responsibility.

---

# Routes

Routes define API endpoints.

Responsibilities

- Receive requests
- Apply middleware
- Forward requests to controllers

Routes should remain lightweight.

Do not implement business logic inside routes.

---

# Controllers

Controllers

Receive validated requests

↓

Call services

↓

Return responses

Controllers should

- Validate request format
- Call business services
- Return standardized responses

Avoid writing SQL inside controllers.

---

# Services

Business logic belongs inside services.

Examples

- Mission Service
- Wallet Service
- Payment Service
- Notification Service
- Authentication Service

Services should be reusable and independent.

---

# Middleware

Middleware handles cross-cutting concerns.

Examples

- Authentication
- Authorization
- Validation
- Logging
- Error Handling
- Rate Limiting

Avoid duplicating middleware logic.

---

# Utility Functions

Utilities contain reusable helper functions.

Examples

- Date formatting
- Token generation
- Validation helpers
- Response formatting
- File utilities

Never duplicate utility logic.

---

# API Design

Design APIs to be

Consistent

Predictable

RESTful

Readable

Avoid unnecessary endpoints.

Reuse existing APIs whenever appropriate.

---

# HTTP Methods

Use proper HTTP verbs.

GET

Retrieve data.

POST

Create new resources.

PUT

Replace existing resources.

PATCH

Update partial resources.

DELETE

Remove resources.

Never misuse HTTP methods.

---

# API Response Format

Successful Response

```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully."
}
```

Error Response

```json
{
  "success": false,
  "message": "Meaningful error message."
}
```

Keep responses consistent across the application.

---

# Input Validation

Validate every request.

Examples

- Required fields
- Data types
- Email format
- Phone numbers
- URLs
- Numeric values
- IDs
- Dates

Never trust incoming requests.

---

# Authentication

Protected APIs must verify

- JWT
- User
- Session
- Token expiration

Authentication should always happen before business logic.

---

# Authorization

Always verify permissions.

Examples

Builder

↓

Can access Builder APIs.

Validator

↓

Can access Validator APIs.

Admin

↓

Can access Admin APIs.

Never trust role information sent from the frontend.

Always verify against the database.

---

# Error Handling

Handle errors consistently.

Return meaningful messages.

Avoid exposing

- SQL errors
- Stack traces
- Internal server information

Unexpected errors should be logged.

---

# Logging

Log

- Authentication failures
- Validation failures
- Payment failures
- Unexpected exceptions

Never log

- Passwords
- JWTs
- OTPs
- Secrets
- API keys

---

# Database Access

All database operations should

- Use parameterized queries
- Handle transactions
- Release connections properly
- Prevent SQL Injection

Database logic should remain separate from controllers.

---

# Transactions

Use transactions for critical operations.

Examples

- Wallet updates
- Payments
- Withdrawals
- Mission approvals
- Multi-table updates

Commit only when all operations succeed.

Rollback on failure.

---

# File Uploads

Validate

- File type
- File size
- MIME type

Reject unsafe uploads.

Rename uploaded files when necessary.

Never trust original filenames.

---

# External Services

External integrations include

- Firebase
- Google OAuth
- Razorpay
- OpenAI
- Resend

External service failures should not crash the application.

Handle failures gracefully.

---

# Environment Variables

Store sensitive values in

```
.env
```

Examples

Database URL

JWT Secret

Firebase Keys

Google OAuth Credentials

Razorpay Keys

OpenAI API Key

Never hardcode secrets.

Never commit `.env`.

---

# Async Operations

Prefer

async/await

Avoid deeply nested Promise chains.

Handle asynchronous errors correctly.

---

# Rate Limiting

Protect sensitive APIs.

Examples

- Login
- OTP
- Password Reset
- Payments
- Webhooks

Prevent abuse.

---

# Performance

Avoid

Repeated database queries

Repeated authentication

Duplicate business logic

Large responses

Heavy synchronous work

Optimize only after measuring performance.

---

# Background Tasks

Long-running operations should execute outside request-response cycles when appropriate.

Examples

- Email sending
- Notification processing
- AI generation
- Report generation

Keep API responses fast.

---

# API Versioning

When introducing breaking changes,

consider API versioning.

Maintain backward compatibility whenever practical.

---

# Dependency Management

Avoid unnecessary packages.

Prefer existing project utilities.

Keep dependencies updated.

Remove unused packages.

---

# Backend Testing Checklist

Before committing verify

✓ APIs return expected responses

✓ Proper status codes

✓ Authentication works

✓ Authorization works

✓ Validation works

✓ SQL queries succeed

✓ Transactions commit correctly

✓ Rollbacks work

✓ No unhandled exceptions

✓ Railway deployment compatibility

---

# Backend Engineering Principles

Write backend code that is

Readable

Reusable

Secure

Scalable

Maintainable

Reliable

Every endpoint should have a clear responsibility.

Every service should solve one business problem.

---

# Final Backend Rule

The backend is the source of truth.

All business rules, security checks, authorization, validation, and database operations must be enforced on the backend.

Never rely on the frontend to enforce business logic.