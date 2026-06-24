export type FeedbackCopy = {
  correct: string
  incorrect: string
  hint: string
  explanation: string
}

export type SimConfig = {
  defaultAngle: number
  defaultVelocity: number
  angleRange?: [number, number]
  velocityRange?: [number, number]
  showGhostArc?: boolean
  targetAngle?: number
  targetVelocity?: number
  ghostAngle?: number
  ghostVelocity?: number
  scaleAngle?: number
  scaleVelocity?: number
  showMaxHeight?: boolean
  showLandingMarker?: boolean
  rememberPreviousLaunch?: boolean
  livePreview?: boolean
  showGravityControl?: boolean
  gravityRange?: [number, number]
  defaultGravity?: number
}

export type StepBase = {
  id: string
  prompt: string
  feedback: FeedbackCopy
}

export type IntroStep = StepBase & {
  type: 'intro'
  body: string
  simDefaults?: SimConfig
}

export type SimExploreStep = StepBase & {
  type: 'sim_explore'
  simConfig: SimConfig
  controls: ('angle' | 'velocity' | 'gravity')[]
}

export type MultipleChoiceStep = StepBase & {
  type: 'multiple_choice'
  options: { id: string; label: string }[]
  correctOptionId: string
  simConfig?: SimConfig
  simControls?: ('angle' | 'velocity')[]
}

export type RangeFormulaStep = StepBase & {
  type: 'range_formula'
  body: string
  formula: string
  angleRange?: [number, number]
  simConfig?: SimConfig
}

export type FormulasStep = StepBase & {
  type: 'formulas'
  body: string
  formulas: { label: string; expression: string; note: string }[]
  highlight?: string
}

export type NumericInputStep = StepBase & {
  type: 'numeric_input'
  correctValue: number
  tolerance?: number
  unit?: string
}

export type CapstoneStep = StepBase & {
  type: 'capstone'
  subtype: 'multiple_choice' | 'numeric_input' | 'sim_match'
  options?: { id: string; label: string }[]
  correctOptionId?: string
  correctValue?: number
  tolerance?: number
  unit?: string
  simConfig?: SimConfig
  simControls?: ('angle' | 'velocity')[]
}

export type Step =
  | IntroStep
  | SimExploreStep
  | MultipleChoiceStep
  | NumericInputStep
  | RangeFormulaStep
  | FormulasStep

export type Lesson = {
  id: string
  title: string
  order: number
  description: string
  steps: Step[]
  capstone: CapstoneStep[]
}

export type Course = {
  id: string
  title: string
  lessons: Lesson[]
}

export type LessonStatus = 'locked' | 'not_started' | 'in_progress' | 'completed'

export type UserProfile = {
  displayName: string
  email: string
  createdAt: Date
  updatedAt: Date
  totalXP: number
  streak: number
  lastActiveDate: string
  badges: string[]
  continueLessonId: string | null
  continuePhase: 'steps' | 'capstone' | null
  continueStepIndex: number | null
}

export type LessonProgress = {
  lessonId: string
  status: 'not_started' | 'in_progress' | 'completed'
  phase: 'steps' | 'capstone'
  currentStepIndex: number
  completedStepIds: string[]
  capstoneCompleted: boolean
  wrongAttempts: Record<string, number>
  simState?: { angle: number; velocity: number }
  startedAt: Date
  updatedAt: Date
  completedAt: Date | null
}
