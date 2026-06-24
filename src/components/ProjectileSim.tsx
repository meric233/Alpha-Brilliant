import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SimConfig } from '../content/types'
import {
  landingPosition,
  maxHeight,
  peakPosition,
  sampleTrajectory,
} from '../lib/physics'
import { GRAVITY } from '../lib/constants'

type Props = {
  angle: number
  velocity: number
  onAngleChange: (v: number) => void
  onVelocityChange: (v: number) => void
  showAngle?: boolean
  showVelocity?: boolean
  simConfig?: SimConfig
  simKey?: string
  onLaunchEnd?: () => void
}

type LaunchSnapshot = { angle: number; velocity: number }

function fixedViewBounds(
  simConfig: SimConfig | undefined,
  angleRange: [number, number],
  velocityRange: [number, number],
  gravityRange: [number, number],
) {
  const angles = new Set<number>([angleRange[0], angleRange[1], 45])
  const velocities = new Set<number>([velocityRange[0], velocityRange[1]])
  const gravities = new Set<number>([gravityRange[0], gravityRange[1]])

  for (const a of [
    simConfig?.scaleAngle,
    simConfig?.ghostAngle,
    simConfig?.targetAngle,
    simConfig?.defaultAngle,
  ]) {
    if (a != null && a >= angleRange[0] && a <= angleRange[1]) angles.add(a)
  }
  for (const v of [
    simConfig?.scaleVelocity,
    simConfig?.ghostVelocity,
    simConfig?.targetVelocity,
    simConfig?.defaultVelocity,
  ]) {
    if (v != null && v >= velocityRange[0] && v <= velocityRange[1]) velocities.add(v)
  }
  if (simConfig?.defaultGravity != null) {
    gravities.add(
      Math.min(gravityRange[1], Math.max(gravityRange[0], simConfig.defaultGravity)),
    )
  }

  let maxRange = 1
  let maxHeightVal = 1

  for (const g of gravities) {
    for (const v of velocities) {
      for (const a of angles) {
        const pts = sampleTrajectory(a, v, 80, g)
        maxRange = Math.max(maxRange, ...pts.map((p) => p.x))
        maxHeightVal = Math.max(maxHeightVal, ...pts.map((p) => p.y))
      }
    }
  }

  const pad = 1.08
  return {
    maxRange: maxRange * pad,
    maxHeight: maxHeightVal * pad,
  }
}

export function ProjectileSim({
  angle,
  velocity,
  onAngleChange,
  onVelocityChange,
  showAngle = true,
  showVelocity = true,
  simConfig,
  simKey,
  onLaunchEnd,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const angleRef = useRef(angle)
  const velocityRef = useRef(velocity)
  const previousLaunchRef = useRef<LaunchSnapshot | null>(null)
  const [launching, setLaunching] = useState(false)
  const [hasLaunched, setHasLaunched] = useState(false)

  angleRef.current = angle
  velocityRef.current = velocity

  const angleRange = simConfig?.angleRange ?? [15, 75]
  const velocityRange = simConfig?.velocityRange ?? [5, 25]
  const ghostAngle = simConfig?.showGhostArc
    ? (simConfig.ghostAngle ?? simConfig.targetAngle)
    : undefined
  const ghostVelocity = simConfig?.showGhostArc
    ? (simConfig.ghostVelocity ?? simConfig.targetVelocity)
    : undefined
  const showMaxHeight = simConfig?.showMaxHeight ?? false
  const showLandingMarker = simConfig?.showLandingMarker ?? false
  const rememberPrevious = simConfig?.rememberPreviousLaunch ?? false
  const livePreview = simConfig?.livePreview ?? false
  const showGravityControl = simConfig?.showGravityControl ?? false
  const gravityRange = simConfig?.gravityRange ?? [GRAVITY, GRAVITY]
  const [gravity, setGravity] = useState(simConfig?.defaultGravity ?? GRAVITY)

  useEffect(() => {
    setGravity(simConfig?.defaultGravity ?? GRAVITY)
  }, [simKey, simConfig?.defaultGravity])

  useEffect(() => {
    previousLaunchRef.current = null
    setHasLaunched(false)
  }, [simKey])

  const viewBounds = useMemo(
    () => fixedViewBounds(simConfig, angleRange, velocityRange, gravityRange),
    [simConfig, angleRange, velocityRange, gravityRange],
  )

  const drawScene = useCallback(
    (trailProgress = 1) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const currentAngle = angleRef.current
      const currentVelocity = velocityRef.current
      const g = gravity
      const previous = rememberPrevious ? previousLaunchRef.current : null

      const w = canvas.width
      const h = canvas.height
      const pad = 24
      const groundY = h - pad

      ctx.clearRect(0, 0, w, h)

      const grad = ctx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#e8f4fc')
      grad.addColorStop(1, '#f7f9fb')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)

      ctx.fillStyle = '#8fbc8f'
      ctx.fillRect(0, groundY, w, pad)
      ctx.strokeStyle = '#5a8a5a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(w, groundY)
      ctx.stroke()

      const cannonX = pad + 20
      const cannonY = groundY

      const { maxRange, maxHeight: viewMaxH } = viewBounds
      const scaleX = (w - pad * 2 - 40) / maxRange
      const scaleY = (groundY - pad) / viewMaxH

      const toCanvas = (x: number, y: number) => ({
        cx: cannonX + x * scaleX,
        cy: cannonY - y * scaleY,
      })

      const drawArc = (
        a: number,
        v: number,
        color: string,
        dashed: boolean,
        progress = 1,
        lineWidth = 3,
      ) => {
        const pts = sampleTrajectory(a, v, 80, g)
        const end = Math.floor(pts.length * progress)
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.setLineDash(dashed ? [7, 5] : [])
        ctx.beginPath()
        pts.slice(0, Math.max(end, 2)).forEach((p, i) => {
          const { cx, cy } = toCanvas(p.x, p.y)
          if (i === 0) ctx.moveTo(cx, cy)
          else ctx.lineTo(cx, cy)
        })
        ctx.stroke()
        ctx.setLineDash([])
      }

      const drawMaxHeightGuide = (a: number, v: number, color: string, label?: string) => {
        const peak = peakPosition(a, v, g)
        const land = landingPosition(a, v, g)
        const h = maxHeight(a, v, g)
        const { cx: peakCx, cy: peakCy } = toCanvas(peak.x, peak.y)
        const { cx: leftCx } = toCanvas(0, peak.y)
        const { cx: rightCx } = toCanvas(land.x, peak.y)
        const { cy: groundCy } = toCanvas(peak.x, 0)

        // vertical drop at peak
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 4])
        ctx.beginPath()
        ctx.moveTo(peakCx, peakCy)
        ctx.lineTo(peakCx, groundCy)
        ctx.stroke()

        // horizontal max-height line
        ctx.lineWidth = 2.5
        ctx.setLineDash([6, 4])
        ctx.beginPath()
        ctx.moveTo(leftCx, peakCy)
        ctx.lineTo(rightCx, peakCy)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = color
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(peakCx, peakCy, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        ctx.font = 'bold 11px system-ui, sans-serif'
        ctx.fillStyle = color
        ctx.textAlign = 'left'
        const labelText = label ?? `max height ${h.toFixed(1)} m`
        ctx.fillText(labelText, Math.min(leftCx + 4, w - 120), peakCy - 8)
      }

      const drawLandingGuide = (a: number, v: number, color: string) => {
        const land = landingPosition(a, v, g)
        const { cx, cy } = toCanvas(land.x, 0)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx, cy - 18)
        ctx.stroke()
        ctx.fillStyle = color
        ctx.beginPath()
        ctx.moveTo(cx, cy - 18)
        ctx.lineTo(cx - 6, cy - 10)
        ctx.lineTo(cx + 6, cy - 10)
        ctx.closePath()
        ctx.fill()
      }

      if (ghostAngle != null && ghostVelocity != null) {
        drawArc(ghostAngle, ghostVelocity, 'rgba(100, 100, 120, 0.5)', true, 1, 2)
      }

      if (previous) {
        drawArc(previous.angle, previous.velocity, 'rgba(234, 88, 12, 0.55)', true, 1, 2)
      }

      drawArc(currentAngle, currentVelocity, '#6c3fc5', false, trailProgress)

      // Guides on top of arcs so they stay visible
      if (ghostAngle != null && ghostVelocity != null) {
        if (showLandingMarker) {
          drawLandingGuide(ghostAngle, ghostVelocity, 'rgba(100, 100, 120, 0.85)')
        }
      }

      if (previous) {
        if (showMaxHeight) {
          drawMaxHeightGuide(
            previous.angle,
            previous.velocity,
            '#ea580c',
            `prev peak ${maxHeight(previous.angle, previous.velocity, g).toFixed(1)} m`,
          )
        }
        if (showLandingMarker) {
          drawLandingGuide(previous.angle, previous.velocity, '#ea580c')
        }
      }

      if (showMaxHeight) {
        drawMaxHeightGuide(
          currentAngle,
          currentVelocity,
          '#dc2626',
          `peak ${maxHeight(currentAngle, currentVelocity, g).toFixed(1)} m`,
        )
      }

      if (showLandingMarker) {
        drawLandingGuide(currentAngle, currentVelocity, '#6c3fc5')
      }

      const rad = (currentAngle * Math.PI) / 180
      const barrelLen = 36
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(cannonX, cannonY)
      ctx.lineTo(
        cannonX + Math.cos(rad) * barrelLen,
        cannonY - Math.sin(rad) * barrelLen,
      )
      ctx.stroke()
      ctx.fillStyle = '#444'
      ctx.beginPath()
      ctx.arc(cannonX, cannonY, 14, Math.PI, 0)
      ctx.fill()

      if (trailProgress < 1 && trailProgress > 0) {
        const pts = sampleTrajectory(currentAngle, currentVelocity, 80, g)
        const idx = Math.min(Math.floor(pts.length * trailProgress), pts.length - 1)
        const { cx, cy } = toCanvas(pts[idx].x, pts[idx].y)
        ctx.fillStyle = '#e85d04'
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fill()
      }
      if (g === 0) {
        ctx.font = 'bold 12px system-ui, sans-serif'
        ctx.fillStyle = '#b45309'
        ctx.textAlign = 'left'
        ctx.fillText('g = 0 → no gravity, straight-line motion', pad + 4, pad + 16)
      }
    },
    [
      viewBounds,
      ghostAngle,
      ghostVelocity,
      showMaxHeight,
      showLandingMarker,
      rememberPrevious,
      gravity,
    ],
  )

  useEffect(() => {
    if (!launching) drawScene(1)
  }, [angle, velocity, gravity, launching, drawScene, hasLaunched])

  const launch = () => {
    if (launching) return
    setLaunching(true)
    const start = performance.now()
    const duration = 1200

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      drawScene(t)
      if (t < 1) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        if (rememberPrevious) {
          previousLaunchRef.current = {
            angle: angleRef.current,
            velocity: velocityRef.current,
          }
        }
        setHasLaunched(true)
        setLaunching(false)
        onLaunchEnd?.()
      }
    }
    cancelAnimationFrame(animRef.current)
    animRef.current = requestAnimationFrame(tick)
  }

  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  const legend: string[] = []
  if (showMaxHeight) legend.push('Red line = max height (peak)')
  if (showLandingMarker) legend.push('Flag = landing spot')
  if (rememberPrevious) legend.push('Orange dashed = previous launch')
  if (ghostAngle != null) legend.push('Gray dashed = reference arc')

  if (showGravityControl) legend.push('Adjust g to see how gravity shapes the arc')
  if (gravity === 0 && showGravityControl) legend.push('At g = 0 the path is a straight line')

  return (
    <div className="sim">
      <div className="sim-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="sim-canvas"
          width={640}
          height={380}
          aria-label="Projectile simulation"
        />
      </div>
      {legend.length > 0 && (
        <ul className="sim-legend">
          {legend.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <div className="sim-controls">
        {showAngle && (
          <label className="sim-slider">
            <span>Angle: {angle}°</span>
            <input
              type="range"
              min={angleRange[0]}
              max={angleRange[1]}
              value={angle}
              onChange={(e) => onAngleChange(Number(e.target.value))}
              disabled={launching}
            />
          </label>
        )}
        {showVelocity && (
          <label className="sim-slider">
            <span>Speed: {velocity} m/s</span>
            <input
              type="range"
              min={velocityRange[0]}
              max={velocityRange[1]}
              value={velocity}
              onChange={(e) => onVelocityChange(Number(e.target.value))}
              disabled={launching}
            />
          </label>
        )}
        {showGravityControl && (
          <label className="sim-slider">
            <span>Gravity g: {gravity} m/s²</span>
            <input
              type="range"
              min={gravityRange[0]}
              max={gravityRange[1]}
              step={1}
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              disabled={launching}
            />
          </label>
        )}
        {!livePreview && (
          <button type="button" className="btn btn-primary sim-launch" onClick={launch} disabled={launching}>
            {launching ? 'Flying…' : 'Launch'}
          </button>
        )}
      </div>
    </div>
  )
}
