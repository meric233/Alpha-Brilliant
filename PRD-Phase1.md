# Product Requirements Document — Paraboloα (Phase 1)

**Version:** 1.0  
**Date:** June 22, 2026  
**Status:** Draft for build  
**Codename / repo:** Alpha-Brilliant  

---

## 1. Overview

**Paraboloα** is a learn-by-doing app for AP Physics C students who know calculus but lack physical intuition. It teaches projectile motion through hands-on simulation — not videos, not walls of text. Learners manipulate a cannon-and-arc simulation, get instant feedback, and finish each lesson with capstone problems that check real understanding.

**One-liner:** Brilliant-style projectile physics for 10th graders who’d rather launch things than watch lectures.

**Phase 1 goal:** Ship 3 complete lessons (3–5 teaching steps + capstone each), auth, progress persistence, streaks/XP/badges, mobile-friendly, deployed on Firebase — with **no live AI in the app**. Lesson content may be authored with AI assistance offline; runtime behavior is 100% hand-defined.

---

## 2. Target User (Persona)

| | |
|---|---|
| **Who** | 10th–11th grader starting AP Physics C |
| **Math** | Comfortable with calculus |
| **Physics** | Finished gravity unit; weak on 2D motion and projectile intuition |
| **Motivation** | Wants to *feel* physics work; easily distracted by video games |
| **Session** | 5–10 minutes, ideally daily |
| **Device** | Phone or laptop |

**Design for:** A smart kid who can do math but doesn’t yet *see* why a projectile makes a parabola or why two angles give the same range.

---

## 3. User Stories

### US-1 — Build intuition through manipulation
**As a** 10th grader struggling with projectile intuition,  
**I want to** manipulate projectiles myself and work through brief calculations,  
**So that** I build intuition and fluency in projectile motion (and eventually other physics topics).

**Acceptance:** Learner can change angle/velocity in a sim, observe trajectory changes, and answer light-number questions tied to what they see.

---

### US-2 — Daily habit over video games
**As a** 10th grader who loves video games and is learning AP Physics C,  
**I want to** log in daily and spend 5–10 minutes learning intuitively,  
**So that** I gradually improve at physics instead of losing all my time to games.

**Acceptance:** Home screen shows streak, XP, and a clear “continue” action; finishing a lesson feels rewarding (badge + XP).

---

### US-3 — Resume where I left off
**As a** returning learner,  
**I want to** pick up exactly where I stopped mid-lesson,  
**So that** I don’t lose progress when I close the app or switch devices.

**Acceptance:** Leaving on step 3 of Lesson 2 and returning opens step 3 with prior answers/sim state restored.

---

## 4. Success Criteria (Phase 1)

After completing all 3 lessons, a learner can:

1. **Explain** that projectile paths are parabolas (qualitatively).
2. **Predict** how changing launch angle or speed affects height, range, and shape (light numbers, no full formula sheet required).
3. **State** that complementary launch angles (e.g. 30° and 60°) give the same horizontal range (same speed, level ground).
4. **Solve** simple capstone problems at the end of each lesson using intuition + basic calculations (e.g. compare heights, estimate range, pick the correct angle for a target).

**MVP gate:** A tester completes all 3 lessons end-to-end on a phone, gets problems wrong, recovers via hints, leaves mid-lesson and resumes, and sees streak/XP update.

---

## 5. Scope

### In scope (Phase 1)

- 3 lessons, each with **3–5 teaching steps** (~1–2 min per step) **plus** a separate capstone (1–2 problems)
- Cannon + arc simulation (sliders for angle & speed; tap to launch)
- Step types: intro, simulation explore, multiple choice / prediction, light-number input; capstone is its own section at the end
- Instant feedback; hints after 2 wrong attempts; unlimited retries
- Firebase Auth: email/password + Google; required display name
- Firestore progress persistence (step index, completion, wrong-attempt counts)
- Home: course path, continue lesson, streak, XP, lesson-complete badges
- Mobile-responsive UI; touch-friendly controls
- Public deployment (Firebase Hosting + Firebase backend)

### Out of scope (Phase 1)

- Live AI (chatbot, runtime hints, generated problems)
- Air resistance, moving platforms, multi-body physics
- Leaderboards, social, payments, teacher dashboard
- Additional subjects beyond projectile motion
- Offline mode
- Content admin CMS (lessons live in repo as structured JSON/TS)

### Content authoring note

Lesson copy and problems may be drafted with AI tools during development. All answers, hints, and validation rules are **fixed in the content model** before deploy — nothing is generated at runtime.

---

## 6. Course Structure

| # | Lesson | Teaching steps (3–5, ~1–2 min each) | Capstone (separate) |
|---|---|---|---|
| 1 | **Shape of Projectiles** — intuition via angle & velocity | e.g. hook → explore → predict → observe | 1–2 problems: identify parabola, predict effect of angle/speed |
| 2 | **Same Range, Two Angles** — complementary angles property | e.g. explore pairs (30°/60°) → discover pattern → light numbers | 1–2 problems: pick complementary angle, same-range reasoning |
| 3 | **Projectile Calculations** — range, max height, time of flight (light) | e.g. connect sim to formulas → guided steps → apply | 1–2 problems: numeric range/height/time with g = 10 m/s² |

**Unlock rule:** Lesson 2 unlocks after Lesson 1 complete; Lesson 3 after Lesson 2.

**Session model:** One lesson = one session. Teaching steps ≈ 3–8 min (3–5 steps × 1–2 min) + capstone ≈ 2–3 min → **~5–10 min total per lesson**. Full course spread across multiple days.

---

## 7. Lesson Flow (Standard Template)

Each lesson has two parts:

### Part A — Teaching steps (3–5 steps, ~1–2 min each)

Not counting the capstone. Pick 3–5 from this rhythm (Brilliant-style):

1. **Hook** — short text + one launch (“What shape is this?”)
2. **Explore** — free manipulation (sliders); minimal text
3. **Predict** — multiple choice or tap based on what they saw
4. **Reason** — short explanation + one more interactive check

Lessons may use 3, 4, or 5 of these depending on the concept. Each step should take roughly **1–2 minutes**.

### Part B — Capstone (separate, not counted in the 3–5)

After the teaching steps, the learner hits a **capstone section** with 1–2 problems mixing sim and light numbers. Must complete capstone to finish the lesson.

**Feedback rules (all steps):**

- Feedback appears in **< 100ms** (client-side validation)
- **Unlimited retries**
- **Hint** after 2nd wrong attempt on a step
- **Full explanation** available after hint (learner taps “Show explanation” or auto after 3rd wrong — product choice at build; default: show after hint request)
- Tone: Brilliant-like — direct, curious, not condescending; short text OK

---

## 8. Functional Requirements

### 8.1 Authentication & profile

| ID | Requirement |
|---|---|
| AUTH-1 | Sign up / sign in with email + password |
| AUTH-2 | Sign in with Google |
| AUTH-3 | Display name required at first sign-up |
| AUTH-4 | Persist user profile: `displayName`, `createdAt`, `lastActiveDate`, `streak`, `totalXP` |

### 8.2 Home screen (returning user)

| ID | Requirement |
|---|---|
| HOME-1 | Show **course path** with 3 lessons and status (locked / in progress / complete) |
| HOME-2 | Show **Continue** CTA → most recent in-progress lesson + step |
| HOME-3 | Show **streak** (consecutive days with ≥1 completed step) |
| HOME-4 | Show **total XP** |
| HOME-5 | Show **lesson-complete badges** for finished lessons |

**First-time user:** Course path visible; Lesson 1 unlocked; streak = 0; XP = 0.

### 8.3 Lesson player

| ID | Requirement |
|---|---|
| LESSON-1 | Render lesson from structured content model (not hardcoded JSX per step) |
| LESSON-2 | Support step types: `intro`, `sim_explore`, `multiple_choice`, `numeric_input`, `capstone` |
| LESSON-3 | Projectile sim: angle slider, speed slider, launch button, animated arc + trail |
| LESSON-4 | Sim uses ideal projectile motion; g = 10 m/s²; no air resistance |
| LESSON-5 | Auto-save progress on step enter/complete and on exit |
| LESSON-6 | Capstone required to mark lesson complete |

### 8.4 Progress & gamification

| ID | Requirement |
|---|---|
| PROG-1 | Store per-lesson: `currentStepIndex`, `completedSteps[]`, `status`, `completedAt` |
| PROG-2 | Resume mid-lesson at saved step |
| PROG-3 | **XP:** +10 per step completed, +25 lesson completion bonus (adjustable constants) |
| PROG-4 | **Streak:** increment if user completes ≥1 step on a new calendar day (local date); reset if a day is missed |
| PROG-5 | **Badge:** award on each lesson complete (Lesson 1 / 2 / 3 badges) |

### 8.5 Feedback

| ID | Requirement |
|---|---|
| FB-1 | Every checkable step has `correct`, `incorrect`, `hint`, `explanation` copy in content |
| FB-2 | Track wrong attempt count per step; show hint at ≥2 wrong |
| FB-3 | No block on advancing after wrong answers (unlimited retries); capstone must be answered correctly to finish |

---

## 9. Data Schema

**Recommendation:** Split content from user state.

| Data | Where | Why |
|---|---|---|
| Course, lessons, steps, feedback copy | **Repo** (`src/content/*.ts`) | Version-controlled, loads fast, no Firestore reads for content |
| User profile, progress, XP, streak, badges | **Firestore** | Per-user, persists across sessions/devices |

Firebase Auth holds identity (`uid`, email). Firestore holds everything else about the learner.

---

### 9.1 Firestore layout

```
users/{uid}
  └── lessonProgress/{lessonId}
```

**Two collections.** No lesson content in Firestore for Phase 1.

---

### 9.2 `users/{uid}` — profile & gamification

Written on first sign-up; updated on step complete, lesson complete, and daily activity.

```typescript
type UserProfile = {
  displayName: string;           // required at sign-up
  email: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Gamification
  totalXP: number;               // default 0
  streak: number;                // consecutive active days, default 0
  lastActiveDate: string;        // "YYYY-MM-DD" local date of last completed step
  badges: string[];              // e.g. ["lesson-1-complete", "lesson-2-complete"]

  // Resume pointer (for Home "Continue" CTA)
  continueLessonId: string | null;   // e.g. "projectile-shape"
  continuePhase: "steps" | "capstone" | null;
  continueStepIndex: number | null;  // index within steps[] or capstone[]
};
```

| Field | Updated when |
|---|---|
| `totalXP` | Step completed (+10), lesson completed (+25) |
| `streak` / `lastActiveDate` | User completes ≥1 step on a new calendar day |
| `badges` | Lesson capstone finished; append `"lesson-{n}-complete"` |
| `continue*` | Every step enter/exit; cleared when course done |

---

### 9.3 `users/{uid}/lessonProgress/{lessonId}` — per-lesson state

One doc per lesson (`lessonId` matches content id, e.g. `"projectile-shape"`).

```typescript
type LessonProgress = {
  lessonId: string;
  status: "not_started" | "in_progress" | "completed";

  // Where they are
  phase: "steps" | "capstone";     // which part of the lesson
  currentStepIndex: number;        // 0-based index in steps[] or capstone[]

  // Completion tracking
  completedStepIds: string[];      // step ids finished (teaching + capstone)
  capstoneCompleted: boolean;      // true only when all capstone problems done

  // Attempts (for hints after 2 wrong)
  wrongAttempts: Record<string, number>;  // stepId → count

  // Optional: restore sim UI on resume
  simState?: {
    angle: number;                 // degrees
    velocity: number;              // m/s
  };

  startedAt: Timestamp;
  updatedAt: Timestamp;
  completedAt: Timestamp | null;
};
```

**Resume logic:** On open, read `continueLessonId` from user doc → fetch `lessonProgress/{lessonId}` → render `phase` + `currentStepIndex`.

**Lesson complete:** `status = "completed"`, `capstoneCompleted = true`, award badge + XP bonus, unlock next lesson.

---

### 9.4 Content model (repo — `src/content/`)

Static TypeScript (or JSON). Validated at build time; rendered by the lesson player.

```typescript
type Course = {
  id: string;                      // "ap-physics-c-projectiles"
  title: string;
  lessons: Lesson[];
};

type Lesson = {
  id: string;                      // "projectile-shape"
  title: string;
  order: number;                   // 1, 2, 3 — drives unlock order
  description: string;
  steps: Step[];                   // 3–5 teaching steps
  capstone: CapstoneStep[];        // 1–2 problems, separate
};

type StepBase = {
  id: string;
  prompt: string;
  feedback: FeedbackCopy;
};

type FeedbackCopy = {
  correct: string;
  incorrect: string;
  hint: string;
  explanation: string;
};

type SimConfig = {
  defaultAngle: number;            // degrees
  defaultVelocity: number;         // m/s
  angleRange?: [number, number];    // e.g. [15, 75]
  velocityRange?: [number, number]; // e.g. [5, 25]
  showGhostArc?: boolean;          // for match challenges
  targetAngle?: number;
  targetVelocity?: number;
};

// --- Step variants (discriminated union on `type`) ---

type IntroStep = StepBase & {
  type: "intro";
  body: string;
  simDefaults?: SimConfig;
};

type SimExploreStep = StepBase & {
  type: "sim_explore";
  simConfig: SimConfig;
  controls: ("angle" | "velocity")[];
};

type MultipleChoiceStep = StepBase & {
  type: "multiple_choice";
  options: { id: string; label: string }[];
  correctOptionId: string;
};

type NumericInputStep = StepBase & {
  type: "numeric_input";
  correctValue: number;
  tolerance?: number;              // default 0.05 (5%) for light numbers
  unit?: string;                   // e.g. "m", "m/s"
};

type CapstoneStep = StepBase & {
  type: "capstone";
  subtype: "multiple_choice" | "numeric_input" | "sim_match";
  options?: { id: string; label: string }[];
  correctOptionId?: string;
  correctValue?: number;
  tolerance?: number;
  simConfig?: SimConfig;
};

type Step =
  | IntroStep
  | SimExploreStep
  | MultipleChoiceStep
  | NumericInputStep;
```

**Content ids (Phase 1):**

| lessonId | order | title |
|---|---|---|
| `projectile-shape` | 1 | Shape of Projectiles |
| `complementary-angles` | 2 | Same Range, Two Angles |
| `projectile-calculations` | 3 | Projectile Calculations |

---

### 9.5 What lives where (quick reference)

| Need | Source |
|---|---|
| Lesson text, options, correct answers | `src/content/course.ts` |
| Is answer correct? | Client validates against content (no server round-trip) |
| Wrong attempt count, hint shown | `lessonProgress.wrongAttempts` |
| XP, streak, badges | `users/{uid}` |
| Resume mid-lesson | `users/{uid}.continue*` + `lessonProgress/{lessonId}` |
| Auth | Firebase Auth only |

---

### 9.6 Firestore security rules (sketch)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /lessonProgress/{lessonId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }
  }
}
```

Users can only read/write their own profile and progress.

---

### 9.7 Why not put content in Firestore?

For Phase 1, repo-based content is simpler and faster:

- No extra Firestore reads on lesson load (helps < 2s target)
- Content changes go through git, not a CMS
- Answer validation stays deterministic and offline-friendly

Move content to Firestore later only if you need live edits without redeploying.

---

## 10. Non-Functional Requirements

| Area | Target |
|---|---|
| Feedback latency | < 100 ms |
| Sim during slider drag | 60 FPS |
| Time to first interaction (lesson load) | < 2 s |
| Touch targets | ≥ 44 × 44 px |
| Viewports | 375px mobile through desktop |
| Concurrent users | Firebase default scale; no shared client state |

---

## 11. Technical Stack

| Layer | Choice |
|---|---|
| Frontend | React (Vite) |
| Auth | Firebase Authentication |
| Database | Cloud Firestore |
| Hosting | Firebase Hosting |
| Simulation | HTML Canvas or SVG (no heavy 3D) |
| Content | TypeScript files in repo (`src/content/`) |

---

## 12. Key Screens

1. **Login / Sign up** — email, Google, name
2. **Home** — path, continue, streak, XP, badges
3. **Lesson player** — step content + sim + feedback panel
4. **Lesson complete** — XP earned, badge, “Next lesson” CTA

---

## 13. Phase 2+ (Not This PRD)

Reserved for assignment Phase 2+: live AI hints, adaptive path, generated practice. Phase 1 must teach fully with AI off.

---

## 14. Open Assumptions

- “Pages” = teaching steps; **3–5 per lesson**, **~1–2 min each**.
- Capstone = **separate** from teaching steps; 1–2 problems at the end of each lesson.
- XP values are initial defaults; tune after playtesting.
- Streak uses device local calendar date unless timezone field added later.

---

## 15. Appendix — Name Rationale

**Paraboloα** — parabola (the shape of every projectile) + α (Alpha AI, AP/advanced, calculus). Wacky enough to remember; smart enough for AP Physics C.

**Tagline (optional):** *Launch your intuition.*
