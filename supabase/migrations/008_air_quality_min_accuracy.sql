-- Add a p_min_accuracy parameter to get_aggregated_air_quality so uncalibrated
-- readings (accuracy < p_min_accuracy) are excluded before averaging.
-- drop+recreate is required because Postgres won't let us change the signature
-- of an existing function with create or replace (the grants are also tied to
-- the specific signature).

drop function if exists public.get_aggregated_air_quality(uuid, timestamptz, int);

create function public.get_aggregated_air_quality(
  p_sensor_id uuid,
  p_since timestamptz,
  p_bucket_seconds int default 300,
  p_min_accuracy smallint default 0
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
    and aqd.accuracy >= p_min_accuracy
  group by bucket
  order by bucket asc;
$$;

revoke all on function public.get_aggregated_air_quality(uuid, timestamptz, int, smallint) from public;
grant execute on function public.get_aggregated_air_quality(uuid, timestamptz, int, smallint) to authenticated;