import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Layout } from '../components/Layout'
import { StepPlayer } from '../components/StepPlayer'
import { course, getLessonById } from '../content/course'
import type { CapstoneStep, LessonProgress } from '../content/types'
import { isLessonUnlocked } from '../lib/courseUtils'
import {
  completeStep,
  getAllLessonProgress,
  getLessonProgress,
  initLessonProgress,
  recordWrongAttempt,
  resetLessonProgress,
  saveContinuePointer,
  saveSimState,
} from '../services/progressService'
import { getUserProfile } from '../services/userService'
import { playLessonComplete, playStreak, playStepComplete, primeAudio } from '../lib/sounds'
import { LessonCompleteCelebration, StreakFireOverlay } from '../components/Celebrations'

export function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>()
  const { user, profile, refreshProfile } = useAuth()
  const lesson = lessonId ? getLessonById(lessonId) : undefined

  const [progress, setProgress] = useState<LessonProgress | null>(null)
  const [allProgress, setAllProgress] = useState<LessonProgress[]>([])
  const [phase, setPhase] = useState<'steps' | 'capstone'>('steps')
  const [stepIndex, setStepIndex] = useState(0)
  const [angle, setAngle] = useState(45)
  const [velocity, setVelocity] = useState(15)
  const [loading, setLoading] = useState(true)
  const [lessonComplete, setLessonComplete] = useState(false)
  const [xpEarned, setXpEarned] = useState(0)
  const [retaking, setRetaking] = useState(false)
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null)

  useEffect(() => {
    if (!user || !lessonId || !lesson) return

    setLessonComplete(false)
    setXpEarned(0)
    setLoading(true)

    async function load() {
      const [lp, all] = await Promise.all([
        getLessonProgress(user!.uid, lessonId!),
        getAllLessonProgress(user!.uid),
      ])
      setAllProgress(all)

      if (!isLessonUnlocked(lesson!, all)) {
        setLoading(false)
        return
      }

      const p = lp ?? (await initLessonProgress(user!.uid, lessonId!))
      setProgress(p)

      const reviewFromStart = p.status === 'completed'
      setPhase(reviewFromStart ? 'steps' : p.phase)
      setStepIndex(reviewFromStart ? 0 : p.currentStepIndex)

      if (p.simState && !reviewFromStart) {
        setAngle(p.simState.angle)
        setVelocity(p.simState.velocity)
      } else {
        const firstStep = lesson!.steps[0]
        const defaults =
          firstStep.type === 'intro'
            ? firstStep.simDefaults
            : firstStep.type === 'sim_explore'
              ? firstStep.simConfig
              : undefined
        if (defaults) {
          setAngle(defaults.defaultAngle)
          setVelocity(defaults.defaultVelocity)
        }
      }

      const continuePhase = reviewFromStart ? 'steps' : p.phase
      const continueIndex = reviewFromStart ? 0 : p.currentStepIndex
      await saveContinuePointer(user!.uid, lessonId!, continuePhase, continueIndex)
      setLoading(false)
    }

    load()
  }, [user, lessonId, lesson])

  useEffect(() => {
    if (!user || !lessonId) return
    const t = setTimeout(() => {
      saveSimState(user.uid, lessonId, { angle, velocity })
    }, 400)
    return () => clearTimeout(t)
  }, [angle, velocity, user, lessonId])

  if (!lesson) {
    return (
      <Layout>
        <p>Lesson not found.</p>
        <Link to="/">Back home</Link>
      </Layout>
    )
  }

  if (!loading && !isLessonUnlocked(lesson, allProgress)) {
    return (
      <Layout>
        <p>Complete the previous lesson to unlock this one.</p>
        <Link to="/">Back home</Link>
      </Layout>
    )
  }

  const steps = phase === 'steps' ? lesson.steps : lesson.capstone
  const currentStep = steps[stepIndex] as CapstoneStep | (typeof lesson.steps)[number]
  const stepId = currentStep?.id ?? ''
  const wrongCount = progress?.wrongAttempts[stepId] ?? 0
  const totalParts = lesson.steps.length + lesson.capstone.length
  const completedParts =
    phase === 'steps'
      ? stepIndex
      : lesson.steps.length + stepIndex

  const handleWrongAttempt = async () => {
    if (!user || !lessonId) return 0
    const count = await recordWrongAttempt(user.uid, lessonId, stepId)
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            wrongAttempts: { ...prev.wrongAttempts, [stepId]: count },
          }
        : prev,
    )
    return count
  }

  const handleRetake = async () => {
    if (!user || !lessonId) return
    setRetaking(true)
    try {
      const p = await resetLessonProgress(user.uid, lessonId)
      setProgress(p)
      setLessonComplete(false)
      setXpEarned(0)
      setPhase('steps')
      setStepIndex(0)
      const firstStep = lesson.steps[0]
      const defaults =
        firstStep.type === 'intro'
          ? firstStep.simDefaults
          : firstStep.type === 'sim_explore'
            ? firstStep.simConfig
            : undefined
      if (defaults) {
        setAngle(defaults.defaultAngle)
        setVelocity(defaults.defaultVelocity)
      }
      await saveContinuePointer(user.uid, lessonId, 'steps', 0)
    } finally {
      setRetaking(false)
    }
  }

  const handleComplete = async () => {
    if (!user || !lessonId || !profile) return

    const prevStreak = profile.streak
    const result = await completeStep(
      user.uid,
      lessonId,
      stepId,
      phase,
      stepIndex,
      { angle, velocity },
      profile,
    )

    if (result.xpEarned > 0) setXpEarned((x) => x + result.xpEarned)
    await refreshProfile()

    const updatedProfile = await getUserProfile(user.uid)
    if (updatedProfile && updatedProfile.streak > prevStreak) {
      primeAudio()
      playStreak()
      setStreakCelebration(updatedProfile.streak)
    } else if (result.xpEarned > 0 && !result.lessonCompleted) {
      primeAudio()
      playStepComplete()
    }

    if (result.lessonCompleted) {
      primeAudio()
      playLessonComplete()
      setLessonComplete(true)
      return
    }

    const isLastTeaching = phase === 'steps' && stepIndex >= lesson.steps.length - 1
    if (isLastTeaching) {
      setPhase('capstone')
      setStepIndex(0)
    } else {
      setStepIndex((i) => i + 1)
    }

    const nextPhase = isLastTeaching ? 'capstone' : phase
    const nextIndex = isLastTeaching ? 0 : stepIndex + 1
    await saveContinuePointer(user.uid, lessonId, nextPhase, nextIndex)

    const updated = await getLessonProgress(user.uid, lessonId)
    if (updated) setProgress(updated)
  }

  if (loading) {
    return (
      <Layout>
        <p className="loading">Loading lesson…</p>
      </Layout>
    )
  }

  if (lessonComplete) {
    const badgeId = `lesson-${lesson.order}-complete`
    const badgeLabels: Record<string, string> = {
      'lesson-1-complete': 'Shape Master',
      'lesson-2-complete': 'Angle Pair Pro',
      'lesson-3-complete': 'Calculation Champ',
      'lesson-4-complete': 'Speed Expert',
    }
    const nextLesson = course.lessons.find((l) => l.order === lesson.order + 1)
    const nextLessonId = nextLesson?.id ?? null

    return (
      <Layout>
        <LessonCompleteCelebration active />
        <div className="lesson-complete lesson-complete-dramatic">
          <p className="complete-burst-label">🎉 Lesson Complete! 🎉</p>
          <h1>You nailed it!</h1>
          <p className="lesson-complete-title">{lesson.title}</p>
          {xpEarned > 0 && <p className="xp-earned">+{xpEarned} XP this session</p>}
          <div className="badge-earned-display">
            <span>🏅</span>
            <p>Badge earned: {badgeLabels[badgeId] ?? badgeId}</p>
          </div>
          {nextLessonId ? (
            <Link to={`/lesson/${nextLessonId}`} className="btn btn-primary">
              Next lesson
            </Link>
          ) : (
            <Link to="/" className="btn btn-primary">
              Back to home
            </Link>
          )}
          <button
            type="button"
            className="btn btn-secondary lesson-retake-btn"
            disabled={retaking}
            onClick={handleRetake}
          >
            {retaking ? 'Resetting…' : 'Retake lesson'}
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      {streakCelebration != null && (
        <StreakFireOverlay
          streak={streakCelebration}
          onDone={() => setStreakCelebration(null)}
        />
      )}
      <div className="lesson">
        <div className="lesson-header">
          <Link to="/" className="btn btn-text btn-small">← Home</Link>
          <div className="lesson-header-right">
            <span className="lesson-progress-text">
              {lesson.title} · {completedParts + 1}/{totalParts}
            </span>
            {progress && progress.status !== 'not_started' && (
              <button
                type="button"
                className="btn btn-text btn-small"
                disabled={retaking}
                onClick={handleRetake}
              >
                {retaking ? 'Resetting…' : 'Retake'}
              </button>
            )}
          </div>
        </div>
        <div className="progress-bar" aria-hidden>
          <div
            className="progress-fill"
            style={{ width: `${((completedParts + 1) / totalParts) * 100}%` }}
          />
        </div>
        {currentStep && (
          <StepPlayer
            key={stepId}
            step={currentStep}
            angle={angle}
            velocity={velocity}
            wrongCount={wrongCount}
            onAngleChange={setAngle}
            onVelocityChange={setVelocity}
            onWrongAttempt={handleWrongAttempt}
            onComplete={handleComplete}
          />
        )}
      </div>
    </Layout>
  )
}
