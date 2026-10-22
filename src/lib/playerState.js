import * as THREE from 'three'

/**
 * Posisi pemain yang dibagikan ke komponen lain (mis. kerumunan NPC)
 * tanpa memicu render ulang React setiap frame.
 */
export const playerPos = new THREE.Vector3(0, 0, 6)
