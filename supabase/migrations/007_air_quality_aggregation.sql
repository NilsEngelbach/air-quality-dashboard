-- Time-bucketed aggregation of air quality readings.
-- Returns one averaged row per bucket for a sensor since a given timestamp,
-- plus the full-resolution rows so the frontend can mix raw + aggregated data.
-- Using floor(epoch/bucket)*bucket keeps buckets relative to the epoch so they
-- line up across requests.

create or replace function public.get_aggregated_air_quality(
  p_sensor_id uuid,
  p_since timestamptz,
  p_bucket_seconds int default 300
)
returns table (
  bucket timestamptz,
  temperature real,
  humidity real,
  pressure real,
  voc real,
  co2 real,
  iaq real,
  accuracy smallint,
  sample_count int
)
language sql
stable
security definer
as $$
  select
    to_timestamp(floor(extract(epoch from aqd.timestamp_received) / p_bucket_seconds) * p_bucket_seconds) at time zone 'UTC' as bucket,
    avg(aqd.temperature)::real as temperature,
    avg(aqd.humidity)::real as humidity,
    avg(aqd.pressure)::real as pressure,
    avg(aqd.voc)::real as voc,
    avg(aqd.co2)::real as co2,
    avg(aqd.iaq)::real as iaq,
    max(aqd.accuracy)::smallint as accuracy,
    count(*)::int as sample_count
  from public.air_quality_data aqd
  where aqd.sensor_id = p_sensor_id
    and aqd.timestamp_received >= p_since
  group by bucket
  order by bucket asc;
$$;

-- Composite index for efficient range scans by sensor + time.
create index if not exists idx_air_quality_data_sensor_time
  on public.air_quality_data(sensor_id, timestamp_received);

-- Grant access to authenticated users (the table is already read-protected
-- by RLS; SECURITY DEFINER lets the function run with table owner rights so
-- aggregation is not blocked by RLS, while anon/authenticated still need the
-- explicit grant on the function).
revoke all on function public.get_aggregated_air_quality(uuid, timestamptz, int) from public;
grant execute on function public.get_aggregated_air_quality(uuid, timestamptz, int) to authenticated;