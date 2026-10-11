/** Mirrors the candidate customer-phone contract; the server remains authoritative. */
export function customerPhoneError(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length > 40 || !/^\+?[0-9\s\-().]+$/.test(value)) {
    return 'Use digits and common phone separators only (up to 40 characters).';
  }
  const digits = value.replace(/\D/g, '').length;
  return digits < 7 || digits > 15 ? 'Phone must contain 7 to 15 digits.' : null;
}
