# BrainLift — Paraboloα Phase 2

A brief BrainLift for Phase 2 of Paraboloα, an AP Physics C **projectile motion** app. It captures the *why* behind what we built — **worked examples** and **AI-graded goal-free problems** — grounded in Sweller's work on cognitive load.

## Owners

- Meric Xing

---

## Purpose

### Purpose

To define **how AI should help a novice learn a fully-deterministic skill.** Projectile motion is exactly computable by a closed-form engine, so the real question isn't "how do we make more problems?" but "how do we lower the *cognitive load* of first-time learning while keeping every graded value provably correct?" Our answer: AI handles only **language and interpretation**, the **engine owns all grading**, and we scaffold first contact with worked examples and goal-free problems.

### In Scope

- Lowering **cognitive load** for novices meeting a multi-step projectile calculation for the first time.
- **Worked examples** and **goal-free problems** as first-contact scaffolds in calculation lessons.
- A strict split: **AI interprets/phrases, the engine verifies/grades.**

### Out of Scope

- **AI grading of numeric answers** — correctness is always an engine computation.
- A **chatbot / open Q&A** surface.
- **Spaced review / scheduling** — designed but thrown out for now (see below).

---

## DOK 4: Spiky Point of View

- **SPOV — A novice doesn't need more problems; they need *less search*.**
  - **Elaboration:** The obvious move for a practice app is "generate endless 'find X' problems." For a *novice* that's nearly the worst thing to do. Sweller (1988) shows a specific goal forces **means-ends analysis** — working backward, juggling subgoals — which consumes the working memory needed to build **schemas** (the organized knowledge that *is* expertise). So for first contact we remove the search two ways: **worked examples** model the full method (then fade to completion problems, then solo), and **goal-free problems** drop the specific target ("find as many quantities as you can"). The catch is that a true goal-free problem can't show a labeled list of blanks — that re-introduces a goal — so the learner types quantities in their own words, which only a language model can interpret reliably. But the model must **never grade**, since every answer is exactly computable and confidently-wrong math is the #1 failure of AI tutoring. So we split it cleanly: **AI maps the learner's label → a canonical quantity; the engine recomputes and grades the value** (with deterministic unit/dimension checks). A bad mapping yields "couldn't check," never a wrong "correct." Same goal as a worked example — lower load while first learning — done safely.

> **Thrown out: spaced review.** Distributed practice is high-utility in the literature (Dunlosky 2013; Rosenshine 2012). It was not implemented because its payoff scales with library size, and we have only **four lessons** — there's too little to space, so the scheduling machinery isn't worth the overhead yet. Worth revisiting once the course is much larger.

---

## Experts

- **John Sweller** — originator of **Cognitive Load Theory** (UNSW). His 1988 paper is the direct basis for both shipped features: a specific goal triggers working-memory-hungry means-ends search that starves schema acquisition, so **worked examples** and **goal-free problems** lower load and improve learning, with support faded as fluency grows. *Cognitive Science* 12(2), 1988.
- **Carl Hendrick - briefly mentioned the cognitive load theory in his talk on Thursday**

---

## DOK 3: Insights

- **For a novice, the goal *is* the problem.** Removing the specific target ("find what you can") drops the means-ends load without changing what's practiced — which is why goal-free problems belong in lessons (first contact), not reviews.
- **A worked example is a "find X" problem with the search deleted.** It hands the learner a schema to imitate instead of forcing them to invent one under load. Hand-authored, so nothing can hallucinate.
- **Determinism is a license to constrain AI hard.** Because `physics.ts` computes every answer, AI can be confined to *language* and still guarantee correctness — the subject's nature, not a policy, designs out wrong-math risk.
- **Feature value scales with content volume.** Worked examples/goal-free pay off at the single hardest lesson; spaced review only pays off across many. At four lessons, build the first two, defer the third.

---

## DOK 2: Knowledge Tree

- **Cognitive Load Theory (basis for what we shipped)**
  - **Source:** Sweller, J. (1988). *Cognitive Load During Problem Solving: Effects on Learning.* Cognitive Science, 12(2), 257–285.
    - **DOK 1 — Facts:** A specific goal is solved by **means-ends analysis**, which imposes heavy load that interferes with **schema acquisition**. **Goal-free** problems ("calculate as many variables as you can") remove that search; in Sweller's kinematics experiments they produced far fewer errors and better later performance, and a forward-working model needed far fewer processing cycles than means-ends. **Worked examples** similarly cut load; fade support as expertise grows.
    - **DOK 2 — Summary:** Working memory is the bottleneck; a specific goal spends it on search instead of learning. Remove the goal (goal-free) or the search (worked examples) to free capacity for building schemas — most valuable at first contact, faded as the learner becomes fluent.
    - **Link:** [https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4)

