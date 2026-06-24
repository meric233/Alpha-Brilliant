import { Link } from 'react-router-dom'
import { course } from '../content/course'
import type { LessonProgress, LessonStatus } from '../content/types'
import { lessonStatus } from '../lib/courseUtils'

type Props = {
  progressList: LessonProgress[]
}

const statusLabel: Record<LessonStatus, string> = {
  locked: 'Locked',
  not_started: 'Start',
  in_progress: 'Continue',
  completed: 'Review',
}

const statusIcon: Record<LessonStatus, string> = {
  locked: '🔒',
  not_started: '○',
  in_progress: '◐',
  completed: '✓',
}

export function CoursePath({ progressList }: Props) {
  return (
    <ol className="course-path">
      {course.lessons.map((lesson) => {
        const progress = progressList.find((p) => p.lessonId === lesson.id)
        const status = lessonStatus(lesson, progress, progressList)
        const locked = status === 'locked'

        return (
          <li key={lesson.id} className={`path-item path-${status}`}>
            <div className="path-node">
              <span className="path-icon" aria-hidden>{statusIcon[status]}</span>
              <div className="path-content">
                <h3>{lesson.title}</h3>
                <p>{lesson.description}</p>
                <div className="path-actions">
                  {locked ? (
                    <span className="path-cta path-cta-disabled">{statusLabel[status]}</span>
                  ) : (
                    <Link to={`/lesson/${lesson.id}`} className="path-cta">
                      {statusLabel[status]}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
