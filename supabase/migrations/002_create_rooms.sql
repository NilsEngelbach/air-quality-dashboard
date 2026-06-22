-- Rooms group one or more sensors (e.g. a physical room in the house)
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

comment on table public.rooms is 'Rooms that contain air quality sensors.';
