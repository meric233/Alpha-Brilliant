import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { LessonProgress } from '../content/types'
import {
  badgeForLesson,
  nextStreak,
  xpForLessonComplete,
  xpForStepComplete,
} from '../lib/gamification'
import { getLessonById } from '../content/course'
import { updateUserProfile } from './userService'
import type { UserProfile } from '../content/types'

function fromFirestore(lessonId: string, data: Record<string, unknown>): LessonProgress {
  const ts = (v: unknown) => (v as Timestamp)?.toDate?.() ?? new Date()
  return {
    lessonId,
    status: (data.status as LessonProgress['status']) ?? 'not_started',
    phase: (data.phase as LessonProgress['phase']) ?? 'steps',
    currentStepIndex: (data.currentStepIndex as number) ?? 0,
    completedStepIds: (data.completedStepIds as string[]) ?? [],
    capstoneCompleted: (data.capstoneCompleted as boolean) ?? false,
    wrongAttempts: (data.wrongAttempts as Record<string, number>) ?? {},
    simState: data.simState as LessonProgress['simState'],
    startedAt: ts(data.startedAt),
    updatedAt: ts(data.updatedAt),
    completedAt: data.completedAt ? ts(data.completedAt) : null,
  }
}

export async function getLessonProgress(
  uid: string,
  lessonId: string,
): Promise<LessonProgress | null> {
  const snap = await getDoc(doc(db, 'users', uid, 'lessonProgress', lessonId))
  if (!snap.exists()) return null
  return fromFirestore(lessonId, snap.data())
}

export async function getAllLessonProgress(uid: string): Promise<LessonProgress[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'lessonProgress'))
  return snap.docs.map((d) => fromFirestore(d.id, d.data()))
}

export async function initLessonProgress(
  uid: string,
  lessonId: string,
): Promise<LessonProgress> {
  const existing = await getLessonProgress(uid, lessonId)
  if (existing) return existing

  return createFreshLessonProgress(uid, lessonId)
}

export async function resetLessonProgress(
  uid: string,
  lessonId: string,
): Promise<LessonProgress> {
  return createFreshLessonProgress(uid, lessonId)
}

async function createFreshLessonProgress(
  uid: string,
  lessonId: string,
): Promise<LessonProgress> {
  const progress: Omit<LessonProgress, 'startedAt' | 'updatedAt' | 'completedAt'> & {
    startedAt: ReturnType<typeof serverTimestamp>
    updatedAt: ReturnType<typeof serverTimestamp>
    completedAt: null
  } = {
    lessonId,
    status: 'in_progress',
    phase: 'steps',
    currentStepIndex: 0,
    completedStepIds: [],
    capstoneCompleted: false,
    wrongAttempts: {},
    startedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  }
  await setDoc(doc(db, 'users', uid, 'lessonProgress', lessonId), progress)
  return {
    ...progress,
    startedAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
  }
}

export async function saveContinuePointer(
  uid: string,
  lessonId: string,
  phase: 'steps' | 'capstone',
  stepIndex: number,
): Promise<void> {
  await updateUserProfile(uid, {
    continueLessonId: lessonId,
    continuePhase: phase,
    continueStepIndex: stepIndex,
  })
}

export async function clearContinuePointer(uid: string): Promise<void> {
  await updateUserProfile(uid, {
    continueLessonId: null,
    continuePhase: null,
    continueStepIndex: null,
  })
}

/**
 * Persist the learner's current position so "Continue" resumes exactly where
 * they left off — even if they quit mid-step without completing it. Writes to
 * both the lesson progress doc and the profile-level continue pointer.
 */
export async function saveLessonPosition(
  uid: string,
  lessonId: string,
  phase: 'steps' | 'capstone',
  stepIndex: number,
): Promise<void> {
  const ref = doc(db, 'users', uid, 'lessonProgress', lessonId)
  await updateDoc(ref, {
    phase,
    currentStepIndex: stepIndex,
    updatedAt: serverTimestamp(),
  })
  await saveContinuePointer(uid, lessonId, phase, stepIndex)
}

export async function recordWrongAttempt(
  uid: string,
  lessonId: string,
  stepId: string,
): Promise<number> {
  const ref = doc(db, 'users', uid, 'lessonProgress', lessonId)
  const snap = await getDoc(ref)
  const data = snap.exists() ? snap.data() : {}
  const wrongAttempts = { ...(data.wrongAttempts as Record<string, number>), [stepId]: ((data.wrongAttempts as Record<string, number>)?.[stepId] ?? 0) + 1 }
  await updateDoc(ref, { wrongAttempts, updatedAt: serverTimestamp() })
  return wrongAttempts[stepId]
}

export async function completeStep(
  uid: string,
  lessonId: string,
  stepId: string,
  phase: 'steps' | 'capstone',
  stepIndex: number,
  simState?: { angle: number; velocity: number },
  profile?: UserProfile,
): Promise<{ xpEarned: number; lessonCompleted: boolean }> {
  const ref = doc(db, 'users', uid, 'lessonProgress', lessonId)
  const snap = await getDoc(ref)
  const data = snap.data() ?? {}
  const completedStepIds = [...((data.completedStepIds as string[]) ?? [])]
  const alreadyDone = completedStepIds.includes(stepId)
  if (!alreadyDone) completedStepIds.push(stepId)

  const lesson = getLessonById(lessonId)
  const totalTeaching = lesson?.steps.length ?? 0
  const totalCapstone = lesson?.capstone.length ?? 0
  const isLastCapstone =
    phase === 'capstone' && stepIndex >= totalCapstone - 1
  const allTeachingDone =
    phase === 'capstone' ||
    completedStepIds.filter((id) => lesson?.steps.some((s) => s.id === id)).length >=
      totalTeaching

  let xpEarned = 0
  let lessonCompleted = false

  const lessonBadge = lesson ? badgeForLesson(lesson.order) : null
  const alreadyFinishedCourse =
    Boolean(lessonBadge && profile?.badges.includes(lessonBadge))

  if (!alreadyDone && !alreadyFinishedCourse) {
    xpEarned += xpForStepComplete()
  }

  const advanceToCapstone =
    phase === 'steps' && stepIndex >= totalTeaching - 1 && allTeachingDone
  const nextPhase = advanceToCapstone ? 'capstone' : phase
  const nextStepIndex = isLastCapstone
    ? stepIndex
    : advanceToCapstone
      ? 0
      : stepIndex + 1

  const patch: Record<string, unknown> = {
    status: isLastCapstone || alreadyFinishedCourse ? 'completed' : 'in_progress',
    phase: nextPhase,
    currentStepIndex: nextStepIndex,
    completedStepIds,
    capstoneCompleted: isLastCapstone || (alreadyFinishedCourse && data.capstoneCompleted),
    updatedAt: serverTimestamp(),
    ...(simState ? { simState } : {}),
  }

  if (isLastCapstone) {
    patch.completedAt = serverTimestamp()
    lessonCompleted = true
    // Rewind the saved position so a fresh re-open of a finished lesson starts
    // at the beginning; mid-review quits still resume via saveLessonPosition.
    patch.phase = 'steps'
    patch.currentStepIndex = 0
    if (!alreadyDone && !alreadyFinishedCourse) xpEarned += xpForLessonComplete()
  }

  await updateDoc(ref, patch)

  if (profile && !alreadyDone && !alreadyFinishedCourse) {
    const streakUpdate = nextStreak(profile.streak, profile.lastActiveDate || null)
    const badges = [...profile.badges]
    if (lessonCompleted && lesson) {
      const badge = badgeForLesson(lesson.order)
      if (!badges.includes(badge)) badges.push(badge)
    }
    await updateUserProfile(uid, {
      totalXP: profile.totalXP + xpEarned,
      streak: streakUpdate.streak,
      lastActiveDate: streakUpdate.lastActiveDate,
      badges,
      continueLessonId: lessonCompleted ? null : lessonId,
      continuePhase: lessonCompleted ? null : nextPhase,
      continueStepIndex: lessonCompleted ? null : nextStepIndex,
    })
  } else if (!lessonCompleted) {
    await saveContinuePointer(uid, lessonId, nextPhase, nextStepIndex)
  }

  if (lessonCompleted) {
    await clearContinuePointer(uid)
  }

  return { xpEarned, lessonCompleted }
}

export async function saveSimState(
  uid: string,
  lessonId: string,
  simState: { angle: number; velocity: number },
): Promise<void> {
  const ref = doc(db, 'users', uid, 'lessonProgress', lessonId)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await initLessonProgress(uid, lessonId)
  }
  await updateDoc(ref, { simState, updatedAt: serverTimestamp() })
}
