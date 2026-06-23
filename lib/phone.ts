/**
 * Normalize an Egyptian phone number to E.164 format (+20XXXXXXXXXX)
 */
export function normalizeEgyptianPhone(phone: string): string {
  // Remove all non-digit chars
  let cleaned = phone.replace(/[^\d]/g, '')

  // If starts with 20, it's already international
  if (cleaned.startsWith('20')) {
    return '+' + cleaned
  }

  // If starts with 0, remove the 0 and add 20
  if (cleaned.startsWith('0')) {
    cleaned = '20' + cleaned.slice(1)
  } else {
    // Otherwise assume local number without leading zero
    cleaned = '20' + cleaned
  }

  return '+' + cleaned
}

/**
 * Format a phone number for display
 */
export function formatPhoneDisplay(phone: string): string {
  const normalized = normalizeEgyptianPhone(phone)
  // +20XXXXXXXXXX -> +20 XXX XXX XXXX
  if (normalized.length === 13) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6, 9)} ${normalized.slice(9)}`
  }
  return normalized
}

/**
 * Check if two phones refer to the same Egyptian number
 */
export function phonesMatch(a: string, b: string): boolean {
  try {
    return normalizeEgyptianPhone(a) === normalizeEgyptianPhone(b)
  } catch {
    return false
  }
}
