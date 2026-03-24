# Custom Showers CRM Portal

Private CRM portal for Custom Showers UK — hosted at **crm.customshowers.uk**.

Built with React + Vite + TypeScript, Supabase (auth + database), Tailwind CSS, deployed on Cloudflare Pages.

---

## Features

- Google OAuth login restricted to `matt@customshowers.uk`
- Contacts dashboard — website enquiries appear automatically, plus manual entry
- Full CRM: Leads, Deals, Customers, Quotes, Jobs, Invoices
- Mobile-friendly, brand-matched UI (navy `#1a2942`)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase anon key:

```bash
cp .env.local.example .env.local
```

Get your anon key from:
https://supabase.com/dashboard/project/qgfmsyxaccvwmmygtspf/settings/api

```
VITE_SUPABASE_URL=https://qgfmsyxaccvwmmygtspf.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

### 3. Supabase database

Run the SQL in `supabase/schema.sql` in the Supabase SQL Editor:
https://supabase.com/dashboard/project/qgfmsyxaccvwmmygtspf/sql

This creates all tables including the `contacts` table used by the portal and the Cloudflare Worker.

### 4. Supabase Google OAuth

In the Supabase dashboard go to **Authentication → Providers → Google** and enable it.

Add the following redirect URL in both Google Cloud Console and Supabase:
```
https://crm.customshowers.uk
```
For local dev also add: `http://localhost:5173`

### 5. Run locally

```bash
npm run dev
```

### 6. Build

```bash
npm run build
```

---

## Cloudflare Pages deployment

The portal is deployed as a Cloudflare Pages project.

1. Connect the GitHub repo in the Cloudflare Pages dashboard
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Add environment variables:
   - `VITE_SUPABASE_URL` = `https://qgfmsyxaccvwmmygtspf.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = your anon key
5. Set custom domain: `crm.customshowers.uk`

---

## Cloudflare Worker (contact form → CRM)

The worker at `workers/customshowers-contact/` handles website contact form submissions.
It writes to both HubSpot and the Supabase `contacts` table.

### Deploy the worker

```bash
cd workers/customshowers-contact
npx wrangler deploy

# Set secrets (never commit these)
npx wrangler secret put HUBSPOT_API_KEY
npx wrangler secret put SUPABASE_SERVICE_KEY
```

The `SUPABASE_SERVICE_KEY` is the **service role key** (not the anon key) from:
https://supabase.com/dashboard/project/qgfmsyxaccvwmmygtspf/settings/api

---

## Database schema — contacts table

```sql
CREATE TABLE contacts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  name         TEXT NOT NULL,
  email        TEXT,
  phone        TEXT,
  address      TEXT,
  source       TEXT DEFAULT 'manual' CHECK (source IN ('website', 'manual')),
  service_type TEXT,
  message      TEXT
);
```

Website enquiries arrive with `source = 'website'`, manual entries with `source = 'manual'`.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + JSX |
| Styling | Tailwind CSS |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (PostgreSQL) |
| Hosting | Cloudflare Pages |
| Worker | Cloudflare Workers |
| CRM integration | HubSpot API v3 |
