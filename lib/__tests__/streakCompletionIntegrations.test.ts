import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "..", "..")
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("qualified streak completion integrations", () => {
  const integrations = [
    "app/child/learning/[stageId]/lesson/[lessonId].tsx",
    "components/coloring/ColoringGameScreen.tsx",
    "components/games/CardsMatchingComponent.tsx",
    "components/games/CountingGameComponent.tsx",
    "components/games/LearningGameComponent.tsx",
    "components/games/PuzzleGameComponent.tsx",
    "components/games/WordGameComponent.tsx",
    "components/stories/GenericStoryRenderer.tsx",
    "components/stories/StoryProgress.tsx",
  ]

  it.each(integrations)("records a stable qualified completion in %s", (relativePath) => {
    const source = read(relativePath)
    expect(source).toContain("recordQualifiedStreakActivity")
    expect(source).toContain("completionId")
    expect(source).toContain("completedAt")
  })

  it("does not award coloring streaks until the child intentionally saves", () => {
    const source = read("components/coloring/ColoringGameScreen.tsx")
    const saveIndex = source.indexOf("const saveToGallery")
    const streakIndex = source.indexOf("recordQualifiedStreakActivity", saveIndex)
    expect(saveIndex).toBeGreaterThan(-1)
    expect(streakIndex).toBeGreaterThan(saveIndex)
  })
})
