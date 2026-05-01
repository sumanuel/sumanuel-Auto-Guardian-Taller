---
name: auto-guardian-ui
description: "Premium, technical, minimalist UI guidance for Auto-Guardian-Taller. Use when redesigning or creating Expo React Native screens, navigation, workshop dashboards, orders, diagnostics, expenses, and reusable components while preserving the Auto-Guardian visual language."
license: MIT
---

# Auto-Guardian-Taller UI Skill

Project-specific guidance for extending the Auto-Guardian design system into a workshop-oriented operational app.

## When to Apply

Use this skill when:

- creating or redesigning screens in Auto-Guardian-Taller
- building reusable React Native components for workshop flows
- improving dashboard, work-order, diagnostic, approval, expense, payment, or delivery layouts
- reviewing whether a new UI still feels like Auto-Guardian in tone and hierarchy

## Core Direction

- Optimize for precision and confidence. The user should understand workload, urgent issues, pending approvals, costs, and delivery commitments in one quick scan.
- Keep a premium workshop-console tone: polished surfaces, restrained accents, crisp hierarchy, and no decorative excess.
- Dense information is acceptable, but it must be segmented into cards, summary rows, section blocks, or timelines.
- Use color as a semantic system for urgency, progress, status, and action intent.

## Project Anchors

- Reuse the responsive system in src/utils/responsive.js for spacing, radius, icon sizing, and font scaling.
- Reuse the theme contract in src/context/ThemeContext.js so light and dark mode stay coherent.
- Prefer shared primitives in src/components when patterns repeat across screens.
- Preserve business logic boundaries; UI work should sit on top of hooks, contexts, and services rather than bypassing them.

## Screen Guidelines

### Dashboard and Reception

- Lead with urgent jobs, vehicles due today, parts pending approval, and direct access to new work orders.
- Keep operational summaries separate from action shortcuts.
- Highlight only signals that should change the next decision.

### Orders, Diagnosis, and Service

- Surface customer, vehicle, service type, assigned technician, due date, and status before secondary metadata.
- Group forms by intent: customer and vehicle, inspection, service details, cost, approvals, and notes.
- Keep irreversible actions visually separated and unmistakable.

### Expenses, Payments, and Delivery

- Make totals, partial payments, balance due, and proof fields easy to compare.
- Use stable alignment for amounts, dates, and statuses.

### Empty and Loading States

- Empty states should explain the next workshop action clearly.
- Loading states should preserve layout structure when possible.

## Copy and Tone

- Write UI copy in concise Spanish.
- Prefer practical operational language.
- Buttons should begin with clear verbs.
- Section titles should orient quickly and sound deliberate.

## Implementation Heuristics

- Keep visual systems consistent before adding new visual ideas.
- Extract shared header, card, stat, and list-row patterns when duplication appears in three or more places.
- Favor touch targets and spacing that remain comfortable on phones and small tablets.
- If a visual improvement makes the workflow less obvious, reject it.
