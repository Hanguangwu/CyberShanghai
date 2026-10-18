export type MusicMode = 'menu' | 'gameplay'

const MENU_TRACK = 'campus_dawn_menu.mp3'
const GAMEPLAY_TRACKS = ['defense_phase_shift.mp3', 'laboratory_gears.mp3', 'midnight_lockdown.mp3', 'starlight_honors.mp3']
const assetUrl = (file: string) => `${import.meta.env.BASE_URL}audios/${file}`

export class MusicController {
  private audio: HTMLAudioElement | null = null
  private mode: MusicMode | null = null
  private enabled = true
  private volume = 0.42
  private bag: string[] = []

  start(mode: MusicMode) {
    this.mode = mode
    if (!this.enabled) return
    this.audio?.pause()
    const file = mode === 'menu' ? MENU_TRACK : this.nextGameplayTrack()
    const audio = new Audio(assetUrl(file))
    audio.volume = this.volume
    audio.onended = () => { if (this.mode === 'gameplay' && this.enabled) this.start('gameplay') }
    this.audio = audio
    void audio.play().catch(() => undefined)
  }

  stop() {
    this.audio?.pause()
    if (this.audio) this.audio.currentTime = 0
    this.audio = null
    this.mode = null
  }

  toggle() { this.enabled = !this.enabled; if (!this.enabled) this.stop(); return this.enabled }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); if (this.audio) this.audio.volume = this.volume }
  isEnabled() { return this.enabled }
  dispose() { this.stop() }

  private nextGameplayTrack() {
    if (this.bag.length === 0) this.bag = [...GAMEPLAY_TRACKS].sort(() => Math.random() - 0.5)
    return this.bag.pop() ?? GAMEPLAY_TRACKS[0]
  }
}
