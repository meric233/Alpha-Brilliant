import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useIsAdmin } from '../lib/admin'

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, logout } = useAuth()
  const isAdmin = useIsAdmin()

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          Parabolo<span className="brand-alpha">α</span>
        </Link>
        {profile && (
          <div className="header-stats">
            {isAdmin && (
              <span className="stat-pill stat-admin" title="Admin mode">
                ADMIN
              </span>
            )}
            <span
              className={`stat-pill stat-streak${profile.streak > 0 ? ' stat-streak-active' : ''}`}
              title="Streak"
            >
              🔥 {profile.streak}
            </span>
            <span className="stat-pill stat-xp" title="XP">
              ✦ {profile.totalXP} XP
            </span>
            <button type="button" className="btn btn-text btn-small" onClick={() => logout()}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
