import { mapTicket } from '@/services/affairs';
import { mapEvent } from '@/services/events';
import { mapRestaurant } from '@/services/food';

test('a restaurant row becomes the shape the screens use', () => {
  const r = mapRestaurant(
    {
      id: 'r-uuid',
      slug: 'kafton',
      name_en: 'Kafton',
      name_ar: 'كفتون',
      cuisine_en: 'Saudi',
      cuisine_ar: null,
      location_en: 'Najd Basement',
      location_ar: null,
      image_url: null,
      prep_min: 12,
      rating: 4.8,
      rating_count: 1200,
      coming_soon: false,
    },
    [
      {
        id: 'm1',
        restaurant_id: 'r-uuid',
        slug: 'k-shawarma',
        name_en: 'Shawarma',
        name_ar: 'شاورما',
        description_en: 'Chicken',
        description_ar: null,
        price: 18,
        category: 'wraps',
        emoji: '🌯',
        bg: '#FCE5CC',
        popular: true,
        is_available: true,
      },
      {
        id: 'm2',
        restaurant_id: 'r-uuid',
        slug: 'k-gone',
        name_en: 'Sold out',
        name_ar: null,
        description_en: null,
        description_ar: null,
        price: 5,
        category: 'drinks',
        emoji: null,
        bg: null,
        popular: false,
        is_available: false,
      },
    ],
    { restaurant_id: 'r-uuid', lines: [{ menu_item_id: 'm1', qty: 2 }], times_ordered: 8 },
  );
  expect(r.id).toBe('kafton'); // routes use the slug...
  expect(r.dbId).toBe('r-uuid'); // ...the database uses the uuid
  expect(r.name.ar).toBe('كفتون');
  expect(r.cuisine.ar).toBe('Saudi'); // missing Arabic falls back to English
  expect(r.rating).toBe('4.8 (1.2k)');
  expect(r.menu.map((m) => m.id)).toEqual(['k-shawarma']); // unavailable items hidden
  expect(r.categories).toEqual(['wraps']);
  expect(r.favoriteOrder).toEqual({ lines: [['k-shawarma', 2]], timesOrdered: 8 });
});

const eventRow = {
  id: 'e-uuid',
  slug: null,
  club_id: null,
  title_en: 'Career Fair',
  title_ar: null,
  about_en: 'Meet employers',
  about_ar: null,
  venue_en: 'Main Hall',
  venue_ar: null,
  venue_detail_en: null,
  venue_detail_ar: null,
  host_en: 'Student Affairs',
  host_ar: 'شؤون الطلاب',
  host_initial: null,
  starts_at: '2099-01-01T07:00:00Z', // 10:00 in Riyadh
  ends_at: '2099-01-01T12:00:00Z', // 15:00
  capacity: 600,
  registration_url: null,
  is_draft: false,
  date_set: true,
  clubs: null,
};

test('a university event row maps host, times and audience', () => {
  const e = mapEvent(eventRow, 540);
  expect(e.id).toBe('e-uuid'); // no slug: falls back to the uuid
  expect(e.kind).toBe('university');
  expect(e.host.ar).toBe('شؤون الطلاب');
  expect(e.hostInitial).toBe('S');
  expect([e.start, e.end]).toEqual(['10:00', '15:00']);
  expect(e.audience.en).toContain('600 seats');
  expect(e.goingCount).toBe(540);
  expect(e.venueDetail.en).toBe('Main Hall'); // detail falls back to the venue
});

test('a club event takes its host from the club and drafts are flagged', () => {
  const e = mapEvent({
    ...eventRow,
    club_id: 'c-uuid',
    host_en: null,
    host_ar: null,
    capacity: null,
    is_draft: true,
    clubs: { slug: 'gdg', name_en: 'GDG on Campus YU', name_ar: null },
  });
  expect(e.kind).toBe('club');
  expect(e.clubId).toBe('gdg');
  expect(e.host.en).toBe('GDG on Campus YU');
  expect(e.hostInitial).toBe('G');
  expect(e.draft).toBe(true);
  expect(e.audience.en).toBe('Open to all students');
});

test('a queue ticket row maps to minutes and never divides by zero', () => {
  const t = mapTicket({
    id: 't-uuid',
    service_slug: 'registration',
    service_id: 's-uuid',
    number: 'R-101',
    ahead: 0,
    wait_min: 0,
    at: '2099-01-01T08:45:00Z', // 11:45 in Riyadh
    served: 0,
    total: 0,
    now_serving: 'R-101',
    alert_near: true,
    alert_turn: false,
  });
  expect(t.serviceId).toBe('registration');
  expect(t.at).toBe(11 * 60 + 45);
  expect(t.total).toBe(1); // the progress bar divides served by total
  expect(t.alertTurn).toBe(false);
});
