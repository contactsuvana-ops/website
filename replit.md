# Suvana Constructions Website

## Overview

Full-stack professional website for Suvana Construction LLC — a handyman and general construction company. Built with React + Vite frontend and Express backend, connected to PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion + Wouter routing
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Email**: Nodemailer (SMTP — configure env vars to activate)
- **Build**: esbuild (CJS bundle)

## Pages

- `/` — Homepage: hero, services overview, stats, why choose us, process, CTA
- `/services` — Full services listing (9 services) with descriptions and images
- `/contact` — Contact form (name, email, phone, message) with honeypot anti-spam
- `/quote` — Quote request form (project type, location, budget, timeline) with honeypot
- `/admin` — Admin dashboard: submission stats and paginated table of all submissions

## API Endpoints

- `GET /api/healthz` — Health check
- `POST /api/contact` — Submit contact form → stores in DB, sends email notification
- `POST /api/quote` — Submit quote request → stores in DB, sends email notification
- `GET /api/submissions` — List all submissions (filter by type, pagination)
- `GET /api/submissions/stats` — Aggregate stats (counts, by project type)

## Email Configuration (optional)

Set these env vars to enable email notifications to contactsuvana@gmail.com:
- `SMTP_HOST` — SMTP server hostname
- `SMTP_PORT` — SMTP port (587 for TLS, 465 for SSL)
- `SMTP_USER` — SMTP username / sender email
- `SMTP_PASS` — SMTP password or app password

Without these, form submissions are stored in the database but emails are skipped (logged as warning).

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Services Covered

General Construction, Handyman Services, Remodeling & Renovation, Roofing, Painting, Flooring, Electrical, Plumbing, Landscaping

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
