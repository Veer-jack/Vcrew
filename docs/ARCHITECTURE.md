# ValidationCrew - System Architecture

## Architecture Overview

ValidationCrew is a modular full-stack SaaS application.

The system is composed of multiple independent applications that share a common backend and PostgreSQL database.

Each application has a clearly defined responsibility.

Never mix responsibilities across applications.

---

# High-Level Architecture

```
                        Internet
                            │
                            ▼
                  Marketing Website
                            │
                 ---------------------
                 │                   │
                 ▼                   ▼
         Builder Application   Validator Application
                 │                   │
                 └─────────┬─────────┘
                           ▼
                    Express Backend API
                           │
                           ▼
                    PostgreSQL Database
                           │
                           ▼
                  Railway Deployment
```

---

# Repository Structure

```
Vcrew/

├── frontend/
│
│   ├── src/
│   │
│   ├── pages/          → Builder Application
│   ├── vpages/         → Validator Application
│   ├── apages/         → Admin Application
│   ├── components/     → Shared Components
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── assets/
│   └── styles/
│
├── backend/
│
│   ├── src/
│   │
│   ├── routes/
│   ├── middleware/
│   ├── controllers/
│   ├── services/
│   ├── utils/
│   ├── db.js
│   └── schema.sql
│
├── site/
│
│   └── Marketing Website
│
├── CLAUDE.md
└── docs/
```

---

# Application Responsibilities

## Marketing Website

Purpose

- Public landing page
- SEO
- Product information
- Pricing
- Authentication entry point

Should NOT contain

- Dashboard logic
- Business logic
- Database logic

---

## Builder Application

Purpose

Builders create and manage validation missions.

Responsibilities

- Authentication
- Dashboard
- Mission Creation
- Mission Management
- Audience Selection
- Reward Configuration
- Analytics
- Payments
- Wallet
- Profile

Builder code lives inside

```
frontend/src/pages
```

---

## Validator Application

Purpose

Validators discover and complete missions.

Responsibilities

- Authentication
- Dashboard
- Mission Discovery
- Secure Brief
- Workspace
- Submission
- Wallet
- Withdrawals
- Notifications
- Profile

Validator code lives inside

```
frontend/src/vpages
```

---

## Admin Application

Purpose

Administrative management.

Responsibilities

- User Management
- Mission Monitoring
- Reports
- Payment Oversight
- Platform Configuration
- Moderation

Admin code lives inside

```
frontend/src/apages
```

---

# Shared Components

Reusable UI belongs inside

```
frontend/src/components
```

Examples

- Button
- Modal
- Input
- Table
- Badge
- Card
- Loader
- Navbar
- Pagination

Avoid duplicate UI components.

---

# Backend Architecture

Backend responsibilities

- Authentication
- Authorization
- Business Logic
- Database Operations
- Validation
- Payment Processing
- Notifications

The backend should never contain UI logic.

---

# Route Organization

Routes belong inside

```
backend/src/routes
```

Each route should

- Handle one resource
- Validate requests
- Delegate business logic
- Return consistent responses

Avoid large route files.

---

# Controllers

Controllers should

- Receive requests
- Validate input
- Call services
- Return responses

Controllers should not contain complex business logic.

---

# Services

Business logic belongs inside services.

Examples

- Mission Service
- Wallet Service
- Payment Service
- Notification Service

Services should be reusable.

---

# Middleware

Middleware should handle

- Authentication
- Authorization
- Validation
- Logging
- Error Handling

Avoid duplicating middleware logic.

---

# Database Layer

Database access should be centralized.

Responsibilities

- Execute SQL
- Manage transactions
- Handle connection pooling

Never scatter database logic across unrelated files.

---

# API Flow

Typical request lifecycle

```
Frontend

↓

API Request

↓

Express Route

↓

Middleware

↓

Controller

↓

Service

↓

Database

↓

Service

↓

Controller

↓

Response

↓

Frontend
```

Business logic should never skip layers.

---

# Authentication Flow

```
User Login

↓

Credentials Verified

↓

JWT Generated

↓

Token Stored

↓

Protected API Request

↓

JWT Verification

↓

Authorization Check

↓

Business Logic

↓

Response
```

Authentication should always be verified on the backend.

---

# Builder Request Flow

```
Builder

↓

Builder Dashboard

↓

Builder API

↓

Express Backend

↓

PostgreSQL

↓

Response

↓

Dashboard Updated
```

Builder APIs should use Builder-specific endpoints.

---

# Validator Request Flow

```
Validator

↓

Validator Dashboard

↓

Validator API

↓

Express Backend

↓

PostgreSQL

↓

Response

↓

Dashboard Updated
```

Validator APIs should remain separate from Builder APIs.

---

# API Clients

Builder frontend

Uses

```
api/client
```

Validator frontend

Uses

```
vapi/client
```

Never mix Builder and Validator API clients.

---

# Data Flow Principles

Data should flow

```
Database

↓

Backend

↓

API

↓

Frontend

↓

UI
```

Avoid bypassing backend validation.

---

# State Management

Store only necessary state.

Avoid

- Duplicate state
- Derived state
- Global state when local state is sufficient

Keep state predictable.

---

# Error Flow

```
Database Error

↓

Service

↓

Controller

↓

Standardized API Response

↓

Frontend Error Handling

↓

User-Friendly Message
```

Never expose internal server errors directly to users.

---

# Logging Flow

Log

- Authentication failures
- Validation failures
- Payment failures
- Unexpected exceptions

Do not log

- Passwords
- JWTs
- OTPs
- Secrets

---

# External Integrations

ValidationCrew integrates with

- PostgreSQL
- Railway
- Firebase
- Google OAuth
- Razorpay
- OpenAI
- Resend Email

External services should be isolated from core business logic whenever possible.

---

# Dependency Rules

Frontend should never access the database directly.

Frontend communicates only through APIs.

Backend is the only layer allowed to communicate with PostgreSQL.

Never violate this separation.

---

# Architectural Principles

Maintain clear separation of concerns.

Each layer should have one responsibility.

Prefer extending existing modules over creating parallel implementations.

Avoid tight coupling between modules.

Design for maintainability and scalability.

---

# Architecture Preservation

Before making significant changes

- Understand the existing architecture.
- Identify affected layers.
- Explain architectural impact.
- Preserve module boundaries.
- Avoid introducing unnecessary dependencies.

Never redesign the architecture without explicit approval.