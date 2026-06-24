import type { CapstoneStep, MultipleChoiceStep } from '../content/types'
import { DEFAULT_NUMERIC_TOLERANCE } from './constants'
import { simMatchTolerance } from './physics'

export function validateMultipleChoice(
  step: MultipleChoiceStep,
  selectedId: string,
): boolean {
  return selectedId === step.correctOptionId
}

function numericAnswerCorrect(
  correctValue: number,
  value: number,
  tolerance = DEFAULT_NUMERIC_TOLERANCE,
): boolean {
  const diff = Math.abs(value - correctValue)
  const allowed = Math.max(Math.abs(correctValue) * tolerance, 0.5)
  return diff <= allowed
}

export function validateCapstone(
  step: CapstoneStep,
  answer: { optionId?: string; numericValue?: number; angle?: number; velocity?: number },
): boolean {
  if (step.subtype === 'multiple_choice') {
    return answer.optionId === step.correctOptionId
  }
  if (step.subtype === 'numeric_input' && step.correctValue != null) {
    return numericAnswerCorrect(
      step.correctValue,
      answer.numericValue ?? NaN,
      step.tolerance,
    )
  }
  if (step.subtype === 'sim_match' && step.simConfig) {
    const { targetAngle, targetVelocity } = step.simConfig
    if (targetAngle == null || targetVelocity == null) return false
    return simMatchTolerance(
      answer.angle ?? 0,
      answer.velocity ?? 0,
      targetAngle,
      targetVelocity,
    )
  }
  return false
}
