-- Sensors represent a single physical air quality device
create table if not exists public.sensors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_sensors_room_id on public.sensors(room_id);

comment on table public.sensors is 'Air quality sensors. Each sensor belongs to a room.';
