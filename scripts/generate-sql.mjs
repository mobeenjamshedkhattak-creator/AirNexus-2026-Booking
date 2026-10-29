import fs from 'node:fs/promises';
import {freshDocument} from '../public/core.js';
const sql=`-- AIRNEXUS CAMPUS ATLAS · run this entire file in Supabase > SQL Editor.
-- Safe to run again: it does not replace existing maps or bookings.
begin;

create table if not exists public.an_organizers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
alter table public.an_organizers enable row level security;
revoke all on public.an_organizers from anon, authenticated;
grant select on public.an_organizers to authenticated;
drop policy if exists an_organizers_read_self on public.an_organizers;
create policy an_organizers_read_self on public.an_organizers for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.an_is_organizer() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.an_organizers where user_id = (select auth.uid())); $$;
revoke all on function public.an_is_organizer() from public, anon;
grant execute on function public.an_is_organizer() to authenticated;

create table if not exists public.an_campuses (
  campus_id text primary key check (campus_id in ('e9','h11')),
  document jsonb not null,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint an_valid_document check (
    document->>'campusId' = campus_id and document->>'schemaVersion' = '1'
    and jsonb_typeof(document->'zones') = 'array'
    and jsonb_typeof(document->'events') = 'array'
  )
);
alter table public.an_campuses enable row level security;
revoke all on public.an_campuses from anon, authenticated;
grant select on public.an_campuses to authenticated;
drop policy if exists an_campuses_read on public.an_campuses;
create policy an_campuses_read on public.an_campuses for select to authenticated using ((select public.an_is_organizer()));

create table if not exists public.an_revisions (
  id bigint generated always as identity primary key,
  campus_id text not null references public.an_campuses(campus_id) on delete cascade,
  document jsonb not null,
  revision bigint not null,
  saved_at timestamptz not null default now(),
  saved_by uuid references auth.users(id) on delete set null
);
create index if not exists an_revisions_campus_idx on public.an_revisions(campus_id, revision desc);
alter table public.an_revisions enable row level security;
revoke all on public.an_revisions from anon, authenticated;
grant select on public.an_revisions to authenticated;
drop policy if exists an_revisions_read on public.an_revisions;
create policy an_revisions_read on public.an_revisions for select to authenticated using ((select public.an_is_organizer()));

create or replace function public.an_save_campus(p_campus_id text, p_document jsonb, p_expected_revision bigint)
returns table(revision bigint, updated_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare current_plan public.an_campuses%rowtype;
begin
  if not public.an_is_organizer() then raise exception 'Organizer access required' using errcode = '42501'; end if;
  if p_campus_id not in ('e9','h11') or p_document is null
     or p_document->>'campusId' is distinct from p_campus_id
     or p_document->>'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_document->'zones') is distinct from 'array'
     or jsonb_typeof(p_document->'events') is distinct from 'array'
     or length(coalesce(p_document->>'title','')) not between 1 and 120
     or octet_length(p_document::text) > 8388608
  then raise exception 'Invalid campus document' using errcode = '22023'; end if;
  if jsonb_array_length(p_document->'zones') > 200 or jsonb_array_length(p_document->'events') > 10000
  then raise exception 'Campus exceeds supported area or event limits' using errcode = '22023'; end if;
  select * into current_plan from public.an_campuses c where c.campus_id = p_campus_id for update;
  if not found then raise exception 'Campus not initialized. Run setup.sql.' using errcode = '22023'; end if;
  if p_expected_revision is null or current_plan.revision <> p_expected_revision
  then raise exception 'Another organizer saved this campus. Export your draft and reload the latest cloud plan.' using errcode = '40001'; end if;
  insert into public.an_revisions(campus_id,document,revision,saved_by)
  values (p_campus_id,current_plan.document,current_plan.revision,current_plan.updated_by);
  return query update public.an_campuses as c set document = p_document, revision = c.revision + 1,
    updated_at = now(), updated_by = auth.uid() where c.campus_id = p_campus_id
    returning c.revision, c.updated_at;
  delete from public.an_revisions as r where r.campus_id = p_campus_id and r.id not in
    (select h.id from public.an_revisions h where h.campus_id = p_campus_id order by h.revision desc limit 30);
end;
$$;
revoke all on function public.an_save_campus(text,jsonb,bigint) from public, anon;
grant execute on function public.an_save_campus(text,jsonb,bigint) to authenticated;

-- Initial clean map data. Existing plans are preserved on repeated setup.
${['e9','h11'].map(id=>`insert into public.an_campuses(campus_id,document) values ('${id}', $map$${JSON.stringify(freshDocument(id))}$map$::jsonb) on conflict (campus_id) do nothing;`).join('\n')}

commit;
-- Next: create an Auth user, then run add-organizer.sql with their email.
`;
await fs.writeFile('supabase/setup.sql',sql);console.log('Generated supabase/setup.sql with both clean campus maps');
