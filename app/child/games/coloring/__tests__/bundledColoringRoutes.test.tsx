/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react"
import { existsSync } from "node:fs"
import { resolve } from "node:path"
import renderer, { act } from "react-test-renderer"

import AnimalsColoringScreen from "../animals"
import ChildColoringScreen from "../child"
import EmblemColoringScreen from "../emblem"
import FatherColoringScreen from "../father"
import GreetingColoringScreen from "../greeting"
import HouseColoringScreen from "../house"
import KingColoringScreen from "../king"
import MaskColoringScreen from "../mask"
import MotherColoringScreen from "../mother"
import ShapesColoringScreen from "../shapes"

jest.mock("@/components/coloring/ColoringGameScreen", () => {
  const ReactNative = require("react-native")
  return function MockColoringGame({ pageName }: { pageName: string }) {
    return (
      <ReactNative.Text testID="bundled-coloring-canvas">
        {pageName}
      </ReactNative.Text>
    )
  }
})

describe("bundled Coloring routes", () => {
  it("keeps the shared coloring component outside the Expo route tree", () => {
    expect(existsSync(resolve(__dirname, "../coloring-game-base.tsx"))).toBe(false)
  })

  it.each([
    ["Cow", AnimalsColoringScreen],
    ["Omwana — Child", ChildColoringScreen],
    ["Emblem", EmblemColoringScreen],
    ["Taata — Father", FatherColoringScreen],
    ["Oli otya? — How are you?", GreetingColoringScreen],
    ["Ennyumba — House", HouseColoringScreen],
    ["King", KingColoringScreen],
    ["Mask", MaskColoringScreen],
    ["Maama — Mother", MotherColoringScreen],
    ["Shapes", ShapesColoringScreen],
  ])("renders the %s canvas without a database content gate", async (pageName, Screen) => {
    let tree: renderer.ReactTestRenderer
    await act(async () => {
      tree = renderer.create(<Screen />)
    })

    const canvas = tree!.root.findByProps({ testID: "bundled-coloring-canvas" })
    expect(canvas.props.children).toBe(pageName)
  })
})
