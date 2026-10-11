-- Ethereal Perfumes — database setup (run ONCE in Supabase: SQL Editor > New query > paste > Run)

-- 1) Shared catalog: one row for the products, one for the settings
create table if not exists public.kv (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.kv enable row level security;

-- Everyone (customers) can READ the catalog
drop policy if exists "ethereal read" on public.kv;
create policy "ethereal read" on public.kv for select using (true);

-- Only a signed-in admin can CHANGE it
drop policy if exists "ethereal admin insert" on public.kv;
create policy "ethereal admin insert" on public.kv for insert to authenticated with check (true);
drop policy if exists "ethereal admin update" on public.kv;
create policy "ethereal admin update" on public.kv for update to authenticated using (true) with check (true);
drop policy if exists "ethereal admin delete" on public.kv;
create policy "ethereal admin delete" on public.kv for delete to authenticated using (true);

-- 2) Storage for product photos uploaded from the admin
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "ethereal images read" on storage.objects;
create policy "ethereal images read" on storage.objects for select using (bucket_id = 'product-images');
drop policy if exists "ethereal images upload" on storage.objects;
create policy "ethereal images upload" on storage.objects for insert to authenticated with check (bucket_id = 'product-images');
drop policy if exists "ethereal images update" on storage.objects;
create policy "ethereal images update" on storage.objects for update to authenticated using (bucket_id = 'product-images');
drop policy if exists "ethereal images delete" on storage.objects;
create policy "ethereal images delete" on storage.objects for delete to authenticated using (bucket_id = 'product-images');
