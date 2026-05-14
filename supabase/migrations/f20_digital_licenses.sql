-- F-20: Lisensi & Limit Download Produk Digital
-- Server-side tracking, license keys, anti-sharing enforcement

-- ─── Kolom baru di menu_items ─────────────────────────────────────────────────
alter table public.menu_items
  add column if not exists license_type text not null default 'personal'
    check (license_type in ('personal','commercial','extended'));

-- ─── Tabel Lisensi (satu per pembelian produk digital) ────────────────────────
create table if not exists public.digital_licenses (
  id                  uuid        primary key default gen_random_uuid(),
  order_id            uuid        not null references public.orders(id) on delete cascade,
  product_id          uuid        not null references public.menu_items(id) on delete cascade,
  shop_id             uuid        not null references public.coffee_shops(id) on delete cascade,
  license_key         text        not null
    default upper(substring(replace(gen_random_uuid()::text,'-','') from 1 for 16)),
  license_type        text        not null default 'personal'
    check (license_type in ('personal','commercial','extended')),
  download_count      integer     not null default 0,
  max_downloads       integer,                       -- null = tidak terbatas
  last_downloaded_at  timestamptz,
  is_active           boolean     not null default true,
  customer_name       text,
  order_number        text,
  created_at          timestamptz not null default now(),
  unique (order_id, product_id)
);

alter table public.digital_licenses enable row level security;

-- Merchant: baca & update lisensi produknya
create policy "owner_all_dlicense" on public.digital_licenses
  using (shop_id in (select id from public.coffee_shops
                     where owner_id = auth.uid() or owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.coffee_shops
                          where owner_id = auth.uid() or owner_user_id = auth.uid()));

-- Publik: bisa baca lisensi sendiri (via order_id yang diketahui pembeli)
create policy "public_select_dlicense" on public.digital_licenses
  for select using (true);

-- ─── Log tiap event unduhan ───────────────────────────────────────────────────
create table if not exists public.digital_download_logs (
  id             uuid        primary key default gen_random_uuid(),
  license_id     uuid        not null references public.digital_licenses(id) on delete cascade,
  shop_id        uuid        not null,
  downloaded_at  timestamptz not null default now()
);

alter table public.digital_download_logs enable row level security;

create policy "owner_read_dlogs" on public.digital_download_logs
  for select using (shop_id in (select id from public.coffee_shops
                                where owner_id = auth.uid() or owner_user_id = auth.uid()));

create policy "public_insert_dlog" on public.digital_download_logs
  for insert with check (true);

-- ─── RPC: record_download ─────────────────────────────────────────────────────
-- Dipanggil saat pembeli klik tombol Download.
-- Atomik: cek limit → increment → log → kembalikan license_key.
create or replace function public.record_download(
  p_order_id   uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql security definer
as $$
declare
  v_license public.digital_licenses;
  v_shop_id uuid;
  v_max_dl  integer;
  v_ltype   text;
  v_onum    text;
begin
  -- Ambil info produk
  select shop_id, download_limit, license_type
    into v_shop_id, v_max_dl, v_ltype
    from public.menu_items
   where id = p_product_id;

  if v_shop_id is null then
    return jsonb_build_object('ok', false, 'reason', 'product_not_found');
  end if;

  -- Ambil order number jika tersedia
  begin
    select order_number into v_onum from public.orders where id = p_order_id;
  exception when others then
    v_onum := null;
  end;

  -- Cari atau buat lisensi
  select * into v_license
    from public.digital_licenses
   where order_id = p_order_id and product_id = p_product_id;

  if not found then
    insert into public.digital_licenses
      (order_id, product_id, shop_id, max_downloads, license_type, order_number)
    values
      (p_order_id, p_product_id, v_shop_id, v_max_dl, coalesce(v_ltype,'personal'), v_onum)
    returning * into v_license;
  end if;

  -- Cek aktif
  if not v_license.is_active then
    return jsonb_build_object('ok', false, 'reason', 'revoked',
      'license_key', v_license.license_key);
  end if;

  -- Cek limit
  if v_license.max_downloads is not null
     and v_license.download_count >= v_license.max_downloads then
    return jsonb_build_object(
      'ok', false, 'reason', 'limit_reached',
      'limit', v_license.max_downloads,
      'count', v_license.download_count,
      'license_key', v_license.license_key
    );
  end if;

  -- Increment + log
  update public.digital_licenses
     set download_count     = download_count + 1,
         last_downloaded_at = now()
   where id = v_license.id;

  insert into public.digital_download_logs (license_id, shop_id)
  values (v_license.id, v_license.shop_id);

  return jsonb_build_object(
    'ok',             true,
    'license_key',    v_license.license_key,
    'license_type',   v_license.license_type,
    'download_count', v_license.download_count + 1,
    'max_downloads',  v_license.max_downloads
  );
end;
$$;

-- ─── RPC: reset_download_count ───────────────────────────────────────────────
create or replace function public.reset_download_count(p_license_id uuid)
returns void
language plpgsql security definer
as $$
begin
  update public.digital_licenses
     set download_count = 0
   where id = p_license_id
     and shop_id in (
       select id from public.coffee_shops
        where owner_id = auth.uid() or owner_user_id = auth.uid()
     );
end;
$$;

-- ─── Indeks ───────────────────────────────────────────────────────────────────
create index if not exists idx_dlicense_shop    on public.digital_licenses(shop_id, created_at desc);
create index if not exists idx_dlicense_product on public.digital_licenses(product_id);
create index if not exists idx_dlogs_license    on public.digital_download_logs(license_id, downloaded_at desc);
