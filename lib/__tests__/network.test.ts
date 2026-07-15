const mockFetch = jest.fn()
const mockAlert = jest.fn()

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { fetch: mockFetch },
}))

jest.mock("react-native", () => ({
  Alert: { alert: mockAlert },
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const {
  isDeviceOffline,
  isLikelyNetworkError,
  requireInternet,
  showNetworkErrorIfNeeded,
} = require("../network")
/* eslint-enable @typescript-eslint/no-require-imports */

describe("network helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: true })
  })

  it("treats a missing connection as offline", async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false })
    await expect(isDeviceOffline()).resolves.toBe(true)
  })

  it("does not block an operation while reachability is still unknown", async () => {
    mockFetch.mockResolvedValue({ isConnected: null, isInternetReachable: null })
    await expect(requireInternet("Signing in")).resolves.toBe(true)
    expect(mockAlert).not.toHaveBeenCalled()
  })

  it("shows an action-specific offline alert before a network operation", async () => {
    mockFetch.mockResolvedValue({ isConnected: true, isInternetReachable: false })
    await expect(requireInternet("Creating an account")).resolves.toBe(false)
    expect(mockAlert).toHaveBeenCalledWith(
      "No internet connection",
      expect.stringContaining("Creating an account needs an internet connection"),
    )
  })

  it("recognizes common fetch failures returned by auth clients", async () => {
    const error = new TypeError("Network request failed")
    expect(isLikelyNetworkError(error)).toBe(true)
    await expect(showNetworkErrorIfNeeded(error, "Signing in")).resolves.toBe(true)
    expect(mockAlert).toHaveBeenCalled()
  })
})
