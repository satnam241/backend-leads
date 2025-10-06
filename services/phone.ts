// utils/phone.ts
export const normalizePhone = (raw?: string | null) => {
    if (!raw) return null;
    // remove non-digits, keep leading +
    let s = raw.trim();
    // if begins with 'whatsapp:' remove it
    s = s.replace(/^whatsapp:/i, "");
    // keep + if present, else keep digits only
    const hasPlus = s.startsWith("+");
    s = s.replace(/[^\d+]/g, "");
    if (!hasPlus && s.length === 10) {
      // likely local 10-digit; optionally prepend country code if you want (e.g. +91)
      // return `+91${s}`; // uncomment if you expect India-only numbers
      return s; // keep as-is if you don't want to guess country code
    }
    return s;
  };
  