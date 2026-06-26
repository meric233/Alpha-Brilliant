import type { GoalFreeQuantityKey } from '../content/types'

// Deterministic unit handling for goal-free grading. We never trust the model
// to validate units — the engine checks dimensions and converts to SI here so
// that e.g. "20 m" entered for a speed (m/s) is correctly rejected.

export type Dimension = 'speed' | 'length' | 'time'

export const KEY_DIMENSION: Record<GoalFreeQuantityKey, Dimension> = {
  vx: 'speed',
  vy: 'speed',
  range: 'length',
  maxHeight: 'length',
  flightTime: 'time',
  timeToPeak: 'time',
}

export type ParsedUnit = { dimension: Dimension; factor: number }

// Canonical SI: speed → m/s, length → m, time → s. `factor` converts the
// entered value into canonical units.
const UNIT_TABLE: Record<string, ParsedUnit> = {
  // speed
  'm/s': { dimension: 'speed', factor: 1 },
  'm/sec': { dimension: 'speed', factor: 1 },
  'm/second': { dimension: 'speed', factor: 1 },
  'meter/second': { dimension: 'speed', factor: 1 },
  'meters/second': { dimension: 'speed', factor: 1 },
  'metre/second': { dimension: 'speed', factor: 1 },
  'metres/second': { dimension: 'speed', factor: 1 },
  mps: { dimension: 'speed', factor: 1 },
  'km/h': { dimension: 'speed', factor: 1 / 3.6 },
  'km/hr': { dimension: 'speed', factor: 1 / 3.6 },
  'kilometers/hour': { dimension: 'speed', factor: 1 / 3.6 },
  kph: { dimension: 'speed', factor: 1 / 3.6 },
  'cm/s': { dimension: 'speed', factor: 0.01 },
  'km/s': { dimension: 'speed', factor: 1000 },
  // length
  m: { dimension: 'length', factor: 1 },
  meter: { dimension: 'length', factor: 1 },
  meters: { dimension: 'length', factor: 1 },
  metre: { dimension: 'length', factor: 1 },
  metres: { dimension: 'length', factor: 1 },
  km: { dimension: 'length', factor: 1000 },
  kilometer: { dimension: 'length', factor: 1000 },
  kilometers: { dimension: 'length', factor: 1000 },
  cm: { dimension: 'length', factor: 0.01 },
  centimeter: { dimension: 'length', factor: 0.01 },
  centimeters: { dimension: 'length', factor: 0.01 },
  mm: { dimension: 'length', factor: 0.001 },
  // time
  s: { dimension: 'time', factor: 1 },
  sec: { dimension: 'time', factor: 1 },
  secs: { dimension: 'time', factor: 1 },
  second: { dimension: 'time', factor: 1 },
  seconds: { dimension: 'time', factor: 1 },
  ms: { dimension: 'time', factor: 0.001 },
  millisecond: { dimension: 'time', factor: 0.001 },
  milliseconds: { dimension: 'time', factor: 0.001 },
  min: { dimension: 'time', factor: 60 },
  mins: { dimension: 'time', factor: 60 },
  minute: { dimension: 'time', factor: 60 },
  minutes: { dimension: 'time', factor: 60 },
}

function normalizeUnit(raw: string): string {
  let s = raw.trim().toLowerCase()
  if (!s) return ''
  s = s.replace(/\./g, '')
  s = s.replace(/\s*per\s*/g, '/')
  s = s.replace(/\s+/g, '')
  return s
}

/** Parse a unit string, or null if unrecognized. */
export function parseUnit(raw: string): ParsedUnit | null {
  const key = normalizeUnit(raw)
  if (!key) return null
  return UNIT_TABLE[key] ?? null
}

export type UnitCheck =
  | { ok: true; canonicalValue: number }
  | { ok: false; reason: 'wrong-dimension' | 'unknown-unit' }

/**
 * Validate + convert a learner's entered value for a given quantity.
 * - No unit string → assume canonical SI (lenient).
 * - Unit present but unknown → fail (unknown-unit).
 * - Unit present but wrong dimension (e.g. "m" for a speed) → fail.
 */
export function checkAndConvert(
  key: GoalFreeQuantityKey,
  value: number,
  unitRaw: string | undefined,
): UnitCheck {
  const expected = KEY_DIMENSION[key]
  const raw = (unitRaw ?? '').trim()
  if (raw === '') return { ok: true, canonicalValue: value }

  const parsed = parseUnit(raw)
  if (!parsed) return { ok: false, reason: 'unknown-unit' }
  if (parsed.dimension !== expected) return { ok: false, reason: 'wrong-dimension' }
  return { ok: true, canonicalValue: value * parsed.factor }
}
