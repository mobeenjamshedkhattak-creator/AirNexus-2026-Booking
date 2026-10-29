-- AIRNEXUS CAMPUS ATLAS · run this entire file in Supabase > SQL Editor.
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
insert into public.an_campuses(campus_id,document) values ('e9', $map${"schemaVersion":1,"campusId":"e9","title":"AirNexus Olympiad","zones":[{"id":"e9-a","name":"A Block","category":"Academic","points":[[141,280],[203,247],[253,327],[196,358]],"label":[195,304],"verified":true,"color":"#53b5ff","notes":"","rooms":[]},{"id":"e9-b","name":"B Block","category":"Academic","points":[[184,209],[258,160],[287,207],[216,258]],"label":[235,207],"verified":true,"color":"#faab45","notes":"","rooms":[]},{"id":"e9-n1","name":"North Block 01","category":"Academic","points":[[254,132],[313,95],[346,153],[288,188]],"label":[301,140],"verified":false,"color":"#b59bff","notes":"","rooms":[]},{"id":"e9-n2","name":"North Block 02","category":"Academic","points":[[340,84],[420,53],[467,115],[385,158]],"label":[404,104],"verified":false,"color":"#ff778a","notes":"","rooms":[]},{"id":"e9-iaa","name":"IAA","category":"Academic","points":[[447,190],[468,171],[498,168],[521,188],[522,224],[506,250],[474,257],[449,234],[441,211]],"label":[482,211],"verified":true,"color":"#32c9a0","notes":"","rooms":[]},{"id":"e9-east","name":"East Complex","category":"Academic","points":[[530,122],[601,88],[628,136],[606,196],[538,178]],"label":[578,141],"verified":false,"color":"#f5d547","notes":"","rooms":[]},{"id":"e9-masjid","name":"Masjid","category":"Facilities","points":[[50,247],[100,224],[131,291],[74,313]],"label":[89,269],"verified":true,"color":"#54d5de","notes":"","rooms":[]},{"id":"e9-cside","name":"C-side Building","category":"Academic","points":[[84,346],[126,328],[154,397],[109,411]],"label":[119,369],"verified":false,"color":"#e58bd4","notes":"","rooms":[]},{"id":"e9-south","name":"South Block","category":"Academic","points":[[251,309],[320,272],[345,309],[275,349]],"label":[299,308],"verified":false,"color":"#8acb56","notes":"","rooms":[]},{"id":"e9-court","name":"West Court","category":"Sports","points":[[109,172],[163,149],[209,214],[158,245]],"label":[158,195],"verified":false,"color":"#fb8a60","notes":"","rooms":[]},{"id":"e9-lawn","name":"South Lawn","category":"Outdoor","points":[[195,373],[270,346],[316,417],[231,469]],"label":[254,405],"verified":false,"color":"#85a0ed","notes":"","rooms":[]},{"id":"e9-parking","name":"North Parking","category":"Facilities","points":[[433,47],[550,3],[590,44],[478,119]],"label":[511,57],"verified":false,"color":"#d5bb8c","notes":"","rooms":[]},{"id":"e9-cafe","name":"AU Café","category":"Facilities","points":[[414,257],[431,247],[450,268],[432,279]],"label":[432,264],"verified":true,"color":"#7dd4b5","notes":"","rooms":[]}],"events":[]}$map$::jsonb) on conflict (campus_id) do nothing;
insert into public.an_campuses(campus_id,document) values ('h11', $map${"schemaVersion":1,"campusId":"h11","title":"AirNexus Olympiad","zones":[{"id":"h11-hostel","name":"Hostel Block","category":"Facilities","points":[[280,15],[319,4],[378,99],[329,126]],"label":[328,66],"verified":true,"color":"#53b5ff","notes":"","rooms":[]},{"id":"h11-courts","name":"Sports Courts","category":"Sports","points":[[270,216],[393,146],[435,224],[313,298]],"label":[352,221],"verified":false,"color":"#faab45","notes":"","rooms":[]},{"id":"h11-pitch","name":"Turf Ground","category":"Sports","points":[[369,268],[435,231],[464,275],[396,315]],"label":[416,273],"verified":false,"color":"#b59bff","notes":"","rooms":[]},{"id":"h11-court2","name":"South Court","category":"Sports","points":[[282,306],[346,267],[390,336],[327,377]],"label":[335,323],"verified":false,"color":"#ff778a","notes":"","rooms":[]},{"id":"h11-field","name":"Open Sports Field","category":"Outdoor","points":[[334,381],[465,303],[526,390],[392,467]],"label":[433,387],"verified":false,"color":"#32c9a0","notes":"","rooms":[]},{"id":"h11-west","name":"Academic Wing 01","category":"Academic","points":[[426,476],[498,485],[495,516],[422,507]],"label":[460,496],"verified":false,"color":"#f5d547","notes":"","rooms":[]},{"id":"h11-north","name":"Academic Wing 02","category":"Academic","points":[[499,477],[548,406],[574,422],[523,492]],"label":[539,450],"verified":false,"color":"#54d5de","notes":"","rooms":[]},{"id":"h11-long","name":"Academic Wing 03","category":"Academic","points":[[503,512],[528,501],[620,647],[597,661]],"label":[562,578],"verified":false,"color":"#e58bd4","notes":"","rooms":[]},{"id":"h11-main","name":"Main Building","category":"Academic","points":[[419,545],[506,583],[469,642],[391,604]],"label":[448,594],"verified":false,"color":"#8acb56","notes":"","rooms":[]},{"id":"h11-eastcourt","name":"East Hard Court","category":"Sports","points":[[555,318],[617,282],[734,476],[675,510]],"label":[646,395],"verified":false,"color":"#fb8a60","notes":"","rooms":[]},{"id":"h11-northeast","name":"North-east Area 01","category":"Other","points":[[460,170],[532,126],[564,176],[495,221]],"label":[512,173],"verified":false,"color":"#85a0ed","notes":"","rooms":[]},{"id":"h11-northeast2","name":"North-east Area 02","category":"Other","points":[[499,249],[555,214],[583,263],[529,299]],"label":[543,256],"verified":false,"color":"#d5bb8c","notes":"","rooms":[]},{"id":"h11-plaza","name":"Central Plaza","category":"Outdoor","points":[[331,533],[400,506],[426,542],[388,604],[333,632],[305,592]],"label":[360,567],"verified":false,"color":"#7dd4b5","notes":"","rooms":[]},{"id":"h11-eastopen","name":"East Open Area","category":"Outdoor","points":[[625,562],[668,536],[732,653],[686,682]],"label":[679,610],"verified":false,"color":"#d99efa","notes":"","rooms":[]}],"events":[]}$map$::jsonb) on conflict (campus_id) do nothing;

commit;
-- Next: create an Auth user, then run add-organizer.sql with their email.
