import {
  addLocalCalendarDays,
  calculateCurrentStreak,
  calculateLongestStreak,
  daysBetweenLocalDates,
  deriveStreakSummary,
  isCompletionInsideEpoch,
  isValidLocalDateKey,
  mergeStreakDays,
  normalizeStreakDayForEpoch,
  toLocalDateKey,
  type ChildStreakDay,
  type ChildStreakEpoch,
  type ChildStreakPreferences,
} from "../streakDate"

const childId = "child-1"

const epoch = (
  id: string,
  startedAt: string,
  endedAt: string | null = null,
): ChildStreakEpoch => ({
  id,
  childId,
  startedAt,
  endedAt,
  endReason: endedAt ? "reset" : null,
  updatedAt: endedAt ?? startedAt,
})

const day = (streakEpochId: string, localDate: string): ChildStreakDay => ({
  childId,
  streakEpochId,
  localDate,
  firstCompletedAt: `${localDate}T09:00:00.000Z`,
  firstTimezone: "Africa/Kampala",
  lastCompletedAt: `${localDate}T09:00:00.000Z`,
  lastTimezone: "Africa/Kampala",
  sourceType: "game",
  sourceRef: "counting",
  updatedAt: `${localDate}T09:00:00.000Z`,
})

const preferences = (
  currentEpochId: string | null,
  streakEnabled = true,
): ChildStreakPreferences => ({
  childId,
  streakEnabled,
  includeInReminders: true,
  currentEpochId,
  resetAt: null,
  updatedAt: "2026-07-19T09:00:00.000Z",
})

describe("streak calendar calculations", () => {
  it("starts at zero and makes the first qualified day a one-day streak", () => {
    expect(calculateCurrentStreak([], "epoch-1", "2026-07-19")).toBe(0)
    expect(calculateLongestStreak([], "2026-07-19")).toBe(0)
    expect(calculateCurrentStreak(
      [day("epoch-1", "2026-07-19")],
      "epoch-1",
      "2026-07-19",
    )).toBe(1)
  })

  it("validates civil dates and crosses month, leap-day, and year boundaries", () => {
    expect(isValidLocalDateKey("2024-02-29")).toBe(true)
    expect(isValidLocalDateKey("2025-02-29")).toBe(false)
    expect(isValidLocalDateKey("2026-7-09")).toBe(false)
    expect(addLocalCalendarDays("2024-02-28", 1)).toBe("2024-02-29")
    expect(addLocalCalendarDays("2024-02-29", 1)).toBe("2024-03-01")
    expect(addLocalCalendarDays("2026-12-31", 1)).toBe("2027-01-01")
    expect(daysBetweenLocalDates("2026-12-31", "2027-01-02")).toBe(2)
  })

  it("converts timestamps using the completion timezone, including DST edges", () => {
    expect(toLocalDateKey("2026-07-18T22:30:00.000Z", "Africa/Kampala")).toBe("2026-07-19")
    expect(toLocalDateKey("2026-03-08T06:30:00.000Z", "America/New_York")).toBe("2026-03-08")
    expect(toLocalDateKey("2026-11-01T05:30:00.000Z", "America/New_York")).toBe("2026-11-01")
    expect(toLocalDateKey("2027-01-01T04:30:00.000Z", "America/New_York")).toBe("2026-12-31")
    expect(toLocalDateKey("not-a-date", "Africa/Kampala")).toBeNull()
    expect(toLocalDateKey("2026-07-19T00:00:00.000Z", "Not/AZone")).toBeNull()
  })

  it("keeps earliest and latest timestamp/timezone pairs atomic across device timezones", () => {
    const kampala = {
      ...day("epoch-1", "2026-07-19"),
      firstCompletedAt: "2026-07-18T22:30:00.000Z",
      firstTimezone: "Africa/Kampala",
      lastCompletedAt: "2026-07-18T22:30:00.000Z",
      lastTimezone: "Africa/Kampala",
    }
    const newYork = {
      ...day("epoch-1", "2026-07-19"),
      firstCompletedAt: "2026-07-19T10:00:00.000Z",
      firstTimezone: "America/New_York",
      lastCompletedAt: "2026-07-19T10:00:00.000Z",
      lastTimezone: "America/New_York",
    }

    const forward = mergeStreakDays(kampala, newYork)
    const reverse = mergeStreakDays(newYork, kampala)
    for (const merged of [forward, reverse]) {
      expect(merged.firstCompletedAt).toBe(kampala.firstCompletedAt)
      expect(merged.firstTimezone).toBe("Africa/Kampala")
      expect(merged.lastCompletedAt).toBe(newYork.lastCompletedAt)
      expect(merged.lastTimezone).toBe("America/New_York")
    }
  })

  it.each([
    ["valid first / invalid last", "2026-07-19T09:00:00.000Z", "2026-07-19T10:00:00.000Z", "2026-07-19T09:00:00.000Z"],
    ["invalid first / valid last", "2026-07-19T07:00:00.000Z", "2026-07-19T09:00:00.000Z", "2026-07-19T09:00:00.000Z"],
  ])("normalizes %s without inventing a boundary", (_label, first, last, expected) => {
    const normalized = normalizeStreakDayForEpoch({
      ...day("epoch-1", "2026-07-19"),
      firstCompletedAt: first,
      lastCompletedAt: last,
    }, epoch("epoch-1", "2026-07-19T08:00:00.000Z", "2026-07-19T10:00:00.000Z"))
    expect(normalized?.firstCompletedAt).toBe(expected)
    expect(normalized?.lastCompletedAt).toBe(expected)
  })

  it("rejects a cached day only when neither supplied boundary is in the epoch", () => {
    expect(normalizeStreakDayForEpoch({
      ...day("epoch-1", "2026-07-19"),
      firstCompletedAt: "2026-07-19T07:00:00.000Z",
      lastCompletedAt: "2026-07-19T10:00:00.000Z",
    }, epoch("epoch-1", "2026-07-19T08:00:00.000Z", "2026-07-19T10:00:00.000Z"))).toBeNull()
  })

  it("keeps a valid boundary when the other timestamp/timezone pair maps to another date", () => {
    const normalized = normalizeStreakDayForEpoch({
      ...day("epoch-1", "2026-03-08"),
      firstCompletedAt: "2026-03-08T22:30:00.000Z",
      firstTimezone: "Africa/Kampala",
      lastCompletedAt: "2026-03-08T09:00:00.000Z",
      lastTimezone: "America/New_York",
    }, epoch("epoch-1", "2026-03-08T08:00:00.000Z"))

    expect(normalized).toEqual(expect.objectContaining({
      firstCompletedAt: "2026-03-08T09:00:00.000Z",
      firstTimezone: "America/New_York",
      lastCompletedAt: "2026-03-08T09:00:00.000Z",
      lastTimezone: "America/New_York",
    }))
  })

  it("preserves same-day qualifications on each side of disable/re-enable without bridging epochs", () => {
    const oldEpoch = epoch("old", "2026-07-18T00:00:00.000Z", "2026-07-19T10:00:00.000Z")
    const newEpoch = epoch("new", "2026-07-19T11:00:00.000Z")
    const normalizedOld = normalizeStreakDayForEpoch({
      ...day("old", "2026-07-19"),
      firstCompletedAt: "2026-07-19T09:00:00.000Z",
      lastCompletedAt: "2026-07-19T12:00:00.000Z",
    }, oldEpoch)
    const normalizedNew = normalizeStreakDayForEpoch({
      ...day("new", "2026-07-19"),
      firstCompletedAt: "2026-07-19T09:00:00.000Z",
      lastCompletedAt: "2026-07-19T12:00:00.000Z",
    }, newEpoch, newEpoch.startedAt)

    expect(normalizedOld?.firstCompletedAt).toBe("2026-07-19T09:00:00.000Z")
    expect(normalizedOld?.lastCompletedAt).toBe("2026-07-19T09:00:00.000Z")
    expect(normalizedNew?.firstCompletedAt).toBe("2026-07-19T12:00:00.000Z")
    expect(normalizedNew?.lastCompletedAt).toBe("2026-07-19T12:00:00.000Z")
    expect(calculateLongestStreak([normalizedOld!, normalizedNew!], "2026-07-19")).toBe(1)
  })

  it("treats epoch start as inclusive and epoch end as exclusive", () => {
    const closed = epoch("epoch-1", "2026-07-18T10:00:00.000Z", "2026-07-19T10:00:00.000Z")
    expect(isCompletionInsideEpoch("2026-07-18T10:00:00.000Z", closed)).toBe(true)
    expect(isCompletionInsideEpoch("2026-07-19T09:59:59.999Z", closed)).toBe(true)
    expect(isCompletionInsideEpoch("2026-07-19T10:00:00.000Z", closed)).toBe(false)
  })

  it("deduplicates days, continues from yesterday, and expires after a missed day", () => {
    const days = [
      day("epoch-1", "2026-07-18"),
      day("epoch-1", "2026-07-17"),
      day("epoch-1", "2026-07-18"),
    ]
    expect(calculateCurrentStreak(days, "epoch-1", "2026-07-19")).toBe(2)
    expect(calculateLongestStreak(days, "2026-07-19")).toBe(2)
    expect(calculateCurrentStreak(days, "epoch-1", "2026-07-20")).toBe(0)
    expect(calculateCurrentStreak(days, "epoch-1", "2026-07-23")).toBe(0)
    expect(calculateLongestStreak(days, "2026-07-23")).toBe(2)
  })

  it("never bridges reset epochs, even when both qualify on the same local date", () => {
    const days = [
      day("old", "2026-07-17"),
      day("old", "2026-07-18"),
      day("new", "2026-07-18"),
      day("new", "2026-07-19"),
    ]
    expect(calculateCurrentStreak(days, "new", "2026-07-19")).toBe(2)
    expect(calculateLongestStreak(days, "2026-07-19")).toBe(2)
  })

  it("ignores malformed and future rows and preserves best history while disabled", () => {
    const days = [
      day("old", "2026-07-17"),
      day("old", "2026-07-18"),
      day("old", "bad-date"),
      day("old", "2026-07-20"),
    ]
    const summary = deriveStreakSummary(
      days,
      [epoch("old", "2026-07-01T00:00:00.000Z", "2026-07-19T00:00:00.000Z")],
      preferences(null, false),
      "2026-07-19T12:00:00.000Z",
      "UTC",
    )
    expect(summary.currentStreak).toBe(0)
    expect(summary.longestStreak).toBe(2)
    expect(summary.todayComplete).toBe(false)
    expect(summary.lastSevenDays).toHaveLength(7)
  })
})
