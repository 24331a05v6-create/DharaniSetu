# DharaniSetu

One Parcel. One Digital Identity. Connected Governance.

DharaniSetu is a parcel-centric digital land governance prototype built for the Smart India Hackathon (SIH). It connects fragmented land-related datasets — Revenue, Registration, Planning, Property Tax, Utilities, Restrictions — through a common parcel identity (ULPIN) on top of Supabase PostgreSQL + PostGIS, with a MapLibre GIS explorer, a unified parcel profile, citizen services, and a role-based government dashboard.

> **Demonstration data:** the database ships with synthetic Andhra Pradesh–style demonstration records (120 parcels + linked records). Demonstration records are labeled as such in the UI. Nothing here is presented as an official government record.

## Problem and solution

Land records in India live in departmental silos: ownership in Revenue, transactions in Registration, zoning in Planning, tax in Municipal systems. Citizens and officers have no single view of a parcel.

DharaniSetu makes the **land parcel** the primary key of governance data:

- Every parcel carries a **ULPIN** (Unique Land Parcel Identification Number).
- Every related record (rights, registration, encumbrance, planning, building, tax, utility, restriction, document, history) links to its parcel via `parcel_id`.
- One search returns the parcel **and** everything connected to it.

## Features (implemented and tested)

- **Parcel search** — by ULPIN, survey number, parcel reference, location hierarchy (state → district → mandal → village), and land-use filter; debounced input, loading/empty/error states, pagination.
- **GIS Explorer (MapLibre + PostGIS)** — 120 parcel boundaries from live geometry, auto-fit, zoom/pan, hover + selection highlight, survey labels from zoom 12, click → detail panel, viewport (bounding-box) loading via a spatial RPC, data-driven overlays (land use, zoning, tax status, building permissions, restrictions, utilities), parcel search box, `?ulpin=` deep links.
- **Unified Parcel Profile** — overview, ward/local body, last-verified date, data source, completeness/confidence indicator, plus ownership/rights, registration timeline, encumbrances, planning/zoning, building permissions, property tax, utilities, restrictions, documents, and event history. Unavailable fields show “Not recorded”, never invented values.
- **Citizen services** — search a parcel once and view all 8 service domains; submit a service request (validated server-side) and receive a reference number; track request status on a Submitted → Under Review → Processed → Completed/Rejected timeline.
- **Government dashboard** — live counts from the database (parcels, rights, registrations, encumbrances, planning, building, tax, utilities, restrictions, documents), verification stats, parcels by land use/district, analytics drill-down, change-detection queue, service-request queue with role-protected status updates.
- **Authentication + RBAC** — Supabase Auth with citizen / revenue / registration / planning / municipal / administrator roles; government area gated by role; request-status changes verified server-side.
- **Six languages** — English, Hindi, Telugu, Tamil, Kannada, Malayalam. Header selector, instant switching, localStorage persistence, `lang` attribute. Database identifiers (ULPINs, names, document numbers) are never translated.
- **Data ingestion foundation** — import API, source health, data-quality and conflict/verification workflow tables and endpoints.
- **Responsive/mobile UI** — verified at 390px width with no horizontal overflow.
- **Security** — RLS enabled on all tables; service-role key used only in server-side API routes, never in browser code; `.env.local` git-ignored.

## Current demonstration dataset

| Table | Rows |
|---|---|
| parcels | 120 |
| rights_records | 120 |
| registration_records | 120 |
| encumbrances | 120 |
| planning_records | 120 |
| building_permissions | 120 |
| property_tax_records | 120 |
| utility_records | 120 |
| restrictions | 120 |
| parcel_documents | 150 |
| parcel_history | 358 |

All parcels have valid SRID-4326 polygon geometry, auto-computed centroids, unique ULPINs, and zero orphaned relations (verified by direct count/FK queries).

## Technology stack

- Next.js 14 (App Router) + React 18 + TypeScript
- Supabase (PostgreSQL + PostGIS, Auth, RLS) via `@supabase/supabase-js`
- MapLibre GL JS for the GIS explorer
- Tailwind CSS

## Architecture / workflow

```
Browser (anon/publishable key, RLS-enforced reads)
  ├─ Search / GIS / Profile / Services pages
  └─ API routes (/api/v1/*)
        ├─ anon client (RLS applies) — reads
        └─ service-role client (server only) — citizen request writes,
            reference lookups, role-checked government updates
Supabase PostgreSQL + PostGIS
  ├─ 16 core tables + services/matching tables
  ├─ parcels_in_bbox RPC (viewport queries, GIST index)
  └─ triggers (updated_at, centroid), RLS policies
```

Key flows: Search → GIS (`?ulpin=`) → click parcel → detail panel → Full Profile → Services; Search → Services (`?ulpin=`); Submit → reference number → Track.

## Setup

Requirements: Node.js 18+, npm, a Supabase project with the SQL editor.

1. Clone and install:
   ```bash
   git clone https://github.com/24331a05v6-create/DharaniSetu.git
   cd DharaniSetu
   npm install
   ```
2. Apply the migrations in `supabase/migrations/` in order (`001`–`007`) in the Supabase SQL editor. This enables PostGIS, creates all tables, constraints, indexes, triggers, RLS policies, and the `parcels_in_bbox` function.
3. Create `.env.local` (see `.env.example`):
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server only, never commit
   ```
   The app also accepts `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the public key variable name.
4. Run:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

## Testing / build

```bash
npm run build
```

Verified before release: TypeScript passes; production build passes; browser end-to-end (16/16 checks) covering search → GIS → click → profile → services → submit → track, language switching/persistence (all 6), overlays, government dashboard rendering, and 390px mobile layout with no console or API errors.

## Project status / SIH context

Prototype demonstrating a parcel-centric Land Stack: one identity (ULPIN) → map → complete record → citizen services → government workflow, in six languages. Data layer, GIS, services, RBAC, and multilingual UI are functional against the live Supabase backend with demonstration data.
