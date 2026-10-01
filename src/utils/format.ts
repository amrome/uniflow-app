/** "Amro Elian" → "AE". */
export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** 25 → "25.00". Prices are SAR throughout the prototype. */
export function money(n: number) {
  return n.toFixed(2);
}
