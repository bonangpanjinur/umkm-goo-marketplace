-- F13-1: Tabel push_subscriptions untuk web push VAPID
-- Simpan endpoint + kunci push per user per device

create table if not exists public.push_subscriptions (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  shop_id     uuid        references public.shops(id) on delete set null,
  endpoint    text        not null,
  subscription jsonb      not null,
  user_agent  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, endpoint)
);

-- Index untuk query cepat per user dan per shop
create index if not exists idx_push_subs_user   on public.push_subscriptions (user_id);
create index if not exists idx_push_subs_shop   on public.push_subscriptions (shop_id);
create index if not exists idx_push_subs_endpoint on public.push_subscriptions (endpoint);

-- RLS: user hanya bisa manage subscription milik sendiri
alter table public.push_subscriptions enable row level security;

create policy "push_subs_select_own"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "push_subs_insert_own"
  on public.push_subscriptions for insert
  with check (auth.uid() = user_id);

create policy "push_subs_update_own"
  on public.push_subscriptions for update
  using (auth.uid() = user_id);

create policy "push_subs_delete_own"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

-- Admin service role bisa baca semua (untuk kirim broadcast)
create policy "push_subs_service_role_select"
  on public.push_subscriptions for select
  using (current_setting('role') = 'service_role');

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_push_subs_updated_at
  before update on public.push_subscriptions
  for each row execute procedure public.set_updated_at();
