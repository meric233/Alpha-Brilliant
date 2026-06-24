import type { CapstoneStep, MultipleChoiceStep, NumericInputStep } from '../content/types'
import { DEFAULT_NUMERIC_TOLERANCE } from './constants'
import { simMatchTolerance } from './physics'

export function validateMultipleChoice(
  step: MultipleChoiceStep,
  selectedId: string,
): boolean {
  return selectedId === step.correctOptionId
}

export function validateNumeric(
  step: NumericInputStep,
  value: number,
): boolean {
  const tolerance = step.tolerance ?? DEFAULT_NUMERIC_TOLERANCE
  const diff = Math.abs(value - step.correctValue)
  const allowed = Math.max(Math.abs(step.correctValue) * tolerance, 0.5)
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
    const tolerance = step.tolerance ?? DEFAULT_NUMERIC_TOLERANCE
    const value = answer.numericValue ?? NaN
    const diff = Math.abs(value - step.correctValue)
    const allowed = Math.max(Math.abs(step.correctValue) * tolerance, 0.5)
    return diff <= allowed
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

export function isCheckableStep(type: string): boolean {
  return type === 'multiple_choice' || type === 'numeric_input' || type === 'capstone'
}
