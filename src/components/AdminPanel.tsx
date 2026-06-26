import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { course } from '../content/course'
import type { LessonProgress } from '../content/types'
import { getDayOffset, setDayOffset, simulatedDate, today } from '../lib/clock'
import { localDateString } from '../lib/gamification'
import {
  adminLogStudyDay,
  adminMarkLessonCompleted,
  adminResetLesson,
  adminSetBadges,
  adminSetCurrentLesson,
  adminSetStats,
  badgeForLesson,
} from '../services/adminService'

const BADGE_LABELS: Record<string, string> = {
  'lesson-1-complete': 'Shape Master',
  'lesson-2-complete': 'Angle Pair Pro',
  'lesson-3-complete': 'Calculation Champ',
  'lesson-4-complete': 'Speed Expert',
}

export function AdminPanel({
  progressList,
  onChanged,
}: {
  progressList: LessonProgress[]
  onChanged: () => void | Promise<void>
}) {
  const { user, profile, refreshProfile } = useAuth()

  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [offset, setOffset] = useState(getDayOffset())

  const [targetOrder, setTargetOrder] = useState(1)
  const [phase, setPhase] = useState<'steps' | 'capstone'>('steps')
  const [stepIndex, setStepIndex] = useState(0)

  const [xp, setXp] = useState(0)
  const [streak, setStreak] = useState(0)
  const [badges, setBadges] = useState<string[]>([])

  useEffect(() => {
    if (!profile) return
    setXp(profile.totalXP)
    setStreak(profile.streak)
    setBadges(profile.badges)
  }, [profile])

  const targetLesson = course.lessons.find((l) => l.order === targetOrder)
  const maxStepIndex = targetLesson
    ? (phase === 'steps' ? targetLesson.steps.length : targetLesson.capstone.length) - 1
    : 0

  async function run(label: string, fn: () => Promise<void>) {
    if (!user) return
    setBusy(true)
    setMessage(null)
    try {
      await fn()
      await refreshProfile()
      await onChanged()
      setMessage(`${label} ✓`)
    } catch (err) {
      setMessage(`${label} failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  function applyOffset(next: number) {
    setDayOffset(next)
    setOffset(next)
    setMessage(`Simulated day set to ${next >= 0 ? `+${next}` : next} (${today()})`)
  }

  if (!user) return null

  const realToday = localDateString()
  const simToday = localDateString(simulatedDate())

  return (
    <section className="admin-panel">
      <button
        type="button"
        className="admin-toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>🛠️ Admin controls</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="admin-body">
          {message && <p className="admin-message">{message}</p>}

          <div className="admin-section">
            <h3>Day simulation (streaks & reviews)</h3>
            <p className="admin-clock">
              Real today: <strong>{realToday}</strong> · Simulated:{' '}
              <strong>{simToday}</strong> (offset {offset >= 0 ? `+${offset}` : offset}d)
            </p>
            <p className="admin-clock">
              Last active: <strong>{profile?.lastActiveDate || '—'}</strong> · Streak:{' '}
              <strong>🔥 {profile?.streak ?? 0}</strong>
            </p>
            <div className="admin-btn-row">
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => applyOffset(offset - 1)}
              >
                − 1 day
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-small"
                onClick={() => applyOffset(offset + 1)}
              >
                + 1 day
              </button>
              <button
                type="button"
                className="btn btn-text btn-small"
                onClick={() => applyOffset(0)}
              >
                Reset to today
              </button>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                run('Logged study day', async () => {
                  await adminLogStudyDay(
                    user.uid,
                    profile?.streak ?? 0,
                    profile?.lastActiveDate ?? '',
                  )
                })
              }
            >
              Log a study day (at simulated date)
            </button>
            <p className="admin-hint">
              Set the simulated date, then "Log a study day" to apply the real streak rules:
              consecutive days build the streak, a gap &gt; 1 day resets it. This drives streaks now
              and will drive spaced-review due dates later. The offset only affects this browser.
            </p>
          </div>

          <div className="admin-section">
            <h3>Set lesson position</h3>
            <div className="admin-grid">
              <label className="admin-field">
                <span>Lesson</span>
                <select
                  className="input"
                  value={targetOrder}
                  onChange={(e) => {
                    setTargetOrder(Number(e.target.value))
                    setStepIndex(0)
                  }}
                >
                  {course.lessons.map((l) => (
                    <option key={l.id} value={l.order}>
                      Lesson {l.order} — {l.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="admin-field">
                <span>Phase</span>
                <select
                  className="input"
                  value={phase}
                  onChange={(e) => {
                    setPhase(e.target.value as 'steps' | 'capstone')
                    setStepIndex(0)
                  }}
                >
                  <option value="steps">Teaching steps</option>
                  <option value="capstone">Capstone</option>
                </select>
              </label>

              <label className="admin-field">
                <span>Step (0–{Math.max(0, maxStepIndex)})</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={Math.max(0, maxStepIndex)}
                  value={stepIndex}
                  onChange={(e) =>
                    setStepIndex(
                      Math.min(Math.max(0, Number(e.target.value)), Math.max(0, maxStepIndex)),
                    )
                  }
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() =>
                run('Lesson position applied', () =>
                  adminSetCurrentLesson(user.uid, targetOrder, phase, stepIndex),
                )
              }
            >
              Apply position
            </button>
            <p className="admin-hint">
              Marks earlier lessons complete (unlocks them), sets this lesson in-progress, and
              re-locks later lessons.
            </p>
          </div>

          <div className="admin-section">
            <h3>Per-lesson quick actions</h3>
            <ul className="admin-lesson-list">
              {course.lessons.map((l) => {
                const p = progressList.find((x) => x.lessonId === l.id)
                return (
                  <li key={l.id} className="admin-lesson-row">
                    <span className="admin-lesson-name">
                      <strong>Lesson {l.order}</strong> {l.title}
                      <em className="admin-status">{p?.status ?? 'not_started'}</em>
                    </span>
                    <span className="admin-lesson-actions">
                      <button
                        type="button"
                        className="btn btn-text btn-small"
                        disabled={busy}
                        onClick={() =>
                          run(`Lesson ${l.order} completed`, () =>
                            adminMarkLessonCompleted(user.uid, l.id),
                          )
                        }
                      >
                        Complete
                      </button>
                      <button
                        type="button"
                        className="btn btn-text btn-small"
                        disabled={busy}
                        onClick={() =>
                          run(`Lesson ${l.order} reset`, () => adminResetLesson(user.uid, l.id))
                        }
                      >
                        Reset
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="admin-section">
            <h3>Stats</h3>
            <div className="admin-grid">
              <label className="admin-field">
                <span>Total XP</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={xp}
                  onChange={(e) => setXp(Number(e.target.value))}
                />
              </label>
              <label className="admin-field">
                <span>Streak</span>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={streak}
                  onChange={(e) => setStreak(Number(e.target.value))}
                />
              </label>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => run('Stats saved', () => adminSetStats(user.uid, { totalXP: xp, streak }))}
            >
              Save stats
            </button>
          </div>

          <div className="admin-section">
            <h3>Badges</h3>
            <div className="admin-badge-list">
              {course.lessons.map((l) => {
                const id = badgeForLesson(l.order)
                const checked = badges.includes(id)
                return (
                  <label key={id} className="admin-badge-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setBadges((prev) =>
                          e.target.checked ? [...prev, id] : prev.filter((b) => b !== id),
                        )
                      }
                    />
                    <span>{BADGE_LABELS[id] ?? id}</span>
                  </label>
                )
              })}
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => run('Badges saved', () => adminSetBadges(user.uid, badges))}
            >
              Save badges
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
