import { sanitizePhone } from '@/lib/phone';

test('phone input keeps digits only and caps at 9', () => {
  expect(sanitizePhone('555 123 4567890')).toBe('555123456');
  expect(sanitizePhone('+966-5a5')).toBe('96655');
  expect(sanitizePhone('٥٥٥١٢٣٤٥٦')).toBe('555123456');
});
