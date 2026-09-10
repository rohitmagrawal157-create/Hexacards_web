-- Site contact + franchise enquiries (optional backup to email)
-- Run in Supabase SQL Editor. Safe to re-run.

create table if not exists public.site_enquiries (
  enquiry_id   bigserial primary key,
  enquiry_type varchar(32) not null check (enquiry_type in ('contact', 'franchise')),
  name         varchar(160) not null,
  phone        varchar(20) not null,
  email        varchar(200) not null,
  subject      varchar(240),
  country      varchar(120),
  state        varchar(120),
  city         varchar(120),
  message      text not null,
  site_url     text,
  email_sent   smallint not null default 0 check (email_sent in (0, 1)),
  created_at   timestamptz not null default now()
);

create index if not exists site_enquiries_type_created_idx
  on public.site_enquiries (enquiry_type, created_at desc);

comment on table public.site_enquiries is
  'Contact and franchise form submissions — emailed to info@hexacards.com';
