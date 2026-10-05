/** Saudi mobile numbers are entered without the +966 prefix: 9 digits starting with 5. */
export const PHONE_MAX_LENGTH = 9;
export const PHONE_PLACEHOLDER = '5xxxxxxxx';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

/** Keeps digits only (Arabic-Indic digits are converted) and caps the length at 9. */
export function sanitizePhone(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/\D/g, '')
    .slice(0, PHONE_MAX_LENGTH);
}
