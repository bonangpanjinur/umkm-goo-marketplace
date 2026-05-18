create table if not exists public.shop_bank_accounts (
  id              uuid primary key default gen_random_uuid(),
  shop_id         uuid not null references public.coffee_shops(id) on delete cascade,
  bank_name       text not null,
  account_number  text not null,
  account_holder  text not null,
  is_primary      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_sba_shop_id on public.shop_bank_accounts(shop_id);

alter table public.shop_bank_accounts enable row level security;

create policy "Owner can manage own bank accounts"
  on public.shop_bank_accounts
  for all
  using (
    shop_id in (
      select id from public.coffee_shops where owner_id = auth.uid()
    )
  );
