-- ─────────────────────────────────────────────────────────────────────────────
-- LWCForge Migration: Add Salesforce Component Metadata Columns
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Adds: master_label, is_exposed, targets (jsonb), api_version,
--       description, include_css, meta_xml
-- All columns use safe defaults and are non-breaking (no existing rows break).
-- ─────────────────────────────────────────────────────────────────────────────

-- Master Label (display name in App Builder)
alter table public.components
  add column if not exists master_label text;

-- Is Exposed (show in Lightning App Builder)
alter table public.components
  add column if not exists is_exposed boolean not null default true;

-- Targets (array of lightning__AppPage, lightning__RecordPage, etc.)
alter table public.components
  add column if not exists targets jsonb not null default '["lightning__AppPage"]'::jsonb;

-- API Version string (e.g. "62.0")
alter table public.components
  add column if not exists api_version text not null default '62.0';

-- Description (optional, max 200 chars)
alter table public.components
  add column if not exists description text;

-- Include CSS (whether a css file was created)
alter table public.components
  add column if not exists include_css boolean not null default true;

-- Raw meta XML (stored for reference / future deploy use)
alter table public.components
  add column if not exists meta_xml text;

-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill existing rows with sensible defaults
-- ─────────────────────────────────────────────────────────────────────────────

-- Set master_label for existing rows that don't have one
-- (converts camelCase/snake_case name to a spaced Title Case label)
update public.components
set master_label = initcap(replace(
  regexp_replace(name, '([a-z0-9])([A-Z])', '\1 \2', 'g'),
  '_', ' '
))
where master_label is null;

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional: add a GIN index on targets for efficient jsonb queries
-- ─────────────────────────────────────────────────────────────────────────────
create index if not exists idx_components_targets
  on public.components using gin (targets);
