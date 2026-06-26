import { useMemo, useState, type ReactNode } from 'react'
import type { GoalFreeProblemStep, GoalFreeQuantityKey } from '../content/types'
import { deriveQuantities } from '../lib/physics'
import { numericAnswerCorrect } from '../lib/validation'
import { checkAndConvert } from '../lib/units'
import { interpretQuantities, explainRow, type CoachReason } from '../lib/ai/goalFreeInterpreter'
import { FeedbackPanel } from './FeedbackPanel'
import { GOAL_FREE_HINT_THRESHOLD } from '../lib/constants'
import { playCorrect, playWrong, primeAudio } from '../lib/sounds'
import { CorrectBurst } from './Celebrations'

type Props = {
  step: GoalFreeProblemStep
  wrongCount: number
  adminSlot?: ReactNode
  onWrongAttempt: () => Promise<number>
  onComplete: () => void
}

type Row = { name: string; value: string; unit: string }
type RowOutcome = 'correct' | 'incorrect' | 'bad-unit' | 'unmatched' | 'given' | 'unchecked'

const EMPTY_ROW: Row = { name: '', value: '', unit: '' }
const INITIAL_ROWS = 5

// Only used when the live AI explanation can't be reached. Kept deliberately
// generic so it never gives away which quantities the exercise checks.
function fallbackExplanation(name: string, reason: CoachReason): string {
  const label = name.trim() || 'that'
  if (reason === 'given') {
    return `“${label}” is already given in the problem, so it won't count — use it to work out something you don't know yet.`
  }
  return `I couldn't match “${label}” to a quantity this exercise can grade. Double-check the spelling, and make sure it's a kinematic property of this projectile's motion.`
}

export function GoalFreeOpenEntry({
  step,
  wrongCount,
  adminSlot,
  onWrongAttempt,
  onComplete,
}: Props) {
  const required = step.requiredCount ?? 3
  const givenKeys = useMemo(() => new Set(step.givenKeys ?? []), [step.givenKeys])
  const truth = useMemo(
    () => deriveQuantities(step.angle, step.velocity, step.gravity),
    [step.angle, step.velocity, step.gravity],
  )

  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: INITIAL_ROWS }, () => ({ ...EMPTY_ROW })),
  )
  const [outcomes, setOutcomes] = useState<RowOutcome[] | null>(null)
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [passed, setPassed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [correctCount, setCorrectCount] = useState(0)
  const [burstKey, setBurstKey] = useState(0)
  // Set when the AI grader can't be reached. There is no offline grader, so we
  // tell the learner rather than penalizing them.
  const [graderError, setGraderError] = useState(false)
  // AI coaching for rows that earned no credit — "?" (unmatched) or ℹ (given).
  const [coachRows, setCoachRows] = useState<
    { i: number; name: string; reason: CoachReason }[]
  >([])
  const [explanations, setExplanations] = useState<Record<number, string>>({})

  const scenario = step.body ?? step.prompt

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const addRow = () => setRows((rs) => [...rs, { ...EMPTY_ROW }])

  const filledCount = rows.filter((r) => r.name.trim() !== '' && r.value.trim() !== '').length
  const canCheck = filledCount > 0 && !checking

  const check = async () => {
    primeAudio()
    setChecking(true)
    setExplanations({})
    setCoachRows([])
    setGraderError(false)
    try {
      const filled = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => r.name.trim() !== '' && r.value.trim() !== '')

      const mappings = await interpretQuantities(
        filled.map(({ r }) => ({ name: r.name, unit: r.unit || undefined })),
        scenario,
      )

      const nextOutcomes: RowOutcome[] = rows.map(() => 'unchecked')
      const credited = new Set<GoalFreeQuantityKey>()
      const coach: { i: number; name: string; unit: string; reason: CoachReason }[] = []

      filled.forEach(({ i }, k) => {
        const m = mappings[k]
        const value = parseFloat(rows[i].value)
        if (Number.isNaN(value)) {
          nextOutcomes[i] = 'unchecked'
          return
        }
        if (!m || m.key === 'unsupported') {
          // The AI couldn't tie this label to a checkable quantity → "?" row.
          nextOutcomes[i] = 'unmatched'
          coach.push({ i, name: rows[i].name.trim(), unit: rows[i].unit.trim(), reason: 'unmatched' })
          return
        }
        if (givenKeys.has(m.key)) {
          // Stated in the prompt — acknowledge it but don't count it.
          nextOutcomes[i] = 'given'
          coach.push({ i, name: rows[i].name.trim(), unit: rows[i].unit.trim(), reason: 'given' })
          return
        }
        // Units are validated by the engine, never the model.
        const unitCheck = checkAndConvert(m.key, value, rows[i].unit)
        if (!unitCheck.ok) {
          nextOutcomes[i] = 'bad-unit'
          return
        }
        if (numericAnswerCorrect(truth[m.key], unitCheck.canonicalValue)) {
          nextOutcomes[i] = 'correct'
          credited.add(m.key)
        } else {
          nextOutcomes[i] = 'incorrect'
        }
      })

      const count = credited.size
      setOutcomes(nextOutcomes)
      setCorrectCount(count)

      if (count >= required) {
        if (!passed) {
          playCorrect()
          setBurstKey((k) => k + 1)
        }
        setPassed(true)
        setStatus('correct')
      } else {
        await onWrongAttempt()
        setStatus('incorrect')
        playWrong()
      }

      setCoachRows(coach.map(({ i, name, reason }) => ({ i, name, reason })))
      void loadExplanations(coach)
    } catch (err) {
      // AI grader unreachable (offline, timeout, etc.). No offline fallback by
      // design — surface it and don't penalize the attempt.
      console.warn('[goal-free] AI grader unavailable:', err)
      setGraderError(true)
      setStatus('idle')
      setOutcomes(null)
    } finally {
      setChecking(false)
    }
  }

  // Fetch a short, context-aware AI explanation for each no-credit row (given or
  // unmatched). Runs after the verdict so grading is never blocked. If the AI is
  // unreachable we fall back to a short static message.
  const loadExplanations = async (
    coach: { i: number; name: string; unit: string; reason: CoachReason }[],
  ) => {
    if (coach.length === 0) return
    // Resolve each row independently so a fast one shows while others load.
    await Promise.all(
      coach.map(async ({ i, name, unit, reason }) => {
        let text: string
        try {
          text =
            (await explainRow({ name, unit: unit || undefined, reason, scenario })).trim() ||
            fallbackExplanation(name, reason)
        } catch (err) {
          console.warn('[goal-free] explanation unavailable, using fallback:', err)
          text = fallbackExplanation(name, reason)
        }
        setExplanations((prev) => ({ ...prev, [i]: text }))
      }),
    )
  }

  const markFor = (outcome: RowOutcome) => {
    if (outcome === 'correct') return <span className="gf-mark">✓</span>
    if (outcome === 'incorrect') return <span className="gf-mark">✗</span>
    if (outcome === 'bad-unit')
      return (
        <span className="gf-mark gf-badunit" title="Right quantity, but the unit doesn't fit. Check the unit.">
          ✗
        </span>
      )
    if (outcome === 'given')
      return (
        <span className="gf-mark gf-given" title="This quantity was given in the problem, so it doesn't count.">
          ℹ
        </span>
      )
    return (
      <span className="gf-mark">
        <span className="gf-unchecked" title="Couldn't match this to a quantity we can check">
          ?
        </span>
      </span>
    )
  }

  return (
    <div className="step step-goalfree step-goalfree-open">
      {burstKey > 0 && <CorrectBurst active key={burstKey} />}
      <span className="goalfree-badge">Find everything you can · AI</span>
      <h2 className="step-prompt">{step.prompt}</h2>
      {step.body && <p className="step-body">{step.body}</p>}
      <p className="goalfree-target">
        Name and compute at least {required} quantities you can derive from this launch — you decide
        which. Type the quantity in your own words and include the unit.
      </p>

      <div className="gf-open-grid">
        <div className="gf-open-head">
          <span>Quantity</span>
          <span>Value</span>
          <span>Unit</span>
          <span aria-hidden />
        </div>
        {rows.map((row, i) => {
          const outcome = outcomes?.[i] ?? 'unchecked'
          const showMark = outcomes != null && row.name.trim() !== '' && row.value.trim() !== ''
          return (
            <div
              key={i}
              className={`gf-open-row${
                showMark && outcome === 'correct'
                  ? ' gf-correct'
                  : showMark && (outcome === 'incorrect' || outcome === 'bad-unit')
                    ? ' gf-wrong'
                    : ''
              }`}
            >
              <input
                type="text"
                className="input"
                placeholder="e.g. how far it goes"
                value={row.name}
                disabled={checking}
                onChange={(e) => updateRow(i, { name: e.target.value })}
              />
              <input
                type="number"
                inputMode="decimal"
                className="input"
                placeholder="value"
                value={row.value}
                disabled={checking}
                onChange={(e) => updateRow(i, { value: e.target.value })}
              />
              <input
                type="text"
                className="input gf-open-unit"
                placeholder="m, s…"
                value={row.unit}
                disabled={checking}
                onChange={(e) => updateRow(i, { unit: e.target.value })}
              />
              {showMark ? markFor(outcome) : <span className="gf-mark" />}
            </div>
          )
        })}
      </div>

      <button type="button" className="btn btn-text btn-small gf-add-row" onClick={addRow}>
        + Add another
      </button>

      {graderError && (
        <p className="goalfree-score gf-grader-error">
          The AI grader is unavailable right now. Please try again in a moment.
        </p>
      )}

      {outcomes && (
        <p className="goalfree-score">
          You found {correctCount} of {required} needed
          {passed
            ? ' — nice work! Continue, or keep going for the rest.'
            : '. Fix the ✗ rows, rename the ? rows, or add more.'}
        </p>
      )}

      {coachRows.length > 0 && (
        <div className="gf-explain-list">
          <p className="gf-explain-head">The AI grader says:</p>
          {coachRows.map(({ i, name }) => {
            const text = explanations[i]
            return (
              <p key={i} className={`gf-explain${text ? '' : ' gf-explain-loading'}`}>
                <span className="gf-explain-q">“{name || '—'}”</span>{' '}
                {text ?? 'Looking at this one…'}
              </p>
            )
          })}
        </div>
      )}

      <FeedbackPanel
        feedback={step.feedback}
        status={status}
        wrongCount={wrongCount}
        hintThreshold={GOAL_FREE_HINT_THRESHOLD}
      />

      {adminSlot}

      <div className="gf-actions">
        <button
          type="button"
          className={passed ? 'btn btn-secondary' : 'btn btn-primary'}
          disabled={!canCheck}
          onClick={check}
        >
          {checking ? 'Checking…' : outcomes ? 'Check again' : 'Check'}
        </button>
        {passed && (
          <button type="button" className="btn btn-primary" onClick={onComplete}>
            Continue
          </button>
        )}
      </div>
    </div>
  )
}
