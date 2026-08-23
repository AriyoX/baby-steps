import { getParentDashboardGreeting } from "../parentDashboardGreeting"

describe("getParentDashboardGreeting", () => {
  it("uses the device-local hour to choose the time-of-day message", () => {
    const morning = getParentDashboardGreeting(new Date(2026, 6, 20, 9, 0))
    const afternoon = getParentDashboardGreeting(new Date(2026, 6, 20, 14, 0))
    const evening = getParentDashboardGreeting(new Date(2026, 6, 20, 19, 0))
    const night = getParentDashboardGreeting(new Date(2026, 6, 20, 23, 0))
    expect(morning.title).not.toBe(afternoon.title)
    expect(afternoon.title).not.toBe(evening.title)
    expect(evening.title).not.toBe(night.title)
    expect(new Set([morning.icon, afternoon.icon, evening.icon, night.icon]).size).toBeGreaterThan(2)
  })

  it("gives Friday, Saturday, and Sunday their own messages", () => {
    const friday = getParentDashboardGreeting(new Date(2026, 6, 17, 10, 0))
    const saturday = getParentDashboardGreeting(new Date(2026, 6, 18, 10, 0))
    const sunday = getParentDashboardGreeting(new Date(2026, 6, 19, 10, 0))
    expect(friday.title).toContain("Friday")
    expect(saturday.title).toContain("Saturday")
    expect(sunday.title).toContain("Sunday")
  })

  it("prioritizes a fixed celebration over its weekday message", () => {
    const christmas = getParentDashboardGreeting(new Date(2026, 11, 25, 10, 0))
    expect(christmas.title).toContain("Christmas")
    expect(christmas.icon).toBe("gift-outline")
  })

  it("supports celebrations whose dates move each year", () => {
    expect(getParentDashboardGreeting(new Date(2026, 3, 5, 10, 0)).title).toContain("Easter")
    expect(getParentDashboardGreeting(new Date(2026, 4, 10, 10, 0)).title).toContain("Mother")
    expect(getParentDashboardGreeting(new Date(2026, 5, 21, 10, 0)).title).toContain("Father")
  })
})
