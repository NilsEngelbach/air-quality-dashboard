-- Individual sensor readings uploaded by the device
create table if not exists public.air_quality_data (
  id uuid primary key default gen_random_uuid(),
  sensor_id uuid not null references public.sensors(id) on delete cascade,
  timestamp_received timestamptz not null default now(),
  temperature real not null,
  humidity real not null,
  pressure real not null,
  voc real not null,
  co2 real not null,
  iaq real not null,
  accuracy smallint not null
);

create index if not exists idx_air_quality_data_sensor_id on public.air_quality_data(sensor_id);
create index if not exists idx_air_quality_data_timestamp on public.air_quality_data(timestamp_received desc);

comment on table public.air_quality_data is 'Air quality measurements received from sensors.';
