"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/coloring-shapes-v2.png")

export default function ShapesColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Shapes" />
}
