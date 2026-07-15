"use client"

import ColoringGameScreen from "./coloring-game-base"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/taata.png")

export default function FatherColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Taata — Father" />
}
