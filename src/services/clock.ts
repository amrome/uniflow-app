// The Figma prototype is frozen at 11:25 AM on a Sunday (shuttle "in 20 min" at 11:45, etc.).
// Every time-dependent screen reads the clock from here so the demo always matches the design.
// Swap `demoNow` for `new Date()` when real data is wired up.
export const DEMO_MINUTES = 11 * 60 + 25;

/** Minutes since midnight for the demo "now". */
export function nowMinutes(): number {
  return DEMO_MINUTES;
}

/** 705 → "11:45 AM" / "11:45 ص". */
export function formatTime(minutes: number, language: 'en' | 'ar' = 'en'): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const hh = String(h12).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const suffix = language === 'ar' ? (h24 < 12 ? 'ص' : 'م') : h24 < 12 ? 'AM' : 'PM';
  return `${hh}:${mm} ${suffix}`;
}

/** 95 → "1h 35m" / "ساعة و35 د". */
export function formatDuration(mins: number, language: 'en' | 'ar' = 'en'): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (language === 'ar') {
    if (!h) return `${m} د`;
    const hours = h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : `${h} ساعات`;
    return m ? `${hours} و${m} د` : hours;
  }
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** "HH:MM" (24h) → minutes since midnight. */
export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

const days = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ar: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
};
const months = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

/** "Wed 23 Sep" / "الأربعاء 23 سبتمبر". */
export function formatDate(d: Date, language: 'en' | 'ar' = 'en'): string {
  return `${days[language][d.getDay()]} ${d.getDate()} ${months[language][d.getMonth()]}`;
}

const daysLong = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  ar: days.ar,
};
const monthsLong = {
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
  ar: months.ar,
};

/** "Thursday, 1 October 2026" / "الخميس، 1 أكتوبر 2026". */
export function formatLongDate(d: Date, language: 'en' | 'ar' = 'en'): string {
  const sep = language === 'ar' ? '، ' : ', ';
  return `${daysLong[language][d.getDay()]}${sep}${d.getDate()} ${monthsLong[language][d.getMonth()]} ${d.getFullYear()}`;
}

/** "OCT" / "أكتوبر" for date blocks. */
export function monthShort(d: Date, language: 'en' | 'ar' = 'en'): string {
  return language === 'ar' ? months.ar[d.getMonth()] : months.en[d.getMonth()].toUpperCase();
}
