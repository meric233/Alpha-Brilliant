# Paraboloα — Phase 1 PRD (Concise)

**Product:** Brilliant-style learn-by-doing app for AP Physics C projectile motion  
**Repo:** Alpha-Brilliant | **Stack:** React (Vite) + Firebase Auth + Firestore + Hosting  
**Rule:** No live AI at runtime. Content may be authored offline; answers are fixed in code.

---

## Goal

Ship 3 interactive lessons with cannon-and-arc simulation, instant feedback, auth, persisted progress, streaks/XP/badges, mobile-friendly UI, public deploy.

**MVP gate:** Tester completes all 3 lessons on phone, gets problems wrong and recovers via hints, leaves mid-lesson and resumes, streak/XP update.

---

## Persona

10th–11th grader, AP Physics C, knows calculus, finished gravity, weak on projectile intuition. Sessions 5–10 min/day. Phone or laptop. Easily distracted by games — needs habit hooks (streak, XP).

---

## User Stories

1. **Intuition** — Manipulate projectiles + light calculations to build fluency.
2. **Daily habit** — Log in daily for 5–10 min; streak/XP motivate return.
3. **Resume** — Pick up mid-lesson on any device where they left off.

---

## Success (after 3 lessons)

- Explain projectile paths are parabolas
- Predict how angle/speed affect height, range, shape (light numbers)
- State complementary angles (e.g. 30°/60°) give same range
- Solve capstone problems with intuition + basic calc (g = 10 m/s²)

---

## Scope

**In:** 3 lessons (3–5 teaching steps + separate capstone each); sim (angle/speed sliders, launch); step types `intro`, `sim_explore`, `multiple_choice`, `numeric_input`, `capstone`; hints after 2 wrong, unlimited retries; email + Google auth + required name; Firestore progress; home (path, continue, streak, XP, badges); mobile; deploy.

**Out:** Live AI, air resistance, leaderboards, payments, other subjects, offline, CMS.

---

## Course (sequential unlock)

| ID | Title | Teaching focus | Capstone |
|---|---|---|---|
| `projectile-shape` | Shape of Projectiles | Angle & velocity intuition | Parabola ID, angle/speed effects |
| `complementary-angles` | Same Range, Two Angles | 30°/60° pairs, pattern | Pick complementary angle |
| `projectile-calculations` | Projectile Calculations | Range, height, time (light) | Numeric problems, g=10 |

**Timing:** 3–5 steps × 1–2 min + capstone 2–3 min ≈ **5–10 min/lesson**.

**Lesson rhythm:** Hook → Explore (sliders) → Predict → Reason → **Capstone** (1–2 problems, must pass to complete).

**Feedback:** Client-side, <100ms. Hint at 2nd wrong. Explanation after hint. Brilliant-like tone.

---

## Screens

1. Login / Sign up (email, Google, name)
2. Home (course path, Continue, streak, XP, badges)
3. Lesson player (step + sim + feedback)
4. Lesson complete (XP, badge, next lesson)

---

## Gamification

- **XP:** +10/step, +25 lesson bonus
- **Streak:** +1 on first completed step each calendar day; reset if day missed
- **Badges:** `lesson-1-complete`, `lesson-2-complete`, `lesson-3-complete`

---

## Data Schema

**Content → repo** (`src/content/course.ts`). **User state → Firestore.**

```
users/{uid}
  displayName, email, totalXP, streak, lastActiveDate, badges[]
  continueLessonId, continuePhase, continueStepIndex
  └── lessonProgress/{lessonId}
        status, phase, currentStepIndex, completedStepIds[]
        capstoneCompleted, wrongAttempts{stepId: count}
        simState? {angle, velocity}
```

**Step types in content:** discriminated union on `type` with `prompt`, `feedback{correct,incorrect,hint,explanation}`, plus type-specific fields (options, correctValue, simConfig, etc.).

**Validation:** Client-side against content. No server round-trip for answers.

**Security:** Users read/write only their own `users/{uid}` and subcollection docs.

---

## Sim

Ideal projectile, g = 10 m/s², no air resistance. Canvas or SVG. Angle + velocity sliders, launch animation, 60 FPS while dragging.

---

## NFRs

Feedback <100ms | Sim 60 FPS | Load <2s | Touch ≥44px | Works at 375px width

---



---

