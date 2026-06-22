-- Seed a default room and the existing sensor so the dashboard works immediately
insert into public.rooms (id, name)
values ('4a6df52f-cbfa-4cc7-b82f-ccbb5f3f94f8', 'Living Room')
on conflict (id) do nothing;

insert into public.sensors (id, name, room_id)
values ('eb2ad84e-8449-4f6c-8810-83d3afb50732', 'Birdy #1', '4a6df52f-cbfa-4cc7-b82f-ccbb5f3f94f8')
on conflict (id) do nothing;
