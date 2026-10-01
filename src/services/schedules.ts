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
  name: L;
  title: L;
  major: Major;
  office: L;
  email: string;
  /** Weekly office hours window. */
  oh: { day: WeekDay; start: string; end: string };
  courses: [L, L];
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
  courses: [L, L],
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

export const instructors: Instructor[] = [
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

export function getInstructor(id: string | undefined) {
  return instructors.find((i) => i.id === id);
}

export type PortalStatus = 'available' | 'away' | 'notAvailable';
export type OfficeHour = { day: WeekDay; start: string; end: string };
export type PortalState = { status: PortalStatus; note: string; hours: OfficeHour[] };

/** What instructors set in 13.1 · Instructor Portal (status, note, weekly office hours). */
export const portal = createStore<Record<string, PortalState>>({
  sarah: {
    status: 'available',
    note: '',
    hours: [
      { day: 0, start: '11:00', end: '12:30' },
      { day: 2, start: '11:00', end: '12:30' },
      { day: 4, start: '13:00', end: '14:00' },
    ],
  },
});

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
  const seed = instructors.indexOf(i);
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
  Object.fromEntries(instructors.map((i) => [i.id, buildWeek(i)])),
);

export function saveWeek(id: string, week: Record<WeekDay, Slot[]>) {
  timetables.set((prev) => ({ ...prev, [id]: week }));
}

export const favoriteInstructors = createToggleSet(['sarah', 'yousef']);
export const notifyInstructors = createToggleSet([]);
