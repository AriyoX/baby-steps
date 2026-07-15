/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react"
import renderer, { act } from "react-test-renderer"

import AnimalsColoringScreen from "../animals"
import EmblemColoringScreen from "../emblem"
import KingColoringScreen from "../king"
import MaskColoringScreen from "../mask"
import ShapesColoringScreen from "../shapes"

jest.mock("../coloring-game-base", () => {
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
  it.each([
    ["Cow", AnimalsColoringScreen],
    ["Emblem", EmblemColoringScreen],
    ["King", KingColoringScreen],
    ["Mask", MaskColoringScreen],
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
