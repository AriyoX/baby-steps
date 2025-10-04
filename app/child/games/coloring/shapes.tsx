"use client"

import ColoringGameScreen from "./coloring-game-base"

// Load image from local assets
const COLORING_IMAGE = require("@/assets/images/shapes.jpg")

// Define bright, baby-friendly colors
const COLORS = [
  "#FF4081", // Pink
  "#FF9800", // Orange
  "#FFEB3B", // Yellow
  "#8BC34A", // Light Green
  "#03A9F4", // Light Blue
  "#9C27B0", // Purple
  "#000000", // Black
  "#FFFFFF", // White
]

export default function ShapesColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Shapes" colors={COLORS} />
}
