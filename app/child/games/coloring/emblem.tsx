"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring-emblem-v2.png")

export default function EmblemColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Emblem" />
}
