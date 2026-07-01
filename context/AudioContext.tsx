"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AppState } from "react-native"
import type { Audio, AVPlaybackSource } from "expo-av"
import { BACKGROUND_TRACKS, BACKGROUND_TRACK_IDS } from "@/lib/audioAssets"
import { audioManager } from "@/lib/audioManager"
import {
  DEFAULT_AUDIO_SETTINGS,
  clampVolume,
  loadAudioSettings,
  normalizeAudioSettings,
  saveAudioSettings,
  type AudioSettings,
} from "@/lib/audioSettings"

type AudioContextValue = {
  settings: AudioSettings
  isSettingsLoaded: boolean
  backgroundTracks: typeof BACKGROUND_TRACKS
  setBackgroundMusicMuted: (muted: boolean) => void
  toggleBackgroundMusicMuted: () => void
  setBackgroundMusicVolume: (volume: number) => void
  setAppSoundsMuted: (muted: boolean) => void
  toggleAppSoundsMuted: () => void
  setAppSoundsVolume: (volume: number) => void
  selectBackgroundTrack: (trackId: string) => void
  playAppSound: (source: AVPlaybackSource) => Promise<Audio.Sound | null>
  createAppSound: (source: AVPlaybackSource) => Promise<Audio.Sound | null>
  replayAppSound: (sound?: Audio.Sound | null) => Promise<boolean>
  unloadAppSound: (sound?: Audio.Sound | null) => Promise<void>
}

const commitSettingsOutsideProvider = (nextSettings: AudioSettings) => {
  const normalizedSettings = normalizeAudioSettings(nextSettings, BACKGROUND_TRACK_IDS)
  void audioManager.updateSettings(normalizedSettings)
  void saveAudioSettings(normalizedSettings, BACKGROUND_TRACK_IDS)
}

const defaultContextValue: AudioContextValue = {
  settings: DEFAULT_AUDIO_SETTINGS,
  isSettingsLoaded: false,
  backgroundTracks: BACKGROUND_TRACKS,
  setBackgroundMusicMuted: (muted) =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      backgroundMusicMuted: muted,
    }),
  toggleBackgroundMusicMuted: () =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      backgroundMusicMuted: !audioManager.getSettingsSnapshot().backgroundMusicMuted,
    }),
  setBackgroundMusicVolume: (volume) =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      backgroundMusicVolume: clampVolume(volume, DEFAULT_AUDIO_SETTINGS.backgroundMusicVolume),
    }),
  setAppSoundsMuted: (muted) =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      appSoundsMuted: muted,
    }),
  toggleAppSoundsMuted: () =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      appSoundsMuted: !audioManager.getSettingsSnapshot().appSoundsMuted,
    }),
  setAppSoundsVolume: (volume) =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      appSoundsVolume: clampVolume(volume, DEFAULT_AUDIO_SETTINGS.appSoundsVolume),
    }),
  selectBackgroundTrack: (trackId) =>
    commitSettingsOutsideProvider({
      ...audioManager.getSettingsSnapshot(),
      selectedBackgroundTrackId: trackId,
    }),
  playAppSound: (source) => audioManager.playAppSound(source),
  createAppSound: (source) => audioManager.createAppSound(source),
  replayAppSound: (sound) => audioManager.replayAppSound(sound),
  unloadAppSound: (sound) => audioManager.unloadAppSound(sound),
}

const AudioContext = createContext<AudioContextValue>(defaultContextValue)

export const AudioProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS)
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false)
  const settingsCommitIdRef = useRef(0)
  const hasUserCommittedSettingsRef = useRef(false)

  const applySettingsSideEffects = useCallback((nextSettings: AudioSettings) => {
    const commitId = ++settingsCommitIdRef.current

    void (async () => {
      try {
        await audioManager.updateSettings(nextSettings)

        if (settingsCommitIdRef.current !== commitId) {
          return
        }

        await saveAudioSettings(nextSettings, BACKGROUND_TRACK_IDS)
      } catch (error) {
        console.warn("Could not apply audio settings:", error)
      }
    })()
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializeAudio = async () => {
      const savedSettings = await loadAudioSettings(BACKGROUND_TRACK_IDS)

      if (!isMounted) return

      if (hasUserCommittedSettingsRef.current) {
        setSettings(audioManager.getSettingsSnapshot())
      } else {
        await audioManager.updateSettings(savedSettings)
        void saveAudioSettings(savedSettings, BACKGROUND_TRACK_IDS).catch((error) => {
          console.warn("Could not save normalized audio settings:", error)
        })

        if (!isMounted) return

        setSettings(savedSettings)
      }

      setIsSettingsLoaded(true)
      await audioManager.setAppIsActive(AppState.currentState === "active")
      await audioManager.startBackgroundMusic()
    }

    void initializeAudio()

    return () => {
      isMounted = false
      audioManager.stopAppSpeech()
      void audioManager.unloadBackgroundMusic()
    }
  }, [])

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      void audioManager.setAppIsActive(nextAppState === "active")
    })

    return () => {
      subscription.remove()
    }
  }, [])

  const commitSettings = useCallback((updater: (current: AudioSettings) => AudioSettings) => {
    hasUserCommittedSettingsRef.current = true

    setSettings((currentSettings) => {
      const nextSettings = normalizeAudioSettings(updater(currentSettings), BACKGROUND_TRACK_IDS)
      applySettingsSideEffects(nextSettings)
      return nextSettings
    })
  }, [applySettingsSideEffects])

  const value = useMemo<AudioContextValue>(
    () => ({
      settings,
      isSettingsLoaded,
      backgroundTracks: BACKGROUND_TRACKS,
      setBackgroundMusicMuted: (muted) =>
        commitSettings((current) => ({
          ...current,
          backgroundMusicMuted: muted,
        })),
      toggleBackgroundMusicMuted: () =>
        commitSettings((current) => ({
          ...current,
          backgroundMusicMuted: !current.backgroundMusicMuted,
        })),
      setBackgroundMusicVolume: (volume) =>
        commitSettings((current) => ({
          ...current,
          backgroundMusicVolume: clampVolume(volume, current.backgroundMusicVolume),
        })),
      setAppSoundsMuted: (muted) =>
        commitSettings((current) => ({
          ...current,
          appSoundsMuted: muted,
        })),
      toggleAppSoundsMuted: () =>
        commitSettings((current) => ({
          ...current,
          appSoundsMuted: !current.appSoundsMuted,
        })),
      setAppSoundsVolume: (volume) =>
        commitSettings((current) => ({
          ...current,
          appSoundsVolume: clampVolume(volume, current.appSoundsVolume),
        })),
      selectBackgroundTrack: (trackId) =>
        commitSettings((current) => ({
          ...current,
          selectedBackgroundTrackId: trackId,
        })),
      playAppSound: (source) => audioManager.playAppSound(source),
      createAppSound: (source) => audioManager.createAppSound(source),
      replayAppSound: (sound) => audioManager.replayAppSound(sound),
      unloadAppSound: (sound) => audioManager.unloadAppSound(sound),
    }),
    [commitSettings, isSettingsLoaded, settings],
  )

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>
}

export const useAudio = () => useContext(AudioContext)
export const useAudioSettings = useAudio
