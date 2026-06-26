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
  body: string
  tryItems?: string[]
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

// --- F2: Worked Examples (lessons only, hand-authored, no AI) ---
// A fully modeled, step-by-step solution. Display-only; the learner studies
// the method, then advances. Reduces cognitive load on first contact with a
// multi-step calculation (Sweller, 1988).
export type WorkedExampleStep = StepBase & {
  type: 'worked_example'
  skillId?: string
  problem: string
  steps: { label: string; expression?: string; detail?: string }[]
  answer: string
  // Optional, formative-only self-explanation prompt. Never blocks advancing.
  selfExplainPrompt?: string
}

// A standard "find X" numeric problem used as a teaching step. With `scaffold`
// (pre-filled solution steps shown above the input) it is the "completion"
// rung of the faded progression; without it, the "full" rung.
export type NumericProblemStep = StepBase & {
  type: 'numeric_problem'
  skillId?: string
  body?: string
  givens?: string[]
  scaffold?: string[]
  correctValue: number
  tolerance?: number
  unit?: string
  simConfig?: SimConfig
  simControls?: ('angle' | 'velocity')[]
}

// --- F3: Goal-Free Problems (lessons only, hand-authored, no AI) ---
// "From this launch, find as many quantities as you can." The engine computes
// and grades the full derivable set; passing needs >= requiredCount correct.
// Eliminates means-ends search → lower load while first learning (Sweller, 1988).
export type GoalFreeQuantityKey =
  | 'vx'
  | 'vy'
  | 'range'
  | 'maxHeight'
  | 'flightTime'
  | 'timeToPeak'

export type GoalFreeProblemStep = StepBase & {
  type: 'goal_free_problem'
  skillId?: string
  body?: string
  angle: number
  velocity: number
  gravity?: number
  requiredCount?: number
  // Quantities that are stated in the prompt (e.g. a given max height). They are
  // not creditable toward `requiredCount` and are flagged as "given" if entered.
  givenKeys?: GoalFreeQuantityKey[]
  quantities: { key: GoalFreeQuantityKey; label: string; unit: string; tolerance?: number }[]
  simConfig?: SimConfig
}

export type Step =
  | IntroStep
  | SimExploreStep
  | MultipleChoiceStep
  | RangeFormulaStep
  | FormulasStep
  | WorkedExampleStep
  | NumericProblemStep
  | GoalFreeProblemStep

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
  // Phase 2: learner-controlled toggle for live AI features (e.g. F3 open entry).
  // Defaults to false so AI surfaces stay hidden until explicitly enabled.
  aiEnabled: boolean
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
