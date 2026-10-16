const NOTES = [220, 261.63, 293.66, 329.63, 392, 440]

export class MusicController {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private timer: number | null = null
  private step = 0
  private playing = false

  start() {
    if (this.playing) return
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextClass) return
    this.context ??= new AudioContextClass()
    this.gain ??= this.context.createGain()
    this.gain.gain.value = 0.035
    this.gain.connect(this.context.destination)
    void this.context.resume()
    this.playing = true
    this.playNote()
    this.timer = window.setInterval(() => this.playNote(), 600)
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.playing = false
  }

  toggle() { if (this.playing) this.stop(); else this.start(); return this.playing }
  isPlaying() { return this.playing }

  private playNote() {
    if (!this.context || !this.gain) return
    const oscillator = this.context.createOscillator()
    const envelope = this.context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = NOTES[this.step % NOTES.length]
    envelope.gain.setValueAtTime(0.001, this.context.currentTime)
    envelope.gain.exponentialRampToValueAtTime(0.15, this.context.currentTime + 0.025)
    envelope.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5)
    oscillator.connect(envelope).connect(this.gain)
    oscillator.start()
    oscillator.stop(this.context.currentTime + 0.52)
    this.step += 1
  }

  dispose() { this.stop(); void this.context?.close() }
}

declare global { interface Window { webkitAudioContext?: typeof AudioContext } }
