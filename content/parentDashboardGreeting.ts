import type { ComponentProps } from "react"
import { Ionicons } from "@expo/vector-icons"

export type ParentDashboardGreeting = {
  title: string
  message: string
  icon: ComponentProps<typeof Ionicons>["name"]
}

type TimeOfDay = "early" | "morning" | "afternoon" | "evening" | "night"

const FIXED_DAY_GREETINGS: Record<string, ParentDashboardGreeting> = {
  "01-01": {
    title: "A bright new year begins!",
    message: "Start softly—a story, a song, or one curious question is plenty for today.",
    icon: "sparkles-outline",
  },
  "02-14": {
    title: "A little love goes a long way",
    message: "Share a cuddle, a kind word, and a few playful minutes together today.",
    icon: "heart-outline",
  },
  "05-15": {
    title: "Happy International Day of Families!",
    message: "Celebrate your family with one small moment of learning, laughter, or listening.",
    icon: "people-outline",
  },
  "06-01": {
    title: "Today celebrates you, parent",
    message: "Your steady encouragement matters more than a perfect lesson ever could.",
    icon: "ribbon-outline",
  },
  "06-16": {
    title: "Celebrating every African child",
    message: "Make room today for their voice, their imagination, and the joy of learning.",
    icon: "earth-outline",
  },
  "12-24": {
    title: "A little Christmas Eve magic",
    message: "Slow down for a festive story, a family song, or a cozy moment together.",
    icon: "star-outline",
  },
  "12-25": {
    title: "Merry Christmas to your family!",
    message: "Today is for warmth, wonder, and celebrating the little moments together.",
    icon: "gift-outline",
  },
  "12-26": {
    title: "A gentle Boxing Day hello",
    message: "Keep today easy—rest, reconnect, and follow your child’s curiosity.",
    icon: "gift-outline",
  },
  "12-31": {
    title: "One last little win this year",
    message: "Celebrate how far you have come together—every small step counted.",
    icon: "trophy-outline",
  },
}

const EASTER_GREETINGS: Record<number, ParentDashboardGreeting> = {
  [-2]: {
    title: "A peaceful Good Friday",
    message: "Make space for a quiet story, a thoughtful question, or simply being together.",
    icon: "heart-circle-outline",
  },
  0: {
    title: "Happy Easter to your family!",
    message: "Let today be full of hope, discovery, and small moments of joy together.",
    icon: "flower-outline",
  },
  1: {
    title: "An easy Easter Monday",
    message: "Keep the holiday playful with a song, a story, or a tiny family adventure.",
    icon: "flower-outline",
  },
}

const STANDARD_GREETINGS: Record<TimeOfDay, ParentDashboardGreeting[]> = {
  early: [
    { title: "A soft start is still a start", message: "If the house is waking up, one song or cuddle can begin the day beautifully.", icon: "partly-sunny-outline" },
    { title: "Good morning, early bird", message: "Follow their curiosity for a few quiet minutes—there is no need to rush.", icon: "cloudy-night-outline" },
  ],
  morning: [
    { title: "Ready for today’s little win?", message: "Ten playful minutes together can be enough to build a happy habit.", icon: "sunny-outline" },
    { title: "A curious morning starts here", message: "Try one story, one question, or one game and let your child lead the way.", icon: "bulb-outline" },
  ],
  afternoon: [
    { title: "How about a little learning break?", message: "A quick game or story can turn an ordinary afternoon into a small win.", icon: "book-outline" },
    { title: "A playful pause can do wonders", message: "Five focused minutes together matter more than a long, perfect session.", icon: "game-controller-outline" },
  ],
  evening: [
    { title: "Time for a gentle evening win", message: "Wind down with a cozy story, a quiet game, or a chat about the day.", icon: "moon-outline" },
    { title: "Small moments still count tonight", message: "One calm activity together is a lovely way to close out the day.", icon: "library-outline" },
  ],
  night: [
    { title: "Rest is a little win, too", message: "There is always another day to learn—tonight, a bedtime story is enough.", icon: "bed-outline" },
    { title: "You’ve done enough for today", message: "Let the day end gently. Tomorrow will bring another chance to explore together.", icon: "moon-outline" },
  ],
}

const WEEKEND_GREETINGS: Record<5 | 6 | 0, Record<TimeOfDay, ParentDashboardGreeting>> = {
  5: {
    early: { title: "A gentle Friday beginning", message: "Ease into the last weekday with one calm, curious moment together.", icon: "cafe-outline" },
    morning: { title: "Friday’s little finish-line win", message: "A playful ten minutes can end the week on a bright and confident note.", icon: "flag-outline" },
    afternoon: { title: "Friday fun is calling", message: "Mark the end of the week with a favorite game, song, or silly challenge.", icon: "musical-notes-outline" },
    evening: { title: "Hello, Friday wind-down", message: "Celebrate the week with something easy, playful, and pressure-free.", icon: "sparkles-outline" },
    night: { title: "The weekend can wait till morning", message: "A bedtime story and a good rest are more than enough for tonight.", icon: "bed-outline" },
  },
  6: {
    early: { title: "Saturday starts at your pace", message: "No rush—let a cuddle, a story, or a curious question lead the morning.", icon: "cloud-outline" },
    morning: { title: "Saturday is made for exploring", message: "Turn playtime into discovery and follow whatever makes their eyes light up.", icon: "compass-outline" },
    afternoon: { title: "A Saturday mini-adventure?", message: "Try a game, a walk, or a story and see where their imagination takes you.", icon: "rocket-outline" },
    evening: { title: "Saturday smiles, one more time", message: "End the day with a favorite story or a quick game you can enjoy together.", icon: "happy-outline" },
    night: { title: "A cozy close to Saturday", message: "Let today’s discoveries settle in with rest and a familiar bedtime story.", icon: "moon-outline" },
  },
  0: {
    early: { title: "A peaceful Sunday start", message: "Keep the morning gentle and notice the small things your child wonders about.", icon: "leaf-outline" },
    morning: { title: "Sunday togetherness starts here", message: "Share a slow story, a family game, or a conversation with no need to hurry.", icon: "people-outline" },
    afternoon: { title: "A small Sunday spark", message: "One cheerful activity can add a little wonder to a restful family afternoon.", icon: "color-wand-outline" },
    evening: { title: "Ready gently for the week ahead", message: "A calm story or simple game can help tomorrow begin with confidence.", icon: "calendar-outline" },
    night: { title: "Sunday is winding down", message: "Rest well. The new week will bring plenty of fresh little wins.", icon: "moon-outline" },
  },
}

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 8) return "early"
  if (hour >= 8 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  if (hour >= 17 && hour < 21) return "evening"
  return "night"
}

function getEasterSunday(year: number) {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month, day)
}

function daysApart(left: Date, right: Date) {
  const leftUtc = Date.UTC(left.getFullYear(), left.getMonth(), left.getDate())
  const rightUtc = Date.UTC(right.getFullYear(), right.getMonth(), right.getDate())
  return Math.round((leftUtc - rightUtc) / 86_400_000)
}

function getMovableCelebration(date: Date): ParentDashboardGreeting | undefined {
  const easterGreeting = EASTER_GREETINGS[daysApart(date, getEasterSunday(date.getFullYear()))]
  if (easterGreeting) return easterGreeting

  const day = date.getDay()
  const weekOfMonth = Math.ceil(date.getDate() / 7)
  if (date.getMonth() === 4 && day === 0 && weekOfMonth === 2) {
    return { title: "Happy Mother’s Day!", message: "Celebrate every caring moment—the patient, playful, everyday ones all matter.", icon: "heart-outline" }
  }
  if (date.getMonth() === 5 && day === 0 && weekOfMonth === 3) {
    return { title: "Happy Father’s Day!", message: "Today celebrates the stories, play, guidance, and love shared along the way.", icon: "heart-outline" }
  }
  return undefined
}

function getWeekNumber(date: Date) {
  return Math.floor(daysApart(date, new Date(date.getFullYear(), 0, 1)) / 7)
}

export function getParentDashboardGreeting(date = new Date()): ParentDashboardGreeting {
  const monthDay = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  const fixedGreeting = FIXED_DAY_GREETINGS[monthDay]
  if (fixedGreeting) return fixedGreeting

  const movableGreeting = getMovableCelebration(date)
  if (movableGreeting) return movableGreeting

  const timeOfDay = getTimeOfDay(date.getHours())
  const day = date.getDay()
  if (day === 5 || day === 6 || day === 0) return WEEKEND_GREETINGS[day][timeOfDay]

  const variants = STANDARD_GREETINGS[timeOfDay]
  return variants[getWeekNumber(date) % variants.length]
}
