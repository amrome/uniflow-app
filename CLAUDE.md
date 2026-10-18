# UniFlow

@README.md

The README covers the stack, scripts, folder structure and conventions. This file only adds decisions and rules that aren't there.

## Backend (Supabase)

SQL files in `supabase/` run in order: `01_schema.sql`, `02_schema_v2.sql`, `03_seed.sql`, `04_reservation_number.sql`, `05_guest_affairs.sql`, `06_multiple_tickets.sql`, `08_restaurant_portal.sql`, `09_free_zone_slots.sql`, `10_parking_confirm.sql`, `11_parking_cancel_anytime.sql`, `12_parking_live_reservations.sql` (optional demo helper: `07_demo_all_portals.sql`). Database tests are in `supabase/tests/`. Add changes as a new numbered file; don't edit old ones.
Secrets are in `.env` (see `.env.example`). Never read, print or commit it.
The README says services are mocked; check `src/services` to see what is already wired to Supabase and what is still mocked.

### How the backend is wired

- The app reads `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env`. Without them every service serves its mock data (Jest runs this way too).
- DB decisions: bilingual `*_en` / `*_ar` columns; uuid PKs plus a `slug` (routes use slugs, DB writes use `dbId`); Student Affairs is a live queue (no helpdesk tickets tables).
- Roles: pre-approved `staff_emails` list. University admin gets `admin`, club admin is a `club_members` row, instructor is linked by `instructors.email`.
- Stores (`createStore` in `services/store.ts`) are the cache. Services hydrate them after sign-in (`services/data.tsx`) and write through (optimistic, rollback via `reportError`). New data needs three things: SQL, a mapper in the service, a hydrate call.
- Multi-step writes are SQL RPCs: `place_order`, `reserve_parking`, `book_queue_ticket`, `save_week`, `save_portal`, `save_shuttle_times`, `kitchen_orders`, `set_order_status`, `confirm_parking`, `cancel_parking`.
- `npm run test:db` runs the SQL and RLS in PGlite (110 checks). Keep it passing when changing SQL. Jest also has a fake-Supabase live-mode test.
- Not yet verified against a real Supabase project (needs the user's keys): auth emails, anonymous sign-in, realtime channels, PostgREST embeds (`clubs(slug)` etc.).

## Restaurant portal (iPad in each restaurant)

- Staff role `restaurant` (`session.restaurantId` = slug). Live: the account is `restaurants.manager_id` (patch `08_restaurant_portal.sql`, demo block at its end). Mock: the Staff login "Restaurant" chip, or an email containing restaurant/kitchen/kafton, opens Kafton.
- Screens: `src/app/staff/restaurant.tsx` (orders board: New → Preparing → Ready → Picked up, reject before ready; three columns when the screen is 760 px or wider, chips on phones) and `restaurant-menu.tsx` (open/closed, prep time, sold-out switches). No Figma frames exist for these; they reuse the staff look (ink header, cards).
- Service `src/services/kitchen.ts`: `kitchenOrders` store, `hydrateKitchen` (RPC `kitchen_orders`), `setOrderStatus` (RPC `set_order_status`, which enforces the order of steps), `setSoldOut`, `updateRestaurant`. The restaurant and menu live in the food store, so students see changes at once.
- Students: sold-out items stay listed but greyed with a "Sold out" chip (`MenuItem.soldOut`, from `is_available`); a closed restaurant (`Restaurant.closed`, from `is_open`) shows "Closed now" and no Add buttons. The order confirmation screen shows live progress (`orderStatuses` / `useOrderStatus` in `food.ts`).
- Live updates: `data.tsx` listens to `orders`, `menu_items`, `restaurants` (realtime) and polls the board every 15 s. In mock mode an order placed on the same device reaches the board through `mockOrderListeners`.

## Paid parking: "Are you still coming?"

- Checkout asks for an arrival time (half-hour chips from the next half hour to 11:30 PM). From 30 min before it (`CHECK_BEFORE_MIN`) the app asks "Are you still coming?": `ParkingCheck` (`features/parking/ParkingCheck.tsx`) is mounted in `(tabs)/_layout.tsx` for students and pops up on any tab, except while the pass screen (`parking/reserved.tsx`) is open, which shows the same two buttons itself (`passOnScreen`). Closing it without answering asks again on the next launch.
- Yes → `confirm_parking` (sets `confirmed_at`). Cancel → `cancel_parking`: status cancelled, `refunded_at` / `refund_amount` recorded, the spot is free at once. Full refund only until 30 min after the arrival time (`REFUND_AFTER_MIN`, enforced in SQL too); after that the pass still offers "Cancel reservation", which frees the spot without a refund (patch 11). Payments are simulated, so the refund is only recorded; a real payment provider's refund call belongs in `cancel_parking`.
- Live: `parking_reservations` is in realtime (patch 12) and every reservation change touches its `parking_lots` row, because realtime only delivers rows a user may read; that touch is what refreshes everyone's Zone P free count. `data.tsx` also re-reads parking, queue and orders when the app returns to the foreground. If the reservation disappears while the pass is open, the pass redirects to Parking.
- Clock: `parkingNow()` is the real Riyadh time in live mode (the database checks refunds against its own clock) and the frozen demo clock in mock mode. With the mock clock at 11:25, booking 11:30 shows the question straight away.

## Free parking zone maps

- Tapping one of the four free zones on Parking opens `src/app/(tabs)/parking/[id].tsx`: a drawn plan of the lot (not a street map). Every bay is numbered and coloured by its sensor (green free, red taken, grey closed). Rows of 10, pairs of rows face a driving lane, bay 1 is by the entrance. Tap a bay for its label and row; "Show me" picks the closest free bay (`nearestFreeBay`). Pinch to zoom works on iOS only (ScrollView `maximumZoomScale`). The plan keeps `direction: 'ltr'` so it never mirrors in Arabic (web ignores this).
- Data: patch `09_free_zone_slots.sql` gives each free zone one `parking_slots` row per bay (label `N-1`…). Sensors write `is_occupied`; a trigger keeps `parking_lots.capacity` / `free_count` in step, so the zone counts follow the bays. Demo a live change in the SQL Editor: `update parking_slots set is_occupied = not is_occupied where label = 'N-7';`
- Service: `zoneBays` store / `useZoneBays` in `services/parking.ts`, loaded in `hydrateParking` and refreshed by the existing `parking_slots` realtime listener. Mock mode: `simulateSensors` swaps a car in and out every 5 s while the map is open (the free count stays the same).
- Street-level directions (Google/Apple Maps) would need each lot's coordinates in `parking_lots.lat` / `lng` (columns exist, empty).

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

- Guests get Food, Transport and Student Affairs (the guest home has a tile for each; the Affairs screens live under `/home/affairs`; `book_queue_ticket` allows guests since patch 05). Parking, schedules, events and profile stay student-only. Guests only have tabs for Food + Transport. The student-only tabs are hidden with `tabBarItemStyle: { display: 'none' }` (never `href: null`: since SDK 58 that makes the route unreachable and redirects to Transport, which broke the guest Affairs tile). They still exist as the first tab, so `(tabs)/_layout.tsx` sets `backBehavior="none"` for guests. Without it, Back from Food or Transport jumps to the student Home.
- Launch: students and staff stay signed in (saved Supabase session is restored in `services/session.tsx`). A guest session is never restored: guests are signed out on relaunch, so the app starts at Login.
- Transitions: only logging out animates (Login slides in from the left, done by hand in `Screen` via `components/ui/slideFromLeft.ts`: call `requestSlideFromLeft()` right before navigating). Getting back to a home page has no animation: the student Home tab does not slide, and `(tabs)` has `animation: 'none'` so the guest Home button and Back from a guest service appear directly. Native `animation` options were unreliable for the slide, so don't use them for it.
- Signed-in users can't go back to login (`Stack.Protected` in `src/app/_layout.tsx`). Tests for this are in `src/__tests__/auth-nav.test.tsx`.

## Demo mode (skip login for judges)

- Set `EXPO_PUBLIC_SKIP_AUTH=1` in `.env` and restart with `npx expo start --clear`. The app opens straight on the student Home, no login.
- Without Supabase keys that is the mock student. With Supabase keys also set `EXPO_PUBLIC_DEMO_EMAIL` / `EXPO_PUBLIC_DEMO_PASSWORD` to a real demo student account, so orders and reservations belong to a real user. Without them the login screen shows as usual.
- Remove the line (or set it to anything else) to bring authentication back. Logic is in `services/session.tsx` (`SKIP_AUTH`). The login screens and guest flow still exist, nothing was deleted.
- The `.env` values are baked into the bundle, so use a throwaway demo account, never a real one.
- The guest tab bar shows Home (a button to `/guest`, drawn by `TabBar` itself), Transport, Food and Affairs (a button to `/home/affairs`, highlighted while the hidden Home tab is focused), spaced evenly. Never any student-only tab. It is built from: `TabBar` skips tabs whose `tabBarItemStyle` has `display: 'none'` (set for guests in `(tabs)/_layout.tsx`).

## Sharing the app for the demo

- `npm start` only works for phones on the same Wi-Fi as the dev PC (LAN address). For people on other networks use `npm run start:tunnel` (PC must stay on).
- Better for judges: EAS Update (`eas update`, runs in Expo Go with the PC off) or an Android APK (`eas build -p android --profile preview`). EAS is set up: Expo account `ame76`, `eas.json` has `preview` (APK, channel `preview`) and `production` profiles, `expo-updates` is installed (runtime version = app version). Cloud builds don't upload the git-ignored `.env`, so the `EXPO_PUBLIC_*` values must also be saved as EAS environment variables, or the build runs on mock data. iPhones can't install an APK: they need TestFlight (Apple Developer account) or Expo Go.
- Expo Go from the store runs only the newest SDK. When SDK 58 came out (2026-09-29), the Expo Go QR for our SDK 57 updates stopped opening the app, so on 2026-10-18 the app moved to SDK 58 (app version 1.1.0, needs Node 22.13+; nvm is installed) and was republished to `preview`. Expo Go friends open the update link `exp://u.expo.dev/0bc6f3de-a811-453f-ac69-b2f5e781ef28/group/<update group id>` (QR on the update's expo.dev page). This breaks again at every new SDK: upgrade, bump `version` in `app.json` (it is the runtime version, so an old APK never receives a newer-SDK update), then `eas update --channel preview --environment preview`. Upgrading: `npx expo install expo@^NN`, then `npx expo install --fix -- --legacy-peer-deps`, then a clean `node_modules` + lock reinstall. SDK 58 also needed `@react-native/jest-preset`, the new tab bar props (`emitter`, `navigateToTab`) and a `WebView<object>` type fix.
- The `.env` Supabase keys are baked in when the bundle is built or published, so publish from a machine that has `.env`.

## One account for all portals (demo)

- An account can hold several roles. The login door chooses the portal: normal Login is always the student portal; Staff login opens the chip you tap (Instructor, Club admin, University admin) if the account has that role, otherwise its first staff role. Guest is separate (anonymous account).
- In live mode the Staff login chips use the email and password typed above them; they don't fill in demo emails any more.
- Set it up with `supabase/07_demo_all_portals.sql`: create the user in Supabase (`@yu.edu.sa`, Auto Confirm), put the email at the top of the file, run it. It makes the account university admin + Sarah (instructor) + GDG club admin. To switch portal: Profile > Log out, then use the other door.
- Capabilities come from the database: `profiles.role` admin/affairs = university admin, `instructors.profile_id` = instructor, a `club_members` admin row = club admin (`loadSession` in `services/session.tsx`).

## Animation conventions

- Durations: press feedback 100-150 ms, state changes 200-300 ms, entrances up to about 400 ms, nothing over 500 ms. Ease-out for things entering. Keep it few and consistent.
- Press feedback: use `PressableScale` (`components/ui/PressableScale.tsx`, core Animated, native driver). `Button`, `Card` (when pressable), `FilterChip` and the tab bar already use it; use it for any new pressable.
- Lists and grids: wrap items in `Reveal index={i}` (`components/ui/Reveal.tsx`, Reanimated `FadeInDown`, 50 ms stagger). `ServiceTile` takes an `index` prop. Used on Home, Guest home and the Student Affairs service rows.
- "Done" moments: `PopIn` (spring zoom) on the order and parking confirmation check marks only (not on the Student Affairs ticket: the user asked for none there).
- Loading: `Skeleton` (`components/ui/Skeleton.tsx`, pulsing grey block) while the first Supabase load runs. `useDataLoading()` from `services/data.tsx` is true during that load; Food, Events and Student Affairs show skeletons when it is true and their list is still empty. Mock mode never loads, so never shows them.
- Lists that change: `AnimatedItem` (150 ms fade in, 100 ms fade out, neighbours glide in 160 ms) on the cart lines and "Your tickets". Toast uses `toastEntering` / `toastExiting` (a short 200 ms slide, no bounce, quicker exit); `ConfirmDialog` card uses `DialogIn` (a quick fade, no zoom). All of these live in `components/ui/Reveal.tsx`.
- Haptics: `haptic.tap / select / success` from `src/lib/haptics.ts` (expo-haptics, never throws). `PressableScale` fires `tap` (or `select` for tabs and chips) on press; `PopIn` fires `success`. Use `feedback="none"` to turn it off for one control.
- Jest has no Reanimated runtime, so `jest.setup.js` replaces everything exported from `Reveal.tsx` with plain Views (and mocks `expo-haptics`). New Reanimated wrappers must be added to that mock.

## Product direction

- Now: hackathon live demo (Supabase demo project, mock fallback).
- Later: sold to universities, each integrating its own systems. Plan for per-university configuration and SSO (Microsoft / Google Workspace), which also supplies the user's name, email and university ID.
- Greeting ("Hi, {name}") uses `useDisplayName()`. If an account has no `full_name` it shows "Hi there". For the demo, set the name on every demo account (Profile > Edit, or `profiles.full_name`). No "ask for name" prompt is planned, because SSO will provide it.

## Current status

- Email: Gmail SMTP chosen for testing.
- Done: phone input rules and required `*` markers (see Form conventions).
- Next: work through the app fix list (add items here).
