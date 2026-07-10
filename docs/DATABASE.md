# ValidationCrew - Database Standards

## Database Overview

ValidationCrew uses PostgreSQL as its primary relational database.

The database is the single source of truth for all persistent application data.

It stores

- Users
- Missions
- Applications
- Submissions
- Wallets
- Transactions
- Notifications
- Authentication Data
- Profiles
- Platform Configuration

Database integrity is critical.

Never compromise data consistency.

---

# Database Philosophy

Design the database for

- Consistency
- Reliability
- Performance
- Scalability
- Maintainability

Every schema change should preserve existing data whenever possible.

---

# Database Technology

Database

- PostgreSQL

Hosting

- Railway PostgreSQL

Connection

- Connection Pool

Never replace PostgreSQL-specific features with generic SQL unless required.

---

# Source of Truth

The database is always the source of truth.

Never trust

- Frontend State
- Browser Storage
- Cookies
- JWT Claims
- Client Requests

Always verify data from the database.

---

# Schema Management

Database schema is defined inside

```
backend/src/schema.sql
```

Whenever schema changes

Update

- schema.sql
- Related migrations
- Documentation

Keep schema synchronized with application code.

---

# Database Structure

Tables should represent business entities.

Examples

- users
- builder_profiles
- validator_profiles
- missions
- mission_tasks
- mission_submissions
- wallets
- wallet_transactions
- notifications
- payments

Avoid duplicate tables.

Normalize data appropriately.

---

# Table Design

Each table should have

- Primary Key
- Created Timestamp
- Updated Timestamp (where applicable)

Use meaningful column names.

Avoid ambiguous naming.

---

# Primary Keys

Prefer

UUID

or

BIGSERIAL

depending on project conventions.

Primary keys must remain immutable.

Never reuse deleted IDs.

---

# Foreign Keys

Always define proper foreign key relationships.

Maintain referential integrity.

Never leave orphan records.

Use cascading actions only when appropriate.

---

# Constraints

Use database constraints to enforce data integrity.

Examples

- PRIMARY KEY
- FOREIGN KEY
- UNIQUE
- NOT NULL
- CHECK

Never rely solely on frontend validation.

---

# Indexing

Create indexes for

Frequently searched columns

Examples

- email
- phone
- user_id
- mission_id
- created_at
- status

Avoid excessive indexing.

Indexes improve reads but increase write cost.

---

# Query Standards

Prefer

Explicit column selection

Example

Good

SELECT id, name, email
FROM users;

Avoid

SELECT *

Retrieve only the data that is actually required.

---

# Parameterized Queries

Always use parameterized queries.

Correct

SELECT * FROM users
WHERE id = $1;

Incorrect

SELECT * FROM users
WHERE id = ${id};

Never concatenate SQL.

Prevent SQL Injection.

---

# PostgreSQL Features

Prefer PostgreSQL-native functionality.

Examples

NOW()

RETURNING

JSONB

ARRAY

CTE

Window Functions

Use PostgreSQL efficiently.

---

# Transactions

Critical operations should use transactions.

Examples

Wallet Update

↓

Transaction History

↓

Notification

↓

Commit

Rollback if any step fails.

Never leave partial updates.

---

# Connection Pooling

Reuse database connections.

Never create a new connection for every request.

Always release clients.

Prevent connection leaks.

---

# Query Optimization

Before writing SQL ask

Can an index help?

Can unnecessary joins be removed?

Can fewer rows be returned?

Can fewer columns be selected?

Optimize queries before they become bottlenecks.

---

# Joins

Use joins carefully.

Avoid unnecessary joins.

Prefer readable queries.

Document complex joins when helpful.

---

# Pagination

Large datasets should support pagination.

Never return thousands of records in a single response.

Use

LIMIT

OFFSET

or keyset pagination where appropriate.

---

# Sorting

Sorting should occur in SQL whenever practical.

Avoid sorting large datasets in JavaScript.

---

# Filtering

Filtering should happen in SQL.

Do not fetch unnecessary rows and filter in application code.

---

# Data Integrity

Protect data integrity at all times.

Examples

- Mission ownership
- Wallet balances
- Payment records
- Submission history

Database constraints should support business rules.

---

# Soft Deletes

If soft deletes are used

Store

deleted_at

or

is_deleted

Never permanently delete business-critical data unless required.

---

# Timestamps

Prefer PostgreSQL

NOW()

instead of application-generated timestamps whenever appropriate.

Store timestamps consistently.

---

# Migrations

Every schema modification should have a migration strategy.

Never modify production schema manually.

Review migration impact before deployment.

---

# Performance

Monitor

Slow Queries

Index Usage

Connection Count

Transaction Duration

Query Execution Plans

Optimize based on measurements.

---

# Database Security

Never expose database credentials.

Store credentials only in environment variables.

Restrict database permissions.

Use least-privilege access.

---

# Environment Variables

Examples

DATABASE_URL

DATABASE_HOST

DATABASE_PORT

DATABASE_USER

DATABASE_PASSWORD

Never commit credentials.

Never hardcode connection strings.

---

# Backup Strategy

Production databases should support

- Automated backups
- Restore procedures
- Disaster recovery

Always verify backup availability before major schema changes.

---

# Data Recovery

Before destructive operations

Verify

Impact

Backup availability

Rollback strategy

Never delete production data without confirmation.

---

# Railway Deployment

Database runs on Railway.

Before deployment verify

- Environment variables
- Database connectivity
- Migration success
- Connection pooling
- Application compatibility

Deployment should never corrupt existing data.

---

# Database Monitoring

Monitor

- Query performance
- Connection pool usage
- Disk utilization
- Storage growth
- Failed queries
- Deadlocks

Investigate anomalies promptly.

---

# Database Testing Checklist

Before every Pull Request verify

✓ Schema changes validated

✓ Queries tested

✓ Foreign keys intact

✓ Constraints working

✓ Transactions working

✓ Rollbacks working

✓ Performance acceptable

✓ Existing data preserved

✓ No SQL Injection risk

✓ Railway compatibility verified

---

# Database Engineering Principles

Design databases that are

Consistent

Reliable

Efficient

Scalable

Maintainable

Secure

Every schema decision should support future growth.

Avoid premature complexity.

---

# Final Database Rule

The database is the foundation of the platform.

Protect its integrity.

Optimize queries thoughtfully.

Design schema changes carefully.

Never sacrifice consistency for convenience.

Write SQL that will continue to perform well as the platform grows from hundreds to millions of records.