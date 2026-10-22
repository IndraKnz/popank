/**
 * Input global (keyboard + joystick virtual + gestur look).
 * Dipakai oleh Player di dalam canvas R3F, dan oleh Joystick di DOM.
 * Sengaja berupa objek mutable supaya tidak memicu re-render React 60x/detik.
 */
export const input = {
  keys: new Set(),
  joy: { x: 0, y: 0 },
  run: false,
  look: { yaw: 0, pitch: 0.14 },
  zoom: 1,
  pointerDown: false,
  lastPointer: { x: 0, y: 0 },
  moved: false,
}

const MOVE_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

if (import.meta.env.DEV && typeof window !== 'undefined') window.__etInput = input

export function attachKeyboard() {
  const down = (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
    if (MOVE_KEYS.has(e.code)) e.preventDefault()
    input.keys.add(e.code)
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = true
  }
  const up = (e) => {
    input.keys.delete(e.code)
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') input.run = false
  }
  const blur = () => {
    input.keys.clear()
    input.run = false
  }
  window.addEventListener('keydown', down, { passive: false })
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

/** Vektor gerak ternormalisasi (-1..1) dari joystick + keyboard. */
export function readMove() {
  let x = input.joy.x
  let y = input.joy.y

  const k = input.keys
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1

  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  return { x, y, len: Math.min(len, 1) }
}

export function isRunning() {
  return input.run || input.keys.has('ShiftLeft') || input.keys.has('ShiftRight')
}

export function clampLook(pitch) {
  return Math.max(-0.22, Math.min(1.05, pitch))
}

/** Arah kamera (horizontal) → basis gerak di dunia. */
export function cameraBasis(yaw) {
  return {
    forward: { x: -Math.sin(yaw), z: -Math.cos(yaw) },
    right: { x: Math.cos(yaw), z: -Math.sin(yaw) },
  }
}
