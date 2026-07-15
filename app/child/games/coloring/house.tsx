"use client"

import ColoringGameScreen from "./coloring-game-base"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/ennyumba.png")

export default function HouseColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Ennyumba — House" />
}
