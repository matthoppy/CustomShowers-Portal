-- Custom Showers CRM — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT,
  phone              TEXT,
  address_line1      TEXT,
  address_line2      TEXT,
  city               TEXT,
  postcode           TEXT,
  notes              TEXT,
  shower_preferences TEXT
);

CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  source      TEXT,
  status      TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'lost')),
  notes       TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE quotes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  quote_number TEXT UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id      UUID REFERENCES leads(id) ON DELETE SET NULL,
  status       TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected')),
  notes        TEXT,
  subtotal     DECIMAL(10,2) DEFAULT 0,
  vat_rate     DECIMAL(5,2)  DEFAULT 20.00,
  vat_amount   DECIMAL(10,2) DEFAULT 0,
  total        DECIMAL(10,2) DEFAULT 0,
  valid_until  DATE
);

CREATE TABLE quote_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  quote_id    UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity    DECIMAL(10,2) DEFAULT 1,
  unit_price  DECIMAL(10,2) NOT NULL,
  total       DECIMAL(10,2) NOT NULL
);

CREATE TABLE jobs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  job_number       TEXT UNIQUE NOT NULL,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  quote_id         UUID REFERENCES quotes(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  description      TEXT,
  status           TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_date   DATE,
  completion_date  DATE,
  notes            TEXT
);

CREATE TABLE invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  job_id         UUID REFERENCES jobs(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  due_date       DATE,
  paid_date      DATE,
  subtotal       DECIMAL(10,2) DEFAULT 0,
  vat_rate       DECIMAL(5,2)  DEFAULT 20.00,
  vat_amount     DECIMAL(10,2) DEFAULT 0,
  total          DECIMAL(10,2) DEFAULT 0,
  amount_paid    DECIMAL(10,2) DEFAULT 0,
  notes          TEXT
);

CREATE TABLE invoice_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  invoice_id   UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description  TEXT NOT NULL,
  quantity     DECIMAL(10,2) DEFAULT 1,
  unit_price   DECIMAL(10,2) NOT NULL,
  total        DECIMAL(10,2) NOT NULL
);

-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables so only authenticated users can access data.
-- ============================================================

ALTER TABLE customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for authenticated users only
CREATE POLICY "Authenticated users only" ON customers    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON leads        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON quotes       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON quote_items  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON jobs         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON invoices     FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users only" ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- INDEXES (optional, for performance)
-- ============================================================

CREATE INDEX idx_leads_status        ON leads(status);
CREATE INDEX idx_leads_customer_id   ON leads(customer_id);
CREATE INDEX idx_quotes_customer_id  ON quotes(customer_id);
CREATE INDEX idx_quotes_status       ON quotes(status);
CREATE INDEX idx_jobs_customer_id    ON jobs(customer_id);
CREATE INDEX idx_jobs_status         ON jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON jobs(scheduled_date);
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_status     ON invoices(status);

CREATE TABLE deals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  stage_changed_at  TIMESTAMPTZ DEFAULT NOW(),
  deal_name         TEXT NOT NULL,
  deal_owner        TEXT DEFAULT 'Matt Hopkinson',
  amount            DECIMAL(10,2),
  close_date        DATE,
  stage             TEXT DEFAULT 'new_enquiry' CHECK (stage IN ('new_enquiry','design_received','quote_sent','quote_accepted','ordered_from_supplier','in_production','ready_for_delivery','completed','lost_on_hold')),
  last_contacted    TIMESTAMPTZ,
  final_order_value DECIMAL(10,2),
  install_required  TEXT,
  lead_source       TEXT,
  shower_type       TEXT,
  deal_type         TEXT DEFAULT 'New Business',
  priority          TEXT DEFAULT 'Low',
  design_reference  TEXT,
  glass_supplier    TEXT,
  hardware_supplier TEXT,
  notes             TEXT,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id           UUID REFERENCES leads(id) ON DELETE SET NULL
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON deals FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_deals_stage       ON deals(stage);
CREATE INDEX idx_deals_customer_id ON deals(customer_id);

-- ============================================================
-- CONTACTS TABLE
-- Website enquiries (via Cloudflare Worker / contact form) and
-- manually-added contacts. Source: 'website' | 'manual'
-- ============================================================

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

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access
CREATE POLICY "Authenticated users only" ON contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow service role (Cloudflare Worker) to insert
CREATE POLICY "Service role insert" ON contacts FOR INSERT TO service_role WITH CHECK (true);

CREATE INDEX idx_contacts_source     ON contacts(source);
CREATE INDEX idx_contacts_created_at ON contacts(created_at DESC);

-- ============================================================
-- SURVEYS TABLE
-- On-site surveys linked to leads and/or customers.
-- ============================================================

CREATE TABLE surveys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  survey_number  TEXT UNIQUE NOT NULL,
  contact_name   TEXT,
  contact_email  TEXT,
  contact_phone  TEXT,
  address        TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  job_type       TEXT DEFAULT 'supply_only' CHECK (job_type IN ('supply_only', 'supply_and_install')),
  status         TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  lead_id        UUID REFERENCES leads(id) ON DELETE SET NULL,
  notes          TEXT
);

ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON surveys FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_surveys_status        ON surveys(status);
CREATE INDEX idx_surveys_scheduled_date ON surveys(scheduled_date);

-- ============================================================
-- SCHEMA MIGRATIONS
-- Additional columns added after initial schema creation.
-- ============================================================

-- job_type on leads (supply_only | supply_and_install)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'supply_only' CHECK (job_type IN ('supply_only', 'supply_and_install'));

-- invoice_type on invoices (full | deposit | final)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'full' CHECK (invoice_type IN ('full', 'deposit', 'final'));

-- job_type on jobs (supply_only | supply_and_install)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type TEXT DEFAULT 'supply_only';

-- supplier tracking on jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS glass_supplier TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS hardware_supplier TEXT;

-- ============================================================
-- JOB ITEMS TABLE
-- Individual showers per job, each tagged with a bathroom label.
-- ============================================================

CREATE TABLE job_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  job_id         UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  bathroom_label TEXT NOT NULL,
  description    TEXT,
  notes          TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'installed'))
);

ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users only" ON job_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_job_items_job_id ON job_items(job_id);

-- Extended job statuses for install track (ordered, in_production, ready_to_install)
-- Drop existing constraint and recreate with expanded values
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('ordered', 'in_production', 'ready_to_install', 'scheduled', 'in_progress', 'completed', 'cancelled'));
