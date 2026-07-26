import NetInfo from "@react-native-community/netinfo"
import { Alert } from "react-native"

export const OFFLINE_ALERT_TITLE = "No internet connection"
export const CONNECTION_ALERT_TITLE = "Can’t connect right now"

export type ReportedConnectivityIssue = {
  kind: "unstable"
  message: string
}

type ConnectivityIssueListener = (
  issue: ReportedConnectivityIssue | null,
) => void

let reportedConnectivityIssue: ReportedConnectivityIssue | null = null
const connectivityIssueListeners = new Set<ConnectivityIssueListener>()

export const getReportedConnectivityIssue = () => reportedConnectivityIssue

export const reportConnectivityIssue = (message: string) => {
  reportedConnectivityIssue = {
    kind: "unstable",
    message,
  }
  connectivityIssueListeners.forEach((listener) =>
    listener(reportedConnectivityIssue),
  )
}

export const clearReportedConnectivityIssue = () => {
  if (!reportedConnectivityIssue) return
  reportedConnectivityIssue = null
  connectivityIssueListeners.forEach((listener) => listener(null))
}

export const subscribeConnectivityIssues = (
  listener: ConnectivityIssueListener,
) => {
  connectivityIssueListeners.add(listener)
  listener(reportedConnectivityIssue)
  return () => {
    connectivityIssueListeners.delete(listener)
  }
}

const getOfflineMessage = (action: string) =>
  `${action} needs an internet connection. Check Wi-Fi or mobile data, then try again. Activities already saved on this device may still be available.`

const getConnectionMessage = (action: string) =>
  `${action} could not reach Baby Steps. The service may be temporarily unavailable. Please try again in a moment.`

const getErrorMessage = (error: unknown): string => {
  if (typeof error === "string") return error
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === "string" ? message : ""
  }
  return ""
}

export function isLikelyNetworkError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  return [
    "failed to fetch",
    "fetch failed",
    "network request failed",
    "network error",
    "connection refused",
    "internet connection",
    "load failed",
    "timed out",
    "timeout",
  ].some((phrase) => message.includes(phrase))
}

export async function isDeviceOffline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch()
    return state.isConnected === false || state.isInternetReachable === false
  } catch (error) {
    console.warn("Could not read network state:", error)
    return false
  }
}

export function showOfflineAlert(action: string) {
  Alert.alert(OFFLINE_ALERT_TITLE, getOfflineMessage(action))
}

export function showConnectionAlert(action: string) {
  Alert.alert(CONNECTION_ALERT_TITLE, getConnectionMessage(action))
}

export async function requireInternet(action: string): Promise<boolean> {
  if (!(await isDeviceOffline())) return true
  showOfflineAlert(action)
  return false
}

export async function showNetworkErrorIfNeeded(
  error: unknown,
  action: string,
): Promise<boolean> {
  if (await isDeviceOffline()) {
    showOfflineAlert(action)
    return true
  }

  if (!isLikelyNetworkError(error)) return false
  showConnectionAlert(action)
  return true
}
