/**
 * Mesin audio prosedural Ever Tide.
 * Tidak ada file mp3 sama sekali — semua suara dibangkitkan dengan Web Audio API:
 *  - "ambience" : ombak pantai (noise + filter yang bergerak pelan)
 *  - "music"    : pad hangat + arpeggio piano-ish dengan progresi romantis
 *  - sfx        : chime, sparkle, whoosh
 * Ini membuat bundle tetap ringan dan bebas masalah lisensi.
 */

const CHORDS = [
  // Aadd9 — F#m7 — Dmaj9 — E6/9  (hangat, sedikit melankolis)
  { root: 220.0, notes: [220.0, 277.18, 329.63, 415.3] },
  { root: 185.0, notes: [185.0, 220.0, 277.18, 329.63] },
  { root: 146.83, notes: [146.83, 185.0, 220.0, 277.18] },
  { root: 164.81, notes: [164.81, 207.65, 246.94, 293.66] },
]

const ARP_PATTERN = [0, 2, 1, 3, 2, 1, 3, 2]

class AudioEngine {
  constructor() {
    this.ctx = null
    this.ready = false
    this.musicVol = 0.4
    this.ambVol = 0.55
    this.musicOn = false
    this.ambOn = false
    this.timer = null
    this.nextTime = 0
    this.step = 0
  }

  async ensure() {
    if (this.ready) {
      if (this.ctx.state === 'suspended') await this.ctx.resume()
      return this.ctx
    }
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return null

    const ctx = new Ctx()
    this.ctx = ctx

    this.master = ctx.createGain()
    this.master.gain.value = 1
    this.master.connect(ctx.destination)

    // Reverb ruang terbuka
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.#impulse(2.8, 2.6)
    this.reverbGain = ctx.createGain()
    this.reverbGain.gain.value = 0.5
    this.reverb.connect(this.reverbGain).connect(this.master)

    this.musicGain = ctx.createGain()
    this.musicGain.gain.value = 0
    this.musicGain.connect(this.master)
    this.musicSend = ctx.createGain()
    this.musicSend.gain.value = 0.55
    this.musicGain.connect(this.musicSend).connect(this.reverb)

    this.ambGain = ctx.createGain()
    this.ambGain.gain.value = 0
    this.ambGain.connect(this.master)

    this.sfxGain = ctx.createGain()
    this.sfxGain.gain.value = 0.9
    this.sfxGain.connect(this.master)
    this.sfxSend = ctx.createGain()
    this.sfxSend.gain.value = 0.35
    this.sfxGain.connect(this.sfxSend).connect(this.reverb)

    this.ready = true
    return ctx
  }

  #impulse(seconds, decay) {
    const ctx = this.ctx
    const rate = ctx.sampleRate
    const len = Math.floor(rate * seconds)
    const buf = ctx.createBuffer(2, len, rate)
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch)
      for (let i = 0; i < len; i++) {
        const t = i / len
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay)
      }
    }
    return buf
  }

  #noiseBuffer(seconds = 3) {
    const ctx = this.ctx
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02 // pink-ish
      d[i] = last * 3.2
    }
    return buf
  }

  /* ---------------- ambience: ombak ---------------- */
  startAmbience() {
    if (!this.ready || this.ambOn) return
    const ctx = this.ctx
    this.ambOn = true

    const src = ctx.createBufferSource()
    src.buffer = this.#noiseBuffer(4)
    src.loop = true

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 520
    lp.Q.value = 0.4

    const hp = ctx.createBiquadFilter()
    hp.type = 'highpass'
    hp.frequency.value = 90

    const swell = ctx.createGain()
    swell.gain.value = 0.16

    // LFO gelombang: filter + amplitudo bergerak seperti ombak datang-pergi
    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.085
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 260
    lfo.connect(lfoGain).connect(lp.frequency)

    const lfo2 = ctx.createOscillator()
    lfo2.frequency.value = 0.085
    const lfo2Gain = ctx.createGain()
    lfo2Gain.gain.value = 0.09
    lfo2.connect(lfo2Gain).connect(swell.gain)

    src.connect(hp).connect(lp).connect(swell).connect(this.ambGain)
    src.start()
    lfo.start()
    lfo2.start()

    this.ambNodes = { src, lfo, lfo2 }
    this.ambGain.gain.cancelScheduledValues(ctx.currentTime)
    this.ambGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.ambGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.ambVol),
      ctx.currentTime + 2.4
    )
  }

  stopAmbience() {
    if (!this.ambOn || !this.ctx) return
    const t = this.ctx.currentTime
    this.ambGain.gain.cancelScheduledValues(t)
    this.ambGain.gain.setValueAtTime(this.ambGain.gain.value, t)
    this.ambGain.gain.linearRampToValueAtTime(0.0001, t + 0.8)
    setTimeout(() => {
      try {
        this.ambNodes?.src.stop()
        this.ambNodes?.lfo.stop()
        this.ambNodes?.lfo2.stop()
      } catch {}
      this.ambNodes = null
      this.ambOn = false
    }, 900)
  }

  /* ---------------- musik generatif ---------------- */
  startMusic() {
    if (!this.ready || this.musicOn) return
    this.musicOn = true
    const ctx = this.ctx
    this.nextTime = ctx.currentTime + 0.2
    this.step = 0
    this.musicGain.gain.cancelScheduledValues(ctx.currentTime)
    this.musicGain.gain.setValueAtTime(0.0001, ctx.currentTime)
    this.musicGain.gain.exponentialRampToValueAtTime(
      Math.max(0.001, this.musicVol * 0.55),
      ctx.currentTime + 3
    )
    this.#scheduler()
  }

  stopMusic() {
    if (!this.musicOn || !this.ctx) return
    const t = this.ctx.currentTime
    this.musicGain.gain.cancelScheduledValues(t)
    this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t)
    this.musicGain.gain.linearRampToValueAtTime(0.0001, t + 1.2)
    clearTimeout(this.timer)
    this.musicOn = false
  }

  #scheduler() {
    if (!this.musicOn) return
    const ctx = this.ctx
    const lookahead = 0.9
    const stepDur = 0.62

    while (this.nextTime < ctx.currentTime + lookahead) {
      this.#scheduleStep(this.step, this.nextTime, stepDur)
      this.step++
      this.nextTime += stepDur
    }
    this.timer = setTimeout(() => this.#scheduler(), 240)
  }

  #scheduleStep(step, time, dur) {
    const chordIndex = Math.floor(step / 12) % CHORDS.length
    const chord = CHORDS[chordIndex]
    const beat = step % 12

    // Pad: setiap awal birama (12 step), nada panjang
    if (beat === 0) {
      chord.notes.forEach((f, i) => {
        this.#pad(f * (i === 0 ? 0.5 : 1), time, dur * 12, 0.055)
        this.#pad(f * 2.002, time + 0.06, dur * 12, 0.018)
      })
      // bass lembut
      this.#pad(chord.root * 0.5, time, dur * 12, 0.075)
    }

    // Arpeggio
    if (beat % 1 === 0) {
      const idx = ARP_PATTERN[beat % ARP_PATTERN.length]
      const note = chord.notes[idx % chord.notes.length] * 2
      this.#pluck(note, time, 0.09 + Math.random() * 0.03)
      if (beat === 4 || beat === 8) this.#pluck(note * 1.5, time + dur * 0.5, 0.045)
    }

    // Nada tinggi sesekali, seperti kilau di air
    if (step % 24 === 7 || step % 24 === 19) {
      const n = chord.notes[3] * 4
      this.#pluck(n, time + 0.3, 0.028, 1.6)
    }
  }

  #pad(freq, time, dur, vol) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.value = freq
    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.value = freq
    osc2.detune.value = 6

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(vol, time + 2.2)
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur)

    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 1200

    osc.connect(g)
    osc2.connect(g)
    g.connect(lp).connect(this.musicGain)
    osc.start(time)
    osc2.start(time)
    osc.stop(time + dur + 0.1)
    osc2.stop(time + dur + 0.1)
  }

  #pluck(freq, time, vol, decay = 0.9) {
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    osc.type = 'triangle'
    osc.frequency.value = freq

    const osc2 = ctx.createOscillator()
    osc2.type = 'sine'
    osc2.frequency.value = freq * 2.01

    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, time)
    g.gain.exponentialRampToValueAtTime(vol, time + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, time + decay * 1.8)

    const g2 = ctx.createGain()
    g2.gain.value = 0.25

    osc.connect(g)
    osc2.connect(g2).connect(g)
    g.connect(this.musicGain)
    osc.start(time)
    osc2.start(time)
    osc.stop(time + decay * 1.9)
    osc2.stop(time + decay * 1.9)
  }

  /* ---------------- sfx ---------------- */
  chime() {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime
    ;[880, 1108.73, 1318.51, 1760].forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const g = ctx.createGain()
      const start = t + i * 0.075
      g.gain.setValueAtTime(0.0001, start)
      g.gain.exponentialRampToValueAtTime(0.14 / (i + 1), start + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, start + 1.6)
      osc.connect(g).connect(this.sfxGain)
      osc.start(start)
      osc.stop(start + 1.7)
    })
  }

  sparkle() {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1200, t)
    osc.frequency.exponentialRampToValueAtTime(3200, t + 0.35)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.03)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6)
    osc.connect(g).connect(this.sfxGain)
    osc.start(t)
    osc.stop(t + 0.7)
  }

  whoosh() {
    if (!this.ready) return
    const ctx = this.ctx
    const t = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.#noiseBuffer(1.4)
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = 1.2
    bp.frequency.setValueAtTime(300, t)
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.9)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.18)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
    src.connect(bp).connect(g).connect(this.sfxGain)
    src.start(t)
    src.stop(t + 1.4)
  }

  /* ---------------- volume ---------------- */
  setMusicVolume(v) {
    this.musicVol = v
    if (!this.ready || !this.musicOn) return
    const t = this.ctx.currentTime
    this.musicGain.gain.cancelScheduledValues(t)
    this.musicGain.gain.setTargetAtTime(Math.max(0.0001, v * 0.55), t, 0.2)
  }

  setAmbienceVolume(v) {
    this.ambVol = v
    if (!this.ready || !this.ambOn) return
    const t = this.ctx.currentTime
    this.ambGain.gain.cancelScheduledValues(t)
    this.ambGain.gain.setTargetAtTime(Math.max(0.0001, v), t, 0.25)
  }

  suspend() {
    this.ctx?.suspend()
  }
  resume() {
    this.ctx?.resume()
  }
}

export const audio = new AudioEngine()
