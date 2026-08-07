import { useEffect } from "react"
import { usePathname } from "expo-router"

import { useAudio } from "@/context/AudioContext"
import { shouldSuppressBackgroundMusic } from "@/lib/audioRoutePolicy"

export function FocusedActivityAudio() {
  const pathname = usePathname()
  const { setBackgroundMusicSuppressed } = useAudio()

  useEffect(() => {
    setBackgroundMusicSuppressed(shouldSuppressBackgroundMusic(pathname))
  }, [pathname, setBackgroundMusicSuppressed])

  useEffect(
    () => () => {
      setBackgroundMusicSuppressed(false)
    },
    [setBackgroundMusicSuppressed],
  )

  return null
}
