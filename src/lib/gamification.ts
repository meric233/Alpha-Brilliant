import { XP_LESSON_BONUS, XP_PER_STEP } from './constants'

export function localDateString(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export function nextStreak(
  currentStreak: number,
  lastActiveDate: string | null,
  today = localDateString(),
): { streak: number; lastActiveDate: string } {
  if (!lastActiveDate) {
    return { streak: 1, lastActiveDate: today }
  }
  if (lastActiveDate === today) {
    return { streak: currentStreak, lastActiveDate: today }
  }
  const gap = daysBetween(lastActiveDate, today)
  if (gap === 1) {
    return { streak: currentStreak + 1, lastActiveDate: today }
  }
  return { streak: 1, lastActiveDate: today }
}

export function xpForStepComplete(): number {
  return XP_PER_STEP
}

export function xpForLessonComplete(): number {
  return XP_LESSON_BONUS
}

export function badgeForLesson(order: number): string {
  return `lesson-${order}-complete`
}
