import { useCallback, useEffect, useRef } from 'react'
import { range } from '../lib/physics'
import { GRAVITY } from '../lib/constants'

type Props = {
  angle: number
  angleRange?: [number, number]
  velocity?: number
  gravity?: number
}

export function SinGraph({
  angle,
  angleRange = [15, 75],
  velocity = 15,
  gravity = GRAVITY,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const pad = { left: 36, right: 16, top: 20, bottom: 36 }
    const plotW = w - pad.left - pad.right
    const plotH = h - pad.top - pad.bottom

    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#faf9fc'
    ctx.fillRect(0, 0, w, h)

    const minDeg = angleRange[0]
    const maxDeg = angleRange[1]
    const toRad = (d: number) => (d * Math.PI) / 180
    const sin2 = (d: number) => Math.sin(2 * toRad(d))

    const xAt = (deg: number) => pad.left + ((deg - minDeg) / (maxDeg - minDeg)) * plotW
    const yAt = (val: number) => pad.top + plotH - val * plotH

    ctx.strokeStyle = '#e5e7eb'
    ctx.lineWidth = 1
    for (let v = 0; v <= 1; v += 0.25) {
      const y = yAt(v)
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
    }

    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(pad.left, pad.top)
    ctx.lineTo(pad.left, h - pad.bottom)
    ctx.lineTo(w - pad.right, h - pad.bottom)
    ctx.stroke()

    ctx.fillStyle = '#6b7280'
    ctx.font = '11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('θ (degrees)', pad.left + plotW / 2, h - 8)
    ctx.save()
    ctx.translate(12, pad.top + plotH / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText('sin(2θ)', 0, 0)
    ctx.restore()

    ctx.strokeStyle = '#6c3fc5'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    for (let px = 0; px <= plotW; px++) {
      const deg = minDeg + (px / plotW) * (maxDeg - minDeg)
      const cx = pad.left + px
      const cy = yAt(sin2(deg))
      if (px === 0) ctx.moveTo(cx, cy)
      else ctx.lineTo(cx, cy)
    }
    ctx.stroke()

    const maxAngle = 45
    if (maxAngle >= minDeg && maxAngle <= maxDeg) {
      const mx = xAt(maxAngle)
      const my = yAt(sin2(maxAngle))
      ctx.strokeStyle = 'rgba(5, 150, 105, 0.35)'
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(mx, h - pad.bottom)
      ctx.lineTo(mx, my)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#059669'
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('max at 45°', mx, pad.top - 6)
    }

    const val = sin2(angle)
    const ax = xAt(angle)
    const ay = yAt(val)

    ctx.strokeStyle = 'rgba(108, 63, 197, 0.45)'
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(pad.left, ay)
    ctx.lineTo(ax, ay)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#6c3fc5'
    ctx.font = '10px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`sin(2θ) = ${val.toFixed(3)}`, pad.left + 4, ay - 6)

    ctx.fillStyle = '#e85d04'
    ctx.beginPath()
    ctx.arc(ax, ay, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.stroke()

    ctx.fillStyle = '#111827'
    ctx.font = '12px system-ui, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`θ = ${angle}°`, pad.left, h - pad.bottom + 22)
    const r = range(angle, velocity, gravity)
    ctx.fillText(`R = ${r.toFixed(1)} m`, pad.left + 100, h - pad.bottom + 22)
  }, [angle, angleRange, velocity, gravity])

  useEffect(() => {
    draw()
  }, [draw])

  return (
    <div className="sin-graph">
      <p className="sin-graph-label">sin(2θ) vs θ — height tracks range at fixed speed</p>
      <canvas
        ref={canvasRef}
        className="sin-graph-canvas"
        width={640}
        height={220}
        aria-label="Graph of sin(2 theta) versus launch angle"
      />
    </div>
  )
}
