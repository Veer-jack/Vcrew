# ValidationCrew - Frontend Standards

## Frontend Overview

The frontend is built using

- React
- Vite

The frontend is responsible only for

- User Interface
- User Experience
- State Management
- Routing
- API Communication

The frontend must never contain business logic that belongs on the backend.

---

# Frontend Architecture

Frontend Structure

frontend/

src/

pages/

vpages/

apages/

components/

hooks/

services/

utils/

assets/

styles/

Keep responsibilities separated.

---

# Application Separation

Builder Application

Location

frontend/src/pages

Contains

- Dashboard
- Mission Creation
- Analytics
- Wallet
- Profile
- Settings

---

Validator Application

Location

frontend/src/vpages

Contains

- Dashboard
- Mission Discovery
- Workspace
- Wallet
- Notifications
- Profile

---

Admin Application

Location

frontend/src/apages

Contains

- User Management
- Reports
- Platform Controls

Never mix Builder and Validator pages.

---

# Components

Reusable UI belongs inside

frontend/src/components

Examples

- Button
- Input
- Modal
- Card
- Table
- Loader
- Badge
- Navbar
- Pagination
- Avatar

Avoid duplicate components.

If UI appears more than once,

extract it.

---

# Component Principles

Each component should have one responsibility.

Keep components

Small

Readable

Reusable

Composable

Avoid components with hundreds of lines of code.

Split when appropriate.

---

# State Management

Store only necessary state.

Avoid

Duplicated State

Derived State

Unnecessary Global State

Keep state predictable.

---

# Props

Pass only required props.

Avoid prop drilling whenever practical.

Use composition where appropriate.

---

# Hooks

Reuse logic through custom hooks.

Examples

Authentication

Pagination

API Requests

Debouncing

Forms

Avoid duplicating hook logic.

---

# API Communication

Frontend communicates only through APIs.

Never access database directly.

Builder

Uses

api/client

Validator

Uses

vapi/client

Never mix API clients.

---

# Routing

Keep routes organized.

Protect authenticated routes.

Unauthenticated users

↓

Login

Authenticated users

↓

Dashboard

Prevent unauthorized access through frontend and backend.

---

# Authentication UI

Logged-out users

Display

- Login
- Get Started

Logged-in users

Display

- Name
- Role
- Profile
- Dashboard
- Sign Out

Never display Login or Get Started after authentication.

---

# Navbar

Navbar should

Remain consistent

Be responsive

Reflect authentication state

Avoid unnecessary clutter.

Provide clear navigation.

---

# Dashboard

Dashboards should load quickly.

Display

Loading State

↓

Data

↓

Empty State (if needed)

↓

Error State (if API fails)

Never leave users staring at blank screens.

---

# Forms

Every form should

Validate inputs

Display errors clearly

Prevent duplicate submission

Disable submit while processing

Provide success feedback

Never rely solely on frontend validation.

---

# Validation

Validate

Email

Phone

Password

Required Fields

Numbers

Dates

URLs

Show helpful validation messages.

---

# Error Handling

Display user-friendly errors.

Never expose

Stack traces

Internal API errors

Database messages

Guide users toward recovery.

---

# Loading States

Every asynchronous action should provide feedback.

Examples

Page Loading

Button Loading

Skeleton Loading

Progress Indicators

Avoid frozen interfaces.

---

# Empty States

When no data exists,

display meaningful empty states.

Explain

Why nothing is shown

What users can do next

Avoid blank pages.

---

# Success Feedback

Notify users after successful actions.

Examples

Mission Created

Profile Updated

Payment Successful

Submission Sent

Provide clear confirmation.

---

# Responsive Design

Support

Desktop

Tablet

Mobile

Every page should remain usable across devices.

Never allow layout breaking.

---

# Accessibility

Use semantic HTML.

Provide

Labels

Alt Text

Keyboard Navigation

Visible Focus States

Meaningful Button Labels

Accessibility is part of quality.

---

# Styling

Maintain consistent

Spacing

Typography

Colors

Border Radius

Shadows

Transitions

Respect existing design language.

---

# Icons

Use icons only when they improve usability.

Avoid decorative clutter.

Icons should communicate meaning.

---

# Images

Optimize images.

Use appropriate formats.

Lazy load when beneficial.

Avoid oversized assets.

---

# Performance

Reduce unnecessary renders.

Avoid

Repeated API Calls

Large Components

Heavy Computation During Render

Duplicate State

Measure before optimizing.

Use

React.memo

useMemo

useCallback

only when beneficial.

---

# Lists

Always provide stable keys.

Avoid using array indexes unless appropriate.

Support pagination for large datasets.

---

# Search & Filtering

Debounce search requests when appropriate.

Avoid unnecessary API calls.

Preserve filter state where it improves user experience.

---

# Modals

Keep modals focused.

Support

Open

Close

Escape Key

Outside Click (when appropriate)

Do not overload modals with excessive functionality.

---

# Notifications

Notifications should be

Clear

Short

Meaningful

Non-intrusive

Examples

Mission Published

Profile Updated

Submission Approved

Avoid notification spam.

---

# Animations

Use animations to improve usability.

Avoid excessive animation.

Animations should feel smooth and purposeful.

---

# Error Boundaries

Use React Error Boundaries where appropriate.

Prevent one component failure from crashing the entire application.

---

# Code Organization

Organize components logically.

Separate

UI

Logic

API

Utilities

Avoid large files containing multiple responsibilities.

---

# Frontend Security

Never trust frontend validation.

Never expose

Secrets

API Keys

JWT Secrets

Database Credentials

All sensitive operations belong on the backend.

---

# Frontend Testing Checklist

Before committing verify

✓ No Console Errors

✓ No React Warnings

✓ Responsive Layout

✓ Correct Navigation

✓ Loading State

✓ Empty State

✓ Error State

✓ Success State

✓ Authentication Flow

✓ Logout Flow

✓ Profile Loading

✓ API Responses

---

# Frontend Engineering Principles

Write components that are

Readable

Reusable

Accessible

Responsive

Maintainable

Performant

Every component should improve the user experience without increasing unnecessary complexity.

---

# Final Frontend Rule

The frontend should present information beautifully and efficiently.

Business logic belongs to the backend.

The frontend should remain lightweight, predictable, reusable, and easy to maintain.