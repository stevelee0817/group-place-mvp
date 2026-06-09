-- Future Supabase migration draft for the 대학가 단체 모임 매장 탐색 MVP.
-- This file is intentionally not wired into the first MVP.

create table if not exists public.stores (
  id text primary key,
  name text not null,
  area text not null check (area in ('front_gate', 'back_gate', 'station', 'food_street', 'campus_nearby')),
  address text,
  category text not null,
  max_contiguous_group_size integer not null check (max_contiguous_group_size >= 0),
  max_split_group_size integer not null check (max_split_group_size >= max_contiguous_group_size),
  capacity_note text,
  seating_types text[] not null default '{}',
  has_private_room boolean not null default false,
  has_semi_private_area boolean not null default false,
  tables_can_be_combined boolean not null default false,
  seating_description text,
  current_group_status text not null check (current_group_status in ('good', 'limited', 'inquiry_needed', 'difficult')),
  last_updated_at timestamptz not null default now(),
  update_source text not null check (update_source in ('owner', 'operator', 'mock')),
  contact_method text not null check (contact_method in ('phone', 'message', 'app_request')),
  phone text,
  message_hint text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_slots (
  id uuid primary key default gen_random_uuid(),
  store_id text not null references public.stores(id) on delete cascade,
  time text not null,
  status text not null check (status in ('available', 'inquiry', 'unavailable')),
  updated_at timestamptz not null default now(),
  unique (store_id, time)
);

create index if not exists stores_area_idx on public.stores(area);
create index if not exists reservation_slots_store_id_idx on public.reservation_slots(store_id);
