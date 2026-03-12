create extension if not exists pgcrypto;

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.archive_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null check (category in ('thoughts', 'words', 'content', 'places', 'activities')),
  subcategory text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  event_date date,
  importance smallint not null check (importance between 1 and 5),
  source_type text not null check (source_type in ('telegram', 'manual', 'imported')),
  summary text not null default '',
  notes text,
  details jsonb not null default '{}'::jsonb
);

create table if not exists public.archive_record_images (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.archive_records(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.telegram_identities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  telegram_user_id bigint not null unique,
  telegram_username text,
  telegram_chat_id bigint,
  status text not null default 'pending' check (status in ('pending', 'verified', 'disabled')),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, telegram_user_id)
);

create table if not exists public.inbox_messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  telegram_identity_id uuid references public.telegram_identities(id) on delete set null,
  source_type text not null default 'telegram' check (source_type in ('telegram', 'manual', 'imported')),
  external_message_id text,
  raw_text text not null,
  attachments jsonb not null default '[]'::jsonb,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received' check (status in ('received', 'parsed', 'approved', 'rejected', 'archived')),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.draft_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  inbox_message_id uuid references public.inbox_messages(id) on delete set null,
  archive_record_id uuid references public.archive_records(id) on delete set null,
  status text not null default 'pending_approval' check (status in ('pending_approval', 'approved', 'rejected', 'superseded')),
  category text not null check (category in ('thoughts', 'words', 'content', 'places', 'activities')),
  subcategory text not null,
  title text not null,
  body text not null default '',
  summary text not null default '',
  tags text[] not null default '{}',
  event_date date,
  importance smallint check (importance between 1 and 5),
  source_type text not null default 'telegram' check (source_type in ('telegram', 'manual', 'imported')),
  structured_payload jsonb not null default '{}'::jsonb,
  assistant_note text,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists archive_records_owner_idx on public.archive_records (owner_id, event_date desc, created_at desc);
create index if not exists archive_records_category_idx on public.archive_records (owner_id, category, subcategory);
create index if not exists archive_records_importance_idx on public.archive_records (owner_id, importance desc);
create index if not exists archive_record_images_record_idx on public.archive_record_images (record_id, sort_order);
create index if not exists telegram_identities_owner_idx on public.telegram_identities (owner_id, status);
create index if not exists inbox_messages_owner_idx on public.inbox_messages (owner_id, received_at desc);
create index if not exists inbox_messages_status_idx on public.inbox_messages (owner_id, status, received_at desc);
create index if not exists draft_records_owner_idx on public.draft_records (owner_id, created_at desc);
create index if not exists draft_records_status_idx on public.draft_records (owner_id, status, created_at desc);

alter table public.archive_records enable row level security;
alter table public.archive_record_images enable row level security;
alter table public.telegram_identities enable row level security;
alter table public.inbox_messages enable row level security;
alter table public.draft_records enable row level security;

drop policy if exists "Users can view own records" on public.archive_records;
drop policy if exists "Users can insert own records" on public.archive_records;
drop policy if exists "Users can update own records" on public.archive_records;
drop policy if exists "Users can delete own records" on public.archive_records;
drop policy if exists "Users can view own record images" on public.archive_record_images;
drop policy if exists "Users can insert own record images" on public.archive_record_images;
drop policy if exists "Users can update own record images" on public.archive_record_images;
drop policy if exists "Users can delete own record images" on public.archive_record_images;
drop policy if exists "Users can view own telegram identities" on public.telegram_identities;
drop policy if exists "Users can insert own telegram identities" on public.telegram_identities;
drop policy if exists "Users can update own telegram identities" on public.telegram_identities;
drop policy if exists "Users can delete own telegram identities" on public.telegram_identities;
drop policy if exists "Users can view own inbox messages" on public.inbox_messages;
drop policy if exists "Users can insert own inbox messages" on public.inbox_messages;
drop policy if exists "Users can update own inbox messages" on public.inbox_messages;
drop policy if exists "Users can delete own inbox messages" on public.inbox_messages;
drop policy if exists "Users can view own draft records" on public.draft_records;
drop policy if exists "Users can insert own draft records" on public.draft_records;
drop policy if exists "Users can update own draft records" on public.draft_records;
drop policy if exists "Users can delete own draft records" on public.draft_records;

create policy "Users can view own records"
on public.archive_records
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own records"
on public.archive_records
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own records"
on public.archive_records
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own records"
on public.archive_records
for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can view own record images"
on public.archive_record_images
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own record images"
on public.archive_record_images
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own record images"
on public.archive_record_images
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own record images"
on public.archive_record_images
for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can view own telegram identities"
on public.telegram_identities
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own telegram identities"
on public.telegram_identities
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own telegram identities"
on public.telegram_identities
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own telegram identities"
on public.telegram_identities
for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can view own inbox messages"
on public.inbox_messages
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own inbox messages"
on public.inbox_messages
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own inbox messages"
on public.inbox_messages
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own inbox messages"
on public.inbox_messages
for delete
to authenticated
using (auth.uid() = owner_id);

create policy "Users can view own draft records"
on public.draft_records
for select
to authenticated
using (auth.uid() = owner_id);

create policy "Users can insert own draft records"
on public.draft_records
for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "Users can update own draft records"
on public.draft_records
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "Users can delete own draft records"
on public.draft_records
for delete
to authenticated
using (auth.uid() = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'record-images',
  'record-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

drop policy if exists "Users can view own storage objects" on storage.objects;
drop policy if exists "Users can upload own storage objects" on storage.objects;
drop policy if exists "Users can update own storage objects" on storage.objects;
drop policy if exists "Users can delete own storage objects" on storage.objects;

create policy "Users can view own storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can upload own storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can update own storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'record-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop trigger if exists set_telegram_identities_updated_at on public.telegram_identities;
create trigger set_telegram_identities_updated_at
before update on public.telegram_identities
for each row
execute function public.set_current_timestamp_updated_at();

drop trigger if exists set_draft_records_updated_at on public.draft_records;
create trigger set_draft_records_updated_at
before update on public.draft_records
for each row
execute function public.set_current_timestamp_updated_at();
