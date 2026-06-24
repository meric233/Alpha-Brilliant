let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    audioCtx = new AudioContext()
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume()
  }
  return audioCtx
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  gain = 0.15,
  when = 0,
) {
  const ctx = getCtx()
  if (!ctx) return
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  g.gain.setValueAtTime(gain, ctx.currentTime + when)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + duration)
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + when)
  osc.stop(ctx.currentTime + when + duration + 0.05)
}

export function playCorrect() {
  tone(523, 0.12, 'sine', 0.12, 0)
  tone(659, 0.12, 'sine', 0.12, 0.1)
  tone(784, 0.2, 'sine', 0.14, 0.2)
}

export function playWrong() {
  tone(220, 0.15, 'square', 0.06, 0)
  tone(185, 0.25, 'square', 0.05, 0.12)
}

export function playStepComplete() {
  tone(440, 0.1, 'triangle', 0.1, 0)
  tone(554, 0.1, 'triangle', 0.1, 0.08)
  tone(659, 0.15, 'triangle', 0.12, 0.16)
}

export function playLessonComplete() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((n, i) => tone(n, 0.25, 'sine', 0.13, i * 0.12))
  tone(784, 0.4, 'sine', 0.1, 0.55)
}

export function playStreak() {
  tone(330, 0.08, 'sawtooth', 0.08, 0)
  tone(440, 0.08, 'sawtooth', 0.1, 0.06)
  tone(554, 0.08, 'sawtooth', 0.1, 0.12)
  tone(659, 0.08, 'sawtooth', 0.12, 0.18)
  tone(880, 0.35, 'sawtooth', 0.14, 0.28)
}

export function primeAudio() {
  getCtx()
}
