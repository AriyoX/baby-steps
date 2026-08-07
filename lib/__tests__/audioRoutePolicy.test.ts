import { shouldSuppressBackgroundMusic } from "../audioRoutePolicy"

describe("shouldSuppressBackgroundMusic", () => {
  it.each([
    "/child/games/cardgame",
    "/child/games/coloring/animals",
    "/child/games/museum/ArtifactsScreen",
    "/child/learning/stage-1/lesson/lesson-1",
    "/child/stories/kintu",
  ])("suppresses music on focused route %s", (pathname) => {
    expect(shouldSuppressBackgroundMusic(pathname)).toBe(true)
  })

  it.each([
    "/child",
    "/child/learning/stage-1",
    "/child/(tabs)/learning",
    "/parent/settings/audio",
  ])("keeps music available on browsing route %s", (pathname) => {
    expect(shouldSuppressBackgroundMusic(pathname)).toBe(false)
  })
})
