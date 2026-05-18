-- F-18: Antrean Digital Klinik
-- Nomor antrian otomatis + estimasi waktu tunggu per toko

-- ─── Sesi Antrian ────────────────────────────────────────────────────────────
create table if not exists public.queue_sessions (
  id                   uuid        primary key default gen_random_uuid(),
  shop_id              uuid        not null references public.coffee_shops(id) on delete cascade,
  session_date         date        not null default current_date,
  is_active            boolean     not null default true,
  avg_service_minutes  integer     not null default 10 check (avg_service_minutes between 1 and 120),
  current_number       integer     not null default 0,
  label                text,                          -- mis. "Poli Umum", "Kasir 1"
  started_at           timestamptz not null default now(),
  ended_at             timestamptz,
  created_at           timestamptz not null default now(),
  unique (shop_id, session_date, label)
);

alter table public.queue_sessions enable row level security;

create policy "owner_all_qsessions" on public.queue_sessions
  using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()));

-- ─── Entri Antrian ───────────────────────────────────────────────────────────
create table if not exists public.queue_entries (
  id              uuid        primary key default gen_random_uuid(),
  session_id      uuid        not null references public.queue_sessions(id) on delete cascade,
  shop_id         uuid        not null references public.coffee_shops(id) on delete cascade,
  queue_number    integer     not null,
  customer_name   text        not null,
  customer_phone  text,
  notes           text,
  status          text        not null default 'waiting'
    check (status in ('waiting','serving','done','skipped')),
  called_at       timestamptz,
  served_at       timestamptz,
  done_at         timestamptz,
  created_at      timestamptz not null default now(),
  unique (session_id, queue_number)
);

alter table public.queue_entries enable row level security;

-- Merchant: full access
create policy "owner_all_qentries" on public.queue_entries
  using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()))
  with check (shop_id in (select id from public.coffee_shops where owner_id = auth.uid() or owner_user_id = auth.uid()));

-- Publik: insert (ambil nomor antrian walk-in) + select session aktif
create policy "public_insert_qentry" on public.queue_entries
  for insert with check (true);

create policy "public_select_qentry" on public.queue_entries
  for select using (true);

create policy "public_select_qsessions" on public.queue_sessions
  for select using (true);

-- ─── Fungsi: Mulai Sesi Baru ─────────────────────────────────────────────────
create or replace function public.start_queue_session(
  p_shop_id             uuid,
  p_avg_service_minutes integer default 10,
  p_label               text    default null
)
returns public.queue_sessions
language plpgsql security definer
as $$
declare
  v_session public.queue_sessions;
begin
  -- Non-aktifkan sesi sebelumnya hari ini
  update public.queue_sessions
     set is_active = false, ended_at = now()
   where shop_id = p_shop_id
     and session_date = current_date
     and (p_label is null or label = p_label)
     and is_active = true;

  insert into public.queue_sessions (shop_id, avg_service_minutes, label)
  values (p_shop_id, p_avg_service_minutes, p_label)
  returning * into v_session;

  return v_session;
end;
$$;

-- ─── Fungsi: Ambil Nomor (Walk-In / Merchant) ────────────────────────────────
create or replace function public.take_queue_number(
  p_session_id    uuid,
  p_customer_name text,
  p_customer_phone text default null,
  p_notes          text default null
)
returns public.queue_entries
language plpgsql security definer
as $$
declare
  v_next   integer;
  v_entry  public.queue_entries;
  v_shopid uuid;
begin
  select shop_id into v_shopid from public.queue_sessions where id = p_session_id;
  if v_shopid is null then
    raise exception 'Sesi antrian tidak ditemukan';
  end if;

  select coalesce(max(queue_number), 0) + 1
    into v_next
    from public.queue_entries
   where session_id = p_session_id;

  insert into public.queue_entries (session_id, shop_id, queue_number, customer_name, customer_phone, notes)
  values (p_session_id, v_shopid, v_next, p_customer_name, p_customer_phone, p_notes)
  returning * into v_entry;

  return v_entry;
end;
$$;

-- ─── Fungsi: Panggil Nomor Berikutnya ────────────────────────────────────────
create or replace function public.call_next_queue(p_session_id uuid)
returns public.queue_entries
language plpgsql security definer
as $$
declare
  v_entry  public.queue_entries;
begin
  -- Selesaikan yang sedang dilayani
  update public.queue_entries
     set status = 'done', done_at = now()
   where session_id = p_session_id and status = 'serving';

  -- Panggil nomor waiting terkecil berikutnya
  update public.queue_entries
     set status = 'serving', called_at = now()
   where id = (
     select id from public.queue_entries
      where session_id = p_session_id and status = 'waiting'
      order by queue_number asc
      limit 1
   )
  returning * into v_entry;

  -- Update current_number di sesi
  if v_entry.id is not null then
    update public.queue_sessions
       set current_number = v_entry.queue_number
     where id = p_session_id;
  end if;

  return v_entry;
end;
$$;

-- ─── Fungsi: Skip Antrian ─────────────────────────────────────────────────────
create or replace function public.skip_queue_entry(p_entry_id uuid)
returns public.queue_entries
language plpgsql security definer
as $$
declare v_entry public.queue_entries;
begin
  update public.queue_entries
     set status = 'skipped'
   where id = p_entry_id and status = 'waiting'
  returning * into v_entry;
  return v_entry;
end;
$$;

-- ─── Indeks ───────────────────────────────────────────────────────────────────
create index if not exists idx_queue_sessions_shop_date on public.queue_sessions(shop_id, session_date);
create index if not exists idx_queue_entries_session_status on public.queue_entries(session_id, status);
