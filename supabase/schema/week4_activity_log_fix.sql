-- Week 4 fix: ensure activity_log table exists
-- Run this once in Supabase SQL editor if activity_log is missing.

create table if not exists public.activity_log (
  id bigserial primary key,
  unified_item_id text,
  type text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_created_at_idx
  on public.activity_log (created_at desc);

