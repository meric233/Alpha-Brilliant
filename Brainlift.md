# Brainlift — Paraboloα Phase 2 AI Decision

This is the decision record for the AI features in Phase 2: **what we considered, what we shipped, and what we deliberately left out**, with the reasoning behind each call. Companion to `PRD-Phase2.md`.

---

## TL;DR

We are an AP Physics C **projectile motion** app. Projectile motion is fully deterministic and parametric (`angle`, `velocity`, `g = 10`, no air resistance), and we already own a closed-form physics engine (`src/lib/physics.ts`). That combination makes us a great fit for **AI generation + machine verification**, and a poor fit for open-ended chat.

So we ship two features, both gated by the engine:
- **F1 — Infinite Practice:** AI-generated problems, every answer verified by the engine before it's shown.
- **F2 — Targeted Hints & Wrong-Answer Explanations:** deterministic misconception diagnosis, phrased by AI, never revealing the answer.

We reject the chatbot and defer adaptive sequencing.

---

## The lens: what does THIS subject actually need?

Two facts drove every decision:

1. **The course runs dry.** Phase 1 shipped 3 lessons with fixed capstones. After completion, the only replay is "Retake." A motivated learner exhausts the content fast. The highest-leverage AI use is **endless, correct practice**.
2. **Everything is checkable.** Unlike an essay tutor, every projectile answer is a number we can compute exactly. That means we can let AI write *prose* while the engine owns *truth* — eliminating the #1 risk of AI in education (confidently wrong math).

We refused to "add a chatbot because everyone has one." We started from the subject and the existing app, not from a feature checklist.

---

## What we considered (all four candidates + chatbot)

### 1. Generate new practice problems → **SHIPPED (F1)**
- **For:** Directly fixes the content-runs-dry problem. Projectile problems are parametric, so generation is natural. Crucially, we can **verify every answer** with `physics.ts` and only display problems that pass — so AI literally cannot show a wrong answer.
- **How we ground it:** We sample parameters and compute the answer *first*; the model only phrases a problem around a known-correct answer. Output is structured JSON, re-verified against the engine, with bounded retries and a non-AI templated fallback.
- **Verdict:** Highest value, lowest risk. Ship.

### 2. Targeted hint when stuck → **SHIPPED (as part of F2)**
- **For:** Phase 1 hints are static strings — identical for every learner and every wrong answer. Numeric physics mistakes have **detectable signatures** (e.g. `sin θ` vs `sin 2θ`, dropped factor of 2, radians/degrees). We can diagnose the specific error deterministically, then have AI phrase a nudge that *doesn't* give the answer.
- **How we ground it:** A misconception table (data) maps the relationship between the learner's value and the true value to a likely error. The detector is pure and unit-tested; the LLM only writes the sentence. A guardrail rejects any hint containing the correct final number.
- **Verdict:** High value, well-grounded. Ship.

### 3. Explain a wrong answer in plain language → **SHIPPED (merged into F2)**
- **For:** Same underlying need as #2 for numeric problems — once we know *which* mistake the learner made, explaining it plainly is the same engine-driven diagnosis with a longer response.
- **Why merged:** Splitting them would duplicate the diagnosis pipeline. One feature, two depths (short hint → fuller explanation), is cleaner.
- **Verdict:** Ship, combined with the hint feature.

### 4. Adapt the path based on struggles → **DEFERRED**
- **Against:** With only 3 linear lessons, there is essentially nothing to reorder. The existing sequential unlock already routes learners. An "adaptive" path over 3 nodes is theater, not learning value.
- **Revisit when:** the content library is large enough (many lessons/sub-skills) that ordering is a real decision. At that point the `wrongAttempts` data we already store becomes a useful signal.
- **Verdict:** Out of scope for Phase 2.

### 5. Freeform AI chatbot / tutor → **REJECTED**
- **Against:** Explicitly discouraged by the brief. It is hard to ground in structured state, hard to verify, and invites off-topic questions and hallucinated physics. It would dilute our actual edge — *verified, in-context* feedback — with a generic chat box.
- **Verdict:** Do not build.

---

## What we shipped

| Feature | One-line value | Grounding | Verification | AI-off fallback |
|---|---|---|---|---|
| **F1 Infinite Practice** | Course never runs dry | Engine computes the answer; AI phrases the problem | Engine re-checks stated answer + distractors before display | Templated, engine-built problems |
| **F2 Targeted Hints/Explanations** | Help tuned to the actual mistake, no spoilers | Misconception table over structured state | Pure detector unit-tested; guardrail strips answer leaks | Phase 1 static hint/explanation |

**Cross-cutting guarantees**
- The LLM never decides correctness — `src/lib/physics.ts` does.
- Every AI surface has a deterministic fallback; with `AI_ENABLED = false` the app behaves exactly like the Phase 1 MVP.
- Model I/O is structured JSON against a schema, not free text we loosely parse.

---

## What we deliberately left out

- **Chatbot / general Q&A** — discouraged, ungroundable, off-strategy.
- **Adaptive lesson sequencing** — too few lessons to make ordering meaningful yet.
- **AI rewriting core teaching steps** — the hand-authored lessons already teach well; regenerating them adds hallucination risk with no upside and would violate "additions, not replacements."
- **Server-side validation of core lessons** — answer checking stays client-side and deterministic; no need to move it.

---

## Why this is safe (the verification story)

The defining risk of AI tutoring is **confidently wrong math**. We design that risk out:

1. For generation, we compute the answer with the engine *before* prompting, then **re-verify** the model's output against the engine and reject mismatches.
2. For hints, the **diagnosis is deterministic** (pure functions over numbers); the model only phrases it, and a guardrail prevents answer leakage.
3. If the model errors, times out, or is disabled, we **fall back** to engine-built problems and static hints.

Net: a learner can never be shown a wrong number by the AI.

---

## Open decisions (tracked in `PRD-Phase2.md` §10)

1. AI runtime/provider — Firebase AI Logic + Gemini (recommended) vs Cloud Functions proxy.
2. Practice entry point — standalone page, post-lesson prompt, or both.
3. Friday scope — both F1 and F2, or F1 first then F2 if time allows.

---

## To fill in after building (evidence for the writeup)

- Verification pass/fall-back rates from `users/{uid}/aiEvents` (e.g. "X% of generations passed first try").
- Misconception-detector accuracy on the seeded test set.
- Before/after note: course had N fixed problems → now effectively unlimited.
- One concrete example each: a generated problem (with the engine check) and a targeted hint vs the old static hint.
