import { useCallback, useEffect, useRef, useState } from "react"
import { AppState, Modal, Pressable, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import {
  CONNECTION_ALERT_TITLE,
  OFFLINE_ALERT_TITLE,
  getReportedConnectivityIssue,
  subscribeConnectivityIssues,
  type ReportedConnectivityIssue,
} from "@/lib/network"

type NetworkStatusNoticeProps = {
  ready?: boolean
  showPersistentBanner?: boolean
}

export const OFFLINE_BANNER_MESSAGE =
  "Sign-in, syncing and fresh updates will resume when you reconnect."

export const OFFLINE_POPUP_MESSAGE =
  "Saved activities may still work. Sign-in, syncing and fresh updates will wait until you reconnect."

export const UNSTABLE_CONNECTION_MESSAGE =
  "The connection is very slow or unstable. Saved family data stays visible while Baby Steps reconnects."

export const shouldShowPersistentNetworkBanner = (pathname: string): boolean =>
  !pathname.startsWith("/child")

const stateIsOffline = (state: NetInfoState) =>
  state.isConnected === false || state.isInternetReachable === false

export function NetworkStatusNotice({
  ready = true,
  showPersistentBanner = true,
}: NetworkStatusNoticeProps) {
  const [isOffline, setIsOffline] = useState(false)
  const [reportedIssue, setReportedIssue] =
    useState<ReportedConnectivityIssue | null>(
      getReportedConnectivityIssue(),
    )
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
    return subscribeConnectivityIssues(setReportedIssue)
  }, [])

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
    if (!isOffline && !reportedIssue) {
      offlineEpisodeActive.current = false
      setShowOfflinePopup(false)
      return
    }

    if (ready && !offlineEpisodeActive.current) {
      offlineEpisodeActive.current = true
      setShowOfflinePopup(true)
    }
  }, [isOffline, ready, reportedIssue])

  if (!isOffline && !reportedIssue) return null

  const title = isOffline ? "You’re offline" : "Connection is unstable"
  const alertTitle = isOffline ? OFFLINE_ALERT_TITLE : CONNECTION_ALERT_TITLE
  const bannerMessage = isOffline
    ? OFFLINE_BANNER_MESSAGE
    : reportedIssue?.message ?? UNSTABLE_CONNECTION_MESSAGE
  const popupMessage = isOffline
    ? OFFLINE_POPUP_MESSAGE
    : reportedIssue?.message ?? UNSTABLE_CONNECTION_MESSAGE

  return (
    <>
      {showPersistentBanner ? (
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
            <Text variant="bold" className="text-white text-sm">{title}</Text>
            <Text className="text-neutral-200 text-xs leading-4 mt-0.5">
              {bannerMessage}
            </Text>
          </View>
        </View>
      ) : null}

      <Modal
        visible={!showPersistentBanner && showOfflinePopup}
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
              {alertTitle}
            </Text>
            <Text className="text-sm leading-6 text-neutral-600 mt-2">
              {popupMessage}
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
