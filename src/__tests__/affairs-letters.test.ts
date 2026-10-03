import {
  MAX_TICKETS,
  affairsServicesStore,
  book,
  cancelTicket,
  estimate,
  tickets,
} from '@/services/affairs';

beforeEach(() => tickets.reset());

test('every Student Affairs service has its own ticket letter', async () => {
  const services = affairsServicesStore.get();
  expect(services.map((s) => s.letter)).toEqual(['R', 'T', 'S', 'I']);
  expect(new Set(services.map((s) => s.letter)).size).toBe(services.length);
  for (const s of services) {
    expect(estimate(s, 'next').number.startsWith(`${s.letter}-`)).toBe(true);
  }
  const scholarships = services.find((s) => s.id === 'scholarships')!;
  const t = await book(scholarships, 'next');
  expect(t.number).toMatch(/^S-\d+$/);
  expect(t.nowServing).toMatch(/^S-\d+$/);
});

test('a student can hold up to 4 tickets, one per service', async () => {
  const services = affairsServicesStore.get();
  expect(MAX_TICKETS).toBe(4);
  for (const s of services) await book(s, 'next');
  expect(tickets.get().map((t) => t.number[0])).toEqual(['R', 'T', 'S', 'I']);
  expect(new Set(tickets.get().map((t) => t.id)).size).toBe(4);

  await expect(book(services[0], 'next')).rejects.toThrow('already have');

  await cancelTicket('mock-transcripts');
  expect(tickets.get()).toHaveLength(3);
  await book(services[1], 'next'); // the freed place can be used again
  expect(tickets.get()).toHaveLength(4);
});
