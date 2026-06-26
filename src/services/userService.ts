import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { UserProfile } from '../content/types'
import { localDateString } from '../lib/gamification'

function fromFirestore(data: Record<string, unknown>): UserProfile {
  const ts = (v: unknown) => (v as Timestamp)?.toDate?.() ?? new Date()
  return {
    displayName: (data.displayName as string) ?? '',
    email: (data.email as string) ?? '',
    createdAt: ts(data.createdAt),
    updatedAt: ts(data.updatedAt),
    totalXP: (data.totalXP as number) ?? 0,
    streak: (data.streak as number) ?? 0,
    lastActiveDate: (data.lastActiveDate as string) ?? '',
    badges: (data.badges as string[]) ?? [],
    continueLessonId: (data.continueLessonId as string | null) ?? null,
    continuePhase: (data.continuePhase as 'steps' | 'capstone' | null) ?? null,
    continueStepIndex: (data.continueStepIndex as number | null) ?? null,
    aiEnabled: (data.aiEnabled as boolean) ?? false,
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  if (!snap.exists()) return null
  return fromFirestore(snap.data())
}

export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const profile = {
    displayName,
    email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    totalXP: 0,
    streak: 0,
    lastActiveDate: '',
    badges: [] as string[],
    continueLessonId: null,
    continuePhase: null,
    continueStepIndex: null,
    aiEnabled: false,
  }
  await setDoc(doc(db, 'users', uid), profile)
  return {
    ...profile,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastActiveDate: '',
  }
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<{
    displayName: string
    totalXP: number
    streak: number
    lastActiveDate: string
    badges: string[]
    continueLessonId: string | null
    continuePhase: 'steps' | 'capstone' | null
    continueStepIndex: number | null
    aiEnabled: boolean
  }>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function ensureUserProfile(
  uid: string,
  email: string,
  displayName: string,
): Promise<UserProfile> {
  const existing = await getUserProfile(uid)
  if (existing) return existing
  return createUserProfile(uid, email, displayName)
}

export { localDateString }
