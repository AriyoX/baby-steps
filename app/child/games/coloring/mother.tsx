"use client"

import ColoringGameScreen from "./coloring-game-base"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/maama.png")

export default function MotherColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Maama — Mother" />
}
