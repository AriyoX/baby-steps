"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring-pattern-mask-v2.png")

export default function MaskColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Mask" />
}
