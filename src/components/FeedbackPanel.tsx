import type { FeedbackCopy } from '../content/types'

type Props = {
  feedback: FeedbackCopy
  status: 'idle' | 'correct' | 'incorrect'
  wrongCount: number
  hintThreshold: number
  showExplanation: boolean
  onShowExplanation: () => void
}

export function FeedbackPanel({
  feedback,
  status,
  wrongCount,
  hintThreshold,
  showExplanation,
  onShowExplanation,
}: Props) {
  if (status === 'idle') return null

  const showHint = status === 'incorrect' && wrongCount >= hintThreshold

  return (
    <div className={`feedback feedback-${status}`} role="status">
      <p className="feedback-message">
        {status === 'correct' ? feedback.correct : feedback.incorrect}
      </p>
      {showHint && !showExplanation && (
        <div className="feedback-hint">
          <p><strong>Hint:</strong> {feedback.hint}</p>
          <button type="button" className="btn btn-text" onClick={onShowExplanation}>
            Show explanation
          </button>
        </div>
      )}
      {showExplanation && (
        <p className="feedback-explanation">{feedback.explanation}</p>
      )}
    </div>
  )
}
