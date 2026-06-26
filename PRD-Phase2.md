# Paraboloα — Phase 2 PRD: Spaced Review + Cognitive-Load-Aware Practice

**Product:** Brilliant-style learn-by-doing app for AP Physics C projectile motion
**Repo:** Alpha-Brilliant | **Stack:** React (Vite) + Firebase Auth + Firestore + Hosting
**Phase 2 deadline:** Friday
**Builds on:** `PRD-Phase1.md` (shipped MVP — sim, auth, progress, XP/streaks/badges; the course now has **4 lessons** in code: L1 `projectile-shape`, L2 `complementary-angles`, L3 `projectile-calculations`, L4 `velocity-range-height`)

> **Prime directive (carried from the assignment):** Only start once the MVP teaches well on its own. Ground every AI feature in the lesson's **structured state**, not raw text. **Verify anything checkable against the physics engine** so the AI can never present a wrong number. The MVP must keep working with **AI turned off** — these are *additions, not replacements*.

---

## 1. Decision (the "decide" half)

The most important Phase 2 deliverable is choosing the *right* features for *this* subject and persona — a distractible 10th–11th grader doing 5–10 min/day who must **retain** projectile-motion fluency until a distant AP exam. Phase 1 already teaches the concepts well but has gaps: the course **runs dry** (3 lessons, replay only), nothing fights **forgetting** between sessions, and the practice surface can **overload novices** (pure "solve for X" problems).

We ship one retention feature (**F1 Spaced Review**) plus two cognitive-load features (**F2 Worked Examples**, **F3 Goal-Free Problems**) that make new lessons easier to learn from. **AI is used in two places**: in **F1**, to *phrase* review problems for parameters the engine has already solved; and in **F3**, to *interpret* the free-text quantities a learner names so the engine can grade them. In both cases **the engine — not the model — decides every number**: the AI only writes prose (F1) or maps a learner's words to a canonical quantity (F3), and never judges whether a value is correct. **F2 is hand-authored** (no AI). **Reviews deliver only normal practice problems** (numeric / multiple-choice). Every AI surface degrades to a deterministic mode when `AI_ENABLED = false`.

### 1.1 Evidence base

- **Distributed practice** (Dunlosky et al., 2013, §9): high-utility; spaced > massed; benefit grows on delayed tests; **practice *testing* beats restudy**; optimal lag ≈ 10–20% of desired retention → an **expanding interval** schedule; students **don't space on their own** and **underrate** spacing → the app must schedule, surface, and briefly justify it; varied items avoid false fluency.
- **Cognitive Load Theory** (Sweller, 1988): novices solving conventional "find X" problems burn working memory on **means-ends search**, leaving little capacity to build the **schemas** that *are* expertise. **Worked examples** and **goal-free problems** remove that search so effort goes into pattern-learning — better, faster, lower-error learning for novices. Fade to full problem solving as fluency grows.
- **Principles of Instruction** (Rosenshine, 2012): begin with **review** (#1, #10), teach in **small steps** (#2), **provide models / worked examples** (#4), use **scaffolds** that fade (#8), aim for a ~**80% success rate** (#7). F1–F3 operationalize these directly.

### 1.2 What we will ship


| #      | Feature                                                                                                                                                                                                                                                                                                                                                                                           | Why it genuinely helps *this* app                                                                                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1** | **Spaced Review** — each learned *skill* enters a fixed expanding-interval schedule; when due, the learner does a short retrieval session of **AI-generated, engine-verified** projectile problems.                                                                                                                                                                                               | Applies the highest-utility technique to a perfectly parametric subject. Fixes forgetting *and* the "runs dry" gap — daily due-reviews keep the learner (and streak) alive with endless fresh, correct problems. |
| **F2** | **Worked Examples** — fully modeled, step-by-step solutions. **Hand-authored, lessons only** in the **multi-step calculation lessons (L3 `projectile-calculations`, L4 `velocity-range-height`)** with a **faded progression** (worked → completion → full). | Lowers cognitive load for novices (Sweller); implements Rosenshine's "provide models" and fading scaffolds. Helps learners *understand the method* instead of flailing through search.                           |
| **F3** | **Goal-Free Problems** — "find as many quantities as you can" instead of "find X." **Lessons only**, calculation lessons (**L3 & L4**). With **AI on**, the learner **names the quantities themselves** (no targets shown) and AI maps each to a canonical quantity the **engine grades**; with **AI off**, the learner fills a **fixed labeled list** (still engine-graded).                                                                                                                                                                                          | Eliminates means-ends search (Sweller) → builds schemas with less overload. **Not pre-listing the targets** keeps the framing genuinely goal-free — the learner decides what is derivable.                                                                                              |


> **Scope rule for F2 & F3:** they live **only in lessons** (never in reviews), and only in the **multi-step calculation lessons (L3, L4)** where a problem has multiple relevant variables or solution steps. Do **not** put them in single-concept/intuition lessons (L1 shape, L2 complementary angles), where a worked example or "find everything" framing adds nothing. **Reviews deliver only normal practice problems** (numeric / multiple-choice).

### 1.3 What we will deliberately leave out (Phase 2)


| Considered                                                   | Why not now                                                                                                                                               |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Freeform AI chatbot / tutor**                              | Explicitly discouraged by the brief. Hard to ground/verify; invites hallucinated physics. Our value is verified, in-context practice — not a chat window. |
| **Standalone "Infinite Practice" page**                      | Folded into Spaced Review; on-demand-without-schedule doesn't fight forgetting. (See §13.)                                                                |
| **Targeted misconception hints / wrong-answer explanations** | Out of scope this phase; reviews reuse Phase 1 static hints. (See §13.)                                                                                   |
| **Adaptive lesson sequencing**                               | Only 3 linear lessons; the sequential unlock already routes learners.                                                                                     |
| **User-entered AP exam date / lag anchored to it**           | Clean future enhancement (the 10–20% rule). Phase 2 uses a fixed ladder. (See §13.)                                                                       |


See `Brainlift.md` for the full decision narrative.

---

## 2. Goals & Non-Goals

**Goals**

- Learners *retain* projectile fluency over weeks via scheduled, spaced retrieval — not one-time learning.
- Course never runs dry: once lessons are done, there is always a fresh, correct problem due.
- Novices learn the *method* with manageable cognitive load (worked examples, goal-free variants), then fade to full problem solving.
- Zero wrong numbers shown to a learner, ever — all AI output is gated by the physics engine.
- App is fully usable with AI disabled: lessons (incl. authored worked examples) work offline; goal-free problems fall back to a fixed engine-graded quantity list; reviews fall back to engine-built templated content.

**Non-Goals**

- No chatbot, no general Q&A, no new subjects.
- No standalone infinite-practice page; no misconception-diagnosis hint system this phase.
- No server-side answer validation (stays client-side and deterministic).
- No change to *existing* Phase 1 lesson content/gamification semantics or core data model. (F2/F3 add **new, optional** step types that existing lessons ignore unless authored to use them.)

---

## 3. Guiding Principles

1. **Engine is the source of truth.** The LLM never decides whether a number is correct. `src/lib/physics.ts` does. AI writes *prose* (F1) or *interprets a learner's free-text quantity name into a canonical engine quantity* (F3); it never grades a value. Any number the learner sees as "correct" was computed and checked by the engine.
2. **Structured state in, structured state out.** We send the model typed JSON (concept tag, sampled parameters, the engine's full answer set, or — for F3 — the learner's label + the canonical quantity catalog) and request **structured output** (JSON schema), never loosely-parsed free text.
3. **Verify-then-show.** Any AI artifact containing a checkable quantity is recomputed/validated before render. On failure → regenerate (≤2 retries) → templated fallback.
4. **Fail safe, not blank.** Every AI surface has a deterministic fallback so AI errors, rate limits, or `AI_ENABLED = false` degrade to a working experience.
5. **Additive code paths.** New review + AI + step-type modules sit alongside existing ones; no Phase 1 file's behavior changes when AI is off.
6. **Manage cognitive load — only where it fits.** For a *novice* on a **multi-step / multi-variable** skill, prefer a worked example or goal-free variant over a bare "find X" problem, and **fade** support toward full problem solving as fluency grows (Sweller; Rosenshine #4/#8). These supports are reserved for the calculation lessons/skills; they are **not** applied to single-concept/intuition steps (L1, L2) where they add nothing.

---

## 4. Feature F1 — Spaced Review

### 4.1 User story

*As a learner who finished a lesson, I want the app to bring back what I learned a few days later as quick practice, so I actually remember it for the AP exam — and so I always have something fresh to do.*

### 4.2 Reviewable skills (content, in repo)

The unit of review is a **skill**, not a whole lesson. Each carries its own schedule and forgetting curve.

```
src/content/reviewSkills.ts
  // conceptual skills (L1–L2)
  shape-parabola          // L1: trajectory is a parabola
  angle-velocity-effects  // L1: how angle/speed change height & range
  complementary-angles    // L2: 30°/60° give the same range
  // calculation skills (L3–L4)
  range-calc              // L3: R = v²·sin(2θ)/g
  max-height-calc         // L3: H = v²·sin²θ / (2g)
  flight-time-calc        // L3: t = 2v·sinθ / g
  speed-range-height      // L4: how launch speed scales range & max height
```

A skill becomes **active** the first time the learner completes the lesson that teaches it. Each skill defines its difficulty band (parameter ranges for `angle`, `velocity`; `g = 10`).

### 4.3 Scheduling algorithm — fixed expanding ladder (pure, deterministic)

```
intervals = [1, 3, 7, 16, 35]   // days; expanding lag per "longer retention → longer lag"
```

- **On lesson completion** → skill at `box = 0`, `nextDueDate = today + 1 day`.
- **On a review attempt:** **Pass** → `box = min(box+1, 4)`, `nextDueDate = today + intervals[box]`. **Lapse** → `box = max(box-1, 0)`, reschedule shorter.
- **Due** = `nextDueDate ≤ today`. Fully client-side and unit-testable. (Default pass threshold tunable — §11.)

### 4.4 Review session flow

1. Home surfaces a **"Review — N due"** card listing due skills (+ a memory-strength bar each, §4.6).
2. The app assembles a short set of **2–4 normal practice problems** across due skills (capped for the 5–10 min persona; the rest roll over). Reviews use only the standard `numeric_input` / `multiple_choice` problem forms — no worked examples or goal-free problems (those are lessons-only, §5–§6).
3. For each, the app **samples parameters** within the skill's band and computes the *true* answer with `physics.ts`.
4. **Problem source (graceful ladder):**
  - **AI on:** the LLM phrases the problem prose + (for MC) distractors for those exact parameters, as structured JSON.
  - **AI off / failure:** a **templated, engine-built** problem for the same parameters.
5. **Verify before display:** recompute the target quantity with `physics.ts`; require `|stated − computed| ≤ tolerance`; for MC exactly one correct option. Failure → regenerate (≤2 retries) → templated fallback.
6. Render through the **`StepPlayer`** (`numeric_input` / `multiple_choice`). Existing validation grades learner answers — unchanged. Phase 1 static hints apply.
7. On completion, update each touched skill's schedule (§4.3) and award XP/streak (§4.6).

### 4.5 Grounding & verification contract

- The model receives parameters and the **engine's answer(s)**; it phrases content so they are correct. It never invents numbers.
- Reject anything referencing air resistance, non-`10` gravity, or out-of-range quantities.
- No wrong number is ever shown: the verification gate (§4.4 step 5) is mandatory.

### 4.6 Habit & transparency

- **Forces distribution:** daily "Review — N due" surface; reviews feed the existing **streak** and award **XP** (e.g. +5/item, bonus for clearing all due). Keeps the streak alive after lessons end.
- **Makes the benefit visible:** a per-skill **memory-strength bar** that decays between reviews and refills on a pass.
- **Briefly convinces:** a one-time "why review works" explainer when the first skill becomes due.

### 4.7 Acceptance criteria

- [ ] Completing a lesson schedules its skills; due skills appear on Home on/after `nextDueDate`.
- [ ] Scheduler advances/drops boxes correctly on pass/lapse (unit-tested, no network).
- [ ] Generating 20 review problems yields 0 incorrect answers shown (verification gate works).
- [ ] With `AI_ENABLED = false`, reviews still produce solvable, engine-built problems and render/grade through `StepPlayer`.
- [ ] Memory-strength bars and "N due" reflect schedule state; reviews update streak/XP.
- [ ] Median time-to-first-problem < 3 s with a visible loading state.

---

## 5. Feature F2 — Worked Examples

### 5.1 User story

*As a novice meeting a new calculation skill, I want to first see a fully worked, step-by-step solution so I learn the method instead of flailing — then gradually do more of the steps myself.*

### 5.2 Where it applies

**Lessons only — and only the multi-step calculation lessons/skills (L3 `projectile-calculations`, L4 `velocity-range-height`).** Conceptual lessons (L1, L2) have no multi-step solution to model and are excluded; reviews never use worked examples (§1.2 scope rule).

When such a skill is first taught, the lesson presents a **faded progression** (Rosenshine #4/#8):
  1. **Worked example** — every step shown and explained (model).
  2. **Completion problem** — the first steps are pre-filled; the learner finishes the rest.
  3. **Full problem** — learner solves independently.

### 5.3 Design (additive step type)

- New optional content step type `**worked_example`**: `{ type, skillId, params, steps[], (optional) selfExplainPrompt }`. Existing lessons that don't use it are unaffected (satisfies the Phase 1 non-goal).
- `StepPlayer` gains an **additive renderer** for `worked_example` (display + "Next"; optional light self-explanation prompt that is *formative only*, never blocks). Existing renderers untouched.
- **Completion/faded** variant: reuse the existing `numeric_input` step with author-provided pre-filled steps shown above the input — no new type required.
- Worked examples are **hand-authored static content** — no AI involved — so they work identically regardless of `AI_ENABLED`. (Authors are responsible for step correctness; values follow from `physics.ts`.)

### 5.4 Acceptance criteria

- [ ] A new-skill calculation lesson (L3/L4) shows the worked → completion → full progression.
- [ ] The `worked_example` step renders via `StepPlayer` with no change to existing step behavior.
- [ ] Authored worked examples display correctly with `AI_ENABLED = false` (and identically with it on).

---

## 6. Feature F3 — Goal-Free Problems

### 6.1 User story

*As a novice, instead of hunting for one specific answer, I want to "find everything I can" from the given launch — deciding for myself what is derivable — so I practice applying the relationships without the mental overload of working backward from a goal.*

### 6.2 Where it applies

**Lessons only — and only where a launch yields multiple relevant quantities, i.e. the calculation lessons/skills (L3 & L4).** A goal-free framing makes no sense for single-concept intuition steps (L1, L2), and reviews never use it (§1.2 scope rule).

Used as a low-load practice variant in L3/L4, especially right after a calculation skill is introduced.

### 6.3 Why this needs AI (and where AI stops)

The essence of a goal-free problem is that **we do not tell the learner which quantities to compute** — surfacing a labeled list ("range = ▢, max height = ▢, …") re-introduces a goal and collapses it into a structured fill-in-the-blank. To honor the design, the learner must be able to **name quantities in their own words** ("how far it goes", "hang time", "speed sideways") and type a value. Grading free-text quantity names deterministically is brittle (synonyms, phrasing, units), so we use **AI to interpret the learner's label**, then hand the number to the engine.

**The AI never grades a value.** Its only job is *semantic mapping*: learner label (+ optional unit) → one **canonical engine quantity key** (or `unsupported`), plus an optional unit-normalization factor. The **engine computes the true value and checks the learner's number** (verify-then-show, §3). This keeps F3 inside the Prime Directive exactly like F1.

### 6.4 Design (additive step type)

New optional content step type `**goal_free_problem`**: authored launch params `{ type, skillId, angle, velocity, g = 10, requiredCount }`. The **engine computes the full derivable set** (`vx`, `vy`, range, max height, flight time, time-to-peak; extensible) — the single source of truth for grading. The step renders via `StepPlayer` (additive branch).

**Two modes, one grader:**

- **AI on — open entry (true goal-free).** The learner adds free-form rows: `{ quantity name (free text), value, optional unit }` with **no target list shown**. For each row:
  1. Engine computes the canonical answer set for the launch.
  2. `goalFreeInterpreter` sends the learner's label + unit + the **canonical quantity catalog** (keys, descriptions, units) to the LLM and requests **structured output**: `{ canonicalKey | "unsupported", unitFactor?, confidence }`.
  3. **Engine grades:** map the learner's value via `unitFactor`, compare to `engineValue[canonicalKey]` within tolerance.
  4. Outcomes per row: **correct / incorrect / unverifiable** (`unsupported`, out-of-domain like air resistance, or a duplicate of an already-credited quantity → credited once).
  - **Fail-safe:** if the model errors, times out, or returns low confidence, fall back to a **deterministic alias matcher** (synonym/keyword table → canonical key). If still unmappable, mark the row "couldn't check this one" — never block, never reveal.
- **AI off — fixed labeled list (graceful degradation).** The learner fills a **hand-authored list** of labeled quantity rows; each is engine-graded (the behavior already shipped). Less "pure" goal-free, but fully functional with zero AI.

**Pass** when the learner supplies **≥ requiredCount distinct engine-verified correct quantities** (default tunable — §11), in either mode. Partial/incorrect rows get the standard wrong-answer treatment; **no answer is ever revealed**.

### 6.5 Acceptance criteria

- [ ] `goal_free_problem` renders/grades via `StepPlayer` with no change to existing step behavior.
- [ ] **AI on:** the learner can enter free-text quantity names with no list shown; each is mapped to a canonical engine quantity and **graded by the engine**; the model never decides correctness.
- [ ] Mapping uses **structured output**; on AI error/timeout/low-confidence it falls back to the deterministic alias matcher, then to "couldn't check" — never blocks the learner.
- [ ] Duplicate entries for the same quantity are credited once; out-of-domain / unsupported quantities are marked unverifiable, not wrong.
- [ ] **AI off:** the fixed labeled-list variant works end-to-end, engine-graded, no AI dependency.
- [ ] Passing requires ≥ `requiredCount` engine-verified correct quantities; nothing reveals the answers.

---

## 7. Architecture

### 7.1 Where AI runs (decision still open — recommended default below)


| Option                                                  | Summary                                                                                                                              | Trade-off                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **A. Firebase AI Logic (Gemini), in-app (recommended)** | Call Gemini from the React client via the Firebase AI Logic SDK, protected by **App Check**. No backend. Matches the existing stack. | Easiest; keys not embedded. Provider = Gemini.                                       |
| **B. Cloud Functions proxy**                            | A `functions/` backend holds the key and calls any LLM.                                                                              | Provider-agnostic, but adds Blaze plan, a backend, latency. Overkill for this scope. |


**Recommended: Option A.** The math-verification layer is **provider-independent** and lives client-side regardless, so we can swap to Option B later without touching feature logic.

> Either way, **no provider ever returns a graded number to the learner** — the engine gates everything (§3).

### 7.2 Verification & math engine

- Reuse `src/lib/physics.ts` as the single source of truth; extend it (additively) with a helper that returns the **full derivable quantity set** for a launch (`deriveQuantities`, already added — `vx`, `vy`, range, max height, flight time, time-to-peak). This set doubles as the **canonical quantity catalog** the F3 interpreter maps learner labels onto, and the grader for both F3 modes.
- Add **math.js** only if we later need symbolic input normalization; pure projectile arithmetic stays in `physics.ts`.

### 7.3 New modules (additive)

```
src/content/
  reviewSkills.ts      // F1: reviewable skill defs + difficulty bands
  (lesson content)     // F2/F3: authored worked_example & goal_free_problem steps added to L3/L4 lessons
src/lib/review/
  scheduler.ts         // F1: fixed-ladder spacing (pure, unit-tested)
  selectDue.ts         // F1: compute due skills, assemble a capped session
src/lib/ai/
  client.ts            // F1+F3: thin LLM wrapper (provider-swappable), structured output, timeouts, retries
  schemas.ts           // F1+F3: JSON schema/types for the review problem (F1) and the quantity-mapping response (F3)
  problemGen.ts        // F1: params -> engine answer -> prompt -> verify -> Step
  templates.ts         // F1: deterministic fallback (engine-built review problems, no AI)
  goalFreeInterpreter.ts // F3: learner free-text label (+unit) -> canonical engine quantity key (+unit factor), structured output; deterministic alias-matcher fallback. Never grades values.
  flags.ts             // AI_ENABLED flag (reads VITE_AI_ENABLED)
src/pages/ReviewPage.tsx   // F1 surface, reuses StepPlayer
src/content/types.ts       // F2/F3: ADD optional step types worked_example, numeric_problem, goal_free_problem (additive — done)
src/components/StepPlayer  // F2/F3: ADD renderers for the new step types (additive branches — done). F3 renderer adds an "open entry" mode (AI on) alongside the fixed-list mode (AI off).
```

- Existing step types, `validation.ts`, and Phase 1 lesson behavior are unchanged; the new step types are ignored by lessons that don't use them.
- **F3 grading is engine-only in both modes.** `goalFreeInterpreter` resolves *which* quantity a learner meant; `validateGoalFree` (already in `validation.ts`) does the numeric comparison against `deriveQuantities`.
- Home gains a "Review — N due" card + memory-strength bars; existing Home behavior untouched.

### 7.4 Feature flags & fallback

- `AI_ENABLED` (env `VITE_AI_ENABLED`, default off) gates **F1 review-problem generation** and **F3 open-entry quantity interpretation**. When off: F1 reviews use templated engine-built problems, and F3 falls back to its **fixed labeled-quantity list** (engine-graded). F2 is unaffected (it never used AI). All lessons work fully. This satisfies "MVP works with AI off."
- Optional finer-grained flag (e.g. `VITE_AI_GOALFREE`) can gate F3 open-entry independently of F1 if we want to ship them on different timelines.

### 7.5 Data model (Firestore) — minimal additions

- `users/{uid}/reviewSchedule/{skillId}`: `{ skillId, lessonId, conceptTag, box(0..4), intervalDays, lastReviewedDate, nextDueDate, reps, lapses, lastResult }`. "Due today" computed client-side. Security rules mirror existing per-user access.
- Optional `users/{uid}/aiEvents/{id}`: `{ type: 'problem_gen' | 'goal_free_map', skillId, verified, fellBack, ts }` for monitoring/Brainlift (`goal_free_map` records whether the AILabel→canonical mapping succeeded or fell back to the alias matcher). No new PII.
- No change to `lessonProgress` or core `users` fields.

---

## 8. Security & Cost

- **Keys:** never embed a raw LLM key in client code. Use Firebase AI Logic + App Check (Option A) or a Cloud Function (Option B).
- **Abuse / cost control:** cap generations per session/day; cache templated fallbacks; short prompts + structured output to bound tokens; client-side rate limit.
- **Safety:** prompts constrained to projectile physics; outputs schema-validated and engine-verified; reject out-of-domain content.

---

## 9. Non-Functional Requirements (delta from Phase 1)


| Area                              | Target                                                            |
| --------------------------------- | ----------------------------------------------------------------- |
| Verified-answer correctness       | 100% — no wrong number ever displayed; AI never grades. F1 review answers and F3 quantity values are computed/checked by the engine |
| Review time-to-first-problem      | < 3 s (with loading state)                                        |
| F3 mapping latency / fallback     | Per-row interpretation < 2 s; on timeout/error/low-confidence, fall back to alias matcher without blocking |
| Scheduler/verification unit tests | Run in CI; no network needed                                      |
| AI-off behavior                   | F1 reviews work via templates; F3 uses fixed labeled list; F2 unaffected; Phase 1 identical |
| New step types                    | Additive; existing lessons/steps unchanged                        |


---

## 10. Milestones (to Friday)


| Order | Milestone                                       | Output                                                                                                             |
| ----- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1     | **Decide** (this PRD + `Brainlift.md`)          | Features chosen + rationale recorded                                                                               |
| 2     | Review skills + scheduler (pure, tested)        | `reviewSkills.ts`, `scheduler.ts` + unit tests green                                                               |
| 3     | New step types (F2/F3, no AI) — **done**        | `worked_example` + `numeric_problem` + `goal_free_problem` types + `StepPlayer` renderers; engine full-quantity helper |
| 4     | F2/F3 authored content in calculation lessons — **done** | Faded worked→completion→full progression + a goal-free variant (fixed-list, AI-off) in L3 & L4                     |
| 5     | Review surface with templated problems (AI off) | `ReviewPage` + Home "N due" card work end-to-end without AI                                                        |
| 6     | AI client + flag + schema                       | `src/lib/ai/{client,schemas,flags}.ts`, `AI_ENABLED` wired                                                         |
| 7     | AI review-problem generation + verification gate| Verified generated review problems via `StepPlayer`                                                                |
| 8     | **F3 open-entry interpretation (AI)**           | `goalFreeInterpreter.ts` + open-entry mode in the F3 renderer; learner-named quantities → canonical key → engine grade; alias-matcher fallback |
| 9     | Habit/transparency + telemetry + Brainlift      | Memory bars, streak/XP on review, one-time explainer; demo: forgetting fought, never runs dry, AI on/off both work (incl. F3 open vs fixed) |


Build order ships the **deterministic fallback before the AI** for every surface, so the MVP-with-AI-off guarantee holds at every commit.

---

## 11. Open Decisions (for you to confirm)

1. **AI runtime/provider:** Option A (Firebase AI Logic + Gemini, recommended) vs Option B (Cloud Functions proxy / other)?
2. **Review session cap:** problems per session (default 2–4) and per day?
3. **Pass thresholds:** what counts as passing a skill in a session (default: all items correct); and `requiredCount` for goal-free problems (default: ≥3 quantities)?
4. **F3 open-entry scope:** confirm AI is used *only* to map a learner's label → canonical quantity (never to grade), and confirm the canonical catalog for mapping (default: `vx`, `vy`, range, max height, flight time, time-to-peak). Should we expand it (e.g. impact speed/angle) before enabling open entry?

> **Decided:** F2 & F3 apply only to the calculation lessons/skills — **L3 `projectile-calculations`** and **L4 `velocity-range-height`** (multi-step / multi-variable). L1/L2 are excluded.

---

## 12. Appendix — Mapping to the assignment's candidate features


| Assignment candidate                               | Our decision                                                                                       |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Generate new practice problems at right difficulty | **Used inside F1** — AI generates fresh, engine-verified review problems                           |
| Adapt the path based on struggles                  | **Partially** — scheduler re-spaces weak skills (lapse → lower box, reviewed sooner)               |
| Targeted hint when stuck, no answer given          | **Deferred** — reviews use Phase 1 static hints (see §13)                                          |
| Explain a wrong answer in plain language           | **Deferred** (see §13)                                                                             |
| (Implicit) chatbot                                 | **Rejected** — discouraged; ungroundable; not our value                                            |


---

## 13. Future features (not Phase 2)

- **AP-exam-date anchoring:** set review lags to ~10–20% of remaining retention (Cepeda et al., 2008) instead of the fixed ladder.
- **Adaptive fading:** drive the worked → completion → full progression per-learner from performance, not just authored order.
- **On-demand practice:** an optional "practice now" entry that draws extra problems without affecting the schedule.
- **Targeted misconception hints/explanations:** diagnose wrong-answer signatures and have the AI phrase an answer-free nudge.
- **Interleaved practice:** mix skill types within a session (Dunlosky et al. §10) once the content library is larger.

