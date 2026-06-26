import { GRAVITY } from './constants'

const ZERO_G_HORIZON = 6 // seconds of flight shown when g = 0

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function positionAt(
  angleDeg: number,
  velocity: number,
  t: number,
  g: number = GRAVITY,
): { x: number; y: number } {
  const rad = degToRad(angleDeg)
  const vx = velocity * Math.cos(rad)
  const vy = velocity * Math.sin(rad)
  return {
    x: vx * t,
    y: vy * t - 0.5 * g * t * t,
  }
}

export function flightTime(
  angleDeg: number,
  velocity: number,
  g: number = GRAVITY,
): number {
  const rad = degToRad(angleDeg)
  const vy = velocity * Math.sin(rad)
  if (g === 0) {
    if (vy <= 0) return ZERO_G_HORIZON
    return ZERO_G_HORIZON
  }
  if (vy <= 0) return 0.001
  return (2 * vy) / g
}

export function range(angleDeg: number, velocity: number, g: number = GRAVITY): number {
  if (g === 0) {
    const rad = degToRad(angleDeg)
    const vx = velocity * Math.cos(rad)
    return vx * ZERO_G_HORIZON
  }
  const rad = degToRad(angleDeg)
  return (velocity * velocity * Math.sin(2 * rad)) / g
}

export function maxHeight(angleDeg: number, velocity: number, g: number = GRAVITY): number {
  if (g === 0) {
    const rad = degToRad(angleDeg)
    const vy = velocity * Math.sin(rad)
    if (vy <= 0) return 0
    return vy * ZERO_G_HORIZON
  }
  const rad = degToRad(angleDeg)
  const vy = velocity * Math.sin(rad)
  return (vy * vy) / (2 * g)
}

export function sampleTrajectory(
  angleDeg: number,
  velocity: number,
  steps = 80,
  g: number = GRAVITY,
): { x: number; y: number }[] {
  const tMax = flightTime(angleDeg, velocity, g)
  if (tMax <= 0) return [{ x: 0, y: 0 }]
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * tMax
    points.push(positionAt(angleDeg, velocity, t, g))
  }
  return points
}

export function peakPosition(
  angleDeg: number,
  velocity: number,
  g: number = GRAVITY,
): { x: number; y: number } {
  if (g === 0) {
    const rad = degToRad(angleDeg)
    const vy = velocity * Math.sin(rad)
    const vx = velocity * Math.cos(rad)
    if (vy <= 0) return { x: vx * ZERO_G_HORIZON, y: 0 }
    return { x: vx * ZERO_G_HORIZON, y: maxHeight(angleDeg, velocity, g) }
  }
  const rad = degToRad(angleDeg)
  const vy = velocity * Math.sin(rad)
  const vx = velocity * Math.cos(rad)
  const tPeak = vy / g
  return { x: vx * tPeak, y: maxHeight(angleDeg, velocity, g) }
}

export function landingPosition(
  angleDeg: number,
  velocity: number,
  g: number = GRAVITY,
): { x: number; y: number } {
  return { x: range(angleDeg, velocity, g), y: 0 }
}

// Full set of quantities derivable from a single launch. Single source of
// truth for grading F3 goal-free problems — the engine, not any model.
export type DerivedQuantities = {
  vx: number
  vy: number
  range: number
  maxHeight: number
  flightTime: number
  timeToPeak: number
}

export function deriveQuantities(
  angleDeg: number,
  velocity: number,
  g: number = GRAVITY,
): DerivedQuantities {
  const rad = degToRad(angleDeg)
  const vy = velocity * Math.sin(rad)
  return {
    vx: velocity * Math.cos(rad),
    vy,
    range: range(angleDeg, velocity, g),
    maxHeight: maxHeight(angleDeg, velocity, g),
    flightTime: flightTime(angleDeg, velocity, g),
    timeToPeak: g === 0 ? 0 : vy / g,
  }
}

export function simMatchTolerance(
  angle: number,
  velocity: number,
  targetAngle: number,
  targetVelocity: number,
): boolean {
  return Math.abs(angle - targetAngle) <= 3 && Math.abs(velocity - targetVelocity) <= 1
}
