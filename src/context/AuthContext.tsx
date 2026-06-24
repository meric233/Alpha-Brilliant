import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import type { UserProfile } from '../content/types'
import { ensureUserProfile, getUserProfile } from '../services/userService'

type AuthState = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  needsDisplayName: boolean
}

type AuthContextValue = AuthState & {
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string, displayName: string) => Promise<void>
  signInGoogle: () => Promise<void>
  setDisplayName: (name: string) => Promise<void>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null)
      return
    }
    const p = await getUserProfile(auth.currentUser.uid)
    setProfile(p)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const p = await getUserProfile(u.uid)
        setProfile(p)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signInEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
    const u = auth.currentUser!
    await ensureUserProfile(u.uid, u.email ?? email, u.displayName ?? 'Learner')
    await refreshProfile()
  }, [refreshProfile])

  const signUpEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName })
      await ensureUserProfile(cred.user.uid, email, displayName)
      await refreshProfile()
    },
    [refreshProfile],
  )

  const signInGoogle = useCallback(async () => {
    const provider = new GoogleAuthProvider()
    const cred = await signInWithPopup(auth, provider)
    const name = cred.user.displayName ?? 'Learner'
    await ensureUserProfile(cred.user.uid, cred.user.email ?? '', name)
    await refreshProfile()
  }, [refreshProfile])

  const setDisplayName = useCallback(
    async (name: string) => {
      if (!auth.currentUser) return
      await updateProfile(auth.currentUser, { displayName: name })
      await ensureUserProfile(auth.currentUser.uid, auth.currentUser.email ?? '', name)
      await refreshProfile()
    },
    [refreshProfile],
  )

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const needsDisplayName = Boolean(
    user && (!user.displayName || !profile?.displayName),
  )

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      needsDisplayName,
      signInEmail,
      signUpEmail,
      signInGoogle,
      setDisplayName,
      refreshProfile,
      logout,
    }),
    [
      user,
      profile,
      loading,
      needsDisplayName,
      signInEmail,
      signUpEmail,
      signInGoogle,
      setDisplayName,
      refreshProfile,
      logout,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
