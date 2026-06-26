import { useEffect, useState } from 'react'
import type {
  CapstoneStep,
  FormulasStep,
  GoalFreeProblemStep,
  MultipleChoiceStep,
  NumericProblemStep,
  RangeFormulaStep,
  SimExploreStep,
  Step,
  WorkedExampleStep,
} from '../content/types'
import { RangeFormulaPanel } from './RangeFormulaPanel'
import { ProjectileSim } from './ProjectileSim'
import { FeedbackPanel } from './FeedbackPanel'
import { HINT_THRESHOLD, GOAL_FREE_HINT_THRESHOLD } from '../lib/constants'
import {
  validateCapstone,
  validateGoalFree,
  validateMultipleChoice,
  validateNumericProblem,
  type GoalFreeResult,
} from '../lib/validation'
import { deriveQuantities, simMatchTolerance } from '../lib/physics'
import { playCorrect, playWrong, primeAudio } from '../lib/sounds'
import { CorrectBurst } from './Celebrations'
import { GoalFreeOpenEntry } from './GoalFreeOpenEntry'

type Props = {
  step: Step | CapstoneStep
  angle: number
  velocity: number
  wrongCount: number
  isAdmin?: boolean
  aiEnabled?: boolean
  onAngleChange: (v: number) => void
  onVelocityChange: (v: number) => void
  onWrongAttempt: () => Promise<number>
  onComplete: () => void
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

/** Admin-only: the correct answer for a gradable step, or null if none. */
function getAdminAnswer(step: Step | CapstoneStep): string | null {
  if (step.type === 'multiple_choice') {
    const opt = step.options.find((o) => o.id === step.correctOptionId)
    return `Correct choice: ${opt?.label ?? step.correctOptionId}`
  }
  if (step.type === 'numeric_problem') {
    return `Answer: ${round(step.correctValue)}${step.unit ? ` ${step.unit}` : ''}`
  }
  if (step.type === 'goal_free_problem') {
    const truth = deriveQuantities(step.angle, step.velocity, step.gravity)
    return step.quantities
      .map((q) => `${q.label}: ${round(truth[q.key])} ${q.unit}`)
      .join(' · ')
  }
  if (step.type === 'capstone') {
    if (step.subtype === 'multiple_choice' && step.options) {
      const opt = step.options.find((o) => o.id === step.correctOptionId)
      return `Correct choice: ${opt?.label ?? step.correctOptionId}`
    }
    if (step.subtype === 'numeric_input' && step.correctValue != null) {
      return `Answer: ${round(step.correctValue)}${step.unit ? ` ${step.unit}` : ''}`
    }
    if (step.subtype === 'sim_match') {
      const a = step.simConfig?.targetAngle
      const v = step.simConfig?.targetVelocity
      return `Target: angle ${a}°, speed ${v} m/s`
    }
  }
  return null
}

function AdminAnswer({ step }: { step: Step | CapstoneStep }) {
  const [shown, setShown] = useState(false)
  const answer = getAdminAnswer(step)
  if (!answer) return null
  return (
    <div className="admin-answer">
      <button
        type="button"
        className="btn btn-text btn-small admin-answer-toggle"
        onClick={() => setShown((s) => !s)}
      >
        {shown ? 'Hide answer' : '🔑 Show answer (admin)'}
      </button>
      {shown && <p className="admin-answer-text">{answer}</p>}
    </div>
  )
}

function CheckButton({
  canCheck,
  onCheck,
}: {
  canCheck: boolean
  onCheck: () => void
}) {
  return (
    <button type="button" className="btn btn-primary" disabled={!canCheck} onClick={onCheck}>
      Check
    </button>
  )
}

export function StepPlayer({
  step,
  angle,
  velocity,
  wrongCount,
  isAdmin = false,
  aiEnabled = false,
  onAngleChange,
  onVelocityChange,
  onWrongAttempt,
  onComplete,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [numericValue, setNumericValue] = useState('')
  const [gfEntries, setGfEntries] = useState<Record<string, string>>({})
  const [gfResult, setGfResult] = useState<GoalFreeResult | null>(null)
  const [burstKey, setBurstKey] = useState(0)

  const resetCheck = () => {
    setStatus('idle')
    setSelectedOption(null)
    setNumericValue('')
    setGfEntries({})
    setGfResult(null)
  }

  const handleContinue = () => {
    resetCheck()
    onComplete()
  }

  const checkAnswer = async (correct: boolean) => {
    primeAudio()
    if (correct) {
      setStatus('correct')
      playCorrect()
      setBurstKey((k) => k + 1)
    } else {
      await onWrongAttempt()
      setStatus('incorrect')
      playWrong()
    }
  }

  useEffect(() => {
    if (step.type === 'multiple_choice' && step.simConfig) {
      onAngleChange(step.simConfig.defaultAngle)
      onVelocityChange(step.simConfig.defaultVelocity)
    }
    if (step.type === 'capstone' && step.simConfig) {
      onAngleChange(step.simConfig.defaultAngle)
      onVelocityChange(step.simConfig.defaultVelocity)
    }
    if (step.type === 'range_formula') {
      onAngleChange(step.angleRange ? (step.angleRange[0] + step.angleRange[1]) / 2 : 45)
      if (step.simConfig) {
        onVelocityChange(step.simConfig.defaultVelocity)
      }
    }
  }, [step.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const renderSim = (
    config: import('../content/types').SimConfig | undefined,
    controls?: ('angle' | 'velocity' | 'gravity')[],
    stepId?: string,
  ) => {
    const showAngle = !controls || controls.includes('angle')
    const showVelocity = !controls || controls.includes('velocity')
    return (
      <ProjectileSim
        angle={angle}
        velocity={velocity}
        onAngleChange={onAngleChange}
        onVelocityChange={onVelocityChange}
        showAngle={showAngle}
        showVelocity={showVelocity}
        simConfig={config}
        simKey={stepId}
      />
    )
  }

  const burst = burstKey > 0 ? <CorrectBurst active key={burstKey} /> : null

  if (step.type === 'intro') {
    return (
      <div className="step step-intro">
        <h2 className="step-prompt">{step.prompt}</h2>
        <p className="step-body">{step.body}</p>
        {step.simDefaults && renderSim(step.simDefaults, undefined, step.id)}
        <button type="button" className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    )
  }

  if (step.type === 'sim_explore') {
    const explore = step as SimExploreStep
    return (
      <div className="step step-explore">
        <h2 className="step-prompt">{explore.prompt}</h2>
        <p className="step-body">{explore.body}</p>
        {explore.tryItems && explore.tryItems.length > 0 && (
          <ul className="step-try-list">
            {explore.tryItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {renderSim(explore.simConfig, explore.controls, explore.id)}
        <button type="button" className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    )
  }

  if (step.type === 'multiple_choice') {
    const mc = step as MultipleChoiceStep
    const withSim = Boolean(mc.simConfig)
    return (
      <div className={`step step-mc${withSim ? ' step-with-sim' : ''}`}>
        {burst}
        <div className="step-main">
          <h2 className="step-prompt">{mc.prompt}</h2>
          {withSim && (
            <p className="step-hint">Use the sim to try different launch angles at fixed speed.</p>
          )}
          <div className="options" role="radiogroup">
            {mc.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`option ${selectedOption === opt.id ? 'option-selected' : ''} ${status === 'correct' && opt.id === mc.correctOptionId ? 'option-correct' : ''}`}
                onClick={() => setSelectedOption(opt.id)}
                disabled={status === 'correct'}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <FeedbackPanel
            feedback={mc.feedback}
            status={status}
            wrongCount={wrongCount}
            hintThreshold={HINT_THRESHOLD}
          />
          {isAdmin && <AdminAnswer step={step} />}
          {status === 'correct' ? (
            <button type="button" className="btn btn-primary" onClick={handleContinue}>
              Continue
            </button>
          ) : (
            <CheckButton
              canCheck={!!selectedOption}
              onCheck={() => {
                primeAudio()
                checkAnswer(validateMultipleChoice(mc, selectedOption!))
              }}
            />
          )}
        </div>
        {withSim && mc.simConfig && (
          <div className="step-sim-aside">
            {renderSim(mc.simConfig, mc.simControls, mc.id)}
          </div>
        )}
      </div>
    )
  }

  if (step.type === 'formulas') {
    const fs = step as FormulasStep
    return (
      <div className="step step-formula">
        <h2 className="step-prompt">{fs.prompt}</h2>
        <p className="step-body">{fs.body}</p>
        <div className="formulas-list">
          {fs.formulas.map((item) => (
            <div key={item.label} className="formula-card">
              <p className="formula-card-label">{item.label}</p>
              <p className="formula-card-expression">{item.expression}</p>
              <p className="formula-card-note">{item.note}</p>
            </div>
          ))}
        </div>
        {fs.highlight && <p className="formula-highlight">{fs.highlight}</p>}
        <button type="button" className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    )
  }

  if (step.type === 'range_formula') {
    const rf = step as RangeFormulaStep
    const angleRange = rf.angleRange ?? [15, 75]
    const simConfig = rf.simConfig ?? {
      defaultAngle: 45,
      defaultVelocity: 15,
      angleRange,
      velocityRange: [15, 15] as [number, number],
      scaleAngle: 75,
      scaleVelocity: 15,
      showLandingMarker: true,
      livePreview: true,
    }
    return (
      <div className="step step-formula step-with-sim">
        <div className="step-main">
          <h2 className="step-prompt">{rf.prompt}</h2>
          <p className="step-body">{rf.body}</p>
          <p className="formula-display">{rf.formula}</p>
          <p className="formula-note">
            Range is proportional to sin(2θ). Slide θ — the sim and graph update together.
          </p>
          <p className="formula-highlight">
            sin(2θ) reaches its maximum at θ = 45°, so range is greatest at 45°.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            Continue
          </button>
        </div>
        <div className="step-sim-aside">
          <RangeFormulaPanel
            angle={angle}
            velocity={velocity}
            onAngleChange={onAngleChange}
            onVelocityChange={onVelocityChange}
            angleRange={angleRange}
            simConfig={simConfig}
            stepId={rf.id}
          />
        </div>
      </div>
    )
  }

  if (step.type === 'worked_example') {
    const we = step as WorkedExampleStep
    return (
      <div className="step step-worked">
        <span className="worked-badge">Worked example</span>
        <h2 className="step-prompt">{we.prompt}</h2>
        <p className="worked-problem">{we.problem}</p>
        <ol className="worked-steps">
          {we.steps.map((s, i) => (
            <li key={i} className="worked-step">
              <span className="worked-step-label">{s.label}</span>
              {s.expression && <span className="worked-step-expr">{s.expression}</span>}
              {s.detail && <span className="worked-step-detail">{s.detail}</span>}
            </li>
          ))}
        </ol>
        <p className="worked-answer">{we.answer}</p>
        {we.selfExplainPrompt && (
          <div className="worked-self-explain">
            <label htmlFor={`se-${we.id}`}>{we.selfExplainPrompt}</label>
            <textarea
              id={`se-${we.id}`}
              className="input"
              rows={2}
              placeholder="Optional — put the method in your own words"
            />
          </div>
        )}
        <button type="button" className="btn btn-primary" onClick={handleContinue}>
          Continue
        </button>
      </div>
    )
  }

  if (step.type === 'numeric_problem') {
    const np = step as NumericProblemStep
    return (
      <div className="step step-numeric">
        {burst}
        <h2 className="step-prompt">{np.prompt}</h2>
        {np.body && <p className="step-body">{np.body}</p>}
        {np.givens && np.givens.length > 0 && (
          <ul className="given-list">
            {np.givens.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        )}
        {np.scaffold && np.scaffold.length > 0 && (
          <div className="scaffold">
            <p className="scaffold-label">Steps so far</p>
            <ol className="scaffold-steps">
              {np.scaffold.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </div>
        )}
        <div className="numeric-input-row">
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            disabled={status === 'correct'}
            placeholder="Your answer"
          />
          {np.unit && <span className="unit">{np.unit}</span>}
        </div>
        <FeedbackPanel
          feedback={np.feedback}
          status={status}
          wrongCount={wrongCount}
          hintThreshold={HINT_THRESHOLD}
        />
        {isAdmin && <AdminAnswer step={step} />}
        {status === 'correct' ? (
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            Continue
          </button>
        ) : (
          <CheckButton
            canCheck={numericValue !== ''}
            onCheck={() =>
              checkAnswer(validateNumericProblem(np, parseFloat(numericValue)))
            }
          />
        )}
      </div>
    )
  }

  if (step.type === 'goal_free_problem') {
    const gf = step as GoalFreeProblemStep
    // AI on → open entry (learner names quantities; AI maps, engine grades).
    // AI off → fixed labeled list below (deterministic, no AI).
    if (aiEnabled) {
      return (
        <GoalFreeOpenEntry
          step={gf}
          wrongCount={wrongCount}
          adminSlot={isAdmin ? <AdminAnswer step={step} /> : null}
          onWrongAttempt={onWrongAttempt}
          onComplete={handleContinue}
        />
      )
    }
    const required = gf.requiredCount ?? Math.min(3, gf.quantities.length)
    const anyEntry = Object.values(gfEntries).some((v) => v !== '' && v != null)
    const withSim = Boolean(gf.simConfig)
    const correctSet = new Set(gfResult?.correctKeys ?? [])
    return (
      <div className={`step step-goalfree${withSim ? ' step-with-sim' : ''}`}>
        {burst}
        <div className="step-main">
          <span className="goalfree-badge">Find everything you can</span>
          <h2 className="step-prompt">{gf.prompt}</h2>
          {gf.body && <p className="step-body">{gf.body}</p>}
          <p className="goalfree-target">
            Fill in at least {required} of the {gf.quantities.length} quantities below — in any order.
          </p>
          <div className="goalfree-grid">
            {gf.quantities.map((q) => {
              const showMark = gfResult != null && (gfEntries[q.key] ?? '') !== ''
              const isCorrect = correctSet.has(q.key)
              return (
                <div
                  key={q.key}
                  className={`goalfree-row${showMark ? (isCorrect ? ' gf-correct' : ' gf-wrong') : ''}`}
                >
                  <label className="goalfree-label" htmlFor={`gf-${gf.id}-${q.key}`}>
                    {q.label}
                  </label>
                  <input
                    id={`gf-${gf.id}-${q.key}`}
                    type="number"
                    inputMode="decimal"
                    className="input"
                    value={gfEntries[q.key] ?? ''}
                    onChange={(e) =>
                      setGfEntries((prev) => ({ ...prev, [q.key]: e.target.value }))
                    }
                    placeholder="—"
                  />
                  <span className="unit">{q.unit}</span>
                  {showMark && <span className="gf-mark">{isCorrect ? '✓' : '✗'}</span>}
                </div>
              )
            })}
          </div>
          {gfResult && (
            <p className="goalfree-score">
              You found {gfResult.correctCount} of {required} needed
              {gfResult.passed
                ? ' — nice work! Continue, or keep going for the rest.'
                : '. Fix the ✗ rows or fill in more.'}
            </p>
          )}
          <FeedbackPanel
            feedback={gf.feedback}
            status={status}
            wrongCount={wrongCount}
            hintThreshold={GOAL_FREE_HINT_THRESHOLD}
          />
          {isAdmin && <AdminAnswer step={step} />}
          {(() => {
            const runCheck = async () => {
              primeAudio()
              const parsed: Record<string, number> = {}
              for (const [k, v] of Object.entries(gfEntries)) {
                if (v !== '') parsed[k] = parseFloat(v)
              }
              const result = validateGoalFree(gf, parsed)
              setGfResult(result)
              if (result.passed) {
                if (status !== 'correct') {
                  playCorrect()
                  setBurstKey((k) => k + 1)
                }
                setStatus('correct')
              } else {
                await onWrongAttempt()
                setStatus('incorrect')
                playWrong()
              }
            }
            const passed = status === 'correct'
            return (
              <div className="gf-actions">
                <button
                  type="button"
                  className={passed ? 'btn btn-secondary' : 'btn btn-primary'}
                  disabled={!anyEntry}
                  onClick={runCheck}
                >
                  {passed ? 'Check again' : 'Check'}
                </button>
                {passed && (
                  <button type="button" className="btn btn-primary" onClick={handleContinue}>
                    Continue
                  </button>
                )}
              </div>
            )
          })()}
        </div>
        {withSim && gf.simConfig && (
          <div className="step-sim-aside">{renderSim(gf.simConfig, undefined, gf.id)}</div>
        )}
      </div>
    )
  }

  if (step.type === 'capstone') {
    const cap = step as CapstoneStep

    if (cap.subtype === 'sim_match') {
      const cfg = cap.simConfig
      const targetAngle = cfg?.targetAngle ?? 45
      const targetVelocity = cfg?.targetVelocity ?? 20
      const matched = simMatchTolerance(angle, velocity, targetAngle, targetVelocity)

      return (
        <div className="step step-capstone">
          {burst}
          <span className="capstone-badge">Capstone</span>
          <h2 className="step-prompt">{cap.prompt}</h2>
          {cfg && renderSim(cfg, undefined, cap.id)}
          <FeedbackPanel
            feedback={cap.feedback}
            status={status}
            wrongCount={wrongCount}
            hintThreshold={HINT_THRESHOLD}
          />
          {isAdmin && <AdminAnswer step={step} />}
          {status === 'correct' ? (
            <button type="button" className="btn btn-primary" onClick={handleContinue}>
              Continue
            </button>
          ) : (
            <CheckButton
              canCheck
              onCheck={async () => {
                primeAudio()
                if (matched) {
                  setStatus('correct')
                  playCorrect()
                  setBurstKey((k) => k + 1)
                } else {
                  await onWrongAttempt()
                  setStatus('incorrect')
                  playWrong()
                }
              }}
            />
          )}
        </div>
      )
    }

    if (cap.subtype === 'multiple_choice' && cap.options) {
      const withSim = Boolean(cap.simConfig)
      return (
        <div className={`step step-capstone${withSim ? ' step-with-sim' : ''}`}>
          {burst}
          <div className="step-main">
            <span className="capstone-badge">Capstone</span>
            <h2 className="step-prompt">{cap.prompt}</h2>
            {withSim && (
              <p className="step-hint">Use the sim while you decide — launch and compare!</p>
            )}
            <div className="options" role="radiogroup">
              {cap.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`option ${selectedOption === opt.id ? 'option-selected' : ''} ${status === 'correct' && opt.id === cap.correctOptionId ? 'option-correct' : ''}`}
                  onClick={() => setSelectedOption(opt.id)}
                  disabled={status === 'correct'}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <FeedbackPanel
              feedback={cap.feedback}
              status={status}
              wrongCount={wrongCount}
              hintThreshold={HINT_THRESHOLD}
            />
            {isAdmin && <AdminAnswer step={step} />}
            {status === 'correct' ? (
              <button type="button" className="btn btn-primary" onClick={handleContinue}>
                Continue
              </button>
            ) : (
              <CheckButton
                canCheck={!!selectedOption}
                onCheck={() =>
                  checkAnswer(validateCapstone(cap, { optionId: selectedOption! }))
                }
              />
            )}
          </div>
          {withSim && cap.simConfig && (
            <div className="step-sim-aside">
              {renderSim(cap.simConfig, cap.simControls, cap.id)}
            </div>
          )}
        </div>
      )
    }

    if (cap.subtype === 'numeric_input') {
      return (
        <div className="step step-capstone">
          {burst}
          <span className="capstone-badge">Capstone</span>
          <h2 className="step-prompt">{cap.prompt}</h2>
          <div className="numeric-input-row">
            <input
              type="number"
              inputMode="decimal"
              className="input"
              value={numericValue}
              onChange={(e) => setNumericValue(e.target.value)}
              disabled={status === 'correct'}
              placeholder="Your answer"
            />
            {cap.unit && <span className="unit">{cap.unit}</span>}
          </div>
          <FeedbackPanel
            feedback={cap.feedback}
            status={status}
            wrongCount={wrongCount}
            hintThreshold={HINT_THRESHOLD}
          />
          {isAdmin && <AdminAnswer step={step} />}
          {status === 'correct' ? (
            <button type="button" className="btn btn-primary" onClick={handleContinue}>
              Continue
            </button>
          ) : (
            <CheckButton
              canCheck={numericValue !== ''}
              onCheck={() =>
                checkAnswer(
                  validateCapstone(cap, { numericValue: parseFloat(numericValue) }),
                )
              }
            />
          )}
        </div>
      )
    }
  }

  return null
}
