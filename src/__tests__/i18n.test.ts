import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';

const keys = (o: object, p = ''): string[] =>
  Object.entries(o).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v, `${p}${k}.`) : [`${p}${k}`],
  );

describe('translations', () => {
  it('Arabic has exactly the same keys as English', () => {
    expect(keys(ar).sort()).toEqual(keys(en).sort());
  });
});
