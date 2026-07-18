"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/ennyumba-v2.png")

export default function HouseColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Ennyumba: House" />
}
