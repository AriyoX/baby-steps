export type ParentingTip = {
  id: string
  category: string
  title: string
  tip: string
  tryThis: string
  icon: "chatbubbles-outline" | "book-outline" | "heart-outline" | "moon-outline" | "restaurant-outline" | "walk-outline"
  color: string
  tint: string
}

export const PARENTING_TIPS: ParentingTip[] = [
  {
    id: "serve-return",
    category: "Connection",
    title: "Follow their lead for five minutes",
    tip: "When your child points, asks, or shows you something, respond to that interest. These back-and-forth moments build language and trust.",
    tryThis: "Put your phone away and narrate what they choose to play with.",
    icon: "chatbubbles-outline",
    color: "#0274BB",
    tint: "#EAF6FC",
  },
  {
    id: "interactive-reading",
    category: "Language",
    title: "Turn story time into a conversation",
    tip: "Pause to ask what your child notices, what might happen next, or how a character feels. Let them answer in any language they know.",
    tryThis: "Ask one open question per page instead of testing for a right answer.",
    icon: "book-outline",
    color: "#C94C3F",
    tint: "#FFF0EE",
  },
  {
    id: "name-feelings",
    category: "Emotions",
    title: "Name the feeling before solving it",
    tip: "A calm label such as “You look disappointed” helps children understand big feelings and makes it easier to reconnect.",
    tryThis: "Validate first, then offer two simple choices for what happens next.",
    icon: "heart-outline",
    color: "#A73F36",
    tint: "#FFE1DD",
  },
  {
    id: "bedtime-rhythm",
    category: "Routines",
    title: "Keep bedtime predictable",
    tip: "A short sequence repeated in the same order helps a child know what comes next and settle more easily.",
    tryThis: "Try wash, pajamas, one story, a cuddle, then lights out.",
    icon: "moon-outline",
    color: "#075685",
    tint: "#D4EDF8",
  },
  {
    id: "food-pressure",
    category: "Mealtimes",
    title: "Offer variety without pressure",
    tip: "Adults choose what and when to serve; children can decide what and how much to eat from what is offered.",
    tryThis: "Include one familiar food beside something new and keep the mood neutral.",
    icon: "restaurant-outline",
    color: "#8F640F",
    tint: "#FFF8E1",
  },
  {
    id: "movement-break",
    category: "Wellbeing",
    title: "Use movement to reset attention",
    tip: "Young children learn through their bodies. A quick movement break can help when focus or patience is running low.",
    tryThis: "Do ten jumps, copy animal walks, or take a short walk together.",
    icon: "walk-outline",
    color: "#0267A6",
    tint: "#EAF6FC",
  },
]
