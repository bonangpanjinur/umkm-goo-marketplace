
-- History table
create table if not exists public.custom_order_status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.custom_order_requests(id) on delete cascade,
  from_status text,
  to_status text not null,
  note text,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists idx_cor_history_request on public.custom_order_status_history(request_id, created_at);

alter table public.custom_order_status_history enable row level security;

drop policy if exists "owner_read_cor_history" on public.custom_order_status_history;
create policy "owner_read_cor_history" on public.custom_order_status_history
  for select using (
    request_id in (
      select cor.id from public.custom_order_requests cor
      join public.coffee_shops cs on cs.id = cor.shop_id
      where cs.owner_id = auth.uid()
    )
  );

drop policy if exists "owner_insert_cor_history" on public.custom_order_status_history;
create policy "owner_insert_cor_history" on public.custom_order_status_history
  for insert with check (
    request_id in (
      select cor.id from public.custom_order_requests cor
      join public.coffee_shops cs on cs.id = cor.shop_id
      where cs.owner_id = auth.uid()
    )
  );

-- Allow trigger insert (definer)
create or replace function public.log_custom_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, null, new.status, 'Permintaan dibuat', null);
    return new;
  end if;
  if new.status is distinct from old.status then
    insert into public.custom_order_status_history(request_id, from_status, to_status, note, changed_by)
    values (new.id, old.status, new.status, new.owner_note, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_cor_status_history_ins on public.custom_order_requests;
create trigger trg_cor_status_history_ins
  after insert on public.custom_order_requests
  for each row execute function public.log_custom_order_status_change();

drop trigger if exists trg_cor_status_history_upd on public.custom_order_requests;
create trigger trg_cor_status_history_upd
  after update of status on public.custom_order_requests
  for each row execute function public.log_custom_order_status_change();

-- Backfill initial history for existing rows
insert into public.custom_order_status_history(request_id, from_status, to_status, note, created_at)
select cor.id, null, cor.status, 'Permintaan dibuat', cor.created_at
from public.custom_order_requests cor
where not exists (select 1 from public.custom_order_status_history h where h.request_id = cor.id);

-- Update RPC to include history
drop function if exists public.get_customer_custom_orders(text, text);
create or replace function public.get_customer_custom_orders(p_shop_slug text, p_contact text)
returns table (
  id uuid,
  shop_id uuid,
  product_id uuid,
  product_name text,
  customer_name text,
  description text,
  budget_min numeric,
  budget_max numeric,
  deadline date,
  reference_image_url text,
  status text,
  owner_note text,
  created_at timestamptz,
  updated_at timestamptz,
  history jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select cor.id, cor.shop_id, cor.product_id, mi.name as product_name,
         cor.customer_name, cor.description, cor.budget_min, cor.budget_max,
         cor.deadline, cor.reference_image_url, cor.status, cor.owner_note,
         cor.created_at, cor.updated_at,
         coalesce((
           select jsonb_agg(jsonb_build_object(
             'from_status', h.from_status,
             'to_status', h.to_status,
             'note', h.note,
             'created_at', h.created_at
           ) order by h.created_at)
           from public.custom_order_status_history h
           where h.request_id = cor.id
         ), '[]'::jsonb) as history
  from public.custom_order_requests cor
  join public.coffee_shops cs on cs.id = cor.shop_id
  left join public.menu_items mi on mi.id = cor.product_id
  where cs.slug = p_shop_slug
    and regexp_replace(cor.customer_contact, '\D', '', 'g')
        = regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')
    and length(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')) >= 6
  order by cor.created_at desc
  limit 50;
$$;

grant execute on function public.get_customer_custom_orders(text, text) to anon, authenticated;
