import { localDateString } from './gamification'

/**
 * Admin-only simulated clock. A day offset (in calendar days) is persisted in
 * localStorage so the admin can fast-forward / rewind "today" to test streaks
 * and (future) spaced-retrieval scheduling without waiting real days.
 *
 * For normal users the offset is 0, so `today()` is just the real local date
 * and nothing about production behavior changes.
 */

const OFFSET_KEY = 'paraboloalpha:admin-day-offset'

export function getDayOffset(): number {
  if (typeof localStorage === 'undefined') return 0
  const n = Number(localStorage.getItem(OFFSET_KEY))
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

export function setDayOffset(days: number): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(OFFSET_KEY, String(Math.trunc(days)))
}

export function simulatedDate(base = new Date()): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + getDayOffset())
  return d
}

/** Current (possibly simulated) local date as "YYYY-MM-DD". */
export function today(): string {
  return localDateString(simulatedDate())
}
