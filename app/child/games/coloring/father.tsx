"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/taata-v2.png")

export default function FatherColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Taata — Father" />
}
