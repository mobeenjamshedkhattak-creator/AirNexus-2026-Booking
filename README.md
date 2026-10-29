# AirNexus Campus Atlas

Editable campus maps for Air University E-9 and H-11: coloured areas, editable boundaries and labels, rooms, event bookings, schedule search, PDF export, editable offline HTML and JSON backup/restore.

**Start with `START-HERE.html`. Open it in Chrome or Edge.** It contains the complete beginner setup guide for GitHub, Supabase and Vercel.

## Quick setup

1. Supabase → SQL Editor → paste and run `supabase/setup.sql`.
2. Supabase → Authentication → Users → Add user → Create new user. Set an email/password and auto-confirm the user.
3. Replace the example email in `supabase/add-organizer.sql` with that email. Run it in SQL Editor. Your email must appear in the result.
4. Copy the Supabase Project URL and **publishable** API key (`sb_publishable_…`).
5. Upload this folder's contents to a private GitHub repository, preserving folders.
6. Vercel → Add New → Project → import that repository. Framework: Other. Build: `npm run build`. Output: `dist`. Add `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` before deploying.
7. Sign in with the organizer account you created. Later edits save to Supabase; they do not require redeployment.

## Important map notes

Maps are manually traced, editable schematics based on the two supplied screenshots. They are not georeferenced, surveyed maps, emergency route maps, or measured floor plans. Roads and building footprints are approximate. Visible names from the references are retained; other names are provisional and marked for confirmation. No actual room names, capacities, or Olympiad events are invented. Confirm boundaries and names before official distribution.

## Local development

Requires Node.js 22 or later. No application dependencies need installing.

```sh
npm run build
npm run dev
```

Open `http://localhost:3000`. Without environment values the app uses local browser storage. Node does not automatically load `.env` files; set environment values in your shell or use Vercel. The offline HTML preview can be opened directly as a file.

```sh
npm test
```

Tests cover time/date validation, room capacity, same-room/whole-area clashes, cancelled events, safe backup import, save acknowledgements, concurrent-edit conflicts, recovery and PDF structure.

## Files

| Path | Purpose |
| --- | --- |
| `public/index.html` | Portal entry point |
| `public/core.js` | Campus geometry and booking rules |
| `public/app.js` | Interactive editor and forms |
| `public/storage.js` | Supabase Auth, saving and conflict handling |
| `public/exports.js` | PDF, offline HTML and backups |
| `public/styles.css` | Responsive design |
| `public/assets/` | Original supplied screenshots for comparison |
| `scripts/build.mjs` | Build and public configuration generation |
| `supabase/setup.sql` | Tables, RLS, organizer access, initial maps, version-safe save RPC |
| `supabase/add-organizer.sql` | Approve a previously created Auth user |
| `docs/` | Clean vector maps and technical notes |
| `vercel.json` | Vercel build configuration |

## Saving and access

Only approved organizers can read or save cloud plans. The publishable key is intentionally public; row-level security and the organizer allowlist protect records. Never add a Supabase secret key, service-role key, database password or organizer password to GitHub or Vercel frontend variables.

Edits autosave about 0.9 seconds after a change, with a revision check. Other signed-in clients poll every 20 seconds when not editing map shapes or using a form. This is polling, not WebSocket realtime. Concurrent edits to the same campus pause the later save, retaining its browser draft for recovery. Export that draft, reload the cloud version and reapply changes. Separate campuses save independently. The database keeps the previous 30 saves per campus; see `docs/TECHNICAL-NOTES.md`.

The offline HTML is independent from the cloud. Use its JSON export and the deployed app's Restore control to transfer edits. Browser storage on file URLs varies by browser; download a JSON backup before closing or moving an offline file. Undo covers the most recent 30 edits in the current session and is reset after a cloud refresh.

Exports contain the plan data currently visible to an organizer. PDF uses the selected campus and date filter, including all categories/areas. JSON and offline HTML include both campus plans. PDF pages are rasterized at 2000 × 1414 pixels for consistent text rendering; use SVG for vector artwork.

## Hosting status

This source package is ready for Vercel. No Vercel or Supabase account has been connected by the author. Live authentication, database policies and cross-device saving must be verified in your own project using the checklist in START-HERE.html.

## Reference images

E-9: user-supplied OpenStreetMap screenshot, © OpenStreetMap contributors. H-11: user-supplied Google Earth imagery; original attribution is retained within the screenshot. The clean schematic is drawn separately and can be edited without altering the reference images. Confirm image-use permissions before publishing the original screenshots beyond your organization.
