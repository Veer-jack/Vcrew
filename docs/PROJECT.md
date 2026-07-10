# ValidationCrew - Project Guide

## Project Overview

ValidationCrew is a production SaaS platform that enables founders to validate ideas, products, and features before launch through structured feedback from real people.

The platform consists of multiple applications that work together to provide a seamless experience for Builders, Validators, and Administrators.

---

# Product Vision

ValidationCrew helps founders answer one important question before building:

> "Are we solving the right problem for the right users?"

Instead of launching products based on assumptions, ValidationCrew allows Builders to gather structured feedback, usability insights, and real-world validation from carefully selected Validators.

The goal is to reduce product risk, improve decision making, and increase the chances of building successful products.

---

# Core Principles

Every feature developed should improve one or more of the following:

- User Experience
- Product Quality
- Reliability
- Performance
- Security
- Maintainability
- Scalability

Every engineering decision should align with the product vision.

---

# Repository Structure

This repository contains:

- Marketing Website
- Builder Application
- Validator Application
- Admin Application
- Backend APIs
- PostgreSQL Database

Each part has a clearly defined responsibility.

Avoid mixing concerns across modules.

---

# Development Workflow

Never work directly on the `main` branch.

Every task should follow this workflow.

```bash
git checkout main

git pull origin main

git checkout -b ravi/<feature-name>
```

After completing development:

```bash
git add .

git commit -m "Meaningful commit message"

git push -u origin ravi/<feature-name>
```

Create a Pull Request.

Wait for review before merging.

Never push directly to the main branch.

---

# Branch Naming

Use descriptive branch names.

Examples:

```
ravi/login-fix

ravi/dashboard-ui

ravi/payment-integration

ravi/improve-auth

ravi/fix-builder-navbar
```

Avoid generic names like

```
test

new

feature

branch1
```

---

# Commit Messages

Use meaningful commit messages.

Good examples

```
fix: resolve builder authentication redirect

feat: add validator onboarding progress

refactor: simplify dashboard state management

docs: update Claude project instructions
```

Avoid

```
update

changes

fixed

work

commit
```

---

# Pull Request Workflow

Every Pull Request should contain:

## Summary

High-level overview.

## Problem

What issue was being solved?

## Root Cause

Why did the issue occur?

## Solution

How was it solved?

## Changes Made

List the major changes.

## Testing

Describe how the changes were tested.

## Impact

Explain any affected features.

## Screenshots

Required for UI changes.

---

# Coding Guidelines

Always

- Make the smallest possible change.
- Reuse existing code.
- Preserve coding style.
- Remove dead code.
- Remove debug statements.
- Write readable code.
- Handle errors properly.
- Keep functions focused.

Never

- Duplicate logic.
- Rewrite entire files unnecessarily.
- Rename files without reason.
- Modify unrelated functionality.
- Introduce unnecessary dependencies.

---

# Before Writing Code

Before making changes always:

1. Understand the requirement.
2. Read the existing implementation.
3. Identify the root cause.
4. Explain the solution.
5. Identify affected files.
6. Estimate possible risks.
7. Modify only required files.

Never make assumptions.

Ask questions when requirements are unclear.

---

# Code Reuse

Before creating anything new, search for:

- Existing Components
- Existing Hooks
- Existing Utilities
- Existing Middleware
- Existing SQL Queries
- Existing API Endpoints

Prefer extending existing implementations over creating new ones.

Avoid duplicate functionality.

---

# Engineering Standards

Every implementation should be

- Readable
- Maintainable
- Reusable
- Secure
- Scalable
- Production Ready

Optimize for long-term maintainability rather than short-term convenience.

---

# Documentation

Whenever introducing:

- New APIs
- New Features
- New Environment Variables
- New Database Tables
- New Configuration

Update the relevant documentation.

Documentation should stay synchronized with the codebase.

---

# Definition of Done

A task is complete only when:

- Code is implemented.
- Code follows project standards.
- No console errors.
- No build errors.
- Existing functionality still works.
- Responsive behavior is verified.
- Code is reviewed.
- Pull Request is created.
- Documentation is updated if required.

---

# Team Collaboration

Communicate changes clearly.

Write descriptive Pull Requests.

Respond to review comments professionally.

Keep Pull Requests focused on a single feature or bug.

Large changes should be divided into multiple Pull Requests.

---

# Product Mindset

Always think beyond implementation.

Ask yourself:

- Does this improve the product?
- Does this improve the user experience?
- Does this improve maintainability?
- Does this introduce unnecessary complexity?
- Can this solution scale?

Engineering decisions should always support business goals.

---

# Golden Rule

Write code as if another engineer will maintain it tomorrow.

Every change should leave the codebase cleaner, more understandable, and easier to extend than before.