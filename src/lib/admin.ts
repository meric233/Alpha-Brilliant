import { useAuth } from '../context/AuthContext'

export const ADMIN_EMAIL = 'langming.xing@alphaaiengineering.com'

export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL
}

/**
 * True when the signed-in Firebase Auth user is the admin. Gated purely on the
 * Auth identity (not the Firestore profile snapshot), so it can't be spoofed by
 * editing profile data.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuth()
  return isAdminEmail(user?.email)
}
