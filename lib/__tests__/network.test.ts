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

  it("labels a fetch failure as a temporary connection problem while online", async () => {
    const error = new TypeError("Network request failed")
    expect(isLikelyNetworkError(error)).toBe(true)
    await expect(showNetworkErrorIfNeeded(error, "Signing in")).resolves.toBe(true)
    expect(mockAlert).toHaveBeenCalledWith(
      "Can’t connect right now",
      expect.stringContaining("The service may be temporarily unavailable"),
    )
  })

  it("reserves the offline label for an explicit NetInfo offline result", async () => {
    mockFetch.mockResolvedValue({ isConnected: false, isInternetReachable: false })

    await expect(
      showNetworkErrorIfNeeded(new TypeError("Failed to fetch"), "Signing in"),
    ).resolves.toBe(true)
    expect(mockAlert).toHaveBeenCalledWith(
      "No internet connection",
      expect.stringContaining("Signing in needs an internet connection"),
    )
  })

  it("leaves non-network errors to the calling screen while online", async () => {
    await expect(
      showNetworkErrorIfNeeded(new Error("Invalid password"), "Signing in"),
    ).resolves.toBe(false)
    expect(mockAlert).not.toHaveBeenCalled()
  })
})
