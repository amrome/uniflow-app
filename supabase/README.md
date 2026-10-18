# Uniflow backend (Supabase)

The app runs on built-in mock data until it finds Supabase keys. Once you add them, the same screens
read and write the real database.

## 1. Create the project

1. [supabase.com](https://supabase.com) → **New project** (pick a region close to Riyadh, e.g. Frankfurt/Bahrain if offered).
2. **Authentication → Providers**
   - **Email**: enabled. Keep **Confirm email** ON for production (it is what proves someone owns a `@yu.edu.sa` address).
   - **Anonymous sign-ins**: enable (used by "Continue as Guest").
3. **Authentication → Rate limits / Emails**: for the hackathon the built-in mailer is fine; it is limited to a few emails per hour, so create demo users from the dashboard (step 4).

## 2. Create the database

In **SQL Editor → New query**, run these three files **in order**, one at a time:

| File               | What it does                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `01_schema.sql`    | Base tables, security rules (RLS), triggers                                                                                               |
| `02_schema_v2.sql` | Bilingual columns, slugs, approved-email roles, Student Affairs queue, parking and order functions                                        |
| `03_seed.sql`      | The prototype's data: restaurants and menus, shuttle times, 15 instructors and timetables, clubs, events, parking zones, affairs services |

Then run the patches in order: `04_reservation_number.sql`, `05_guest_affairs.sql`,
`06_multiple_tickets.sql`, `08_restaurant_portal.sql`, `09_free_zone_slots.sql`, `10_parking_confirm.sql`, `11_parking_cancel_anytime.sql`, `12_parking_live_reservations.sql` (`07_demo_all_portals.sql` is an optional demo helper).

Each is meant to run **once**. To start over: Project Settings → Database → reset, or delete and recreate the project.

## 3. Connect the app

```
cp .env.example .env      # then fill in the two values
npx expo start --clear
```

Take both values from **Project Settings → API**: the project URL and the **anon / public** key.
Never put the `service_role` key in the app.

## 4. Accounts and roles

Roles are decided at sign-up:

1. If the email is in **`staff_emails`** → that role (`instructor`, `admin`, …). A row with a `club_id` also makes the person that club's admin.
2. Otherwise by domain in **`allowed_domains`** (`yu.edu.sa` → student).
3. Anything else (Gmail…) and anonymous sign-ins → guest (food + shuttle only).

`03_seed.sql` pre-approves three **demo** accounts. Create them in **Authentication → Users → Add user**
(tick _Auto Confirm User_, choose a password):

- `s.alotaibi@yu.edu.sa`: instructor (Dr. Sarah Al-Otaibi)
- `gdg.president@yu.edu.sa`: admin of the GDG club
- `student.affairs@yu.edu.sa`: university admin

Delete them (and their `staff_emails` rows) before real launch.

**Make yourself an admin** (run in the SQL Editor, then sign up in the app with that email):

```sql
insert into public.staff_emails (email, role, note) values ('you@yu.edu.sa', 'admin', 'me');
```

If that person already has an account, also run:
`update public.profiles set role = 'admin' where email = 'you@yu.edu.sa';`

Add real staff the same way: instructors need a matching `instructors.email`; club presidents use
`insert into staff_emails (email, role, club_id) values ('x@yu.edu.sa', 'student', (select id from clubs where slug = 'gdg'));`

### Restaurant accounts (the iPad in each restaurant)

A restaurant account is the profile in `restaurants.manager_id`. Create the user (Authentication →
Users, Auto Confirm), then link it:

```sql
update public.restaurants set manager_id = (select id from public.profiles where email = 'kafton@yu.edu.sa')
where slug = 'kafton';
```

On the iPad: **Staff login** → type that email and password → **Restaurant** chip. It opens the live
orders board (New → Preparing → Ready → Picked up) and Menu & settings (sold out, open/closed, prep
time). The demo block at the end of `08_restaurant_portal.sql` does the same for one email.

## 5. Replacing the seed data

Edit rows in **Table Editor** (restaurants, menu_items, shuttle_timetable, events…). Use these columns:

- `*_en` / `*_ar`: English and Arabic text (a missing Arabic value falls back to English).
- `slug`: the short id used in app links (`/food/kafton`). Keep it unique.
- `sort_order`: the display order.
- Parking: a **paid** zone has real rows in `parking_slots` (`is_occupied` can be fed by sensors); **free** zones use `capacity` / `free_count`, which sensors update with the service role key.

## 6. Tests

```
npm run test:db    # runs the SQL in an in-memory Postgres: security rules, ordering, parking, queue, events
npm test           # app tests (mock mode + a fake-Supabase live mode)
```

## Known limits

- Database error messages (for example "You already have an active ticket") are in English.
- Profile photos, the notifications screen and push notifications are still prototype-only (no storage or messaging yet).
- Queue positions refresh every 15 seconds and on change; parking counts update live.
- Free parking zones have one `parking_slots` row per bay (patch 09). Sensors set `is_occupied` with the service role key; the zone's free count follows automatically.
- The restaurant board updates on every order change (realtime) and re-reads every 15 seconds in case a message is missed.
