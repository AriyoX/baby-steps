import { readFileSync } from "fs"
import path from "path"

const root = path.join(__dirname, "..", "..", "..")
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8")

describe("learning streak UI integrations", () => {
  it("shows current, best, today, seven-day, preference, and reset states in the child profile", () => {
    const source = read("components/parent/ChildStreakSection.tsx")
    expect(source).toContain("Current streak")
    expect(source).toContain("Best streak")
    expect(source).toContain("Learning is complete for today")
    expect(source).toContain("Last seven days")
    expect(source).toContain("Include in learning reminders")
    expect(source).toContain('Alert.alert(\n      "Reset current streak?"')
    expect(source).toContain("learning complete")
    expect(source).toContain("no qualifying activity")
  })

  it("shows only the active enabled child's compact streak with an accessibility label", () => {
    const source = read("components/child/AfricanThemeGameInterface.tsx")
    const streakSource = read("components/child/ChildHeaderStreak.tsx")
    expect(streakSource).toContain("snapshot.childId !== activeChildId")
    expect(streakSource).toContain("!snapshot.preferences.streakEnabled")
    expect(streakSource).toContain('testID="child-header-streak"')
    expect(source).toContain('t("streak.accessibilityLabel"')
  })

  it("uses a non-modal, reduced-motion-aware, accessible daily celebration", () => {
    const source = read("components/child/StreakCelebrationHost.tsx")
    expect(source).toContain("useReducedMotion")
    expect(source).toContain('accessibilityRole="alert"')
    expect(source).toContain('testID="streak-celebration"')
    expect(source).not.toContain("Modal")
  })

  it("clears visible state during child switches and guards snapshots by child id", () => {
    const source = read("context/StreakContext.tsx")
    expect(source).toContain("setSnapshot(null)")
    expect(source).toContain("setIsLoading(Boolean(activeChildId))")
    expect(source).toContain("snapshot?.childId === activeChildId ? snapshot : null")
  })
})
