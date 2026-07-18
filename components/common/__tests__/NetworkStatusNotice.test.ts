import {
  OFFLINE_BANNER_MESSAGE,
  OFFLINE_POPUP_MESSAGE,
  shouldShowPersistentNetworkBanner,
} from "../NetworkStatusNotice"

describe("global offline notice", () => {
  it("uses wording that preserves access to saved activities", () => {
    expect(OFFLINE_BANNER_MESSAGE).toContain("Sign-in, syncing and fresh updates")
    expect(OFFLINE_POPUP_MESSAGE).toContain("Saved activities may still work")
    expect(`${OFFLINE_BANNER_MESSAGE} ${OFFLINE_POPUP_MESSAGE}`).not.toContain(
      "Account access",
    )
  })

  it("does not cover child activities with the persistent banner", () => {
    expect(shouldShowPersistentNetworkBanner("/child/games/coloring/animals")).toBe(false)
    expect(shouldShowPersistentNetworkBanner("/child/learning/stage-1")).toBe(false)
    expect(shouldShowPersistentNetworkBanner("/parent")).toBe(true)
    expect(shouldShowPersistentNetworkBanner("/login")).toBe(true)
  })
})
