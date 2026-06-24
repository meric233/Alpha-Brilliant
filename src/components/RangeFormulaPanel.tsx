import { useMemo } from 'react'
import type { SimConfig } from '../content/types'
import { range } from '../lib/physics'
import { GRAVITY } from '../lib/constants'
import { ProjectileSim } from './ProjectileSim'
import { SinGraph } from './SinGraph'

type Props = {
  angle: number
  velocity: number
  onAngleChange: (v: number) => void
  onVelocityChange: (v: number) => void
  angleRange: [number, number]
  simConfig: SimConfig
  stepId: string
}

export function RangeFormulaPanel({
  angle,
  velocity,
  onAngleChange,
  onVelocityChange,
  angleRange,
  simConfig,
  stepId,
}: Props) {
  const g = GRAVITY
  const sin2 = useMemo(
    () => Math.sin((2 * angle * Math.PI) / 180),
    [angle],
  )
  const currentRange = useMemo(() => range(angle, velocity, g), [angle, velocity, g])

  return (
    <div className="range-formula-panel">
      <div className="range-formula-linked">
        <div className="range-formula-sim">
          <p className="range-formula-sim-label">Projectile range (live)</p>
          <ProjectileSim
            angle={angle}
            velocity={velocity}
            onAngleChange={onAngleChange}
            onVelocityChange={onVelocityChange}
            showAngle={false}
            showVelocity={false}
            simConfig={simConfig}
            simKey={stepId}
          />
          <p className="range-formula-readout">
            R = {currentRange.toFixed(1)} m at θ = {angle}°
          </p>
        </div>
        <SinGraph
          angle={angle}
          onAngleChange={onAngleChange}
          angleRange={angleRange}
          velocity={velocity}
          gravity={g}
          showSlider={false}
          showRangeLink
        />
      </div>
      <label className="sim-slider range-formula-slider">
        <span>Launch angle θ: {angle}°</span>
        <input
          type="range"
          min={angleRange[0]}
          max={angleRange[1]}
          value={angle}
          onChange={(e) => onAngleChange(Number(e.target.value))}
        />
      </label>
      <p className="range-formula-sync-note">
        Range R = v² sin(2θ) / g — so <strong>R ∝ sin(2θ)</strong> at fixed speed. Right now
        sin(2θ) = {sin2.toFixed(3)}.
      </p>
    </div>
  )
}
