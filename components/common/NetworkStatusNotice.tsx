import { useCallback, useEffect, useRef, useState } from "react"
import {
  AppState,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo"
import { ShanaPortrait } from "@/components/brand/ShanaPortrait"
import { Text } from "@/components/StyledText"
import { brandColors, brandRadius, brandShadows } from "@/constants/Brand"
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
  const { height, width } = useWindowDimensions()
  const isCompactLandscape = width > height && height < 440

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
        <View style={styles.popupBackdrop}>
          <View
            style={[
              styles.popupCard,
              isCompactLandscape && styles.popupCardLandscape,
            ]}
            accessibilityRole="alert"
            accessibilityViewIsModal
          >
            <View
              style={[
                styles.popupVisual,
                isCompactLandscape && styles.popupVisualLandscape,
              ]}
            >
              <View style={styles.mascotHalo} />
              <ShanaPortrait
                accessible={false}
                importantForAccessibility="no"
                variant="offline"
                width={98}
                height={132}
              />
              <View style={styles.offlineBadge}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={22}
                  color={brandColors.white}
                />
              </View>
            </View>
            <View style={styles.popupCopy}>
              <Text
                variant="bold"
                style={[
                  styles.popupTitle,
                  isCompactLandscape && styles.popupTextLandscape,
                ]}
              >
                {alertTitle}
              </Text>
              <Text
                style={[
                  styles.popupMessage,
                  isCompactLandscape && styles.popupTextLandscape,
                ]}
              >
                {popupMessage}
              </Text>
              <Pressable
                style={({ pressed }) => [
                  styles.dismissButton,
                  pressed && styles.dismissButtonPressed,
                ]}
                onPress={() => setShowOfflinePopup(false)}
                accessibilityRole="button"
                accessibilityLabel="Dismiss offline message"
              >
                <Text variant="bold" style={styles.dismissButtonLabel}>
                  Got it
                </Text>
                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color={brandColors.white}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  dismissButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: brandColors.blue[600],
    borderRadius: brandRadius.md,
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    minHeight: 48,
    paddingHorizontal: 20,
  },
  dismissButtonLabel: {
    color: brandColors.white,
    marginRight: 8,
  },
  dismissButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  mascotHalo: {
    backgroundColor: brandColors.gold[50],
    borderColor: brandColors.gold[200],
    borderRadius: 64,
    borderWidth: 1,
    height: 116,
    position: "absolute",
    width: 116,
  },
  offlineBadge: {
    alignItems: "center",
    backgroundColor: brandColors.shanaOrange,
    borderColor: brandColors.white,
    borderRadius: 18,
    borderWidth: 3,
    bottom: 3,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 3,
    width: 40,
  },
  popupBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(35, 41, 53, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  popupCard: {
    ...brandShadows.lifted,
    alignItems: "center",
    backgroundColor: brandColors.white,
    borderColor: brandColors.gold[200],
    borderRadius: 28,
    borderWidth: 2,
    maxWidth: 390,
    padding: 22,
    width: "100%",
  },
  popupCardLandscape: {
    alignItems: "center",
    flexDirection: "row",
    maxWidth: 560,
    padding: 18,
  },
  popupCopy: {
    flex: 1,
    minWidth: 0,
    width: "100%",
  },
  popupMessage: {
    color: brandColors.neutral[600],
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
  popupTextLandscape: {
    textAlign: "left",
  },
  popupTitle: {
    color: brandColors.neutral[900],
    fontSize: 23,
    lineHeight: 29,
    textAlign: "center",
  },
  popupVisual: {
    alignItems: "center",
    height: 138,
    justifyContent: "center",
    marginBottom: 4,
    position: "relative",
    width: 138,
  },
  popupVisualLandscape: {
    marginBottom: 0,
    marginRight: 18,
  },
})
