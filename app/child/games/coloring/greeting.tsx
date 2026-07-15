"use client"

import ColoringGameScreen from "./coloring-game-base"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/greeting.png")

export default function GreetingColoringScreen() {
  return (
    <ColoringGameScreen
      imageSource={COLORING_IMAGE}
      pageName="Oli otya? — How are you?"
    />
  )
}
