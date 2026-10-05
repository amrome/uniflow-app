import { readFileSync } from 'node:fs';
import { boot, as } from './lib.mjs';
const db = await boot();
let pass = 0,
  fail = 0;
const ok = (name, cond, extra = '') => {
  cond ? pass++ : fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <- ' + extra}`);
};
const fails = async (name, p, match) => {
  try {
    await p;
    ok(name, false, 'did not fail');
  } catch (e) {
    ok(name, !match || e.message.includes(match), e.message);
  }
};
const mk = async (email, name) =>
  (
    await db.query(
      `insert into auth.users (email, raw_user_meta_data, is_anonymous) values ($1, $2::jsonb, $3) returning id`,
      [email, JSON.stringify({ full_name: name }), email === null],
    )
  ).rows[0].id;

const stu = await mk('202311430@yu.edu.sa', 'Amro Elian');
const stu2 = await mk('202400111@yu.edu.sa', 'Second Student');
const gst = await mk('friend@gmail.com', 'Gmail Guest');
const anon = await mk(null, '');
const inst = await mk('s.alotaibi@yu.edu.sa', 'Sarah');
const club = await mk('gdg.president@yu.edu.sa', 'GDG President');
const adm = await mk('student.affairs@yu.edu.sa', 'Affairs');
const other = await mk('someone.else@yu.edu.sa', 'Other');

console.log('\n-- sign-up roles');
const prof = async (id) =>
  (await db.query('select role, university_id from profiles where id=$1', [id])).rows[0];
ok(
  'yu student -> student, id 2023-11430',
  JSON.stringify(await prof(stu)) === '{"role":"student","university_id":"2023-11430"}',
);
ok('gmail -> guest', (await prof(gst)).role === 'guest');
ok('anonymous (no email) -> guest', (await prof(anon)).role === 'guest');
ok('listed instructor -> instructor', (await prof(inst)).role === 'instructor');
ok('listed uni admin -> admin', (await prof(adm)).role === 'admin');
ok('unlisted yu address stays a student', (await prof(other)).role === 'student');
ok(
  'club president is a student with club admin row',
  (await prof(club)).role === 'student' &&
    (
      await db.query(
        `select 1 from club_members cm join clubs c on c.id=cm.club_id where cm.user_id=$1 and c.slug='gdg' and cm.role='admin'`,
        [club],
      )
    ).rowCount === 1,
);
ok(
  'instructor row linked to the account',
  (await db.query(`select 1 from instructors where slug='sarah' and profile_id=$1`, [inst]))
    .rowCount === 1,
);

console.log('\n-- profile edits');
await as(db, stu, `update profiles set phone='+966500000000' where id='${stu}'`);
ok(
  'student can edit own phone',
  (await db.query('select phone from profiles where id=$1', [stu])).rows[0].phone ===
    '+966500000000',
);
await fails(
  'student cannot edit university_id',
  as(db, stu, `update profiles set university_id='1' where id='${stu}'`),
  'permission denied',
);
await fails(
  'student cannot make self admin',
  as(db, stu, `update profiles set role='admin' where id='${stu}'`),
  'permission denied',
);
ok(
  'student cannot read staff_emails',
  (await as(db, stu, 'select * from staff_emails')).rows.length === 0,
);
ok(
  "student cannot see other people's profiles",
  (await as(db, stu, 'select id from profiles')).rows.length === 1,
);

console.log('\n-- food');
const kaftonItems = (
  await db.query(`select id, slug from menu_items where slug in ('k-shawarma','k-laban')`)
).rows;
const mi = Object.fromEntries(kaftonItems.map((r) => [r.slug, r.id]));
const rid = async (slug) =>
  (await db.query(`select id from restaurants where slug=$1`, [slug])).rows[0].id;
const kafton = await rid('kafton'),
  archi = await rid('archi'),
  soon = await rid('soon');
const items = JSON.stringify([
  { menu_item_id: mi['k-shawarma'], quantity: 2 },
  { menu_item_id: mi['k-laban'], quantity: 1 },
]);
const order = (
  await as(db, stu, `select * from place_order('${kafton}', '${items}'::jsonb, null, 'mada', null)`)
).rows[0];
ok('order total = 2x18 + 6 = 42 (server priced)', Number(order.total) === 42, order.total);
ok('order number starts at UF-10432', order.order_number === 'UF-10432', order.order_number);
ok('customer name stamped for the kitchen', order.customer_name === 'Amro Elian');
ok(
  'pickup time = now + prep (12 min)',
  Math.abs((new Date(order.pickup_time) - Date.now()) / 60000 - 12) < 1.5,
);
const guestOrder = (await as(db, gst, `select * from place_order('${kafton}', '${items}'::jsonb)`))
  .rows[0];
ok(
  'guest can order food',
  Number(guestOrder.total) === 42 && guestOrder.order_number === 'UF-10433',
);
await fails(
  'an order number can never repeat',
  db.query(`update orders set order_number = '${order.order_number}' where id='${guestOrder.id}'`),
  'duplicate key',
);
await fails(
  'empty cart rejected',
  as(db, stu, `select * from place_order('${kafton}', '[]'::jsonb)`),
  'empty',
);
await fails(
  'item from another restaurant rejected',
  as(db, stu, `select * from place_order('${archi}', '${items}'::jsonb)`),
  'does not belong',
);
await fails(
  'coming-soon restaurant rejected',
  as(db, stu, `select * from place_order('${soon}', '${items}'::jsonb)`),
  'not taking orders',
);
await fails(
  'forged total on direct insert rejected',
  as(db, stu, `insert into orders (restaurant_id, total) values ('${kafton}', 0.01)`),
  'permission denied',
);
ok(
  "students cannot see each other's orders",
  (await as(db, stu2, 'select * from orders')).rows.length === 0,
);
ok('owner sees only own order', (await as(db, stu, 'select * from orders')).rows.length === 1);
await as(db, stu, `update orders set status='cancelled' where id='${order.id}'`);
ok(
  'owner can cancel a pending order',
  (await db.query('select status from orders where id=$1', [order.id])).rows[0].status ===
    'cancelled',
);
await as(db, stu, `insert into favorite_restaurants (restaurant_id) values ('${kafton}')`);
ok(
  'favourite restaurant saved for self only',
  (await as(db, stu, 'select * from favorite_restaurants')).rows.length === 1 &&
    (await as(db, stu2, 'select * from favorite_restaurants')).rows.length === 0,
);

console.log('\n-- parking');
const lid = async (slug) =>
  (await db.query(`select id from parking_lots where slug=$1`, [slug])).rows[0].id;
const paid = await lid('paid'),
  north = await lid('north');
const zoneFree = async () =>
  (await as(db, stu, `select free from parking_zones where slug='paid'`)).rows[0].free;
ok('paid zone starts with 18 free', (await zoneFree()) === 18);
const res = (await as(db, stu, `select * from reserve_parking('${paid}', 'applePay')`)).rows[0];
const label = async (id) =>
  (await db.query('select label from parking_slots where id=$1', [id])).rows[0].label;
ok('first reservation gets P-17 (lowest free)', (await label(res.slot_id)) === 'P-17');
ok('charged 80 SAR via applePay', Number(res.amount) === 80 && res.payment_method === 'applePay');
ok(
  'reservation ends at midnight Riyadh',
  (() => {
    const h = new Date(new Date(res.ends_at).getTime() + 3 * 3600e3);
    return h.getUTCHours() === 0 && h.getUTCMinutes() === 0;
  })(),
);
ok('zone now shows 17 free', (await zoneFree()) === 17);
await fails(
  'second reservation by same student rejected',
  as(db, stu, `select * from reserve_parking('${paid}', 'mada')`),
  'already have',
);
const res2 = (await as(db, stu2, `select * from reserve_parking('${paid}', 'mada')`)).rows[0];
ok('another student gets a different slot (P-18)', (await label(res2.slot_id)) === 'P-18');
ok(
  'every reservation gets its own increasing number (gaps are fine, repeats are not)',
  res.reservation_number === 'PK-10001' &&
    /^PK-\d+$/.test(res2.reservation_number) &&
    res2.reservation_number !== res.reservation_number,
  `${res.reservation_number} ${res2.reservation_number}`,
);
await fails(
  'a reservation number can never repeat',
  db.query(
    `update parking_reservations set reservation_number = '${res.reservation_number}' where id='${res2.id}'`,
  ),
  'duplicate key',
);
await fails(
  'guest cannot reserve parking',
  as(db, gst, `select * from reserve_parking('${paid}', 'mada')`),
  'students and staff',
);
await fails(
  'free (sensor) zones cannot be reserved',
  as(db, other, `select * from reserve_parking('${north}', 'mada')`),
  'cannot be reserved',
);
ok(
  "student cannot see others' reservations",
  (await as(db, stu, 'select * from parking_reservations')).rows.length === 1,
);
await as(db, stu, `update parking_reservations set status='cancelled' where id='${res.id}'`);
ok('cancelling frees the spot again (16 + 1 = 17)', (await zoneFree()) === 17);
await as(db, stu, `insert into spot_alerts (lot_id) values ('${north}')`);
ok('spot alert saved', (await as(db, stu, 'select * from spot_alerts')).rows.length === 1);

console.log('\n-- student affairs queue');
const sid = async (slug) =>
  (await db.query(`select id from affairs_services where slug=$1`, [slug])).rows[0].id;
const reg = await sid('registration'),
  tr = await sid('transcripts');
await as(db, stu, `select book_queue_ticket('${reg}')`);
let t1 = (await as(db, stu, 'select * from my_active_ticket()')).rows[0];
ok(
  'first ticket is R-101, nobody ahead, now serving itself',
  t1.number === 'R-101' && t1.ahead === 0 && t1.now_serving === 'R-101',
  JSON.stringify(t1),
);
await fails(
  'no second live ticket for the same service',
  as(db, stu, `select book_queue_ticket('${reg}')`),
  'already have',
);
await as(db, stu, `select book_queue_ticket('${tr}')`);
ok(
  'a student can hold a ticket for each service (2 live)',
  (await as(db, stu, 'select * from my_active_tickets()')).rows.length === 2,
);
await as(db, stu, `select book_queue_ticket('${await sid('scholarships')}')`);
await as(db, stu, `select book_queue_ticket('${await sid('idcard')}')`);
const mine = (await as(db, stu, 'select number from my_active_tickets()')).rows.map(
  (r) => r.number[0],
);
ok('four live tickets, one letter per service (R,T,S,I)', mine.join('') === 'RTSI', mine.join(','));
await db.query(`update public.affairs_services set is_active = true`);
await db.query(
  `insert into public.affairs_services (slug, name_en, name_ar, ticket_prefix, minutes_per_ticket, sort_order) values ('extra','Extra','إضافي','X',5,9)`,
);
await fails(
  'a fifth live ticket is refused',
  as(db, stu, `select book_queue_ticket('${await sid('extra')}')`),
  'up to 4',
);
await db.query(`delete from public.affairs_services where slug = 'extra'`);
await as(db, stu2, `select book_queue_ticket('${reg}')`);
let t2 = (await as(db, stu2, 'select * from my_active_ticket()')).rows[0];
ok(
  'second student is R-102 with 1 ahead, ~5 min wait',
  t2.number === 'R-102' && t2.ahead === 1 && t2.wait_min === 5,
  JSON.stringify(t2),
);
const slot = new Date(Date.now() + 90 * 60000).toISOString();
await as(db, other, `select book_queue_ticket('${reg}', '${slot}')`);
const t3 = (await as(db, other, 'select * from my_active_ticket()')).rows[0];
ok(
  'appointment ticket: nobody ahead, wait ~90 min',
  t3.number === 'R-103' && t3.ahead === 0 && Math.abs(t3.wait_min - 90) <= 1,
  JSON.stringify(t3),
);
await fails(
  'direct ticket insert rejected',
  as(db, adm, `insert into queue_tickets (service_id, seq) values ('${tr}', 99)`),
  'permission denied',
);
await fails(
  'student cannot call next',
  as(db, stu, `select affairs_call_next('${reg}')`),
  'Not allowed',
);
const called = (await as(db, adm, `select affairs_call_next('${reg}') as n`)).rows[0].n;
ok('staff calls R-101', called === 'R-101', called);
t2 = (await as(db, stu2, 'select * from my_active_ticket()')).rows[0];
ok(
  'student 2 sees R-101 now serving, 0 waiting ahead',
  t2.now_serving === 'R-101' && t2.ahead === 0 && t2.status === 'waiting',
  JSON.stringify(t2),
);
await as(db, adm, `select affairs_call_next('${reg}')`);
t2 = (await as(db, stu2, 'select * from my_active_ticket()')).rows[0];
ok(
  'after next call: R-102 being served, 1 served, 0 ahead',
  t2.status === 'serving' && t2.served === 1 && t2.ahead === 0,
  JSON.stringify(t2),
);
const st = (
  await as(
    db,
    stu,
    `select next_number, waiting from affairs_service_status where slug='registration'`,
  )
).rows[0];
ok('service board: next number R-104', st.next_number === 'R-104', JSON.stringify(st));
await as(db, gst, `select book_queue_ticket('${reg}')`);
const tg = (await as(db, gst, 'select * from my_active_ticket()')).rows[0];
ok('guest can book a Student Affairs ticket', tg && /^R-\d+$/.test(tg.number), JSON.stringify(tg));
await as(db, other, `update queue_tickets set status='cancelled' where user_id='${other}'`);
ok(
  'owner can cancel own waiting ticket',
  (await as(db, other, 'select * from my_active_ticket()')).rows.length === 0,
);

console.log('\n-- events');
const vis = async (uid) =>
  (await as(db, uid, `select slug from events where slug='cloud-workshop'`)).rows.length;
ok('draft hidden from students', (await vis(stu)) === 0);
ok('draft visible to its club admin', (await vis(club)) === 1);
ok('draft visible to uni admin', (await vis(adm)) === 1);
const eid = async (slug) =>
  (await db.query(`select id from events where slug=$1`, [slug])).rows[0].id;
const devfest = await eid('devfest'),
  cloudId = await eid('cloud-workshop'),
  photo = await eid('photo-meetup');
await fails(
  'cannot RSVP to a draft',
  as(db, stu, `insert into event_rsvps (event_id) values ('${cloudId}')`),
  'row-level security',
);
await as(db, stu, `insert into event_rsvps (event_id) values ('${devfest}')`);
await as(db, stu2, `insert into event_rsvps (event_id) values ('${devfest}')`);
ok(
  'rsvp count is real (2)',
  (await as(db, other, `select rsvp_count from event_rsvp_counts where event_id='${devfest}'`))
    .rows[0].rsvp_count === 2,
);
await db.query(`update events set capacity = 2 where id='${devfest}'`);
await fails(
  'event full at capacity',
  as(db, other, `insert into event_rsvps (event_id) values ('${devfest}')`),
  'Event is full',
);
ok(
  'club admin sees attendee names for own club event',
  (await as(db, club, `select full_name from event_attendees where event_id='${devfest}'`)).rows
    .length === 2,
);
await as(db, other, `insert into event_rsvps (event_id) values ('${photo}')`);
ok(
  "club admin cannot see attendees of another club's event",
  (await as(db, club, `select * from event_attendees where event_id='${photo}'`)).rows.length === 0,
);
ok(
  'students see no attendee list',
  (await as(db, stu, 'select * from event_attendees')).rows.length === 0,
);
const gdgId = (await db.query(`select id from clubs where slug='gdg'`)).rows[0].id;
await as(
  db,
  club,
  `insert into events (club_id, title_en, starts_at) values ('${gdgId}', 'New GDG event', now() + interval '3 days')`,
);
ok(
  'club admin can create an event for own club',
  (await db.query(`select 1 from events where title_en='New GDG event' and created_by=$1`, [club]))
    .rows.length === 1,
);
await fails(
  'club admin cannot create a university-wide event',
  as(
    db,
    club,
    `insert into events (club_id, title_en, starts_at) values (null, 'Uni event', now())`,
  ),
  'row-level security',
);
await as(
  db,
  adm,
  `insert into events (club_id, title_en, starts_at) values (null, 'Uni event', now() + interval '2 days')`,
);
ok(
  'uni admin can create a university event',
  (await db.query(`select 1 from events where title_en='Uni event'`)).rows.length === 1,
);
await fails(
  'student cannot create events',
  as(db, stu, `insert into events (title_en, starts_at) values ('x', now())`),
  'row-level security',
);

console.log('\n-- transport + guest contact');
await as(db, adm, `select save_shuttle_times('toCampus', '{07:45,08:30,09:15}'::text[])`);
const nTimes = async (d) =>
  (
    await db.query(
      `select count(*)::int c from shuttle_timetable t join shuttle_routes r on r.id=t.route_id where r.direction=$1`,
      [d],
    )
  ).rows[0].c;
ok('admin replaces a shuttle direction atomically (3 trips)', (await nTimes('toCampus')) === 3);
ok('other direction untouched (9 trips)', (await nTimes('fromCampus')) === 9);
await fails(
  'student cannot edit the shuttle',
  as(db, stu, `select save_shuttle_times('toCampus', '{01:00}'::text[])`),
  'Not allowed',
);
const g2 = (
  await db.query(
    `insert into auth.users (email, raw_user_meta_data, is_anonymous) values (null, '{"full_name":"Visitor","contact":"+966555"}', true) returning id`,
  )
).rows[0].id;
ok(
  'guest contact copied into profile',
  (await db.query('select phone from profiles where id=$1', [g2])).rows[0].phone === '+966555',
);

console.log('\n-- instructors');
const iid = async (slug) =>
  (await db.query(`select id from instructors where slug=$1`, [slug])).rows[0].id;
const sarah = await iid('sarah'),
  lama = await iid('lama');
const hours = JSON.stringify([
  { day_of_week: 0, start_time: '10:00', end_time: '11:00' },
  { day_of_week: 3, start_time: '13:00', end_time: '14:00' },
]);
await as(db, inst, `select save_portal('${sarah}', 'away', 'Back at 1pm', '${hours}'::jsonb)`);
const sr = (
  await db.query(
    `select availability_status s, status_note n, (select count(*)::int from office_hours where instructor_id=instructors.id) h from instructors where id=$1`,
    [sarah],
  )
).rows[0];
ok(
  'instructor saves own portal (status, note, 2 windows)',
  sr.s === 'away' && sr.n === 'Back at 1pm' && sr.h === 2,
  JSON.stringify(sr),
);
await fails(
  "instructor cannot edit another instructor's portal",
  as(db, inst, `select save_portal('${lama}', 'away', '', '[]'::jsonb)`),
  'Not allowed',
);
await fails(
  'student cannot edit a portal',
  as(db, stu, `select save_portal('${sarah}', 'away', '', '[]'::jsonb)`),
  'Not allowed',
);
const week = JSON.stringify([
  {
    day_of_week: 0,
    start_time: '08:30',
    end_time: '09:30',
    slot_type: 'CLS',
    title_en: 'Intro',
    title_ar: 'x',
    room_en: 'E-1',
    room_ar: 'E-1',
  },
]);
await as(db, inst, `select save_week('${sarah}', '${week}'::jsonb)`);
ok(
  'instructor replaces own weekly timetable',
  (await db.query(`select count(*)::int c from schedule_slots where instructor_id=$1`, [sarah]))
    .rows[0].c === 1,
);
ok(
  "other instructors' timetables untouched (30)",
  (await db.query(`select count(*)::int c from schedule_slots where instructor_id=$1`, [lama]))
    .rows[0].c === 30,
);
await as(db, stu, `update instructors set name_en='HACKED' where id='${sarah}'`);
ok(
  'student cannot change instructor rows (0 rows updated)',
  (await db.query('select name_en from instructors where id=$1', [sarah])).rows[0].name_en ===
    'Dr. Sarah Al-Otaibi',
);
await as(
  db,
  stu,
  `insert into instructor_prefs (instructor_id, followed, notify) values ('${sarah}', true, true)`,
);
ok(
  'student follows an instructor',
  (await as(db, stu, 'select * from instructor_prefs')).rows.length === 1,
);

console.log('\n-- restaurant portal (08_restaurant_portal.sql)');
const ipad = await mk('kafton.ipad@yu.edu.sa', 'Kafton iPad');
await db.query(`update restaurants set manager_id = $1 where slug = 'kafton'`, [ipad]);
const kOrder = (await as(db, stu2, `select * from place_order('${kafton}', '${items}'::jsonb)`))
  .rows[0];
const board = (await as(db, ipad, `select kitchen_orders('${kafton}') as j`)).rows[0].j;
const kRow = board.find((o) => o.id === kOrder.id);
ok(
  "kitchen sees today's orders with items",
  board.length === 3 &&
    kRow?.customer_name === 'Second Student' &&
    kRow.items.length === 2 &&
    kRow.items.some((i) => i.name_en === 'Chicken Shawarma Wrap' && i.quantity === 2),
  JSON.stringify(board.map((o) => [o.order_number, o.status, o.items.length])),
);
await fails(
  "a student cannot open a restaurant's board",
  as(db, stu, `select kitchen_orders('${kafton}')`),
  'Not allowed',
);
await fails(
  "a restaurant cannot open another restaurant's board",
  as(db, ipad, `select kitchen_orders('${archi}')`),
  'Not allowed',
);
const statusOf = async (id) =>
  (await db.query('select status from orders where id=$1', [id])).rows[0].status;
await as(db, ipad, `select set_order_status('${kOrder.id}', 'preparing')`);
await as(db, ipad, `select set_order_status('${kOrder.id}', 'ready')`);
ok('kitchen moves an order to ready', (await statusOf(kOrder.id)) === 'ready');
ok(
  'the student sees the order is ready',
  (await as(db, stu2, `select status from orders where id='${kOrder.id}'`)).rows[0]?.status ===
    'ready',
);
await fails(
  'a ready order cannot be cancelled',
  as(db, ipad, `select set_order_status('${kOrder.id}', 'cancelled')`),
  'already ready',
);
await as(db, ipad, `select set_order_status('${kOrder.id}', 'completed')`);
ok('kitchen marks it picked up', (await statusOf(kOrder.id)) === 'completed');
await fails(
  'a student cannot change order status',
  as(db, stu2, `select set_order_status('${kOrder.id}', 'preparing')`),
  'Not allowed',
);
await fails(
  'a cancelled order stays cancelled',
  as(db, ipad, `select set_order_status('${order.id}', 'preparing')`),
  'already cancelled',
);
const kunafaId = (await db.query(`select id from menu_items where slug = 'k-kunafa'`)).rows[0].id;
await as(db, ipad, `update menu_items set is_available = false where id = '${kunafaId}'`);
await as(db, ipad, `update restaurants set is_open = false, prep_min = 20 where id = '${kafton}'`);
const kNow = (await db.query('select is_open, prep_min from restaurants where id=$1', [kafton]))
  .rows[0];
const kunafa = (await db.query('select is_available from menu_items where id=$1', [kunafaId]))
  .rows[0];
ok(
  'restaurant marks an item sold out, closes and sets prep time',
  kunafa.is_available === false && kNow.is_open === false && kNow.prep_min === 20,
);
await fails(
  'a closed restaurant takes no orders',
  as(db, stu, `select * from place_order('${kafton}', '${items}'::jsonb)`),
  'not taking orders',
);
await as(db, ipad, `update menu_items set is_available = false where restaurant_id = '${archi}'`);
ok(
  "a restaurant cannot edit another restaurant's menu",
  (await db.query(`select count(*)::int as n from menu_items where restaurant_id=$1 and not is_available`, [archi]))
    .rows[0].n === 0,
);
await db.query(`update restaurants set is_open = true, prep_min = 12 where id = $1`, [kafton]);
await db.query(`update menu_items set is_available = true where id = $1`, [kunafaId]);

console.log('\n-- free zone bays (09_free_zone_slots.sql)');
const zoneCounts = async (slug) =>
  (await as(db, stu, `select total, free from parking_zones where slug='${slug}'`)).rows[0];
const bays = async (slug) =>
  (
    await as(
      db,
      stu,
      `select s.label, s.is_occupied from parking_slots s join parking_lots l on l.id = s.lot_id where l.slug = '${slug}'`,
    )
  ).rows;
const northBays = await bays('north');
ok(
  'every free zone has one numbered bay per space, with the same free count as before',
  northBays.length === 120 &&
    northBays.filter((b) => !b.is_occupied).length === 12 &&
    northBays.some((b) => b.label === 'N-120') &&
    (await bays('east')).every((b) => b.is_occupied) &&
    (await bays('west')).length === 80,
  JSON.stringify(await zoneCounts('north')),
);
const freeBay = northBays.find((b) => !b.is_occupied).label;
await db.query(`update parking_slots set is_occupied = true where label = $1`, [freeBay]);
ok('a sensor taking a bay lowers the zone count', (await zoneCounts('north')).free === 11);
await db.query(`update parking_slots set is_occupied = false where label = 'E-5'`);
ok(
  'a bay freeing up in a full zone shows 1 free',
  JSON.stringify(await zoneCounts('east')) === '{"total":60,"free":1}',
  JSON.stringify(await zoneCounts('east')),
);
await as(db, stu, `update parking_slots set is_occupied = false where label = '${freeBay}'`);
ok("a student can't fake a sensor", (await zoneCounts('north')).free === 11);
await db.exec(readFileSync(new URL('../09_free_zone_slots.sql', import.meta.url), 'utf8'));
ok('patch 09 can run twice', (await bays('north')).length === 120);

console.log('\n-- parking: still coming? (10_parking_confirm.sql)');
const freeBefore = await zoneFree();
const later = (
  await as(
    db,
    stu,
    `select * from reserve_parking('${paid}', 'mada', least(now() + interval '1 hour', date_trunc('day', now() at time zone 'Asia/Riyadh') at time zone 'Asia/Riyadh' + interval '23 hours 59 minutes'))`,
  )
).rows[0];
ok(
  'a reservation keeps its arrival time',
  later.arrive_at !== null && String(later.arrive_at) !== String(later.starts_at),
);
await fails(
  'an arrival time tomorrow is rejected',
  as(db, stu2, `select * from reserve_parking('${paid}', 'mada', now() + interval '2 days')`),
  'today',
);
await fails(
  "nobody can confirm someone else's reservation",
  as(db, stu2, `select * from confirm_parking('${later.id}')`),
  'no longer active',
);
await as(db, stu, `select * from confirm_parking('${later.id}')`);
ok(
  "'Yes, I'm coming' confirms it",
  (await db.query('select confirmed_at from parking_reservations where id=$1', [later.id])).rows[0]
    .confirmed_at !== null,
);
ok('the confirmed spot is still taken', (await zoneFree()) === freeBefore - 1);
const cancelled = (await as(db, stu, `select * from cancel_parking('${later.id}')`)).rows[0];
ok(
  'cancelling refunds the full amount and frees the spot',
  cancelled.status === 'cancelled' &&
    Number(cancelled.refund_amount) === 80 &&
    cancelled.refunded_at !== null &&
    (await zoneFree()) === freeBefore,
);
await fails(
  'a reservation can only be refunded once',
  as(db, stu, `select * from cancel_parking('${later.id}')`),
  'no longer active',
);
await db.query(
  `update parking_reservations set arrive_at = now() - interval '1 hour' where id = $1`,
  [res2.id],
);
const lateFree = await zoneFree();
const late = (await as(db, stu2, `select * from cancel_parking('${res2.id}')`)).rows[0];
ok(
  'after the refund window it still cancels and frees the spot, without a refund (11)',
  late.status === 'cancelled' &&
    Number(late.refund_amount) === 0 &&
    late.refunded_at === null &&
    (await zoneFree()) === lateFree + 1,
  JSON.stringify(late),
);

console.log('\n-- paid parking is live (12_parking_live_reservations.sql)');
ok(
  'reservations send realtime events',
  (
    await db.query(
      `select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'parking_reservations'`,
    )
  ).rowCount === 1,
);
const xmin = async () =>
  (await db.query(`select xmin::text as x from parking_lots where slug = 'paid'`)).rows[0].x;
const before12 = await xmin();
const r12 = (await as(db, stu, `select * from reserve_parking('${paid}', 'mada')`)).rows[0];
const afterBook = await xmin();
await as(db, stu, `select * from cancel_parking('${r12.id}')`);
ok(
  "booking and cancelling touch Zone P, so everyone's free count refreshes",
  afterBook !== before12 && (await xmin()) !== afterBook,
);

console.log('\n-- one account for every portal (07_demo_all_portals.sql)');
const all = await mk('demo@yu.edu.sa', 'Demo All Portals');
const helper = readFileSync(new URL('../07_demo_all_portals.sql', import.meta.url), 'utf8');
await db.exec(helper);
const allRole = (await db.query(`select role from profiles where id = '${all}'`)).rows[0].role;
const allSarah = (await db.query(`select profile_id from instructors where slug = 'sarah'`))
  .rows[0];
const allClub = (
  await db.query(
    `select cm.role from club_members cm join clubs c on c.id = cm.club_id where c.slug = 'gdg' and cm.user_id = '${all}'`,
  )
).rows[0];
ok(
  'one account is university admin + Sarah + GDG admin',
  allRole === 'admin' && allSarah.profile_id === all && allClub?.role === 'admin',
  JSON.stringify({ allRole, allSarah, allClub }),
);
await db.exec(helper);
ok('the helper can run twice', true);
await db.exec(readFileSync(new URL('../08_restaurant_portal.sql', import.meta.url), 'utf8'));
ok(
  'the demo account is also the Kafton restaurant (08)',
  (await db.query(`select manager_id from restaurants where slug = 'kafton'`)).rows[0]
    .manager_id === all,
);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
