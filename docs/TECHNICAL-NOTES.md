# Technical notes

## Architecture

The portal is static HTML, CSS and browser JavaScript. Vercel serves `dist/`. A small Node build copies assets, generates a public `config.js` from two environment variables and creates a self-contained offline editor. There are no external JavaScript/CDN/font dependencies, no paid mapping API and no runtime server functions.

Supabase Auth handles password sign-in. The browser uses Auth HTTP endpoints and the PostgREST Data API. Sessions remain in tab sessionStorage and refresh before expiry. Local draft caches are separated by project hostname and organizer ID. Signing out removes the active session. Browser-local copies can remain on the computer for recovery: use trusted devices or remove site data on shared devices.

## Data model

`an_campuses`: two rows (`e9`, `h11`), each holding a JSONB document with title, zones and events, plus revision and save metadata. A zone contains its editable polygon, label point, colour, category, verification flag, notes and room list. An event refers to a zone and optionally a room. A null room reserves the whole area. Schedules are single-day and use local PKT wall-clock times; overnight bookings must be split.

`an_organizers`: approved auth user UUIDs. A user cannot approve themselves. Adding an email through add-organizer.sql succeeds only after that email has an Auth account.

`an_revisions`: the previous 30 full campus documents. The save RPC locks the campus row and verifies the submitted expected revision before changing data. Authorized saves record the prior version. Browser form validation implements booking rules; SQL verifies organizer authorization, document shape, campus ID, version and size limits. Editors are trusted staff. Do not expose RPC write access to untrusted public booking users without adding full server-side event validation.

## Database recovery

In Supabase SQL Editor, inspect versions:

```sql
select id, campus_id, revision, saved_at from public.an_revisions
order by saved_at desc limit 30;
```

To recover, first export the current plan's JSON. Identify the correct history ID and campus. An administrator can restore a snapshot using the following transaction after replacing BOTH placeholders. This is manual administrative work, not a portal control.

```sql
begin;
select * from public.an_campuses where campus_id = 'e9' for update;
insert into public.an_revisions(campus_id, document, revision, saved_by)
select campus_id, document, revision, updated_by
from public.an_campuses where campus_id = 'e9';
update public.an_campuses c
set document = h.document, revision = c.revision + 1,
    updated_at = now(), updated_by = null
from public.an_revisions h
where c.campus_id = 'e9' and h.campus_id = c.campus_id
and h.id = 123; -- replace 123 with the verified history ID
commit;
```

Confirm that one row was updated. Reload the latest cloud plan in the portal. The new revision prevents silent overwriting by stale browser drafts.

## Limits and operations

- Up to 200 areas per campus, 100 vertices per area, 200 rooms per area and 10,000 events per campus.
- Supported browsers: current Chrome and Edge on desktop are the recommended editing environment. Responsive small-screen layout is included. Polygon editing is easiest with a mouse.
- Map vertices are image coordinates, not latitude/longitude. Compass says UP deliberately because true-north orientation cannot be certified from the screenshots.
- Reference screenshots remain unchanged. Drawing and labels are independent SVG data.
- PDF generation runs in the browser with Canvas and a minimal PDF image writer. It uses no print service or external rendering endpoint.
- If a browser blocks a download in an insecure local preview, use the deployed HTTPS site. PDF preparation presents a normal explicit download link.
- Supabase availability, project pausing and account quotas affect cloud saving. The app reports failures and retains a browser draft rather than claiming a cloud save succeeded.
- The current release has organizer-only cloud access. Distribute exported PDF maps to participants. A public live spectator view is not included.

## Validation delivered

Node unit tests exercise conflict rules, import validation, save sequencing, concurrent-edit recovery and the PDF writer's byte offsets. Browser QA exercises both campus routes, room/event forms, local persistence, clash rejection and map selection. JSON download was verified. PDF preparation completed in the preview, but the browser did not complete its PDF download, so that browser download path remains unverified. The same PDF writer was independently exercised with the clean maps, parsed by PDF tools and visually checked after rendering. The standalone offline editor was also opened and checked, including edit/reload persistence. Actual Supabase execution and Vercel deployment require your account setup; no live cloud integration test is claimed.

The supplied setup.sql was also executed twice in an isolated PGlite PostgreSQL engine with a minimal Supabase-style auth schema. These checks passed: repeatable setup, approved organizer reads, outsider row filtering, anonymous denial, direct-update denial, successful save RPC, stale-revision rejection and previous-version history. This verifies SQL execution and policy behavior in that engine; it does not replace a test against your live Supabase Auth service.
