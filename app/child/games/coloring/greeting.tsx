"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/greeting-v2.png")

export default function GreetingColoringScreen() {
  return (
    <ColoringGameScreen
      imageSource={COLORING_IMAGE}
      pageName="Oli otya?: How are you?"
    />
  )
}
