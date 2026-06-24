import { useEffect, useState } from 'react'

export function CorrectBurst({ active }: { active: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!active) return
    setShow(true)
    const t = setTimeout(() => setShow(false), 1200)
    return () => clearTimeout(t)
  }, [active])

  if (!show) return null

  return (
    <div className="correct-burst-overlay" aria-hidden>
      <div className="correct-burst-glow" />
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="burst-particle"
          style={{
            '--i': i,
            '--rot': `${i * 22.5}deg`,
          } as React.CSSProperties}
        />
      ))}
      <span className="burst-check">✓</span>
    </div>
  )
}

export function StreakFireOverlay({
  streak,
  onDone,
}: {
  streak: number
  onDone: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="streak-fire-overlay" role="status" aria-live="polite">
      <div className="streak-fire-bg" />
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="fire-particle"
          style={{ '--fi': i } as React.CSSProperties}
        />
      ))}
      <div className="streak-fire-content">
        <p className="streak-fire-emoji">🔥🔥🔥</p>
        <h2 className="streak-fire-title">{streak} day streak!</h2>
        <p className="streak-fire-sub">You&apos;re on fire — keep it going!</p>
      </div>
    </div>
  )
}

export function LessonCompleteCelebration({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="lesson-celebration" aria-hidden>
      {Array.from({ length: 20 }).map((_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{ '--ci': i } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
