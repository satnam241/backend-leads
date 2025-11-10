// very small normalizer — adapt per country rules
export function normalizePhone(input?: string | null): string | null {
  if (!input) return null;
  let s = input.toString().trim();
  // remove common separators
  s = s.replace(/[\s()-\.]/g, "");
  // if starts with +, keep it; if starts with 0 and length suggests local number, optionally convert
  // This is simplistic — replace with libphonenumber for production
  return s;
}
