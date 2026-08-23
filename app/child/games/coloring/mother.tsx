"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/maama-v2.png")

export default function MotherColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Maama: Mother" />
}
