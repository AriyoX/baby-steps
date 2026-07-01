import type { AVPlaybackSource } from "expo-av"

export type BackgroundTrack = {
  id: string
  title: string
  source: AVPlaybackSource
}

export const BACKGROUND_TRACKS: readonly BackgroundTrack[] = [
  {
    id: "default",
    title: "Default",
    source: require("@/assets/audio/background-music.mp3"),
  },
]

export const BACKGROUND_TRACK_IDS = BACKGROUND_TRACKS.map((track) => track.id)

export const getBackgroundTrackById = (trackId: string): BackgroundTrack =>
  BACKGROUND_TRACKS.find((track) => track.id === trackId) ?? BACKGROUND_TRACKS[0]
