-- F-19: Checklist Kondisi Rental (sebelum & sesudah)
-- Merchant mengisi checklist kondisi unit, pelanggan tanda tangan digital

-- ─── Template Item Checklist per Toko ────────────────────────────────────────
create table if not exists public.rental_checklist_templates (
  id          uuid    primary key default gen_random_uuid(),
  shop_id     uuid    not null references public.coffee_shops(id) on delete cascade,
  name        text    not null,              -- mis. "Checklist Motor", "Checklist Mobil"
  items       jsonb   not null default '[]', -- [{label, category}]
  is_default  boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.rental_checklist_templates enable row level security;

create policy "owner_all_rct" on public.rental_checklist_templates
  using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()));

-- ─── Checklist Aktual (satu per rental booking, sebelum/sesudah) ─────────────
create table if not exists public.rental_checklists (
  id               uuid    primary key default gen_random_uuid(),
  shop_id          uuid    not null references public.coffee_shops(id) on delete cascade,
  booking_id       uuid    references public.rental_bookings(id) on delete set null,
  unit_id          uuid    references public.rental_units(id)    on delete set null,
  type             text    not null check (type in ('before', 'after')),
  customer_name    text    not null,
  customer_phone   text,
  odometer_km      integer,
  fuel_level       text    check (fuel_level in ('E','1/4','1/2','3/4','F')),
  items            jsonb   not null default '[]',
    -- [{ label, category, status: 'ok'|'damaged'|'missing', notes, photo_data }]
  signature_data   text,   -- base64 PNG dari canvas signature pad
  signed_by        text,
  signed_at        timestamptz,
  general_notes    text,
  created_at       timestamptz not null default now()
);

alter table public.rental_checklists enable row level security;

create policy "owner_all_rc" on public.rental_checklists
  using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()));

-- pelanggan boleh baca checklist yang mereka tandatangani (via token link opsional)
create policy "public_select_rc" on public.rental_checklists
  for select using (true);

-- ─── Indeks ───────────────────────────────────────────────────────────────────
create index if not exists idx_rc_shop      on public.rental_checklists(shop_id, created_at desc);
create index if not exists idx_rc_booking   on public.rental_checklists(booking_id);
create index if not exists idx_rct_shop     on public.rental_checklist_templates(shop_id);

-- ─── Seed: Template Default Kendaraan ────────────────────────────────────────
-- (Merchant bisa edit/hapus via UI)
-- Insert dilakukan dari UI saat merchant belum punya template.
