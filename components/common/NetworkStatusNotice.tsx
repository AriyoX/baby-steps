import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Modal, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import { OFFLINE_ALERT_TITLE } from "@/lib/network"

type NetworkStatusNoticeProps = {
  ready?: boolean
}

const stateIsOffline = (state: NetInfoState) =>
  state.isConnected === false || state.isInternetReachable === false

export function NetworkStatusNotice({ ready = true }: NetworkStatusNoticeProps) {
  const [isOffline, setIsOffline] = useState(false)
  const [showOfflinePopup, setShowOfflinePopup] = useState(false)
  const offlineEpisodeActive = useRef(false)

  const applyNetworkState = useCallback((state: NetInfoState) => {
    setIsOffline(stateIsOffline(state))
  }, [])

  const refreshNetworkState = useCallback(async () => {
    try {
      applyNetworkState(await NetInfo.fetch())
    } catch (error) {
      console.warn("Could not refresh the global network state:", error)
    }
  }, [applyNetworkState])

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(applyNetworkState)
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refreshNetworkState()
    })

    void refreshNetworkState()

    return () => {
      unsubscribe()
      appStateSubscription.remove()
    }
  }, [applyNetworkState, refreshNetworkState])

  useEffect(() => {
    if (!isOffline) {
      offlineEpisodeActive.current = false
      setShowOfflinePopup(false)
      return
    }

    if (ready && !offlineEpisodeActive.current) {
      offlineEpisodeActive.current = true
      setShowOfflinePopup(true)
    }
  }, [isOffline, ready])

  if (!isOffline) return null

  return (
    <>
      <View
        className="absolute top-12 left-3 right-3 z-50 flex-row items-center rounded-2xl bg-neutral-900 px-4 py-3 shadow-lg"
        style={{ elevation: 12 }}
        pointerEvents="none"
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View className="w-9 h-9 rounded-xl bg-secondary-500 items-center justify-center">
          <Ionicons name="cloud-offline-outline" size={20} color={brandColors.white} />
        </View>
        <View className="flex-1 ml-3">
          <Text variant="bold" className="text-white text-sm">You’re offline</Text>
          <Text className="text-neutral-200 text-xs leading-4 mt-0.5">
            Account access and syncing will resume when you reconnect.
          </Text>
        </View>
      </View>

      <Modal
        visible={showOfflinePopup}
        transparent
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setShowOfflinePopup(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/45 px-6">
          <View
            className="w-full max-w-[380px] rounded-[28px] bg-white p-6 shadow-xl"
            accessibilityRole="alert"
            accessibilityViewIsModal
          >
            <View className="w-14 h-14 rounded-2xl bg-secondary-50 items-center justify-center mb-4">
              <Ionicons name="cloud-offline-outline" size={29} color={brandColors.shanaOrange} />
            </View>
            <Text variant="bold" className="text-2xl text-neutral-900">
              {OFFLINE_ALERT_TITLE}
            </Text>
            <Text className="text-sm leading-6 text-neutral-600 mt-2">
              Baby Steps cannot reach the internet. Saved activities may still work, but account access, syncing, and fresh updates will wait until you reconnect.
            </Text>
            <Pressable
              className="mt-6 min-h-[50px] rounded-2xl bg-primary-600 items-center justify-center px-5"
              onPress={() => setShowOfflinePopup(false)}
              accessibilityRole="button"
              accessibilityLabel="Dismiss offline message"
            >
              <Text variant="bold" className="text-white">Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  )
}
