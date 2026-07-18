"use client"

import ColoringGameScreen from "@/components/coloring/ColoringGameScreen"

const COLORING_IMAGE = require("@/assets/images/learning/lg/coloring/omwana-v2.png")

export default function ChildColoringScreen() {
  return <ColoringGameScreen imageSource={COLORING_IMAGE} pageName="Omwana: Child" />
}
