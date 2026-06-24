import { useEffect, useState } from 'react'
import type {
  CapstoneStep,
  FormulasStep,
  MultipleChoiceStep,
  NumericInputStep,
  RangeFormulaStep,
  SimExploreStep,
  Step,
} from '../content/types'
import { RangeFormulaPanel } from './RangeFormulaPanel'
import { ProjectileSim } from './ProjectileSim'
import { FeedbackPanel } from './FeedbackPanel'
import { HINT_THRESHOLD } from '../lib/constants'
import {
  validateCapstone,
  validateMultipleChoice,
  validateNumeric,
} from '../lib/validation'
import { simMatchTolerance } from '../lib/physics'
import { playCorrect, playWrong, primeAudio } from '../lib/sounds'
import { CorrectBurst } from './Celebrations'

type Props = {
  step: Step | CapstoneStep
  angle: number
  velocity: number
  wrongCount: number
  onAngleChange: (v: number) => void
  onVelocityChange: (v: number) => void
  onWrongAttempt: () => Promise<number>
  onComplete: () => void
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
  onAngleChange,
  onVelocityChange,
  onWrongAttempt,
  onComplete,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'correct' | 'incorrect'>('idle')
  const [showExplanation, setShowExplanation] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [numericValue, setNumericValue] = useState('')
  const [burstKey, setBurstKey] = useState(0)

  const resetCheck = () => {
    setStatus('idle')
    setShowExplanation(false)
    setSelectedOption(null)
    setNumericValue('')
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
            showExplanation={showExplanation}
            onShowExplanation={() => setShowExplanation(true)}
          />
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

  if (step.type === 'numeric_input') {
    const num = step as NumericInputStep
    return (
      <div className="step step-numeric">
        {burst}
        <h2 className="step-prompt">{num.prompt}</h2>
        <div className="numeric-input-row">
          <input
            type="number"
            inputMode="decimal"
            className="input"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            disabled={status === 'correct'}
            placeholder="Your answer"
            aria-label="Numeric answer"
          />
          {num.unit && <span className="unit">{num.unit}</span>}
        </div>
        <FeedbackPanel
          feedback={num.feedback}
          status={status}
          wrongCount={wrongCount}
          hintThreshold={HINT_THRESHOLD}
          showExplanation={showExplanation}
          onShowExplanation={() => setShowExplanation(true)}
        />
        {status === 'correct' ? (
          <button type="button" className="btn btn-primary" onClick={handleContinue}>
            Continue
          </button>
        ) : (
          <CheckButton
            canCheck={numericValue !== ''}
            onCheck={() => checkAnswer(validateNumeric(num, parseFloat(numericValue)))}
          />
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
            showExplanation={showExplanation}
            onShowExplanation={() => setShowExplanation(true)}
          />
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
              showExplanation={showExplanation}
              onShowExplanation={() => setShowExplanation(true)}
            />
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
            showExplanation={showExplanation}
            onShowExplanation={() => setShowExplanation(true)}
          />
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
