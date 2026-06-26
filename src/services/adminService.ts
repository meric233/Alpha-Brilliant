import { arrayRemove, arrayUnion, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { course, getLessonById } from '../content/course'
import { badgeForLesson, nextStreak } from '../lib/gamification'
import { today } from '../lib/clock'
import { updateUserProfile } from './userService'

/**
 * Admin-only Firestore writes for manually adjusting a learner's progress.
 *
 * All writes target the signed-in admin's own `users/{uid}` document and
 * `lessonProgress` subcollection, so they work under the existing self-access
 * security rules — no rules changes or Cloud Functions required.
 */

function allStepIds(lessonId: string): string[] {
  const lesson = getLessonById(lessonId)
  if (!lesson) return []
  return [...lesson.steps.map((s) => s.id), ...lesson.capstone.map((s) => s.id)]
}

/** Write/merge arbitrary fields onto a lesson progress doc (creates if missing). */
export async function adminSetLessonProgress(
  uid: string,
  lessonId: string,
  fields: Record<string, unknown>,
): Promise<void> {
  await setDoc(
    doc(db, 'users', uid, 'lessonProgress', lessonId),
    { lessonId, ...fields, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export async function adminMarkLessonCompleted(uid: string, lessonId: string): Promise<void> {
  await adminSetLessonProgress(uid, lessonId, {
    status: 'completed',
    phase: 'steps',
    currentStepIndex: 0,
    completedStepIds: allStepIds(lessonId),
    capstoneCompleted: true,
    startedAt: serverTimestamp(),
    completedAt: serverTimestamp(),
  })
  const lesson = getLessonById(lessonId)
  if (lesson) {
    await updateDoc(doc(db, 'users', uid), {
      badges: arrayUnion(badgeForLesson(lesson.order)),
      updatedAt: serverTimestamp(),
    })
  }
}

export async function adminResetLesson(uid: string, lessonId: string): Promise<void> {
  await adminSetLessonProgress(uid, lessonId, {
    status: 'not_started',
    phase: 'steps',
    currentStepIndex: 0,
    completedStepIds: [],
    capstoneCompleted: false,
    wrongAttempts: {},
    completedAt: null,
  })
  // A true reset also drops the completion badge so the lesson can be re-earned.
  const lesson = getLessonById(lessonId)
  if (lesson) {
    await updateDoc(doc(db, 'users', uid), {
      badges: arrayRemove(badgeForLesson(lesson.order)),
      updatedAt: serverTimestamp(),
    })
  }
}

/**
 * Jump the learner to a given "day" (lesson order), phase and step:
 *  - lessons before the target are marked fully completed (so it unlocks)
 *  - the target lesson is set in_progress at the requested position
 *  - lessons after the target are reset to not_started (re-locked)
 *  - the profile continue pointer is updated to match
 */
export async function adminSetCurrentLesson(
  uid: string,
  targetOrder: number,
  phase: 'steps' | 'capstone' = 'steps',
  stepIndex = 0,
): Promise<void> {
  const targetLesson = course.lessons.find((l) => l.order === targetOrder)
  if (!targetLesson) return

  for (const lesson of course.lessons) {
    if (lesson.order < targetOrder) {
      await adminMarkLessonCompleted(uid, lesson.id)
    } else if (lesson.order === targetOrder) {
      const teachingIds = getLessonById(lesson.id)?.steps.map((s) => s.id) ?? []
      const completedStepIds =
        phase === 'capstone' ? teachingIds : teachingIds.slice(0, Math.max(0, stepIndex))
      await adminSetLessonProgress(uid, lesson.id, {
        status: 'in_progress',
        phase,
        currentStepIndex: stepIndex,
        completedStepIds,
        capstoneCompleted: false,
        startedAt: serverTimestamp(),
        completedAt: null,
      })
    } else {
      await adminResetLesson(uid, lesson.id)
    }
  }

  await updateUserProfile(uid, {
    continueLessonId: targetLesson.id,
    continuePhase: phase,
    continueStepIndex: stepIndex,
  })
}

/** Patch gamification stats (XP, streak, last active date). */
export async function adminSetStats(
  uid: string,
  stats: Partial<{ totalXP: number; streak: number; lastActiveDate: string }>,
): Promise<void> {
  await updateUserProfile(uid, stats)
}

/** Toggle a single lesson-completion badge on/off. */
export async function adminSetBadges(uid: string, badges: string[]): Promise<void> {
  await updateUserProfile(uid, { badges })
}

/**
 * Simulate "studied today" using the (possibly offset) admin clock, applying the
 * real streak rules. Combined with the day-offset control this lets the admin
 * fast-forward days and watch streaks build, hold, or reset — without doing a
 * full lesson each time.
 */
export async function adminLogStudyDay(
  uid: string,
  currentStreak: number,
  lastActiveDate: string,
): Promise<{ streak: number; lastActiveDate: string }> {
  const result = nextStreak(currentStreak, lastActiveDate || null, today())
  await updateUserProfile(uid, {
    streak: result.streak,
    lastActiveDate: result.lastActiveDate,
  })
  return result
}

export { badgeForLesson }
