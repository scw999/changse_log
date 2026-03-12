create extension if not exists pgcrypto;

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

create index if not exists archive_records_owner_idx on public.archive_records (owner_id, event_date desc, created_at desc);
create index if not exists archive_records_category_idx on public.archive_records (owner_id, category, subcategory);
create index if not exists archive_records_importance_idx on public.archive_records (owner_id, importance desc);
create index if not exists archive_record_images_record_idx on public.archive_record_images (record_id, sort_order);

alter table public.archive_records enable row level security;
alter table public.archive_record_images enable row level security;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'record-images',
  'record-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

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
