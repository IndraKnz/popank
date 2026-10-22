import * as THREE from 'three'

/**
 * Data bersama untuk taman kecil di sisi barat pulau.
 * Dipakai Garden.jsx (menggambar) dan Player.jsx (proximity & duduk di ayunan).
 */

export const GARDEN = { x: -9.5, z: 5.5, r: 3.9 }

/** Mulut taman menghadap pusat pulau. */
export const GARDEN_YAW = Math.atan2(GARDEN.z, -GARDEN.x)

export const SWING = { x: -2.0, z: 0.1, pivotY: 2.12, len: 1.38 }

/** Titik dunia di depan ayunan (tempat prompt muncul & tempat turun). */
export const SWING_SPOT = (() => {
  const v = new THREE.Vector3(SWING.x + 1.0, 0, SWING.z)
  v.applyAxisAngle(new THREE.Vector3(0, 1, 0), GARDEN_YAW)
  return { x: GARDEN.x + v.x, z: GARDEN.z + v.z }
})()

/**
 * Status ayunan. Garden menulis posisi dudukan tiap frame,
 * Player membacanya saat pemain duduk — tanpa render ulang React.
 */
export const swingRig = {
  seat: new THREE.Vector3(0, 0, 0),
  yaw: GARDEN_YAW + Math.PI / 2,
  ready: false,
}
