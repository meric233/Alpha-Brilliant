import type { Lesson, LessonProgress, LessonStatus } from '../content/types'
import { course } from '../content/course'

export function isLessonUnlocked(
  lesson: Lesson,
  allProgress: LessonProgress[],
): boolean {
  if (lesson.order === 1) return true
  const prev = course.lessons.find((l) => l.order === lesson.order - 1)
  if (!prev) return true
  const prevProgress = allProgress.find((p) => p.lessonId === prev.id)
  return prevProgress?.status === 'completed'
}

export function lessonStatus(
  lesson: Lesson,
  progress: LessonProgress | undefined,
  allProgress: LessonProgress[],
): LessonStatus {
  if (!isLessonUnlocked(lesson, allProgress)) return 'locked'
  if (!progress || progress.status === 'not_started') return 'not_started'
  if (progress.status === 'completed') return 'completed'
  return 'in_progress'
}

export function findContinueTarget(
  profile: {
    continueLessonId: string | null
    continuePhase: 'steps' | 'capstone' | null
    continueStepIndex: number | null
  },
  allProgress: LessonProgress[],
): { lessonId: string; phase: 'steps' | 'capstone'; stepIndex: number } | null {
  if (
    profile.continueLessonId &&
    profile.continuePhase != null &&
    profile.continueStepIndex != null
  ) {
    return {
      lessonId: profile.continueLessonId,
      phase: profile.continuePhase,
      stepIndex: profile.continueStepIndex,
    }
  }
  const inProgress = course.lessons
    .map((l) => ({
      lesson: l,
      progress: allProgress.find((p) => p.lessonId === l.id),
    }))
    .find(({ lesson, progress }) => {
      if (!isLessonUnlocked(lesson, allProgress)) return false
      return progress?.status === 'in_progress'
    })
  if (inProgress?.progress) {
    return {
      lessonId: inProgress.lesson.id,
      phase: inProgress.progress.phase,
      stepIndex: inProgress.progress.currentStepIndex,
    }
  }
  const firstAvailable = course.lessons.find((l) =>
    isLessonUnlocked(l, allProgress) &&
    allProgress.find((p) => p.lessonId === l.id)?.status !== 'completed',
  )
  if (firstAvailable) {
    return { lessonId: firstAvailable.id, phase: 'steps', stepIndex: 0 }
  }
  return null
}
