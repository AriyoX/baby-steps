import { Audio, type AVPlaybackSource } from "expo-av"
import * as Speech from "expo-speech"
import type { SpeechOptions } from "expo-speech"
import { BACKGROUND_TRACKS, type BackgroundTrack } from "@/lib/audioAssets"
import {
  DEFAULT_AUDIO_SETTINGS,
  normalizeAudioSettings,
  type AudioSettings,
} from "@/lib/audioSettings"

const BACKGROUND_AUDIO_MODE = {
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: true,
}

const getAppliedAppSoundVolume = (settings: AudioSettings): number =>
  settings.appSoundsMuted ? 0 : settings.appSoundsVolume

const getAppliedBackgroundMusicVolume = (settings: AudioSettings): number =>
  settings.backgroundMusicMuted ? 0 : settings.backgroundMusicVolume

export class BabyStepsAudioManager {
  private settings = DEFAULT_AUDIO_SETTINGS
  private backgroundSound: Audio.Sound | null = null
  private backgroundLoadPromise: Promise<void> | null = null
  private backgroundLoadGeneration = 0
  private currentBackgroundTrackId: string | null = null
  private appIsActive = true
  private managedAppSounds = new Set<Audio.Sound>()

  constructor(private readonly backgroundTracks: readonly BackgroundTrack[] = BACKGROUND_TRACKS) {}

  getSettingsSnapshot(): AudioSettings {
    return this.settings
  }

  getBackgroundTracks(): readonly BackgroundTrack[] {
    return this.backgroundTracks
  }

  getSelectedBackgroundTrack(): BackgroundTrack {
    return (
      this.backgroundTracks.find((track) => track.id === this.settings.selectedBackgroundTrackId) ??
      this.backgroundTracks[0]
    )
  }

  async updateSettings(settings: AudioSettings): Promise<void> {
    const previousSettings = this.settings
    this.settings = normalizeAudioSettings(
      settings,
      this.backgroundTracks.map((track) => track.id),
    )

    if (previousSettings.appSoundsMuted !== this.settings.appSoundsMuted && this.settings.appSoundsMuted) {
      Speech.stop()
    }

    await this.updateManagedAppSoundVolumes()

    if (previousSettings.selectedBackgroundTrackId !== this.settings.selectedBackgroundTrackId) {
      await this.unloadBackgroundMusic()
      await this.startBackgroundMusic()
      return
    }

    await this.applyBackgroundMusicSettings()
  }

  async setAppIsActive(isActive: boolean): Promise<void> {
    this.appIsActive = isActive

    if (!this.backgroundSound) {
      return
    }

    if (this.shouldBackgroundMusicPlay()) {
      await this.playBackgroundSound()
      return
    }

    await this.pauseBackgroundSound()
  }

  async startBackgroundMusic(): Promise<void> {
    if (this.backgroundLoadPromise) {
      await this.backgroundLoadPromise

      if (this.backgroundSound) {
        await this.applyBackgroundMusicSettings()
        return
      }
    }

    if (this.backgroundSound) {
      await this.applyBackgroundMusicSettings()
      return
    }

    const loadGeneration = this.backgroundLoadGeneration
    this.backgroundLoadPromise = this.loadBackgroundMusic(loadGeneration)

    try {
      await this.backgroundLoadPromise
    } finally {
      this.backgroundLoadPromise = null
    }
  }

  async pauseBackgroundMusic(): Promise<void> {
    await this.pauseBackgroundSound()
  }

  async stopBackgroundMusic(): Promise<void> {
    if (!this.backgroundSound) return

    try {
      await this.backgroundSound.stopAsync()
    } catch (error) {
      console.warn("Could not stop background music:", error)
    }
  }

  async unloadBackgroundMusic(): Promise<void> {
    this.backgroundLoadGeneration += 1

    if (this.backgroundLoadPromise) {
      await this.backgroundLoadPromise
    }

    if (!this.backgroundSound) return

    const sound = this.backgroundSound
    this.backgroundSound = null
    this.currentBackgroundTrackId = null

    try {
      sound.setOnPlaybackStatusUpdate(null)
      await sound.unloadAsync()
    } catch (error) {
      console.warn("Could not unload background music:", error)
    }
  }

  async createAppSound(source: AVPlaybackSource): Promise<Audio.Sound | null> {
    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: false,
        volume: getAppliedAppSoundVolume(this.settings),
      })
      this.managedAppSounds.add(sound)
      return sound
    } catch (error) {
      console.warn("Could not create app sound:", error)
      return null
    }
  }

  async playAppSound(source: AVPlaybackSource): Promise<Audio.Sound | null> {
    if (this.settings.appSoundsMuted) {
      return null
    }

    try {
      const { sound } = await Audio.Sound.createAsync(source, {
        shouldPlay: true,
        volume: this.settings.appSoundsVolume,
      })

      this.managedAppSounds.add(sound)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          this.managedAppSounds.delete(sound)
          void sound.unloadAsync().catch((error) => {
            console.warn("Could not unload completed app sound:", error)
          })
        }
      })

      return sound
    } catch (error) {
      console.warn("Could not play app sound:", error)
      return null
    }
  }

  async replayAppSound(sound?: Audio.Sound | null): Promise<boolean> {
    if (!sound || this.settings.appSoundsMuted) {
      return false
    }

    try {
      this.managedAppSounds.add(sound)
      await sound.setVolumeAsync(this.settings.appSoundsVolume)
      await sound.replayAsync()
      return true
    } catch (error) {
      console.warn("Could not replay app sound:", error)
      return false
    }
  }

  async unloadAppSound(sound?: Audio.Sound | null): Promise<void> {
    if (!sound) return

    this.managedAppSounds.delete(sound)

    try {
      await sound.unloadAsync()
    } catch (error) {
      console.warn("Could not unload app sound:", error)
    }
  }

  speakAppText(text: string, options: SpeechOptions = {}): boolean {
    if (this.settings.appSoundsMuted) {
      return false
    }

    Speech.speak(text, {
      ...options,
      volume: this.settings.appSoundsVolume,
    })

    return true
  }

  stopAppSpeech(): void {
    Speech.stop()
  }

  private async loadBackgroundMusic(loadGeneration: number): Promise<void> {
    const selectedTrack = this.getSelectedBackgroundTrack()

    try {
      await Audio.setAudioModeAsync(BACKGROUND_AUDIO_MODE)

      const { sound } = await Audio.Sound.createAsync(selectedTrack.source, {
        shouldPlay: this.shouldBackgroundMusicPlay(),
        isLooping: true,
        volume: getAppliedBackgroundMusicVolume(this.settings),
      })

      if (
        loadGeneration !== this.backgroundLoadGeneration ||
        selectedTrack.id !== this.settings.selectedBackgroundTrackId
      ) {
        await sound.unloadAsync()
        return
      }

      this.backgroundSound = sound
      this.currentBackgroundTrackId = selectedTrack.id

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && !status.isPlaying && this.shouldBackgroundMusicPlay()) {
          void sound.playAsync().catch((error) => {
            console.warn("Could not resume background music:", error)
          })
        }
      })
    } catch (error) {
      console.error("Error playing background music:", error)
      this.backgroundSound = null
      this.currentBackgroundTrackId = null
    }
  }

  private async applyBackgroundMusicSettings(): Promise<void> {
    if (!this.backgroundSound) return

    const selectedTrack = this.getSelectedBackgroundTrack()
    if (this.currentBackgroundTrackId !== selectedTrack.id) {
      await this.unloadBackgroundMusic()
      await this.startBackgroundMusic()
      return
    }

    try {
      await this.backgroundSound.setVolumeAsync(getAppliedBackgroundMusicVolume(this.settings))

      if (this.shouldBackgroundMusicPlay()) {
        await this.playBackgroundSound()
      } else {
        await this.pauseBackgroundSound()
      }
    } catch (error) {
      console.warn("Could not apply background music settings:", error)
    }
  }

  private async updateManagedAppSoundVolumes(): Promise<void> {
    const volume = getAppliedAppSoundVolume(this.settings)
    await Promise.all(
      Array.from(this.managedAppSounds).map(async (sound) => {
        try {
          await sound.setVolumeAsync(volume)
        } catch {
          this.managedAppSounds.delete(sound)
        }
      }),
    )
  }

  private shouldBackgroundMusicPlay(): boolean {
    return this.appIsActive && !this.settings.backgroundMusicMuted
  }

  private async playBackgroundSound(): Promise<void> {
    if (!this.backgroundSound) return

    try {
      await this.backgroundSound.playAsync()
    } catch (error) {
      console.warn("Could not play background music:", error)
    }
  }

  private async pauseBackgroundSound(): Promise<void> {
    if (!this.backgroundSound) return

    try {
      await this.backgroundSound.pauseAsync()
    } catch (error) {
      console.warn("Could not pause background music:", error)
    }
  }
}

export const audioManager = new BabyStepsAudioManager()
