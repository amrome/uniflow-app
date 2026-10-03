# UniFlow

@README.md

The README covers the stack, scripts, folder structure and conventions. This file only adds decisions and rules that aren't there.

## Backend (Supabase)

SQL files in `supabase/` run in order: `01_schema.sql`, `02_schema_v2.sql`, `03_seed.sql`, `04_reservation_number.sql`, `05_guest_affairs.sql`, `06_multiple_tickets.sql` (optional demo helper: `07_demo_all_portals.sql`). Database tests are in `supabase/tests/`. Add changes as a new numbered file; don't edit old ones.
Secrets are in `.env` (see `.env.example`). Never read, print or commit it.
The README says services are mocked; check `src/services` to see what is already wired to Supabase and what is still mocked.

### How the backend is wired

- The app reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`. Without them every service serves its mock data (Jest runs this way too).
- DB decisions: bilingual `*_en` / `*_ar` columns; uuid PKs plus a `slug` (routes use slugs, DB writes use `dbId`); Student Affairs is a live queue (no helpdesk tickets tables).
- Roles: pre-approved `staff_emails` list. University admin gets `admin`, club admin is a `club_members` row, instructor is linked by `instructors.email`.
- Stores (`createStore` in `services/store.ts`) are the cache. Services hydrate them after sign-in (`services/data.tsx`) and write through (optimistic, rollback via `reportError`). New data needs three things: SQL, a mapper in the service, a hydrate call.
- Multi-step writes are SQL RPCs: `place_order`, `reserve_parking`, `book_queue_ticket`, `save_week`, `save_portal`, `save_shuttle_times`.
- `npm run test:db` runs the SQL and RLS in PGlite (74 checks). Keep it passing when changing SQL. Jest also has a fake-Supabase live-mode test.
- Not yet verified against a real Supabase project (needs the user's keys): auth emails, anonymous sign-in, realtime channels, PostgREST embeds (`clubs(slug)` etc.).

## Design source (Figma)

- File: https://www.figma.com/design/S9Z8YiKVErzjWoZMJsg1SK/Uniflow-%25E2%2580%2594-Hackathon-Prototype (fileKey `S9Z8YiKVErzjWoZMJsg1SK`). Figma is the source of truth for every screen.
- Page `4:2` = Screens (EN, AR, Dark variants, ~190 frames). Page `0:1` = Design System (Icon/*, Logo/UF, Button, Chip, TopBar, NavBar).
- Frames are named like `04.1 · Kafton Menu`, with `· AR`, `· Dark`, `· Dark · AR` variants. Text node names equal their content, so Arabic copy can be pulled from page metadata instead of fetching each AR frame.
- Page metadata is about 1.7 MB: save it to disk and parse it, don't pull it in one call.
- Icons were exported as SVG and live in `src/components/icons/paths.ts`.

## Build decisions and gotchas

- Demo clock is frozen at Sunday 11:25 AM (`src/services/clock.ts`) so shuttle "in 20 min", office hours and pickup slots match the Figma copy. Swap `nowMinutes()` for real time when going live.
- `experiments.typedRoutes` is off in `app.json`: the generator on Windows / SDK 57 listed non-route files and broke tsc. Don't turn it back on.
- Every tab is its own Stack (`src/app/(tabs)/<tab>/_layout.tsx` uses TabStack) because Figma keeps the tab bar on sub-screens. Staff screens (`src/app/staff/*`) have no tab bar.
- RTL uses `direction: 'rtl'` on the root View (no app reload). Text alignment is mapped in `AppText`.
- React Compiler is on (`experiments.reactCompiler`). Never name a custom hook bare `use` (it is treated as React's `use()` and crashes with "change in the order of Hooks"). Name hooks `useSomething`, e.g. the store's `useValue()`. Jest does not run the compiler, so it won't catch this. To repro device-only crashes, drive the Metro web bundle (`transform.reactCompiler=true`) in headless Edge via CDP.
- Running Expo CLI rewrites `tsconfig.json` and drops the `.expo/types` includes. Run `git checkout tsconfig.json` afterwards.

## Email / auth decisions

- Confirm email is ON in Supabase.
- Testing and demo: Supabase custom SMTP with Gmail (app password, `smtp.gmail.com`, port 465, sender name "UniFlow"). Not for real launch.
- Production: a transactional provider (Resend, Amazon SES, SendGrid, Postmark, Mailgun, Brevo) on a university-owned domain with SPF/DKIM set up by university IT.
- Best long term: university single sign-on (Microsoft or Google Workspace), so no sign-up emails are needed. The staff login screen already mentions it.
- If judges ask: "In production we'd send confirmation emails through a transactional provider on a university-owned domain. The demo uses Supabase SMTP, which is limited."

## Working rules

- Every screen has four variants (EN, AR RTL, dark, dark AR). When asked to change a screen or design, apply it to all four, not just one.
- Colors come from `useTheme()`, strings from `useI18n()`. Screens go through `src/services`, never straight to mock data.
- Before saying a task is done, run `npm run typecheck`, `npm run lint` and `npm test`.
- Prefer targeted searches and line ranges over reading whole large files.

## Student Affairs tickets

- Each service has its own ticket letter: Registration `R`, Transcripts & Letters `T`, Scholarships `S`, ID Card `I` (R-101, S-102…). Live: the database owns it (`affairs_services.ticket_prefix`). Mock: `letter` in `src/services/affairs.ts`. The service list shows the letter as a badge. To add a service, give it a new unique letter in both places.
- A student (or guest) can hold up to 4 live tickets at once, at most one per service (`MAX_TICKETS`; DB patch `06_multiple_tickets.sql`, RPC `my_active_tickets()`). The app keeps them in `tickets` (an array); the ticket screen takes `?id=`.

## Form conventions

- Required inputs get a red `*` (`statusError` colour): pass `required` to `TextField` / `PickerField`. For section headings that act as labels (guest registration), add the red `*` span by hand.
- Phone numbers are entered without the prefix: 9 digits starting with 5, placeholder `5xxxxxxxx`. Use `sanitizePhone`, `PHONE_MAX_LENGTH` and `PHONE_PLACEHOLDER` from `src/lib/phone.ts`. Stored as `+966` + the 9 digits.

- Any `TextField` with `secureTextEntry` automatically gets a show/hide eye button (icons `eye` / `eyeOff`, strings `common.showPassword` / `hidePassword`). Don't build a separate one.
- Event dates can't be before today: the event editor passes `minimumDate` to `PickerField` and disables Publish / Save draft with an error line when the date is past (also for old events opened for editing).

## Navigation rules

- Guests get Food, Transport and Student Affairs (the guest home has a tile for each; the Affairs screens live under `/home/affairs`; `book_queue_ticket` allows guests since patch 05). Parking, schedules, events and profile stay student-only. Guests only have tabs for Food + Transport. The student-only tabs are hidden with `href: null`, but they still exist as the first tab, so `(tabs)/_layout.tsx` sets `backBehavior="none"` for guests. Without it, Back from Food or Transport jumps to the student Home.
- Launch: students and staff stay signed in (saved Supabase session is restored in `services/session.tsx`). A guest session is never restored: guests are signed out on relaunch, so the app starts at Login.
- Transitions: only logging out animates (Login slides in from the left, done by hand in `Screen` via `components/ui/slideFromLeft.ts`: call `requestSlideFromLeft()` right before navigating). Getting back to a home page has no animation: the student Home tab does not slide, and `(tabs)` has `animation: 'none'` so the guest Home button and Back from a guest service appear directly. Native `animation` options were unreliable for the slide, so don't use them for it.
- Signed-in users can't go back to login (`Stack.Protected` in `src/app/_layout.tsx`). Tests for this are in `src/__tests__/auth-nav.test.tsx`.

## Demo mode (skip login for judges)

- Set `EXPO_PUBLIC_SKIP_AUTH=1` in `.env` and restart with `npx expo start --clear`. The app opens straight on the student Home, no login.
- Without Supabase keys that is the mock student. With Supabase keys also set `EXPO_PUBLIC_DEMO_EMAIL` / `EXPO_PUBLIC_DEMO_PASSWORD` to a real demo student account, so orders and reservations belong to a real user. Without them the login screen shows as usual.
- Remove the line (or set it to anything else) to bring authentication back. Logic is in `services/session.tsx` (`SKIP_AUTH`). The login screens and guest flow still exist, nothing was deleted.
- The `.env` values are baked into the bundle, so use a throwaway demo account, never a real one.
- The guest tab bar shows Home (a button to `/guest`, drawn by `TabBar` itself), Transport, Food and Affairs (a button to `/home/affairs`, highlighted while the hidden Home tab is focused), spaced evenly. Never any student-only tab. It is built from: `TabBar` skips tabs hidden with `href: null` (expo-router turns that into `tabBarItemStyle: { display: 'none' }`, which is what the custom bar checks).

## Sharing the app for the demo

- `npm start` only works for phones on the same Wi-Fi as the dev PC (LAN address). For people on other networks use `npm run start:tunnel` (PC must stay on).
- Better for judges: EAS Update (`eas update`, runs in Expo Go with the PC off) or an Android APK (`eas build -p android --profile preview`). Neither is set up yet: no `eas.json`, needs an Expo account.
- The `.env` Supabase keys are baked in when the bundle is built or published, so publish from a machine that has `.env`.

## One account for all portals (demo)

- An account can hold several roles. The login door chooses the portal: normal Login is always the student portal; Staff login opens the chip you tap (Instructor, Club admin, University admin) if the account has that role, otherwise its first staff role. Guest is separate (anonymous account).
- In live mode the Staff login chips use the email and password typed above them; they don't fill in demo emails any more.
- Set it up with `supabase/07_demo_all_portals.sql`: create the user in Supabase (`@yu.edu.sa`, Auto Confirm), put the email at the top of the file, run it. It makes the account university admin + Sarah (instructor) + GDG club admin. To switch portal: Profile > Log out, then use the other door.
- Capabilities come from the database: `profiles.role` admin/affairs = university admin, `instructors.profile_id` = instructor, a `club_members` admin row = club admin (`loadSession` in `services/session.tsx`).

## Product direction

- Now: hackathon live demo (Supabase demo project, mock fallback).
- Later: sold to universities, each integrating its own systems. Plan for per-university configuration and SSO (Microsoft / Google Workspace), which also supplies the user's name, email and university ID.
- Greeting ("Hi, {name}") uses `useDisplayName()`. If an account has no `full_name` it shows "Hi there". For the demo, set the name on every demo account (Profile > Edit, or `profiles.full_name`). No "ask for name" prompt is planned, because SSO will provide it.

## Current status

- Email: Gmail SMTP chosen for testing.
- Done: phone input rules and required `*` markers (see Form conventions).
- Next: work through the app fix list (add items here).
