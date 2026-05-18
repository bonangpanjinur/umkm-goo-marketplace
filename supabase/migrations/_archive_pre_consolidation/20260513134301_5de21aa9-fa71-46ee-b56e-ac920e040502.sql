
-- ============= Ensure shop_portfolio exists =============
create table if not exists public.shop_portfolio (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.coffee_shops(id) on delete cascade,
  image_url text not null,
  caption text,
  category text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_portfolio_shop on public.shop_portfolio(shop_id, sort_order);
alter table public.shop_portfolio enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='shop_portfolio' and policyname='owner_all_portfolio') then
    create policy "owner_all_portfolio" on public.shop_portfolio
      using (shop_id in (select id from coffee_shops where owner_id = auth.uid()))
      with check (shop_id in (select id from coffee_shops where owner_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='shop_portfolio' and policyname='public_read_portfolio') then
    create policy "public_read_portfolio" on public.shop_portfolio for select using (true);
  end if;
end $$;

-- Before/After
alter table public.shop_portfolio
  add column if not exists before_image_url text,
  add column if not exists after_image_url text,
  add column if not exists is_before_after boolean not null default false;

-- ============= Custom Order =============
alter table public.menu_items
  add column if not exists accepts_custom_order boolean not null default false;

create table if not exists public.custom_order_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.coffee_shops(id) on delete cascade,
  product_id uuid references public.menu_items(id) on delete set null,
  customer_name text not null,
  customer_contact text not null,
  description text not null,
  budget_min numeric,
  budget_max numeric,
  deadline date,
  reference_image_url text,
  status text not null default 'pending',
  owner_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_custom_orders_shop on public.custom_order_requests(shop_id, created_at desc);

alter table public.custom_order_requests enable row level security;
drop policy if exists "public_insert_custom_order" on public.custom_order_requests;
create policy "public_insert_custom_order" on public.custom_order_requests
  for insert with check (true);
drop policy if exists "owner_read_custom_order" on public.custom_order_requests;
create policy "owner_read_custom_order" on public.custom_order_requests
  for select using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));
drop policy if exists "owner_update_custom_order" on public.custom_order_requests;
create policy "owner_update_custom_order" on public.custom_order_requests
  for update using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));
drop policy if exists "owner_delete_custom_order" on public.custom_order_requests;
create policy "owner_delete_custom_order" on public.custom_order_requests
  for delete using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));

drop trigger if exists update_custom_order_requests_updated_at on public.custom_order_requests;
create trigger update_custom_order_requests_updated_at
before update on public.custom_order_requests
for each row execute function public.update_updated_at_column();

-- ============= Shop Health Score =============
create or replace view public.shop_health_score
with (security_invoker = true)
as
select
  s.id as shop_id,
  s.name as shop_name,
  s.slug,
  s.owner_id,
  coalesce(prod.cnt, 0)::int as product_count,
  coalesce(ord30.cnt, 0)::int as orders_last_30d,
  coalesce(ord30.total, 0)::numeric as revenue_last_30d,
  coalesce(rev.avg_rating, 0)::numeric(3,2) as avg_rating,
  coalesce(rev.cnt, 0)::int as review_count,
  s.created_at as shop_created_at,
  least(100,
    (case when coalesce(prod.cnt, 0) >= 5 then 20 else coalesce(prod.cnt, 0)*4 end) +
    (case when coalesce(ord30.cnt, 0) >= 20 then 30 else (coalesce(ord30.cnt, 0) * 1.5)::int end) +
    (case when coalesce(rev.avg_rating, 0) >= 4 then 25 else (coalesce(rev.avg_rating, 0) * 5)::int end) +
    (case when (now() - s.created_at) < interval '30 days' then 25 else 15 end)
  )::int as health_score
from public.coffee_shops s
left join (
  select shop_id, count(*) cnt from public.menu_items where is_available = true group by shop_id
) prod on prod.shop_id = s.id
left join (
  select shop_id, count(*) cnt, sum(total) total from public.orders
  where created_at > now() - interval '30 days' and status::text not in ('cancelled', 'refunded')
  group by shop_id
) ord30 on ord30.shop_id = s.id
left join (
  select shop_id, avg(rating)::numeric avg_rating, count(*) cnt
  from public.product_reviews where is_hidden = false group by shop_id
) rev on rev.shop_id = s.id;
