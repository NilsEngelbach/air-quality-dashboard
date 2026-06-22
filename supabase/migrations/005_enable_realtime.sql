-- Enable realtime updates for INSERT events on air_quality_data
do $$
begin
  -- Ensure the realtime publication exists
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- Add the table to the publication if not already present
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'air_quality_data'
  ) then
    alter publication supabase_realtime add table public.air_quality_data;
  end if;
end
$$;
