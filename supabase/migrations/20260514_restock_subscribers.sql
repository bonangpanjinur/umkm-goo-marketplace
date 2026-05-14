-- Restock subscribers: customers who want to be notified when a product is back in stock
create table if not exists public.restock_subscribers (
  id            uuid        primary key default gen_random_uuid(),
  shop_id       uuid        not null references public.coffee_shops(id) on delete cascade,
  product_id    uuid        not null references public.menu_items(id)   on delete cascade,
  product_name  text        not null,
  customer_wa   text        not null,
  customer_name text,
  subscribed_at timestamptz not null default now(),
  notified_at   timestamptz,
  unique (product_id, customer_wa)
);

alter table public.restock_subscribers enable row level security;

-- Anyone (including unauthenticated) can subscribe
create policy "restock_sub_insert_anyone" on public.restock_subscribers
  for insert with check (true);

-- Only the shop owner can view their subscribers
create policy "restock_sub_owner_select" on public.restock_subscribers
  for select using (
    shop_id in (select id from public.coffee_shops where owner_id = auth.uid())
  );

-- Only the shop owner can update (mark as notified)
create policy "restock_sub_owner_update" on public.restock_subscribers
  for update using (
    shop_id in (select id from public.coffee_shops where owner_id = auth.uid())
  );

-- Only the shop owner can delete
create policy "restock_sub_owner_delete" on public.restock_subscribers
  for delete using (
    shop_id in (select id from public.coffee_shops where owner_id = auth.uid())
  );

create index if not exists restock_sub_shop_idx    on public.restock_subscribers (shop_id);
create index if not exists restock_sub_product_idx on public.restock_subscribers (product_id);
