"use client"

import ColoringGameScreen from "./coloring-game-base"

// Load image from local assets
const COLORING_IMAGE = require("@/assets/images/cow.png")

// Define colors for this specific coloring page
const COLORS = [
  "#FFEB3B", // Yellow
  "#4CAF50", // Green
  "#2196F3", // Blue
  "#673AB7", // Purple
  "#795548", // Brown
  "#607D8B", // Gray
  "#000000", // Black
  "#FFFFFF", // White
]

export default function CowColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Cow" colors={COLORS} />
}
