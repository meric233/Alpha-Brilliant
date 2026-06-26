import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/Layout'
import { CoursePath } from '../components/CoursePath'
import { AdminPanel } from '../components/AdminPanel'
import { course } from '../content/course'
import type { LessonProgress } from '../content/types'
import { findContinueTarget } from '../lib/courseUtils'
import { useIsAdmin } from '../lib/admin'
import { getAllLessonProgress } from '../services/progressService'

const BADGE_LABELS: Record<string, string> = {
  'lesson-1-complete': 'Shape Master',
  'lesson-2-complete': 'Angle Pair Pro',
  'lesson-3-complete': 'Calculation Champ',
  'lesson-4-complete': 'Speed Expert',
}

export function HomePage() {
  const { user, profile, refreshProfile, setAiEnabled } = useAuth()
  const isAdmin = useIsAdmin()
  const [progressList, setProgressList] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [togglingAi, setTogglingAi] = useState(false)

  const aiEnabled = profile?.aiEnabled ?? false
  const handleToggleAi = async () => {
    setTogglingAi(true)
    try {
      await setAiEnabled(!aiEnabled)
    } finally {
      setTogglingAi(false)
    }
  }

  const reloadProgress = useCallback(async () => {
    if (!user) return
    const list = await getAllLessonProgress(user.uid)
    setProgressList(list)
    setLoading(false)
  }, [user])

  useEffect(() => {
    reloadProgress()
  }, [reloadProgress])

  const continueTarget = profile
    ? findContinueTarget(profile, progressList)
    : null

  const completedCount = progressList.filter((p) => p.status === 'completed').length
  const allDone = completedCount >= course.lessons.length

  return (
    <Layout>
      <div className="home">
        <section className="home-hero">
          <h1>Hey, {profile?.displayName ?? 'Learner'}!</h1>
          <p>{course.title} — {course.lessons.length} lessons</p>
        </section>

        {!loading && continueTarget && !allDone && (
          <Link
            to={`/lesson/${continueTarget.lessonId}`}
            className="continue-card"
          >
            <span className="continue-label">Continue</span>
            <span className="continue-title">
              {course.lessons.find((l) => l.id === continueTarget.lessonId)?.title}
            </span>
          </Link>
        )}

        {allDone && (
          <div className="course-complete-banner">
            <h2>Course complete!</h2>
            <p>You finished all projectile lessons. Nice work.</p>
          </div>
        )}

        <section className="ai-toggle-card">
          <div className="ai-toggle-text">
            <h2>AI features</h2>
            <p>
              {aiEnabled
                ? 'On — goal-free problems let you name and find any quantities you can derive.'
                : 'Off — goal-free problems show a fixed checklist of quantities.'}
            </p>
          </div>
          <button
            type="button"
            className={`ai-toggle-switch${aiEnabled ? ' ai-toggle-on' : ''}`}
            role="switch"
            aria-checked={aiEnabled}
            disabled={togglingAi}
            onClick={handleToggleAi}
          >
            <span className="ai-toggle-knob" />
            <span className="ai-toggle-label">{aiEnabled ? 'On' : 'Off'}</span>
          </button>
        </section>

        <section className="badges-section">
          <h2>Badges</h2>
          <div className="badges-row">
            {course.lessons.map((lesson) => {
              const badgeId = `lesson-${lesson.order}-complete`
              const earned = profile?.badges.includes(badgeId)
              return (
                <div
                  key={badgeId}
                  className={`badge ${earned ? 'badge-earned' : 'badge-locked'}`}
                  title={BADGE_LABELS[badgeId]}
                >
                  <span className="badge-icon">{earned ? '🏅' : '🔒'}</span>
                  <span className="badge-name">{BADGE_LABELS[badgeId]}</span>
                </div>
              )
            })}
          </div>
        </section>

        <section>
          <h2>Your path</h2>
          <CoursePath progressList={progressList} />
        </section>

        <button
          type="button"
          className="btn btn-text btn-small"
          onClick={() => {
            refreshProfile()
            reloadProgress()
          }}
        >
          Refresh progress
        </button>

        {isAdmin && <AdminPanel progressList={progressList} onChanged={reloadProgress} />}
      </div>
    </Layout>
  )
}
