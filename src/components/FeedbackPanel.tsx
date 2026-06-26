import type { FeedbackCopy } from '../content/types'

type Props = {
  feedback: FeedbackCopy
  status: 'idle' | 'correct' | 'incorrect'
  wrongCount: number
  hintThreshold: number
}

export function FeedbackPanel({ feedback, status, wrongCount, hintThreshold }: Props) {
  if (status === 'idle') return null

  const showHint = status === 'incorrect' && wrongCount >= hintThreshold

  return (
    <div className={`feedback feedback-${status}`} role="status">
      <p className="feedback-message">
        {status === 'correct' ? feedback.correct : feedback.incorrect}
      </p>
      {showHint && feedback.hint && (
        <div className="feedback-hint">
          <p><strong>Hint:</strong> {feedback.hint}</p>
        </div>
      )}
    </div>
  )
}
