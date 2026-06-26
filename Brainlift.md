# Brainlift — Paraboloα Phase 2 Decision

This is the decision record for the Phase 2 features: **what we considered, what we shipped, and what we deliberately left out**, with the reasoning behind each call. Companion to `PRD-Phase2.md`.

> **Note:** Phase 2 was re-scoped after grounding the design in learning-science research. The earlier draft (a standalone "Infinite Practice" generator + a misconception-diagnosis hint system) was replaced by the three features below. The discarded ideas are recorded under "What we deliberately left out / deferred."

---

## TL;DR

We are an AP Physics C **projectile motion** app. Projectile motion is fully deterministic and parametric (`angle`, `velocity`, `g = 10`, no air resistance), and we already own a closed-form physics engine (`src/lib/physics.ts`). That combination makes us a great fit for **AI generation + machine verification**, and a poor fit for open-ended chat.

So we ship three features:
- **F1 — Spaced Review (the AI feature):** skills enter an expanding-interval schedule; due skills are practiced with AI-generated, engine-verified problems. **Reviews serve only normal practice problems** (numeric / multiple-choice).
- **F2 — Worked Examples (lessons only, hand-authored, no AI):** faded worked→completion→full solutions in the multi-step calculation lessons, to **reduce cognitive load the first time a learner meets a skill**.
- **F3 — Goal-Free Problems (lessons only):** "find as many quantities as you can" in the calculation lessons — same goal, **lowering load during first-time learning**. With **AI on**, the learner *names* the quantities themselves (no list shown) and AI maps each label to a canonical quantity the **engine grades**; with **AI off**, they fill a fixed labeled list (still engine-graded). The engine — never the model — checks every value.

F2 and F3 are deliberately **first-contact scaffolds**: they live in lessons (where the learner is a novice on the skill), not in reviews (which assume the skill is already known and are pure retrieval). We reject the chatbot, and defer adaptive sequencing, targeted misconception hints, and exam-date scheduling.

> **Implementation status (current build).** **F2 and F3 are built and running locally**, including F3's live-AI open-entry mode. **F1 is designed/spec'd but not yet implemented** (we deliberately deferred the live review generator). The AI runtime is **OpenAI behind a Firebase Cloud Function proxy** (`functions/src/index.ts`, callable `aiGenerate`, default model `gpt-4o-mini`); the OpenAI key lives only as a server-side Firebase secret (`OPENAI_API_KEY`) and the callable requires an authenticated user. The client wrapper (`src/lib/ai/client.ts`) keeps the same `generateJson`/`generateText` API. (We moved off the Gemini Developer API because its free tier caps `gemini-2.5-flash` at ~20 requests/day; OpenAI's pay-as-you-go API removes that limit. Note: an OpenAI key cannot be safely shipped in the browser, which is why it sits behind the function — Firebase AI Logic's safe client-side path does not apply to OpenAI.) A learner-facing **AI on/off toggle** (Home page, persisted as `aiEnabled` on the user profile) gates every AI surface; with it off, everything degrades to the deterministic paths below.

---

## The lens: what does THIS subject + learner actually need?

Three facts drove every decision:

1. **The course runs dry.** Phase 1 shipped a small, fixed set of lessons/capstones; the only replay is "Retake." A motivated learner exhausts the content fast. The highest-leverage AI use is **endless, correct practice**.
2. **Learners forget, and they don't self-regulate.** Our persona is a distractible 10th–11th grader doing 5–10 min/day. One-time learning fades before the AP exam, and students reliably **cram instead of spacing** and **underrate** spacing's benefit. The app has to *schedule* retention.
3. **Everything is checkable.** Every projectile answer is a number we can compute exactly. So AI can write *prose* while the engine owns *truth* — designing out the #1 risk of AI in education (confidently wrong math).

We grounded the choices in three papers — **Dunlosky et al. (2013)** on distributed practice, **Sweller (1988)** on cognitive load, and **Rosenshine (2012)** on principles of instruction — and started from the subject and the learner, not a feature checklist. We refused to "add a chatbot because everyone has one."

---

## Evidence base

- **Distributed practice** — Dunlosky et al. (2013), §9: HIGH-utility; spaced > massed; benefit is stronger on *delayed* tests; practice *testing* > restudy; optimal lag ≈ 10–20% of desired retention (→ expanding intervals); students don't space on their own ("procrastination scallop") and underrate spacing → the app must schedule, surface, and justify it; varied items avoid false fluency. → **F1**
- **Cognitive Load Theory** — Sweller (1988): novices solving conventional "find X" problems burn working memory on **means-ends search**, starving the **schema** acquisition that *is* expertise; **worked examples** and **goal-free problems** remove that search so effort goes into learning the method (lower error, better transfer). Fade support as fluency grows. → **F2, F3**
- **Principles of Instruction** — Rosenshine (2012): begin with **review** (#1, #10), teach in **small steps** (#2), **provide models / worked examples** (#4), use **scaffolds that fade** (#8), target ~**80% success** (#7). → corroborates **F1–F3**

---

## What we shipped

### F1. Spaced Review — DESIGNED (not yet implemented)
- **What it is:** Each learned *skill* (not whole lesson) enters a fixed expanding-interval ladder `[1, 3, 7, 16, 35]` days (Leitner-style box: advance on a pass, drop on a lapse). When skills are due, the learner does a short 2–4 problem retrieval session of AI-generated, engine-verified projectile problems.
- **Why it helps THIS app:** It fixes Phase 1's "course runs dry" gap (only 4 lessons) by generating endless fresh, correct problems, and it fights forgetting. For a distractible learner doing 5–10 min/day, a daily "Review — N due" card gives a low-effort, high-value entry point that keeps the streak and habit alive.
- **Research basis:** Dunlosky et al. (2013) §9 rates distributed practice HIGH utility: spaced beats massed, the benefit is *stronger on delayed tests*, and distributed *testing* beats restudy — so reviews are retrieval, not rereading. Optimal lag ≈ 10–20% of the retention interval motivates the expanding ladder. Because students don't space on their own ("procrastination scallop") and underrate spacing, the system schedules and surfaces it. Varied parametric problems avoid the false fluency of repeated identical items. Rosenshine (2012) #1 (daily review) and #10 (weekly/monthly review) confirm review builds well-connected, automatic knowledge.
- **How we ground & verify it:** The engine (`src/lib/physics.ts`) computes the true answer first; AI only phrases the problem for already-solved parameters. Output is re-verified against the engine before display, with bounded retries and a templated fallback if generation fails. The scheduler is pure and unit-tested.
- **Design choices worth noting:** Skill-level scheduling (not lesson-level) for finer retention; a lapse drops the box one step; a fixed ladder ships now with exam-date anchoring deferred; a per-skill memory-strength bar plus a one-time explainer make the (underrated) spacing benefit visible.
- **AI-off fallback:** Reviews use templated engine-built problems; scheduling, due-detection, streak, and XP all work unchanged.
- **Status:** Specified here and in the PRD but **not built yet** — we prioritized the two first-contact scaffolds (F2, F3) and the AI plumbing first. The "engine solves → AI phrases → engine re-verifies" pattern is already proven by F3's interpreter pipeline, so F1 reuses the same `src/lib/ai/client.ts` plumbing when implemented.

### F2. Worked Examples — SHIPPED (lessons only, hand-authored, no AI)
- **What it is:** Fully modeled, step-by-step solutions for multi-step projectile calculations, delivered as a **faded progression** — worked example (every step shown) → completion problem (first steps pre-filled, learner finishes) → full problem solved independently.
- **Why it helps THIS app:** They are a **first-contact scaffold**: the first time a novice meets a multi-step projectile calculation, solving from scratch overloads working memory, so we model the method instead of making them flail. They live in lessons, where the learner is new to the skill — *not* in reviews, which assume the skill is already known.
- **Scope (deliberate):** Calculation lessons/skills **L3 `projectile-calculations`** and **L4 `velocity-range-height`** only — where problems have multiple steps/variables. **Not** applied to single-concept lessons **L1 `projectile-shape`** or **L2 `complementary-angles`**, where a worked example adds nothing.
- **Research basis:** Sweller (1988) — the **worked-example effect**: conventional "find X" problems consume working memory on **means-ends search**, starving **schema** acquisition; worked examples remove that search so effort goes into learning the method, with support **faded** as fluency grows. Rosenshine (2012) — #4 "provide models" and #8 fading **scaffolds** (plus #2 small steps).
- **How we ground & verify it:** Worked examples are **hand-authored static lesson content — no AI involved** — so there is no generation to verify and nothing can hallucinate. Authors write the steps (values follow from `src/lib/physics.ts`). Implemented as an additive `worked_example` step type with an additive `StepPlayer` branch; existing steps unchanged.
- **AI on/off:** Identical — F2 has no AI dependency.

### F3. Goal-Free Problems — SHIPPED (lessons only; AI interprets, engine grades)
- **What it is:** Instead of "find X," the prompt is "from this launch (angle, velocity, `g = 10`), find as many quantities as you can." The engine computes the full derivable set (`vx`, `vy`, range, max height, flight time, time-to-peak). Passing requires ≥ N engine-verified correct quantities (N tunable) — no answer is ever revealed.
- **Why it needs AI (and where AI stops):** The essence of a goal-free problem is that **we don't tell the learner which quantities to compute** — showing a labeled list re-introduces a goal and collapses it into fill-in-the-blank. So with **AI on** the learner types quantities in their *own words* ("how far it goes", "hang time") with no targets shown, and **AI interprets** each label → a canonical engine quantity (+ unit normalization). The **AI never grades a value**: the engine recomputes the true value and checks the learner's number. That keeps F3 inside the same "engine owns truth" contract as F1.
- **Why it helps THIS app:** Same first-contact goal as F2 — **lower cognitive load while learning the skill for the first time.** Removing the specific goal removes the backward-reasoning (means-ends) overload novices hit on multi-variable projectile calcs, freeing working memory to build the actual relationships. A lesson tool, not a review tool.
- **Scope (deliberate):** Calculation lessons/skills **L3 `projectile-calculations`** and **L4 `velocity-range-height`** only — i.e. where a single launch yields multiple relevant quantities. **L1 `projectile-shape` and L2 `complementary-angles` are excluded**, since a "find everything" framing adds nothing to single-concept intuition steps.
- **Research basis:** Sweller (1988), *Cognitive Load During Problem Solving*: a specific goal forces means-ends analysis (working backward, juggling subgoals), imposing heavy cognitive load that interferes with learning problem structure. A nonspecific goal ("calculate as many variables as you can") eliminates that search, lowers load, and improves schema acquisition and transfer — Sweller's goal-free kinematics/trig problems yielded ~4–6× fewer math errors per quantity and better later performance, and a computational model needed far fewer productions/cycles than means-ends.
- **How we ground & verify it:** The **engine (`physics.ts` → `deriveQuantities`) computes and grades** the full answer set; the AI is confined to *semantic mapping* (learner label → canonical key, via structured JSON output) and never touches correctness. The AI is the **sole interpreter** of the label — the standards (paraphrase/typo tolerance, the launch-instant rule, "judge the whole phrase, not stray keywords") are spelled out in the prompt; there is **no offline matcher**. If the AI is unreachable, the open-entry UI says the grader is temporarily unavailable and doesn't penalize the attempt. Unmappable entries are marked "couldn't check," never wrong. Implemented as an additive `goal_free_problem` step type; existing steps unchanged.
- **AI on/off:** **AI on** → open entry, learner names quantities (true goal-free). **AI off** → a fixed labeled-quantity list, engine-graded. Both modes grade identically through the engine; only the *naming* of quantities differs.

**Implementation notes (what we actually built)**
- **Runtime:** **OpenAI via a Firebase Cloud Function proxy.** A callable `aiGenerate` (`functions/src/index.ts`, default `gpt-4o-mini`, temperature 0, JSON-schema structured outputs) holds the `OPENAI_API_KEY` secret server-side and requires an authenticated user; the client wrapper `src/lib/ai/client.ts` (`generateJson` for structured mapping, `generateText` for prose) calls it via `httpsCallable`. We moved off Firebase AI Logic / Gemini because the Gemini free tier caps `gemini-2.5-flash` at ~20 req/day; OpenAI pay-as-you-go removes the cap. A backend is **required** here (unlike Gemini's safe in-browser path) because an OpenAI key must never reach the client. **App Check is implemented client-side** (`src/lib/firebase.ts`, reCAPTCHA v3, gated on `VITE_RECAPTCHA_SITE_KEY`, with a localhost debug-token path); **enforcement on the function is the final activation step** — flip `enforceAppCheck: true` in `functions/src/index.ts` and redeploy once the reCAPTCHA key is configured and verified locally.
- **Toggle & persistence:** `aiEnabled` lives on the user profile (Firestore), set via a Home-page switch; `StepPlayer` routes `goal_free_problem` to the open-entry component only when it's on.
- **Units are engine-checked, not AI-checked:** a deterministic `src/lib/units.ts` parses the learner's unit, enforces the right **dimension** (e.g. rejects `20 m` entered as a speed), and converts to SI before the engine compares. The AI is explicitly told to **ignore units**. This closed the earlier "20 m accepted as a speed" hole.
- **Velocities mean the *initial launch* components — a prompt standard:** `vx`/`vy` are the values at launch. A label that pins a velocity to another moment ("vertical speed **at max height**" = 0 at the apex, "**final/impact** speed", "speed **at landing**") is a different quantity the engine doesn't grade. This rule is stated explicitly in the mapping prompt — including "don't latch onto a stray keyword like 'highest point'" — so the AI returns "couldn't check" for these. (We briefly hard-coded a deterministic regex override for this but **removed it** in favor of AI-only interpretation, per the "no offline grader" decision.)
- **Goal-free-safe coaching for no-credit rows ("?" unmatched AND ℹ given):** a **live AI explanation** ("The AI grader says:") tells the learner *why* a row earned no credit. The full **problem statement is passed into the prompt** so the response is specific to the actual question rather than generic filler — e.g. a quantity that's already stated ("height" when the max height is given) gets "that's already given, use it to find something you don't know yet", out-of-scope physics (energy, momentum…) gets "this exercise only grades the launch's kinematics", and gibberish gets "not a quantity I recognize". It's still prompt-constrained to **never enumerate the checkable unknowns or suggest the exact name to type** (that would defeat goal-free). A short static message covers AI outages.
- **Pass rule:** start with ~5 open rows; **≥ 3 engine-verified correct** to pass, but the learner may keep going for the rest (Continue vs. Check again). `requiredCount` defaults to 3.
- **Hints (goal-free):** raised the reveal threshold to **5 wrong attempts** (`GOAL_FREE_HINT_THRESHOLD`) and rewrote L3/L4 hints to be **conceptual nudges about method, not the answer**. The old "show explanation / show answer" affordance was **removed app-wide** (hints only).
- **L3 vs L4 are deliberately different problems:** L3 gives angle + speed and asks for the derivable set; **L4 works *backward*** — it gives the launch speed and the **max height** (`givenKeys: ['maxHeight']`, angle hidden) and asks for everything else (`v_y = √(2gH)` → `vₓ = √(v²−v_y²)` → timing/range). A `givenKeys` field marks stated quantities as "given, doesn't count" so re-typing them isn't credited.

---

## Summary table

| Feature | Status | Uses AI? | One-line value | Grounding / verification | Where it lives |
|---|---|---|---|---|---|
| **F1 Spaced Review** | Designed, not built | **Yes** | Endless fresh, due-based retrieval that fixes "runs dry" and fights forgetting | Engine solves params first; AI only phrases; output re-verified vs engine before display (bounded retries → templated fallback); pure unit-tested scheduler | Reviews (normal numeric / MC problems only) |
| **F2 Worked Examples** | Shipped | **No** | Faded worked→completion→full solutions that cut cognitive load on first contact with a multi-step calc | Hand-authored static content; no generation to verify; values follow from `physics.ts`; additive step type | Lessons only (L3/L4) |
| **F3 Goal-Free Problems** | Shipped | **Interpret only** | "Find as many quantities as you can" — lowers load while first learning a multi-variable skill | Engine computes & grades the full set deterministically + unit/dimension check; AI is the sole label → canonical-quantity interpreter (standards in the prompt, no offline matcher), never grades values; ≥ 3 correct to pass; no answers revealed | Lessons only (L3/L4) |

**Cross-cutting guarantees**
- The LLM never decides correctness — `src/lib/physics.ts` does. AI writes prose (F1) or maps a learner's words to a canonical quantity (F3); the engine grades every number.
- **AI is used only in F1 and F3, and only for language — never for grading.** F2 is hand-authored with no AI. F3's *values* are engine-graded in both modes; AI only resolves *which* quantity the learner named when open entry is on.
- The learner-controlled **`aiEnabled` toggle** (Home page, Firestore-persisted) turns AI off entirely: F3 reverts to the fixed labeled-quantity list (and, when built, F1 reviews use templated engine-built problems). With AI **on**, F3's label interpretation is **AI-only** (no offline matcher) — if the model errors/times out, the open-entry UI surfaces "grader unavailable" rather than grading; value + unit/dimension checking stays deterministic in `physics.ts`/`units.ts` regardless. Phase 1 behavior is unchanged throughout.
- Model I/O is structured JSON against a schema (F3 quantity-mapping; F1 problem when built), except the short "why didn't this match" coaching prose, which is plain text and answer-free by construction.
- F2/F3 ship as **additive** step types — existing lessons/steps are untouched.

---

## What we deliberately left out / deferred

- **Chatbot / general Q&A** — *rejected.* Discouraged by the brief, ungroundable, hard to verify, invites hallucinated physics. It would dilute our edge — *verified, in-context* practice.
- **Standalone "Infinite Practice" page** — *folded into F1.* On-demand practice without a schedule doesn't fight forgetting; the scheduled surface is what makes spacing happen.
- **Targeted misconception hints / wrong-answer explanations** — *deferred.* A diagnosis-driven hint system (detect the specific error signature, have AI phrase an answer-free nudge) is promising but out of scope this phase; reviews reuse Phase 1 static hints.
- **Adaptive lesson sequencing** — *deferred.* Too few, linear lessons to reorder meaningfully; the sequential unlock already routes learners. Revisit when the library is large.
- **User-entered AP exam date / exam-anchored lags** — *deferred.* A clean enhancement (set lag ≈ 10–20% of remaining retention); Phase 2 uses a fixed ladder.
- **AI rewriting core teaching steps** — *rejected.* Hand-authored lessons already teach well; regenerating them adds hallucination risk with no upside and violates "additions, not replacements."
- **Server-side validation of core lessons** — *rejected.* Answer checking stays client-side and deterministic.
- **App Check enforcement** — *client implemented; enforcement is the last pre-launch step.* The client wires reCAPTCHA v3 App Check (`src/lib/firebase.ts`); the `aiGenerate` function still runs `enforceAppCheck: false` so local testing works without a key. Activate by setting `VITE_RECAPTCHA_SITE_KEY`, registering a localhost debug token, then flipping `enforceAppCheck: true` and redeploying.
- **Expanding F3's canonical catalog (impact speed/angle, energy, momentum)** — *deferred.* Kept to the six kinematic launch quantities; everything else is intentionally "couldn't check" with an answer-free explanation. Energy etc. are valid physics but out of this exercise's scope.

---

## Why this is safe (the verification story)

The defining risk of AI tutoring is **confidently wrong math**. We design it out by keeping the AI away from *grading* entirely — it only ever produces or interprets *language*, while `physics.ts` owns every number:

1. **AI never grades.** F2 has no AI. In F1 the AI only *phrases* a problem the engine already solved; in F3 the AI only *maps a learner's label* to a canonical quantity. Correctness is always an engine computation.
2. For F1 generation, we compute the answer with the engine *before* prompting, then **re-verify** the model's output against the engine and reject mismatches (bounded retries, then templated fallback).
3. Degradation: with AI **off**, F3 uses the fixed labeled list and (when built) F1 uses engine-built problems. With AI **on**, F3 interpretation is AI-only — if the model errors/times out, the open-entry UI says the grader is temporarily unavailable (no offline matcher) and the learner isn't penalized; the rest of the lesson keeps working.
4. F3's **value grading** is fully deterministic: the engine produces and grades the quantity set, recomputing every learner entry in `physics.ts`. The AI's mapping only decides *which* quantity a value is checked against; a bad mapping yields "couldn't check," never a wrong "correct."
5. Units/dimensions are validated deterministically in `units.ts` (a speed entered in metres is rejected), independent of the AI. The launch-instant rule ("at max height", "final", "at landing" → not gradeable) is enforced through the mapping prompt's standards rather than a hard-coded override. So the only thing the model affects is *which* quantity an entry maps to; the value and unit truth remain the engine's.

Net: a learner can never be shown a wrong number by the AI — the AI handles only prose and interpretation, and the engine gates every value.

---

## Open decisions (tracked in `PRD-Phase2.md` §11)

1. ~~**AI runtime/provider**~~ — **DECIDED (revised 2026-06):** **OpenAI** (`gpt-4o-mini` default) behind a **Firebase Cloud Function proxy** (`aiGenerate`), with the API key as a server-side secret. Replaced the original Firebase AI Logic / Gemini choice after the Gemini free tier's ~20 req/day cap on `gemini-2.5-flash` proved limiting; OpenAI pay-as-you-go removes the cap. The proxy is required because an OpenAI key cannot be exposed client-side. (App Check is implemented client-side; enforcing it on the function — flip `enforceAppCheck: true` + redeploy — is the final pre-launch step.)
2. **Review session cap** — problems per session (default 2–4) and per day. *(Open — part of unbuilt F1.)*
3. ~~**Pass thresholds (F3)**~~ — **DECIDED for goal-free:** `requiredCount` = **3** engine-verified quantities to pass, with the learner free to keep going. (Review/skill pass thresholds remain open with F1.)
4. ~~**F3 open-entry scope**~~ — **DECIDED:** AI maps label → canonical quantity **only** (never grades); catalog is the six kinematic quantities (`vx`, `vy`, range, max height, flight time, time-to-peak), with velocities meaning the **launch** components; the catalog is **not** expanded (impact speed/angle, energy, etc. stay "couldn't check").

**Decided:** F2 & F3 apply only to the calculation lessons/skills — **L3 `projectile-calculations`** and **L4 `velocity-range-height`** (multi-step / multi-variable); L1/L2 excluded.

---

## To fill in after building (evidence for the writeup)

- Verification pass / fall-back rates from `users/{uid}/aiEvents` (e.g. "X% of generations passed first try").
- Scheduler unit-test coverage; a worked example of the box advance/lapse logic.
- Before/after note: course had N fixed problems → now effectively unlimited, with spaced retention.
- One concrete example each: a generated review problem (with the engine check), a faded worked-example progression, and a goal-free problem with its engine-verified answer set.
