import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/Layout'
import { CoursePath } from '../components/CoursePath'
import { course } from '../content/course'
import type { LessonProgress } from '../content/types'
import { findContinueTarget } from '../lib/courseUtils'
import { getAllLessonProgress } from '../services/progressService'

const BADGE_LABELS: Record<string, string> = {
  'lesson-1-complete': 'Shape Master',
  'lesson-2-complete': 'Angle Pair Pro',
  'lesson-3-complete': 'Calculation Champ',
  'lesson-4-complete': 'Speed Expert',
}

export function HomePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [progressList, setProgressList] = useState<LessonProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getAllLessonProgress(user.uid).then((list) => {
      setProgressList(list)
      setLoading(false)
    })
  }, [user])

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

        <button type="button" className="btn btn-text btn-small" onClick={() => refreshProfile()}>
          Refresh progress
        </button>
      </div>
    </Layout>
  )
}
