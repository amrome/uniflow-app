import { dayOffsetFromToday, minutesOfDay, riyadhIso, toHhmm } from '@/lib/time';

import { bi, db, fetchAll, live, ok, requireUserId } from './backend';
import { reportError } from './errors';
import { createStore } from './store';

// Figma 08 · Events, 08.1 · Event Details, 08.2 · University, 08.3 · Club, Popup/AllClubs.
type L = { en: string; ar: string };

export type EventKind = 'university' | 'club';

export type CampusEvent = {
  id: string;
  /** Database uuid (backend only); `id` is the slug used in routes. */
  dbId?: string;
  kind: EventKind;
  title: L;
  host: L;
  hostInitial: string;
  clubId?: string;
  /** Days from today (0 = today). */
  dayOffset: number;
  start: string;
  end: string;
  venue: L;
  venueDetail: L;
  audience: L;
  about: L;
  /** External registration link (club admins add it); otherwise RSVP in-app. */
  registrationUrl?: string;
  /** Drafts are only visible to the organizer (13.2 · Club Admin). */
  draft?: boolean;
  /** False for drafts without a date yet. */
  dateSet?: boolean;
  goingCount: number;
};

export type Club = { id: string; dbId?: string; name: L };

const mockClubs: Club[] = [
  { id: 'gdg', name: { en: 'GDG on Campus YU', ar: 'GDG on Campus YU' } },
  { id: 'sports', name: { en: 'YU Sports Club', ar: 'النادي الرياضي' } },
  { id: 'photo', name: { en: 'Photography Club', ar: 'نادي التصوير' } },
  { id: 'debate', name: { en: 'Debate Club', ar: 'نادي المناظرات' } },
  { id: 'robotics', name: { en: 'Robotics Club', ar: 'نادي الروبوتات' } },
  { id: 'cyber', name: { en: 'Cybersecurity Club', ar: 'نادي الأمن السيبراني' } },
  { id: 'ai', name: { en: 'AI & Data Science Club', ar: 'نادي الذكاء الاصطناعي والبيانات' } },
  { id: 'entre', name: { en: 'Entrepreneurship Club', ar: 'نادي ريادة الأعمال' } },
  { id: 'finance', name: { en: 'Finance & Investment Club', ar: 'نادي المالية والاستثمار' } },
  { id: 'law', name: { en: 'Law Society', ar: 'جمعية القانون' } },
  { id: 'arch', name: { en: 'Architecture & Design Club', ar: 'نادي العمارة والتصميم' } },
  { id: 'ie', name: { en: 'Industrial Engineering Society', ar: 'جمعية الهندسة الصناعية' } },
  { id: 'media', name: { en: 'Media & Film Club', ar: 'نادي الإعلام والأفلام' } },
  { id: 'arts', name: { en: 'Arts Club', ar: 'نادي الفنون' } },
  { id: 'music', name: { en: 'Music Club', ar: 'نادي الموسيقى' } },
  { id: 'reading', name: { en: 'Reading Club', ar: 'نادي القراءة' } },
  { id: 'volunteer', name: { en: 'Volunteering Club', ar: 'نادي التطوع' } },
  { id: 'health', name: { en: 'Health & Wellness Club', ar: 'نادي الصحة واللياقة' } },
  { id: 'chess', name: { en: 'Chess Club', ar: 'نادي الشطرنج' } },
  { id: 'esports', name: { en: 'Esports Club', ar: 'نادي الرياضات الإلكترونية' } },
  { id: 'toast', name: { en: 'Toastmasters Club', ar: 'نادي توستماسترز' } },
  { id: 'env', name: { en: 'Environmental Club', ar: 'نادي البيئة' } },
  { id: 'culture', name: { en: 'Cultural Exchange Club', ar: 'نادي التبادل الثقافي' } },
];

const affairs: L = { en: 'Student Affairs', ar: 'شؤون الطلاب' };
const allStudents = (seats: number): L => ({
  en: `Open to all students · ${seats} seats`,
  ar: `مفتوحة لجميع الطلاب · ${seats} مقعدًا`,
});
const club = (id: string) => mockClubs.find((c) => c.id === id)!.name;

export const initialEvents: CampusEvent[] = [
  {
    id: 'devfest',
    goingCount: 86,
    kind: 'club',
    clubId: 'gdg',
    title: { en: 'GDG DevFest Kickoff', ar: 'انطلاقة GDG DevFest' },
    host: club('gdg'),
    hostInitial: 'G',
    dayOffset: 8,
    start: '18:30',
    end: '21:00',
    venue: { en: 'Innovation Hub', ar: 'مركز الابتكار' },
    venueDetail: {
      en: 'Innovation Hub · Building A, Floor 2',
      ar: 'مركز الابتكار · مبنى A، الدور 2',
    },
    audience: allStudents(120),
    about: {
      en: 'Kick off DevFest season with talks on Android, web and AI from Google Developer Experts, a hands-on Gemini workshop, and networking with the GDG community. Snacks provided.',
      ar: 'انطلق معنا في موسم DevFest مع محاضرات عن Android والويب والذكاء الاصطناعي من خبراء Google، وورشة عملية على Gemini، وفرصة للتواصل مع مجتمع GDG. تتوفر وجبات خفيفة.',
    },
    registrationUrl: 'https://gdg.community.dev',
  },
  {
    id: 'career-fair',
    goingCount: 540,
    kind: 'university',
    title: { en: 'Career Fair 2026', ar: 'معرض التوظيف 2026' },
    host: affairs,
    hostInitial: 'Y',
    dayOffset: 12,
    start: '10:00',
    end: '15:00',
    venue: { en: 'Main Hall', ar: 'القاعة الرئيسية' },
    venueDetail: { en: 'Main Hall · Main Building', ar: 'القاعة الرئيسية · المبنى الرئيسي' },
    audience: allStudents(600),
    about: {
      en: 'Meet 40+ employers from banking, tech, energy and government. Bring your CV — on-the-spot interviews for final-year students.',
      ar: 'التقِ بأكثر من 40 جهة توظيف من البنوك والتقنية والطاقة والقطاع الحكومي. أحضر سيرتك الذاتية — مقابلات فورية لطلاب السنة الأخيرة.',
    },
  },
  {
    id: 'national-day',
    goingCount: 320,
    kind: 'university',
    title: { en: 'Saudi National Day Celebration', ar: 'احتفال اليوم الوطني السعودي' },
    host: affairs,
    hostInitial: 'Y',
    dayOffset: 0,
    start: '19:00',
    end: '22:00',
    venue: { en: 'Main Courtyard', ar: 'الساحة الرئيسية' },
    venueDetail: { en: 'Main Courtyard · Main Building', ar: 'الساحة الرئيسية · المبنى الرئيسي' },
    audience: allStudents(800),
    about: {
      en: 'Celebrate with traditional performances, Saudi food stalls, a photo booth and fireworks to close the night.',
      ar: 'احتفل معنا بالعروض الشعبية وأركان الأكلات السعودية وركن التصوير، وتختتم الليلة بالألعاب النارية.',
    },
  },
  {
    id: 'photo-meetup',
    goingCount: 24,
    kind: 'club',
    clubId: 'photo',
    title: { en: 'Photography Club Meetup', ar: 'لقاء نادي التصوير' },
    host: club('photo'),
    hostInitial: 'P',
    dayOffset: 0,
    start: '16:00',
    end: '17:30',
    venue: { en: 'Art Studio', ar: 'مرسم الفنون' },
    venueDetail: { en: 'Art Studio · Tuwaiq Building', ar: 'مرسم الفنون · مبنى طويق' },
    audience: allStudents(40),
    about: {
      en: 'Weekly meetup: this week is golden-hour portraits around campus. Bring any camera — phones welcome.',
      ar: 'اللقاء الأسبوعي: تصوير البورتريه وقت الغروب في أرجاء الجامعة. أحضر أي كاميرا — الجوال مرحب به.',
    },
  },
  {
    id: 'ai-talk',
    goingCount: 130,
    kind: 'university',
    title: { en: 'Tech Talk: Careers in AI', ar: 'حديث تقني: الوظائف في الذكاء الاصطناعي' },
    host: { en: 'Career Center', ar: 'مركز التوظيف' },
    hostInitial: 'C',
    dayOffset: 7,
    start: '17:00',
    end: '18:30',
    venue: { en: 'Al-Khudair Hall', ar: 'قاعة الخضير' },
    venueDetail: { en: 'Al-Khudair Hall', ar: 'قاعة الخضير' },
    audience: allStudents(200),
    about: {
      en: 'Industry speakers on breaking into ML engineering, data science and AI product roles in the Kingdom.',
      ar: 'متحدثون من القطاع عن دخول مجالات هندسة تعلم الآلة وعلم البيانات وإدارة منتجات الذكاء الاصطناعي في المملكة.',
    },
  },
  {
    id: 'padel-finals',
    goingCount: 75,
    kind: 'club',
    clubId: 'sports',
    title: { en: 'Padel Tournament Finals', ar: 'نهائي بطولة البادل' },
    host: club('sports'),
    hostInitial: 'Y',
    dayOffset: 10,
    start: '16:00',
    end: '19:00',
    venue: { en: 'YUPadel', ar: 'YUPadel' },
    venueDetail: { en: 'YUPadel courts', ar: 'ملاعب YUPadel' },
    audience: allStudents(150),
    about: {
      en: 'The top four pairs battle it out for the YU Padel Cup. Come cheer — free drinks for spectators.',
      ar: 'أفضل أربعة فرق تتنافس على كأس الجامعة للبادل. تعال وشجّع — مشروبات مجانية للحضور.',
    },
  },
  {
    id: 'research-day',
    goingCount: 96,
    kind: 'university',
    title: { en: 'Research Day 2026', ar: 'يوم البحث العلمي 2026' },
    host: { en: 'Deanship of Research', ar: 'عمادة البحث العلمي' },
    hostInitial: 'D',
    dayOffset: 15,
    start: '09:00',
    end: '14:00',
    venue: { en: 'Al-Khudair Hall', ar: 'قاعة الخضير' },
    venueDetail: { en: 'Al-Khudair Hall', ar: 'قاعة الخضير' },
    audience: allStudents(300),
    about: {
      en: 'Student and faculty research posters, three-minute thesis competition, and awards.',
      ar: 'ملصقات بحثية للطلاب وأعضاء هيئة التدريس، ومسابقة الأطروحة في ثلاث دقائق، وتوزيع الجوائز.',
    },
  },
  {
    id: 'flutter-jam',
    goingCount: 41,
    kind: 'club',
    clubId: 'gdg',
    title: { en: 'Flutter Study Jam', ar: 'ورشة Flutter' },
    host: club('gdg'),
    hostInitial: 'G',
    dayOffset: 17,
    start: '17:00',
    end: '19:00',
    venue: { en: 'Engineering Lab 3', ar: 'معمل الهندسة 3' },
    venueDetail: {
      en: 'Engineering Lab 3 · College of Engineering',
      ar: 'معمل الهندسة 3 · كلية الهندسة',
    },
    audience: allStudents(35),
    about: {
      en: 'Build your first Flutter app in two hours. Laptops required; Flutter SDK install guide sent after you RSVP.',
      ar: 'ابنِ أول تطبيق Flutter في ساعتين. يلزم إحضار لابتوب؛ يُرسل دليل التثبيت بعد التسجيل.',
    },
  },
  {
    id: 'debate-night',
    goingCount: 58,
    kind: 'club',
    clubId: 'debate',
    title: { en: 'Debate Night', ar: 'أمسية المناظرات' },
    host: club('debate'),
    hostInitial: 'D',
    dayOffset: 19,
    start: '19:00',
    end: '21:00',
    venue: { en: 'Tuwaiq Building', ar: 'مبنى طويق' },
    venueDetail: { en: 'Tuwaiq Building · Auditorium', ar: 'مبنى طويق · المسرح' },
    audience: allStudents(90),
    about: {
      en: 'Motion: "This house would ban homework." Teams of three, British Parliamentary format.',
      ar: 'المقترح: "يجب إلغاء الواجبات المنزلية". فرق من ثلاثة أعضاء بنظام البرلمان البريطاني.',
    },
  },
  {
    id: 'cloud-workshop',
    goingCount: 0,
    kind: 'club',
    clubId: 'gdg',
    title: { en: 'Cloud Workshop', ar: 'ورشة الحوسبة السحابية' },
    host: club('gdg'),
    hostInitial: 'G',
    dayOffset: 30,
    dateSet: false,
    draft: true,
    start: '17:00',
    end: '19:00',
    venue: { en: 'Innovation Hub', ar: 'مركز الابتكار' },
    venueDetail: {
      en: 'Innovation Hub · Building A, Floor 2',
      ar: 'مركز الابتكار · مبنى A، الدور 2',
    },
    audience: allStudents(40),
    about: {
      en: 'Hands-on intro to deploying apps on Google Cloud.',
      ar: 'مقدمة عملية لنشر التطبيقات على Google Cloud.',
    },
  },
];

export const events = createStore<CampusEvent[]>(live ? [] : initialEvents);

export const clubsStore = createStore<Club[]>(live ? [] : mockClubs);
export const useClubs = clubsStore.useValue;

/** Events students can see (drafts hidden). */
export function publishedEvents(list: CampusEvent[]) {
  return list.filter((e) => !e.draft);
}

/** Event ids the student is going to. */
export const going = createStore<readonly string[]>(live ? [] : ['devfest', 'career-fair']);

/** RSVP / cancel RSVP. Instant on screen; saved in the background and rolled back if it fails. */
export function toggleGoing(id: string) {
  const was = going.get().includes(id);
  const apply = (on: boolean) =>
    going.set((p) => (on ? (p.includes(id) ? p : [...p, id]) : p.filter((x) => x !== id)));
  apply(!was);
  if (!live) return;
  (async () => {
    const event = events.get().find((e) => e.id === id);
    if (!event?.dbId) return;
    const userId = requireUserId();
    const table = db().from('event_rsvps');
    if (was) await ok(table.delete().eq('event_id', event.dbId).eq('user_id', userId));
    else await ok(table.insert({ event_id: event.dbId, user_id: userId }));
    await hydrateEvents(); // refresh the going counts
  })().catch((e) => {
    apply(was);
    reportError(e);
  });
}

export function eventDate(e: CampusEvent): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + e.dayOffset);
  return d;
}

const OPEN_TO_ALL: L = { en: 'Open to all students', ar: 'مفتوحة لجميع الطلاب' };

type ClubRow = { id: string; slug: string | null; name_en: string; name_ar: string | null };

type EventRow = {
  id: string;
  slug: string | null;
  club_id: string | null;
  title_en: string;
  title_ar: string | null;
  about_en: string | null;
  about_ar: string | null;
  venue_en: string | null;
  venue_ar: string | null;
  venue_detail_en: string | null;
  venue_detail_ar: string | null;
  host_en: string | null;
  host_ar: string | null;
  host_initial: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  registration_url: string | null;
  is_draft: boolean;
  date_set: boolean;
  clubs: { slug: string | null; name_en: string; name_ar: string | null } | null;
};

const EVENT_SELECT = '*, clubs(slug, name_en, name_ar)';

export function mapEvent(r: EventRow, goingCount = 0): CampusEvent {
  const clubName = r.clubs ? bi(r.clubs.name_en, r.clubs.name_ar) : undefined;
  const host = r.host_en ? bi(r.host_en, r.host_ar) : (clubName ?? bi('', ''));
  const start = toHhmm(minutesOfDay(r.starts_at));
  return {
    id: r.slug ?? r.id,
    dbId: r.id,
    kind: r.club_id ? 'club' : 'university',
    clubId: r.clubs ? (r.clubs.slug ?? r.club_id ?? undefined) : undefined,
    title: bi(r.title_en, r.title_ar),
    host,
    hostInitial: r.host_initial ?? (host.en[0] ?? '?').toUpperCase(),
    dayOffset: dayOffsetFromToday(r.starts_at),
    start,
    end: r.ends_at ? toHhmm(minutesOfDay(r.ends_at)) : start,
    venue: bi(r.venue_en, r.venue_ar),
    venueDetail: bi(r.venue_detail_en ?? r.venue_en, r.venue_detail_ar ?? r.venue_ar),
    audience: r.capacity ? allStudents(r.capacity) : OPEN_TO_ALL,
    about: bi(r.about_en, r.about_ar),
    registrationUrl: r.registration_url ?? undefined,
    draft: r.is_draft || undefined,
    dateSet: r.date_set,
    goingCount,
  };
}

/** Loads clubs, events (drafts only for their organisers), going counts and the student's RSVPs. */
export async function hydrateEvents() {
  if (!live) return;
  const client = db();
  const userId = requireUserId();
  const [clubRows, rows, counts, mine] = await Promise.all([
    fetchAll<ClubRow>((a, b) =>
      client.from('clubs').select('id, slug, name_en, name_ar').order('sort_order').range(a, b),
    ),
    fetchAll<EventRow>((a, b) =>
      client.from('events').select(EVENT_SELECT).order('starts_at').range(a, b),
    ),
    fetchAll<{ event_id: string; rsvp_count: number }>((a, b) =>
      client.from('event_rsvp_counts').select('event_id, rsvp_count').range(a, b),
    ),
    ok<{ event_id: string }[]>(client.from('event_rsvps').select('event_id').eq('user_id', userId)),
  ]);
  clubsStore.set(
    clubRows.map((c) => ({ id: c.slug ?? c.id, dbId: c.id, name: bi(c.name_en, c.name_ar) })),
  );
  const list = rows.map((r) =>
    mapEvent(r, counts.find((c) => c.event_id === r.id)?.rsvp_count ?? 0),
  );
  events.set(list);
  going.set(list.filter((e) => mine.some((m) => m.event_id === e.dbId)).map((e) => e.id));
}

/** How many students joined a club (shown to its admin). */
export async function clubMemberCount(clubDbId: string | undefined): Promise<number> {
  if (!live) return 412;
  if (!clubDbId) return 0;
  const { count } = await db()
    .from('club_members')
    .select('club_id', { count: 'exact', head: true })
    .eq('club_id', clubDbId);
  return count ?? 0;
}

/** Creates or updates an event (club admins for their club; university admins for any). */
export async function upsertEvent(e: CampusEvent) {
  if (!live) {
    events.set((prev) =>
      prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e],
    );
    return;
  }
  const club = e.clubId ? clubsStore.get().find((c) => c.id === e.clubId) : undefined;
  const payload = {
    club_id: e.kind === 'club' ? (club?.dbId ?? null) : null,
    title_en: e.title.en,
    title_ar: e.title.ar,
    about_en: e.about.en,
    about_ar: e.about.ar,
    venue_en: e.venue.en,
    venue_ar: e.venue.ar,
    venue_detail_en: e.venueDetail.en,
    venue_detail_ar: e.venueDetail.ar,
    host_en: e.kind === 'university' ? e.host.en : null,
    host_ar: e.kind === 'university' ? e.host.ar : null,
    host_initial: e.hostInitial,
    starts_at: riyadhIso(e.dayOffset, e.start),
    ends_at: riyadhIso(e.dayOffset, e.end),
    registration_url: e.registrationUrl ?? null,
    is_draft: !!e.draft,
    date_set: e.dateSet !== false,
  };
  const table = db().from('events');
  const row = await ok<EventRow>(
    (e.dbId ? table.update(payload).eq('id', e.dbId) : table.insert(payload))
      .select(EVENT_SELECT)
      .single(),
  );
  const saved = mapEvent(row, e.goingCount);
  events.set((prev) =>
    prev.some((x) => x.id === e.id || x.dbId === row.id)
      ? prev.map((x) => (x.id === e.id || x.dbId === row.id ? saved : x))
      : [...prev, saved],
  );
}

export async function deleteEvent(id: string) {
  if (live) {
    const event = events.get().find((x) => x.id === id);
    if (event?.dbId) await ok(db().from('events').delete().eq('id', event.dbId));
  }
  events.set((prev) => prev.filter((x) => x.id !== id));
}
