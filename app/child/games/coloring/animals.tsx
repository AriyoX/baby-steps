"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring-cow-v2.png")

export default function CowColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Cow" />
}
