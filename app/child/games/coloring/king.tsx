"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring-royal-leader-v2.png")

export default function KingColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="King" />
}
