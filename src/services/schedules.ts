import { trimTime } from '@/lib/time';

import { bi, db, fetchAll, live, ok, requireUserId } from './backend';
import { createStore, createToggleSet } from './store';

// Instructors from Figma 03 · Instructor Schedules (+ 03.2–03.8 per-major lists) and the
// 03.1 · Instructor Profile weekly timetable. The demo "today" is Sunday (see services/clock).
type L = { en: string; ar: string };

export const majors = {
  software: {
    en: 'Software Engineering',
    ar: 'هندسة البرمجيات',
    short: { en: 'Software', ar: 'البرمجيات' },
  },
  industrial: {
    en: 'Industrial Engineering',
    ar: 'الهندسة الصناعية',
    short: { en: 'Industrial', ar: 'الصناعية' },
  },
  architecture: { en: 'Architecture', ar: 'العمارة', short: { en: 'Architecture', ar: 'العمارة' } },
  network: {
    en: 'Network Engineering',
    ar: 'هندسة الشبكات',
    short: { en: 'Network', ar: 'الشبكات' },
  },
  law: { en: 'Law', ar: 'القانون', short: { en: 'Law', ar: 'القانون' } },
  finance: { en: 'Finance', ar: 'المالية', short: { en: 'Finance', ar: 'المالية' } },
  business: {
    en: 'Business Administration',
    ar: 'إدارة الأعمال',
    short: { en: 'Business', ar: 'إدارة الأعمال' },
  },
} as const;

export type Major = keyof typeof majors;
export const majorIds = Object.keys(majors) as Major[];

/** Sun–Thu, the YU teaching week. */
export const weekDays = [0, 1, 2, 3, 4] as const;
export type WeekDay = (typeof weekDays)[number];
export const TODAY: WeekDay = 0;

export type SlotType = 'CLS' | 'CP' | 'OH' | 'DD' | 'PM' | 'RS';

export type Slot = { start: string; end: string; type: SlotType; title: L; room: L };

export type Instructor = {
  id: string;
  /** Database uuid (backend only); `id` is the slug used in routes. */
  dbId?: string;
  name: L;
  title: L;
  major: Major;
  office: L;
  email: string;
  /** Weekly office hours window. */
  oh: { day: WeekDay; start: string; end: string };
  courses: L[];
};

const roomB: L = { en: 'Building B · Room 214', ar: 'المبنى B · غرفة ٢١٤' };
const dean: L = { en: "Building A · Dean's office", ar: 'المبنى A · مكتب العميد' };

const asst: L = { en: 'Assistant Professor', ar: 'أستاذ مساعد' };
const assoc: L = { en: 'Associate Professor', ar: 'أستاذ مشارك' };
const prof: L = { en: 'Professor', ar: 'أستاذ' };

function inst(
  id: string,
  en: string,
  ar: string,
  major: Major,
  title: L,
  oh: Instructor['oh'],
  courses: L[],
  room = 'Building B · Room 214',
  roomAr = 'المبنى B · غرفة ٢١٤',
): Instructor {
  const [first, last] = en.split(' ');
  return {
    id,
    name: { en: `Dr. ${en}`, ar: `د. ${ar}` },
    title,
    major,
    office: { en: room, ar: roomAr },
    email: `${first[0].toLowerCase()}.${last.replace(/-/g, '').toLowerCase()}@yu.edu.sa`,
    oh,
    courses,
  };
}

const c = (en: string, ar: string): L => ({ en, ar });

const mockInstructors: Instructor[] = [
  inst(
    'sarah',
    'Sarah Al-Otaibi',
    'سارة العتيبي',
    'software',
    asst,
    { day: 0, start: '11:00', end: '12:30' },
    [
      c('SWE-301 Software Design', 'SWE-301 تصميم البرمجيات'),
      c('SWE-215 Programming II', 'SWE-215 برمجة ٢'),
    ],
  ),
  inst(
    'faisal',
    'Faisal Al-Harbi',
    'فيصل الحربي',
    'business',
    assoc,
    { day: 0, start: '13:00', end: '14:00' },
    [
      c('MGT-210 Principles of Management', 'MGT-210 مبادئ الإدارة'),
      c('MKT-301 Marketing Strategy', 'MKT-301 استراتيجيات التسويق'),
    ],
    'Building C · Room 105',
    'المبنى C · غرفة ١٠٥',
  ),
  inst(
    'lama',
    'Lama Al-Qahtani',
    'لمى القحطاني',
    'finance',
    asst,
    { day: 4, start: '10:00', end: '11:00' },
    [
      c('FIN-220 Corporate Finance', 'FIN-220 تمويل الشركات'),
      c('ACC-201 Accounting I', 'ACC-201 محاسبة ١'),
    ],
    'Building C · Room 118',
    'المبنى C · غرفة ١١٨',
  ),
  inst(
    'yousef',
    'Yousef Al-Dosari',
    'يوسف الدوسري',
    'network',
    prof,
    { day: 0, start: '15:00', end: '16:00' },
    [
      c('NET-330 Network Security', 'NET-330 أمن الشبكات'),
      c('NET-210 Data Communications', 'NET-210 اتصالات البيانات'),
    ],
  ),
  inst(
    'noura',
    'Noura Al-Shehri',
    'نورة الشهري',
    'architecture',
    assoc,
    { day: 2, start: '09:00', end: '10:00' },
    [
      c('ARC-240 Design Studio III', 'ARC-240 استوديو التصميم ٣'),
      c('ARC-310 Urban Planning', 'ARC-310 التخطيط العمراني'),
    ],
    'Building D · Studio 3',
    'المبنى D · استوديو ٣',
  ),
  inst(
    'khalid',
    'Khalid Al-Mutairi',
    'خالد المطيري',
    'law',
    prof,
    { day: 0, start: '12:00', end: '13:00' },
    [
      c('LAW-201 Commercial Law', 'LAW-201 القانون التجاري'),
      c('LAW-315 Saudi Legal System', 'LAW-315 النظام القانوني السعودي'),
    ],
    'Building C · Room 210',
    'المبنى C · غرفة ٢١٠',
  ),
  inst(
    'omar',
    'Omar Al-Zahrani',
    'عمر الزهراني',
    'software',
    asst,
    { day: 0, start: '14:00', end: '15:00' },
    [
      c('SWE-350 Software Testing', 'SWE-350 اختبار البرمجيات'),
      c('CS-101 Intro to Computing', 'CS-101 مقدمة في الحوسبة'),
    ],
  ),
  inst(
    'reem',
    'Reem Al-Ghamdi',
    'ريم الغامدي',
    'software',
    assoc,
    { day: 1, start: '10:00', end: '11:00' },
    [
      c('SWE-410 Software Architecture', 'SWE-410 معمارية البرمجيات'),
      c('SWE-220 Databases', 'SWE-220 قواعد البيانات'),
    ],
  ),
  inst(
    'majed',
    'Majed Al-Shammari',
    'ماجد الشمري',
    'industrial',
    assoc,
    { day: 0, start: '09:00', end: '10:30' },
    [
      c('IE-301 Operations Research', 'IE-301 بحوث العمليات'),
      c('IE-220 Quality Control', 'IE-220 ضبط الجودة'),
    ],
  ),
  inst(
    'hala',
    'Hala Al-Rashid',
    'هالة الراشد',
    'industrial',
    asst,
    { day: 2, start: '13:00', end: '14:00' },
    [
      c('IE-210 Engineering Economy', 'IE-210 الاقتصاد الهندسي'),
      c('IE-340 Supply Chain', 'IE-340 سلاسل الإمداد'),
    ],
  ),
  inst(
    'tariq',
    'Tariq Al-Anazi',
    'طارق العنزي',
    'architecture',
    asst,
    { day: 0, start: '12:00', end: '13:30' },
    [
      c('ARC-120 Architectural Drawing', 'ARC-120 الرسم المعماري'),
      c('ARC-260 Building Technology', 'ARC-260 تقنيات البناء'),
    ],
    'Building D · Studio 1',
    'المبنى D · استوديو ١',
  ),
  inst(
    'abdullah',
    'Abdullah Al-Qahtani',
    'عبدالله القحطاني',
    'network',
    asst,
    { day: 0, start: '10:00', end: '11:00' },
    [
      c('NET-220 Routing & Switching', 'NET-220 التوجيه والتبديل'),
      c('NET-310 Cloud Networks', 'NET-310 شبكات السحابة'),
    ],
  ),
  inst(
    'maha',
    'Maha Al-Subaie',
    'مها السبيعي',
    'law',
    assoc,
    { day: 3, start: '11:00', end: '12:00' },
    [
      c('LAW-220 Contract Law', 'LAW-220 قانون العقود'),
      c('LAW-330 Labor Law', 'LAW-330 نظام العمل'),
    ],
    'Building C · Room 212',
    'المبنى C · غرفة ٢١٢',
  ),
  inst(
    'fahad',
    'Fahad Al-Harthi',
    'فهد الحارثي',
    'finance',
    prof,
    { day: 0, start: '13:00', end: '14:00' },
    [
      c('FIN-310 Investments', 'FIN-310 الاستثمار'),
      c('FIN-401 Islamic Finance', 'FIN-401 التمويل الإسلامي'),
    ],
    'Building C · Room 120',
    'المبنى C · غرفة ١٢٠',
  ),
  inst(
    'nouf',
    'Nouf Al-Otaibi',
    'نوف العتيبي',
    'business',
    asst,
    { day: 0, start: '11:00', end: '12:00' },
    [
      c('MGT-320 Organizational Behavior', 'MGT-320 السلوك التنظيمي'),
      c('ENT-210 Entrepreneurship', 'ENT-210 ريادة الأعمال'),
    ],
    'Building C · Room 107',
    'المبنى C · غرفة ١٠٧',
  ),
];

/** Instructors: the mock above, or what Supabase returned after sign-in. */
export const instructorsStore = createStore<Instructor[]>(live ? [] : mockInstructors);
export const useInstructors = instructorsStore.useValue;

export function getInstructor(id: string | undefined) {
  return instructorsStore.get().find((i) => i.id === id);
}

/** Like getInstructor, but re-renders the screen when the list loads or changes. */
export function useInstructor(id: string | undefined) {
  return instructorsStore.useValue().find((i) => i.id === id);
}

export type PortalStatus = 'available' | 'away' | 'notAvailable';
export type OfficeHour = { day: WeekDay; start: string; end: string };
export type PortalState = { status: PortalStatus; note: string; hours: OfficeHour[] };

/** What instructors set in 13.1 · Instructor Portal (status, note, weekly office hours). */
export const portal = createStore<Record<string, PortalState>>(
  live
    ? {}
    : {
        sarah: {
          status: 'available',
          note: '',
          hours: [
            { day: 0, start: '11:00', end: '12:30' },
            { day: 2, start: '11:00', end: '12:30' },
            { day: 4, start: '13:00', end: '14:00' },
          ],
        },
      },
);

/** Saves the instructor's status, note and weekly office hours (13.1 · Instructor Portal). */
export async function savePortal(id: string, state: PortalState) {
  if (live) {
    const instructor = getInstructor(id);
    if (!instructor?.dbId) throw new Error('Unknown instructor');
    await ok(
      db().rpc('save_portal', {
        p_instructor: instructor.dbId,
        p_status: state.status === 'notAvailable' ? 'not_available' : state.status,
        p_note: state.note,
        p_hours: state.hours.map((h) => ({
          day_of_week: h.day,
          start_time: h.start,
          end_time: h.end,
        })),
      }),
    );
  }
  portal.set((p) => ({ ...p, [id]: state }));
}

export function portalFor(i: Instructor, all = portal.get()): PortalState {
  return all[i.id] ?? { status: 'available', note: '', hours: [i.oh] };
}

/** Today's office hours if any (and the instructor hasn't marked themselves unavailable). */
export function todayHours(i: Instructor, all = portal.get()): OfficeHour | undefined {
  const p = portalFor(i, all);
  if (p.status === 'notAvailable') return undefined;
  return p.hours.find((h) => h.day === TODAY);
}

/** The next office-hours window after today. */
export function nextHours(i: Instructor, all = portal.get()): OfficeHour {
  const hours = [...portalFor(i, all).hours].sort(
    (a, b) => a.day - b.day || a.start.localeCompare(b.start),
  );
  return hours.find((h) => h.day > TODAY) ?? hours[0] ?? i.oh;
}

export function isAvailableToday(i: Instructor, all = portal.get()) {
  return !!todayHours(i, all);
}

const fixed: Record<SlotType, L> = {
  CLS: { en: '', ar: '' },
  CP: { en: 'Class Preparation', ar: 'تحضير المحاضرات' },
  OH: { en: 'Office Hours', ar: 'الساعات المكتبية' },
  DD: { en: 'Department Duties', ar: 'مهام القسم' },
  PM: { en: 'Project Meetings', ar: 'اجتماعات المشاريع' },
  RS: { en: 'Research', ar: 'البحث العلمي' },
};

const hours = ['08:30', '09:30', '10:30', '11:30', '12:30', '13:30', '14:30'];
const classRooms: L[] = [
  { en: 'E-105 Tuwaiq', ar: 'E-105 طويق' },
  { en: 'G-118 Tuwaiq', ar: 'G-118 طويق' },
  { en: 'E-201 Tuwaiq', ar: 'E-201 طويق' },
];

/**
 * Builds a believable Sun–Thu timetable: six hourly blocks from 8:30, two lectures a day, and
 * office hours on the instructor's OH day. Sarah's Sunday matches Figma 03.1 exactly.
 */
function buildWeek(i: Instructor): Record<WeekDay, Slot[]> {
  const seed = mockInstructors.indexOf(i);
  const week = {} as Record<WeekDay, Slot[]>;
  for (const d of weekDays) {
    const pattern: SlotType[] = ['CLS', 'CP', 'CLS', 'RS', 'DD', 'PM'];
    const rot = (d + seed) % pattern.length;
    const order = [...pattern.slice(rot), ...pattern.slice(0, rot)];
    if (d === i.oh.day) {
      const at = Math.max(0, hours.findIndex((h) => h >= i.oh.start.padStart(5, '0')) - 1);
      order[Math.min(at, order.length - 1)] = 'OH';
    }
    let lecture = 0;
    week[d] = order.map((type, k) => {
      const slot: Slot = {
        start: hours[k],
        end: hours[k + 1],
        type,
        title: fixed[type],
        room: type === 'DD' ? dean : i.office,
      };
      if (type === 'CLS') {
        slot.title = i.courses[(lecture + d) % 2];
        slot.room = classRooms[(lecture + d + seed) % classRooms.length];
        lecture++;
      }
      return slot;
    });
  }
  if (i.id === 'sarah') {
    week[0] = [
      { start: '08:30', end: '09:30', type: 'CLS', title: i.courses[0], room: classRooms[0] },
      { start: '09:30', end: '10:30', type: 'CP', title: fixed.CP, room: roomB },
      { start: '10:30', end: '11:30', type: 'CLS', title: i.courses[1], room: classRooms[1] },
      { start: '11:30', end: '12:30', type: 'OH', title: fixed.OH, room: roomB },
      { start: '12:30', end: '13:30', type: 'DD', title: fixed.DD, room: dean },
      { start: '13:30', end: '14:30', type: 'PM', title: fixed.PM, room: roomB },
    ];
  }
  return week;
}

/** Editable timetables (instructors can change theirs from 03.1a · Edit Schedule). */
export const timetables = createStore<Record<string, Record<WeekDay, Slot[]>>>(
  live ? {} : Object.fromEntries(mockInstructors.map((i) => [i.id, buildWeek(i)])),
);

export const emptyWeek = (): Record<WeekDay, Slot[]> => ({ 0: [], 1: [], 2: [], 3: [], 4: [] });

export async function saveWeek(id: string, week: Record<WeekDay, Slot[]>) {
  if (live) {
    const instructor = getInstructor(id);
    if (!instructor?.dbId) throw new Error('Unknown instructor');
    await ok(
      db().rpc('save_week', {
        p_instructor: instructor.dbId,
        p_slots: weekDays.flatMap((d) =>
          week[d].map((s) => ({
            day_of_week: d,
            start_time: s.start,
            end_time: s.end,
            slot_type: s.type,
            title_en: s.title.en,
            title_ar: s.title.ar,
            room_en: s.room.en,
            room_ar: s.room.ar,
          })),
        ),
      }),
    );
  }
  timetables.set((prev) => ({ ...prev, [id]: week }));
}

// Follow (⭐) and bell (🔔) are two flags on one row per student and instructor.
async function savePref(slug: string, flags: { followed: boolean; notify: boolean }) {
  const instructor = getInstructor(slug);
  if (!instructor?.dbId) return;
  await ok(
    db()
      .from('instructor_prefs')
      .upsert(
        { user_id: requireUserId(), instructor_id: instructor.dbId, ...flags },
        { onConflict: 'user_id,instructor_id' },
      ),
  );
}

export const favoriteInstructors = createToggleSet(
  live ? [] : ['sarah', 'yousef'],
  live
    ? (slug, on) => savePref(slug, { followed: on, notify: notifyInstructors.has(slug) })
    : undefined,
);
export const notifyInstructors = createToggleSet(
  [],
  live
    ? (slug, on) => savePref(slug, { followed: favoriteInstructors.has(slug), notify: on })
    : undefined,
);

type InstructorRow = {
  id: string;
  slug: string | null;
  name_en: string;
  name_ar: string | null;
  title_en: string | null;
  title_ar: string | null;
  major_key: string | null;
  office_en: string | null;
  office_ar: string | null;
  email: string | null;
  availability_status: 'available' | 'away' | 'not_available';
  status_note: string;
};
type CourseRow = { instructor_id: string; code: string; name_en: string; name_ar: string | null };
type HoursRow = {
  instructor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};
type SlotRow = HoursRow & {
  slot_type: SlotType;
  title_en: string;
  title_ar: string;
  room_en: string | null;
  room_ar: string | null;
};
type PrefRow = { instructor_id: string; followed: boolean; notify: boolean };

/** How many students follow an instructor (shown on the Instructor Portal). */
export async function instructorFollowerCount(dbId: string | undefined): Promise<number> {
  if (!live) return 38;
  if (!dbId) return 0;
  const row = await ok<{ followers: number } | null>(
    db()
      .from('instructor_follow_counts')
      .select('followers')
      .eq('instructor_id', dbId)
      .maybeSingle(),
  );
  return row?.followers ?? 0;
}

const asDay = (n: number): WeekDay | null =>
  (weekDays as readonly number[]).includes(n) ? (n as WeekDay) : null;

/** Loads instructors, their office hours, weekly timetables and the student's follows. */
export async function hydrateSchedules() {
  if (!live) return;
  const client = db();
  const [rows, courses, hours, slots, prefs] = await Promise.all([
    fetchAll<InstructorRow>((a, b) =>
      client.from('instructors').select('*').order('sort_order').order('name_en').range(a, b),
    ),
    fetchAll<CourseRow>((a, b) =>
      client
        .from('instructor_courses')
        .select('instructor_id, code, name_en, name_ar')
        .order('sort_order')
        .range(a, b),
    ),
    fetchAll<HoursRow>((a, b) =>
      client
        .from('office_hours')
        .select('instructor_id, day_of_week, start_time, end_time')
        .order('day_of_week')
        .order('start_time')
        .range(a, b),
    ),
    fetchAll<SlotRow>((a, b) =>
      client
        .from('schedule_slots')
        .select(
          'instructor_id, day_of_week, start_time, end_time, slot_type, title_en, title_ar, room_en, room_ar',
        )
        .order('start_time')
        .range(a, b),
    ),
    ok<PrefRow[]>(
      client
        .from('instructor_prefs')
        .select('instructor_id, followed, notify')
        .eq('user_id', requireUserId()),
    ),
  ]);

  const hoursOf = (uuid: string): OfficeHour[] =>
    hours.flatMap((h) => {
      const day = asDay(h.day_of_week);
      return h.instructor_id === uuid && day !== null
        ? [{ day, start: trimTime(h.start_time), end: trimTime(h.end_time) }]
        : [];
    });

  instructorsStore.set(
    rows.map((r) => ({
      id: r.slug ?? r.id,
      dbId: r.id,
      name: bi(r.name_en, r.name_ar),
      title: bi(r.title_en, r.title_ar),
      major: (r.major_key ?? 'software') as Major,
      office: bi(r.office_en, r.office_ar),
      email: r.email ?? '',
      oh: hoursOf(r.id)[0] ?? { day: 0, start: '00:00', end: '00:00' },
      courses: courses
        .filter((c) => c.instructor_id === r.id)
        .map((c) => bi(`${c.code} ${c.name_en}`, `${c.code} ${c.name_ar ?? c.name_en}`)),
    })),
  );

  portal.set(
    Object.fromEntries(
      rows.map((r): [string, PortalState] => [
        r.slug ?? r.id,
        {
          status:
            r.availability_status === 'not_available' ? 'notAvailable' : r.availability_status,
          note: r.status_note,
          hours: hoursOf(r.id),
        },
      ]),
    ),
  );

  const weeks: Record<string, Record<WeekDay, Slot[]>> = {};
  for (const r of rows) weeks[r.slug ?? r.id] = emptyWeek();
  for (const s of slots) {
    const owner = rows.find((r) => r.id === s.instructor_id);
    const day = asDay(s.day_of_week);
    if (!owner || day === null) continue;
    weeks[owner.slug ?? owner.id][day].push({
      start: trimTime(s.start_time),
      end: trimTime(s.end_time),
      type: s.slot_type,
      title: bi(s.title_en, s.title_ar),
      room: bi(s.room_en, s.room_ar),
    });
  }
  timetables.set(weeks);

  const slugOf = (uuid: string) => {
    const owner = rows.find((r) => r.id === uuid);
    return owner ? [owner.slug ?? owner.id] : [];
  };
  favoriteInstructors.replace(
    prefs.filter((p) => p.followed).flatMap((p) => slugOf(p.instructor_id)),
  );
  notifyInstructors.replace(prefs.filter((p) => p.notify).flatMap((p) => slugOf(p.instructor_id)));
}
