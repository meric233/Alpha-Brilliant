import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'

export function AuthPage() {
  const {
    signInEmail,
    signUpEmail,
    signInGoogle,
    setDisplayName,
    needsDisplayName,
    user,
  } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (!displayName.trim()) {
          setError('Display name is required.')
          return
        }
        await signUpEmail(email, password, displayName.trim())
      } else {
        await signInEmail(email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      await signInGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    } finally {
      setLoading(false)
    }
  }

  const handleNameSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) return
    setLoading(true)
    try {
      await setDisplayName(displayName.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save name')
    } finally {
      setLoading(false)
    }
  }

  if (user && needsDisplayName) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Welcome to Paraboloα</h1>
          <p>What should we call you?</p>
          <form onSubmit={handleNameSubmit} className="auth-form">
            <input
              className="input"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              required
              autoFocus
            />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn-primary" disabled={loading}>
              Continue
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>
          Parabolo<span className="brand-alpha">α</span>
        </h1>
        <p className="tagline">Launch your intuition.</p>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <input
              className="input"
              value={displayName}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name"
              required
            />
          )}
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
          />
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-secondary btn-google"
          onClick={handleGoogle}
          disabled={loading}
        >
          Continue with Google
        </button>

        <p className="auth-toggle">
          {mode === 'signin' ? (
            <>
              New here?{' '}
              <button type="button" className="btn btn-text" onClick={() => setMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button type="button" className="btn btn-text" onClick={() => setMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  )
}
