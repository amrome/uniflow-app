import { createStore } from './store';

// Figma 08 · Events, 08.1 · Event Details, 08.2 · University, 08.3 · Club, Popup/AllClubs.
type L = { en: string; ar: string };

export type EventKind = 'university' | 'club';

export type CampusEvent = {
  id: string;
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

export const clubs: { id: string; name: L }[] = [
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
const club = (id: string) => clubs.find((c) => c.id === id)!.name;

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

export const events = createStore<CampusEvent[]>(initialEvents);

/** Events students can see (drafts hidden). */
export function publishedEvents(list: CampusEvent[]) {
  return list.filter((e) => !e.draft);
}

/** Event ids the student is going to. */
export const going = createStore<readonly string[]>(['devfest', 'career-fair']);

export function toggleGoing(id: string) {
  going.set((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
}

export function eventDate(e: CampusEvent): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + e.dayOffset);
  return d;
}

export function upsertEvent(e: CampusEvent) {
  events.set((prev) =>
    prev.some((x) => x.id === e.id) ? prev.map((x) => (x.id === e.id ? e : x)) : [...prev, e],
  );
}

export function deleteEvent(id: string) {
  events.set((prev) => prev.filter((x) => x.id !== id));
}
