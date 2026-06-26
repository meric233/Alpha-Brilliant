import type { GoalFreeQuantityKey } from '../../content/types'
import { generateJson, generateText } from './client'
import { CANONICAL_KEYS, mappingJsonSchema, type MappingResponse } from './schemas'

// F3 goal-free interpretation. The AI is the sole judge of what physical
// quantity a learner's free-text label refers to — we just give it the
// standards in the prompt. There is intentionally NO offline/deterministic
// matcher: when the AI is unavailable the call throws and the UI surfaces that,
// rather than silently grading with a weaker heuristic.
//
// The AI only *interprets* the label. The engine still verifies the numeric
// value and unit (see GoalFreeOpenEntry + units.ts) — that is the Prime
// Directive: AI interprets, engine grades the value.

export type CatalogEntry = {
  key: GoalFreeQuantityKey
  label: string
  unit: string
  description: string
  aliases: string[]
}

export const QUANTITY_CATALOG: CatalogEntry[] = [
  {
    key: 'vx',
    label: 'Horizontal velocity',
    unit: 'm/s',
    description:
      'Horizontal component of the INITIAL launch velocity, v·cosθ. (It happens to stay constant, but this key means the launch horizontal speed.)',
    aliases: [
      'vx',
      'horizontal velocity',
      'horizontal speed',
      'x velocity',
      'sideways speed',
      'horizontal component',
    ],
  },
  {
    key: 'vy',
    label: 'Vertical velocity',
    unit: 'm/s',
    description:
      'Vertical component of the INITIAL launch velocity, v·sinθ (its value at the moment of launch — NOT at the peak, where vertical speed is 0, and NOT at landing).',
    aliases: [
      'vy',
      'vertical velocity',
      'vertical speed',
      'y velocity',
      'upward speed',
      'vertical component',
      'initial vertical velocity',
    ],
  },
  {
    key: 'range',
    label: 'Range',
    unit: 'm',
    description: 'Horizontal distance traveled before landing on level ground.',
    aliases: [
      'range',
      'distance',
      'horizontal distance',
      'how far',
      'how far it goes',
      'landing distance',
      'x distance',
    ],
  },
  {
    key: 'maxHeight',
    label: 'Maximum height',
    unit: 'm',
    description: 'Peak vertical height above the launch point.',
    aliases: [
      'max height',
      'maximum height',
      'peak height',
      'height',
      'highest point',
      'apex height',
    ],
  },
  {
    key: 'flightTime',
    label: 'Time of flight',
    unit: 's',
    description: 'Total time in the air until it lands.',
    aliases: [
      'time of flight',
      'flight time',
      'hang time',
      'total time',
      'time in air',
      'airtime',
    ],
  },
  {
    key: 'timeToPeak',
    label: 'Time to peak',
    unit: 's',
    description: 'Time to reach maximum height (half the flight time).',
    aliases: [
      'time to peak',
      'time to apex',
      'time to top',
      'time to max height',
      'rise time',
      'time to highest point',
    ],
  },
]

export type Mapping = {
  key: GoalFreeQuantityKey | 'unsupported'
  confidence: number
}

function buildPrompt(labels: { name: string; unit?: string }[], scenario?: string): string {
  const catalog = QUANTITY_CATALOG.map(
    (e) =>
      `- ${e.key}: ${e.description} Canonical unit: ${e.unit}. Examples: ${e.aliases.join(', ')}.`,
  ).join('\n')
  const items = labels
    .map((l, i) => `${i}. "${l.name}"${l.unit ? ` [learner unit: ${l.unit}]` : ''}`)
    .join('\n')

  return `You map a physics learner's free-text quantity names to canonical projectile-motion quantities for a single projectile launched over level ground. Do NOT compute, verify, or judge any numeric values, and IGNORE units entirely (units are validated separately). Only classify which physical quantity the learner is referring to.
${scenario ? `\nThe problem the learner is working on (for context — e.g. a bare word like "height" means the max height here):\n"${scenario}"\n` : ''}
Canonical quantities:
${catalog}

For EACH learner label below, choose the single best-matching canonical key, or "unsupported".

Judge the MEANING OF THE WHOLE PHRASE, not individual words in isolation:
- Be generous with paraphrases, e.g. "speed in the vertical direction", "how fast it's going up", and "vertical velocity" all map to vy.
- Tolerate spelling mistakes, typos, and abbreviations, e.g. "vertical sped"/"vertical spd" → vy, "maximun height" → maxHeight, "horizantal distance" → range, "dist" → range.
- Map synonyms, e.g. "hang time" → flightTime, "how far it travels" → range, "peak height" → maxHeight.
- Do NOT latch onto a single stray keyword. "vertical speed at the highest point" is a VELOCITY at the apex (see the velocity rule below) — it is "unsupported", even though it contains the words "highest point". Likewise "speed at landing" is unsupported, not a distance.

CRITICAL — velocities mean the INITIAL launch components only:
- vx and vy are the horizontal/vertical speeds AT THE MOMENT OF LAUNCH.
- If a label describes a speed or velocity pinned to a DIFFERENT instant (the peak/apex/top/highest point, landing/impact/ground, or "final"), it is a physically different quantity this exercise does NOT grade → return "unsupported", NOT vx/vy and NOT a positional quantity. Examples that are "unsupported": "vertical speed at max height" (that is 0 at the apex), "speed at the top", "velocity at landing", "final speed", "impact speed", "speed when it lands".
- Only map to vy/vx when the label means the launch/initial value, or is an unqualified speed/velocity (e.g. plain "vertical speed", which we treat as the launch value).

Use "unsupported" when the label:
- is not one of the listed quantities (e.g. air resistance, kinetic energy, momentum, mass, acceleration, launch angle, initial total speed), OR
- is a velocity at a non-launch instant as described above, OR
- is gibberish / unrecognizable.

Return for each label:
- index: echo the label's index.
- canonicalKey: one of the keys above or "unsupported".
- confidence: 0 to 1.

Learner labels:
${items}

Respond with JSON only, one mapping object per label.`
}

/**
 * Map each learner label to a canonical quantity using the AI. Throws on AI
 * failure / timeout (no offline fallback) so the caller can tell the learner the
 * grader is temporarily unavailable.
 */
export async function interpretQuantities(
  labels: { name: string; unit?: string }[],
  scenario?: string,
): Promise<Mapping[]> {
  if (labels.length === 0) return []

  const res = await generateJson<MappingResponse>(
    buildPrompt(labels, scenario),
    mappingJsonSchema,
    'quantity_mapping',
  )

  const byIndex = new Map<number, Mapping>()
  for (const m of res.mappings ?? []) {
    const key = (CANONICAL_KEYS as string[]).includes(m.canonicalKey)
      ? (m.canonicalKey as GoalFreeQuantityKey)
      : 'unsupported'
    byIndex.set(m.index, {
      key,
      confidence: typeof m.confidence === 'number' ? m.confidence : 0,
    })
  }

  return labels.map(
    (_, i) => byIndex.get(i) ?? { key: 'unsupported', confidence: 0 },
  )
}

export type CoachReason = 'given' | 'unmatched'

/**
 * Live AI coaching for a row that didn't earn credit — either because the label
 * names a quantity ALREADY GIVEN in the problem (`given`) or because it couldn't
 * be matched to anything the engine can grade (`unmatched`). The full problem
 * statement is passed in so the AI can reason specifically (e.g. recognize that
 * "height" is the given max height) instead of emitting generic filler. Prose
 * only — it never grades a value. Throws on AI failure so the caller can fall
 * back to a short static message.
 */
export async function explainRow(args: {
  name: string
  unit?: string
  reason: CoachReason
  scenario: string
}): Promise<string> {
  const { name, unit, reason, scenario } = args

  const common = `You are coaching a learner during a "goal-free" projectile-motion exercise: they must decide for themselves which quantities to derive from one launch, and an engine grades each entry.

The EXACT problem they are working on:
"${scenario}"

The learner entered the quantity name "${name}"${unit ? ` with unit "${unit}"` : ''}.

Write 1-2 short, encouraging sentences addressed to the learner as "you". Be specific to THIS problem and THIS input — never generic filler like "it doesn't match the expected format". Plain text only, no markdown.`

  const rules =
    reason === 'given'
      ? `This quantity is ALREADY GIVEN in the problem statement above, so re-entering it earns no credit. Say specifically that it's already provided in the problem, and nudge them to instead derive a quantity that ISN'T given yet. Do NOT reveal or compute any numeric value, and do NOT list the other quantities they could find.`
      : `The engine could NOT match this to a quantity it can grade. Briefly explain why, specific to this input:
- If it is actually one of the values already stated in the problem above, point that out.
- If it is a real physics concept outside basic projectile kinematics (energy, momentum, force, mass, air resistance), or a speed/velocity at a non-launch instant (at the peak/top, at landing/impact, "final"), say this exercise only grades kinematic properties of the launch's own motion, so that isn't something it checks.
- If it looks like gibberish or a typo of a non-physics word, say you don't recognize it for this problem and suggest re-checking what they typed.
Do NOT list or hint at which gradeable quantities exist, and do NOT suggest the exact name to type (that would defeat the goal-free exercise). Do NOT reveal any numeric answer.`

  const text = (await generateText(`${common}\n\n${rules}`)).trim()
  return text
}
