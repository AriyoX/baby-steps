"use client"

import ColoringGameScreen from "./coloring-game-base"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/omwana.png")

export default function ChildColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Omwana — Child" />
}
