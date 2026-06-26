import type {
  CapstoneStep,
  GoalFreeProblemStep,
  MultipleChoiceStep,
  NumericProblemStep,
} from '../content/types'
import { DEFAULT_NUMERIC_TOLERANCE } from './constants'
import { deriveQuantities, simMatchTolerance } from './physics'

export function validateMultipleChoice(
  step: MultipleChoiceStep,
  selectedId: string,
): boolean {
  return selectedId === step.correctOptionId
}

export function numericAnswerCorrect(
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

// F2: "full" / "completion" numeric teaching problems.
export function validateNumericProblem(
  step: NumericProblemStep,
  value: number,
): boolean {
  return numericAnswerCorrect(step.correctValue, value, step.tolerance)
}

// F3: grade goal-free entries against the engine. Only non-empty entries are
// scored; the learner passes when at least `requiredCount` are correct.
export type GoalFreeResult = {
  correctKeys: string[]
  attemptedKeys: string[]
  correctCount: number
  required: number
  passed: boolean
}

export function validateGoalFree(
  step: GoalFreeProblemStep,
  entries: Record<string, number | undefined>,
): GoalFreeResult {
  const truth = deriveQuantities(step.angle, step.velocity, step.gravity)
  const required = step.requiredCount ?? Math.min(3, step.quantities.length)

  const correctKeys: string[] = []
  const attemptedKeys: string[] = []

  for (const q of step.quantities) {
    const entry = entries[q.key]
    if (entry == null || Number.isNaN(entry)) continue
    attemptedKeys.push(q.key)
    if (numericAnswerCorrect(truth[q.key], entry, q.tolerance)) {
      correctKeys.push(q.key)
    }
  }

  return {
    correctKeys,
    attemptedKeys,
    correctCount: correctKeys.length,
    required,
    passed: correctKeys.length >= required,
  }
}
