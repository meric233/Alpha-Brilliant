# Paraboloα — Phase 2 PRD: AI Features

**Product:** Brilliant-style learn-by-doing app for AP Physics C projectile motion
**Repo:** Alpha-Brilliant | **Stack:** React (Vite) + Firebase Auth + Firestore + Hosting
**Phase 2 deadline:** Friday
**Builds on:** `PRD-Phase1.md` (shipped MVP — 3 lessons, sim, auth, progress, XP/streaks/badges)

> **Prime directive (carried from the assignment):** Only start once the MVP teaches well on its own. Ground every AI feature in the lesson's **structured state**, not raw text. **Verify anything checkable against the physics engine** so the AI can never present a wrong number. The MVP must keep working with **AI turned off** — these are *additions, not replacements*.

---

## 1. Decision (the "decide" half)

The single most important Phase 2 deliverable is choosing the *right* features for *this* subject. Projectile motion is fully deterministic and highly parametric (angle, speed, `g = 10`, no air resistance). That makes it an unusually good fit for **generation + machine verification** and a poor fit for open-ended chat.

### 1.1 What we will ship

| # | Feature | Why it genuinely helps *this* app |
|---|---------|-----------------------------------|
| **F1** | **Infinite Practice** — AI-generated projectile problems at a chosen difficulty, every answer verified by `physics.ts` before display | The Phase 1 course **runs dry**: 3 lessons, fixed capstones, only "Retake" to replay. Projectile problems are parametric, so we can generate endless fresh problems and **verify each answer exactly** with the existing engine. Directly fixes the biggest content gap. |
| **F2** | **Targeted Hints + Wrong-Answer Explanations** — diagnose the learner's *specific* wrong answer, then give an escalating, plain-language nudge that does **not** hand over the answer | Phase 1 hints are static strings shown after 2 wrong attempts (same hint for everyone). Numeric projectile mistakes have **detectable signatures** (e.g. used `sin θ` instead of `sin 2θ`, dropped the factor of 2 in flight time, radians/degrees mix-up). We diagnose deterministically; the AI only phrases it. |

F2 combines the assignment's "targeted hint" and "explain a wrong answer" candidates because for numeric physics they share the same engine-driven diagnosis step.

### 1.2 What we will deliberately leave out (Phase 2)

| Considered | Why not now |
|------------|-------------|
| **Freeform AI chatbot / tutor** | Explicitly discouraged by the brief ("do not bolt on a chatbot because everyone has one"). It is hard to ground, hard to verify, and invites off-topic / hallucinated physics. Our value is verified, in-context feedback — not a chat window. |
| **Adaptive lesson sequencing (F3 candidate)** | With only 3 linear lessons, there is almost nothing to adapt *between*. The existing sequential unlock already routes learners correctly. Revisit once the content library is large enough that ordering is a real decision. |
| **Live AI re-writing of core lesson teaching steps** | The MVP teaches well with hand-authored steps. Replacing them with generated prose adds risk (hallucination) with no learning upside and would violate "additions, not replacements." |

See `Brainlift.md` for the full decision narrative.

---

## 2. Goals & Non-Goals

**Goals**
- Course never runs dry: a learner can always get a fresh, correct practice problem.
- Hints adapt to what the learner actually did, while never revealing the final answer.
- Zero wrong numbers shown to a learner, ever — AI output is gated by the physics engine.
- App is fully usable with AI disabled (graceful fallback to Phase 1 behavior).

**Non-Goals**
- No chatbot, no general Q&A, no new subjects.
- No server-side answer validation for the core lessons (stays client-side and deterministic).
- No change to existing Phase 1 lesson content, gamification, or data model semantics.

---

## 3. Guiding Principles

1. **Engine is the source of truth.** The LLM never decides whether a number is correct. `src/lib/physics.ts` does. AI writes *prose*, not *answers*.
2. **Structured state in, structured state out.** We send the model typed JSON (concept tags, parameters, the learner's value, attempt count) and request **structured output** (JSON schema), never free text that we then parse loosely.
3. **Verify-then-show.** Any AI artifact that contains a checkable quantity is recomputed/validated before it reaches the UI. If it fails, we regenerate (bounded retries) or fall back to static content.
4. **Fail safe, not blank.** Every AI surface has a deterministic fallback so AI errors, rate limits, or `AI_ENABLED = false` degrade to the working Phase 1 experience.
5. **Additive code paths.** New AI modules sit alongside existing ones; no Phase 1 file's behavior changes when AI is off.

---

## 4. Feature F1 — Infinite Practice (generated, verified problems)

### 4.1 User story
*As a learner who finished the lessons, I want unlimited fresh problems at a difficulty I pick, so I can keep practicing without the course running out.*

### 4.2 Flow
1. Learner opens **Practice** (new entry point on Home, e.g. "Keep practicing" after a lesson/badge).
2. Picks a focus (Shape / Complementary angles / Calculations) and difficulty (Easy / Medium / Hard).
3. App **samples parameters** within difficulty bands (`angle`, `velocity`, `g = 10`) and computes the *true* answer with `physics.ts`.
4. App asks the LLM to write the **problem prose + distractors + explanation** for those exact parameters, returned as structured JSON.
5. App **verifies**: the engine-computed answer must match the problem's stated `correctValue` within tolerance, and (for MC) exactly one option is correct. On failure → regenerate (≤2 retries) → fall back to a templated, engine-built problem.
6. Render through the **existing `StepPlayer`** by mapping to the current `numeric_input` / `multiple_choice` step shapes. Existing validation (`validateNumeric`, `validateMultipleChoice`) checks the learner's answer — unchanged.

### 4.3 Grounding contract (what the model may and may not do)
- The model receives parameters and the **engine's answer**; it must phrase the problem so that answer is correct. It does **not** invent the answer.
- Difficulty bands (initial; tune after playtest):
  - **Easy:** given `angle`, `velocity` → find range or max height.
  - **Medium:** find the angle for a target range; compare two launches.
  - **Hard:** complementary-angle reasoning; solve for `velocity` given a constraint.

### 4.4 Verification (must pass before display)
- Recompute the target quantity with `physics.ts`; require `|stated − computed| ≤ tolerance`.
- MC problems: exactly one option within tolerance of the true value; distractors must be *wrong* (engine-checked) and ideally map to known misconceptions (§5.3).
- Reject anything referencing air resistance, non-`10` gravity (unless the step is the gravity explorer), or quantities outside sane ranges.

### 4.5 Acceptance criteria
- [ ] Generating 20 problems yields 0 incorrect answers shown (verification gate works).
- [ ] With `AI_ENABLED = false`, Practice still produces solvable, engine-built problems (templated fallback).
- [ ] A generated problem renders and grades correctly through the unmodified `StepPlayer`.
- [ ] Median time-to-first-problem < 3 s; a visible loading state covers generation latency.

---

## 5. Feature F2 — Targeted Hints & Wrong-Answer Explanations

### 5.1 User story
*As a learner who got it wrong, I want a hint about my specific mistake (not a generic one) and, if I'm still stuck, a plain-language explanation tuned to what I did — without just being told the answer.*

### 5.2 Flow (replaces nothing; augments `FeedbackPanel`)
1. Learner submits a wrong numeric/MC answer. Existing wrong-attempt counting is unchanged.
2. On reaching `HINT_THRESHOLD`, instead of (or above) the static hint, the app runs **deterministic misconception diagnosis** (§5.3) using structured state: `{ correctValue, learnerValue, angle, velocity, g, concept }`.
3. The diagnosis (e.g. `MISSED_DOUBLE_ANGLE`) + structured state is sent to the LLM, which returns a short, **answer-free** hint (and, on further request, a fuller explanation), as structured output.
4. **Guardrail:** the returned text is scanned to ensure it does **not** contain the correct final value; if it does, we drop it and show the static hint. The explanation may include method/steps but the hint must not state the final number.

### 5.3 Misconception table (deterministic, engine-checked — examples)
| Signature (how learner's value relates to true value) | Likely error | Hint angle (answer-free) |
|---|---|---|
| Learner value ≈ `v²·sin(θ)/g` | Used `sin θ` instead of `sin 2θ` for range | "Check the angle inside your sine — range depends on `sin(2θ)`, not `sin(θ)`." |
| Learner value ≈ half the true time | Dropped the factor of 2 in `t = 2v_y/g` | "You found time to the *peak*. How does time up compare to total time?" |
| Components swapped (`sin`↔`cos`) | Mixed up horizontal/vertical components | "Which component carries the launch *upward* — sine or cosine of θ?" |
| Off by a `π/180`-ish factor | Degrees/radians mix-up | "Double-check your calculator's angle mode." |

The table is data; new signatures are cheap to add. The LLM phrases the chosen row for the learner's context; it never selects correctness.

### 5.4 Acceptance criteria
- [ ] For a seeded set of classic wrong answers, the correct misconception is detected ≥ 90% of the time (unit-tested against the table, no LLM needed).
- [ ] No hint or explanation ever contains the correct final value (guardrail unit-tested).
- [ ] With `AI_ENABLED = false`, the Phase 1 static hint/explanation shows exactly as today.
- [ ] AI hint latency failure (timeout/error) silently falls back to the static hint.

---

## 6. Architecture

### 6.1 Where AI runs (decision required — recommended default below)
The app is currently client-only. Two viable options:

| Option | Summary | Trade-off |
|--------|---------|-----------|
| **A. Firebase AI Logic (Gemini), in-app (recommended)** | Call Gemini directly from the React client via the Firebase AI Logic SDK, protected by **App Check**. No backend to run. Matches the existing Firebase stack. | Easiest given current stack; keys are not embedded (SDK + App Check). Provider = Gemini. |
| **B. Cloud Functions proxy** | A `functions/` backend (HTTPS/callable) holds the API key and calls any LLM (Gemini/OpenAI/etc.). | Most flexible + provider-agnostic, but adds the Blaze plan, a backend to deploy/maintain, and latency. Overkill for Phase 2 scope. |

**Recommended: Option A.** It keeps Phase 2 within the current serverless footprint. The math verification layer is **provider-independent** and lives client-side regardless, so we can swap to Option B later without touching feature logic.

> Either way, **no provider ever returns a graded number to the learner** — the engine gates everything (§3).

### 6.2 Verification & math engine
- Reuse `src/lib/physics.ts` as the single source of truth for projectile quantities.
- Add **math.js** only if we need to evaluate/normalize symbolic learner input or generated algebra; pure projectile arithmetic stays in `physics.ts`. (The brief suggests `math.js`/SymPy — `physics.ts` already covers the closed-form physics; math.js is the optional general evaluator.)

### 6.3 New modules (additive)
```
src/lib/ai/
  client.ts          # thin LLM wrapper (provider-swappable), structured-output calls, timeouts, retries
  schemas.ts         # JSON schemas / TS types for model I/O (problem, hint, explanation)
  problemGen.ts      # F1: sample params -> engine answer -> prompt -> verify -> Step
  problemTemplates.ts# F1 deterministic fallback (engine-built problems, no AI)
  diagnose.ts        # F2: misconception table + detector (pure functions, unit-tested)
  hint.ts            # F2: diagnosis + state -> answer-free hint/explanation, guardrailed
  flags.ts           # AI_ENABLED + per-feature flags (reads VITE_AI_ENABLED)
src/pages/PracticePage.tsx   # F1 surface, reuses StepPlayer
```
- `StepPlayer`, `validation.ts`, `content/types.ts` are **reused, not modified** (F1 maps generated problems onto existing step shapes; if a new optional field is needed it is additive and ignored when AI is off).
- `FeedbackPanel` gains an optional AI-hint slot above the existing static hint; static path untouched.

### 6.4 Feature flag & fallback
- `AI_ENABLED` (env `VITE_AI_ENABLED`, default off) plus per-feature flags. When off: no Practice generation (templated problems only) and Phase 1 static hints. This satisfies "MVP works with AI off."

### 6.5 Data model (Firestore) — minimal additions
- Optional `users/{uid}/aiEvents/{id}`: `{ type: 'problem_gen'|'hint', concept, difficulty, verified: bool, fellBack: bool, ts }` — for the Brainlift write-up and to monitor verification/fallback rates. No PII beyond existing auth. Security rules mirror existing per-user access.
- No change to `lessonProgress` or `users` core fields.

---

## 7. Security & Cost

- **Keys:** never embed a raw LLM key in client code. Use Firebase AI Logic + App Check (Option A) or a Cloud Function (Option B).
- **Abuse / cost control:** cap generations per session; cache the templated fallback; short prompts + structured output to bound tokens; client-side rate limit.
- **Safety:** prompts are constrained to projectile physics; outputs are schema-validated and engine-verified; reject out-of-domain content.

---

## 8. Non-Functional Requirements (delta from Phase 1)

| Area | Target |
|------|--------|
| Verified-answer correctness | 100% (no wrong number ever displayed) |
| Practice time-to-first-problem | < 3 s (with loading state) |
| AI hint render | < 2 s, else fall back to static |
| AI-off behavior | Identical to Phase 1 MVP |
| Verification/diagnosis unit tests | Run in CI; no network needed |

---

## 9. Milestones (to Friday)

| Order | Milestone | Output |
|---|---|---|
| 1 | **Decide** (this PRD + `Brainlift.md`) | Features chosen + rationale recorded |
| 2 | AI client + flags + schemas | `src/lib/ai/{client,schemas,flags}.ts`, `AI_ENABLED` wired |
| 3 | F1 engine-built fallback first | Templated Practice works with AI **off** |
| 4 | F1 generation + verification gate | Verified generated problems via `StepPlayer` |
| 5 | F2 diagnosis (pure, tested) | `diagnose.ts` + unit tests green |
| 6 | F2 AI phrasing + guardrail | Targeted hints/explanations in `FeedbackPanel` |
| 7 | Polish, telemetry, Brainlift final | Demo: course never runs dry; AI on/off both work |

Build order deliberately ships the **deterministic fallback before the AI** for each feature, so the MVP-with-AI-off guarantee holds at every commit.

---

## 10. Open Decisions (for you to confirm)

1. **AI runtime/provider:** Option A (Firebase AI Logic + Gemini, recommended) vs Option B (Cloud Functions proxy / other provider)?
2. **Practice entry point:** standalone Practice page, post-lesson "Keep practicing," or both?
3. **Scope check:** ship both F1 and F2 by Friday, or land F1 first and F2 if time permits?

---

## 11. Appendix — Mapping to the assignment's candidate features

| Assignment candidate | Our decision |
|---|---|
| Generate new practice problems at right difficulty | **Shipping (F1)** — best fit; fully verifiable |
| Targeted hint when stuck, no answer given | **Shipping (F2)** — diagnosis-driven |
| Explain a wrong answer in plain language | **Shipping (F2)** — same engine diagnosis |
| Adapt the path based on struggles | **Deferred** — too few lessons to sequence meaningfully |
| (Implicit) chatbot | **Rejected** — discouraged; ungroundable; not our value |
