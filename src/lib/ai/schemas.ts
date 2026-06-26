import type { GoalFreeQuantityKey } from '../../content/types'

// The canonical projectile quantities the engine can compute and therefore
// grade. The F3 interpreter maps a learner's free-text label onto one of these
// (or "unsupported"). Keep in sync with `deriveQuantities` in physics.ts.
export const CANONICAL_KEYS: GoalFreeQuantityKey[] = [
  'vx',
  'vy',
  'range',
  'maxHeight',
  'flightTime',
  'timeToPeak',
]

export type CanonicalOrUnsupported = GoalFreeQuantityKey | 'unsupported'

// One mapping per learner-entered label. The model only *interprets* — it never
// grades. Units are validated deterministically elsewhere, so the model does not
// report a unit factor.
export type QuantityMapping = {
  index: number
  canonicalKey: CanonicalOrUnsupported
}

export type MappingResponse = {
  mappings: QuantityMapping[]
}

// OpenAI structured-output schema (strict mode): every property must be listed
// in `required` and objects must set `additionalProperties: false`.
export const mappingJsonSchema: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    mappings: {
      type: 'array',
      description: 'One entry per learner label, echoing its index.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          index: {
            type: 'integer',
            description: 'Zero-based index of the learner label this maps to.',
          },
          canonicalKey: {
            type: 'string',
            enum: [...CANONICAL_KEYS, 'unsupported'],
            description: 'Best-matching canonical quantity, or "unsupported".',
          },
        },
        required: ['index', 'canonicalKey'],
      },
    },
  },
  required: ['mappings'],
}
