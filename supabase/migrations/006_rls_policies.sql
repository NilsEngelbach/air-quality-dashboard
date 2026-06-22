-- Enable Row Level Security on all application tables
alter table public.rooms enable row level security;
alter table public.sensors enable row level security;
alter table public.air_quality_data enable row level security;

-- Authenticated users can read everything
-- Note: the device writes to air_quality_data using the service_role key, which bypasses RLS.

create policy "Allow authenticated read access" on public.rooms
  for select to authenticated using (true);

create policy "Allow authenticated read access" on public.sensors
  for select to authenticated using (true);

create policy "Allow authenticated read access" on public.air_quality_data
  for select to authenticated using (true);

-- Authenticated users can manage rooms and sensors through the dashboard
create policy "Allow authenticated insert" on public.rooms
  for insert to authenticated with check (true);

create policy "Allow authenticated insert" on public.sensors
  for insert to authenticated with check (true);
