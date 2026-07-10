# ValidationCrew - Business Rules

## Product Overview

ValidationCrew is a platform that connects Builders and Validators.

Builders create structured validation missions.

Validators complete missions and provide high-quality feedback.

The primary objective is to help founders validate products before launch using real users.

Every implementation should preserve these business objectives.

---

# User Roles

ValidationCrew has three primary roles.

## Builder

Builders

- Create missions
- Manage missions
- Publish missions
- Review submissions
- Approve or reject work
- Manage payments
- View analytics
- Manage profile

Builders should never access Validator-only functionality.

---

## Validator

Validators

- Discover missions
- Accept missions
- Complete validation tasks
- Submit feedback
- Earn rewards
- Withdraw earnings
- Manage profile

Validators should never access Builder-only functionality.

---

## Admin

Administrators

- Manage users
- Monitor missions
- Resolve disputes
- Manage platform settings
- Review payments
- Moderate content

Admins have elevated permissions.

---

# Authentication Rules

Each user authenticates independently.

Builder authentication and Validator authentication must remain isolated.

Authentication methods may include

- Email & Password
- Google OAuth
- Firebase Phone OTP

Authenticated users should

- Stay logged in until session expiration or logout.
- Never see Login or Get Started buttons after logging in.
- See their Name and Role in the navigation bar.
- Be able to Sign Out.
- Access their dashboard directly.

---

# Builder Lifecycle

Builder Journey

```
Signup

↓

Onboarding

↓

Dashboard

↓

Create Mission

↓

AI Task Generation

↓

Edit Tasks

↓

Select Audience

↓

Configure Reward

↓

Publish Mission

↓

Receive Applications

↓

Review Submissions

↓

Approve or Reject

↓

Release Payments

↓

View Analytics
```

Builders own their missions.

Only the Builder who created a mission may modify it unless administrative privileges exist.

---

# Validator Lifecycle

Validator Journey

```
Signup

↓

Onboarding

↓

Dashboard

↓

Discover Missions

↓

Accept Mission

↓

Secure Brief

↓

Workspace

↓

Complete Tasks

↓

Submit Evidence

↓

Submit Mission

↓

Await Review

↓

Approved

↓

Wallet Updated

↓

Withdraw Earnings
```

Validators should only access missions they have accepted.

---

# Mission Lifecycle

Mission States

```
Draft

↓

Published

↓

Applications Received

↓

Validator Accepted

↓

In Progress

↓

Submitted

↓

Under Review

↓

Approved

↓

Rejected

↓

Completed
```

Mission state transitions must always follow valid business rules.

Never allow invalid transitions.

---

# Mission Creation Rules

Every mission should contain

- Title
- Description
- Objective
- Target Audience
- Reward
- Required Tasks
- Validation Criteria

A mission cannot be published if required information is missing.

---

# AI Generated Tasks

AI may generate suggested validation tasks.

Business Rules

- AI tasks are editable.
- Builders can modify generated tasks.
- Builders can delete generated tasks.
- Builders can add custom tasks.

AI suggestions are recommendations, not final content.

---

# Secure Brief

Secure Briefs may contain

- Product URL
- Test Credentials
- Internal Links
- Confidential Instructions

Secure Briefs become available only after

- Mission Acceptance
- Required agreements (if applicable)

Never expose Secure Brief information publicly.

---

# Workspace Rules

Workspace is where Validators complete missions.

Workspace may include

- Task Checklist
- Timer
- Notes
- Screenshots
- Answers
- Progress Tracking

Validators should complete required tasks before submission.

---

# Submission Rules

Mission submissions should include

- Answers
- Required screenshots
- Required files
- Notes (if applicable)

Incomplete submissions should not be accepted.

---

# Builder Review

Builders review submissions.

Possible outcomes

- Approve
- Reject
- Request clarification (if supported)

Approval releases payment.

Rejected submissions should include meaningful feedback whenever possible.

---

# Reward Rules

Rewards are defined by Builders.

Rewards become payable only after

- Successful submission
- Builder approval

Rewards should never be released before approval.

---

# Wallet Rules

Wallet stores validator earnings.

Wallet balance increases only after

- Approved submission
- Verified payment workflow

Wallet balance decreases only after

- Successful withdrawal

Every wallet transaction should be recorded.

---

# Withdrawal Rules

Validators may request withdrawals.

Before processing

Verify

- User
- Wallet balance
- Eligibility

Prevent duplicate withdrawals.

Maintain transaction history.

---

# Payment Rules

Payments should

- Be verified
- Be traceable
- Be recoverable

Never trust frontend payment confirmation.

Payment status should always be verified by the backend.

---

# Notification Rules

Notify users for important events.

Examples

Builder

- Mission published
- Submission received
- Payment completed

Validator

- Mission accepted
- Submission approved
- Submission rejected
- Wallet updated
- Withdrawal completed

Notifications should be timely and meaningful.

---

# Longitudinal Missions

Longitudinal missions require repeated participation.

Rules

- Scheduled check-ins
- Progress tracking
- Time-based validation
- Multiple submissions

Check-ins should follow the configured schedule.

---

# Dashboard Rules

Builder Dashboard

Displays

- Active Missions
- Draft Missions
- Pending Reviews
- Analytics
- Wallet

Validator Dashboard

Displays

- Available Missions
- Active Missions
- Completed Missions
- Wallet
- Notifications

Dashboards should only display information relevant to the logged-in user.

---

# Profile Rules

Users may update

- Name
- Profile Photo
- Contact Information
- Preferences

Role changes should not occur through profile editing.

---

# Search & Filtering

Users should be able to search and filter where appropriate.

Examples

- Mission Category
- Reward
- Status
- Audience
- Date

Search results should remain performant.

---

# Business Constraints

Never allow

- Duplicate mission submissions
- Duplicate payments
- Duplicate withdrawals
- Unauthorized mission access
- Unauthorized profile access

Business rules should always be enforced on the backend.

---

# Data Integrity

Every important action should preserve data integrity.

Examples

- Mission creation
- Submission
- Approval
- Wallet updates
- Withdrawals

Critical operations should use database transactions where appropriate.

---

# Product Principles

Every feature should improve one or more of the following

- User Experience
- Product Validation Quality
- Trust
- Transparency
- Reliability
- Performance
- Scalability

Business requirements always take precedence over implementation convenience.

---

# Business Rule Preservation

Before modifying any business logic

- Understand the existing workflow.
- Identify affected users.
- Identify downstream effects.
- Preserve data integrity.
- Maintain backward compatibility.

Never change business rules without explicit product requirements.