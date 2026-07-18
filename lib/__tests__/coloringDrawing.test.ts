import {
  clearColoringHistory,
  commitColoringMark,
  createColoringHistory,
  eraseColoringMarks,
  redoColoringHistory,
  undoColoringHistory,
} from "../coloringDrawing"

describe("coloring drawing history", () => {
  const mark = {
    id: "mark-1",
    points: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
    ],
    color: "#FF0000",
    size: 4,
    type: "stroke" as const,
  }

  it("commits, undoes, and redoes a mark", () => {
    const committed = commitColoringMark(createColoringHistory(), mark)
    expect(committed.marks).toHaveLength(1)

    const undone = undoColoringHistory(committed)
    expect(undone.marks).toHaveLength(0)

    const redone = redoColoringHistory(undone)
    expect(redone.marks).toEqual([mark])
  })

  it("erases the touched part and preserves an undo snapshot", () => {
    const committed = commitColoringMark(createColoringHistory(), mark)
    const erased = eraseColoringMarks(committed, [{ x: 10, y: 0 }], 2)

    expect(erased.marks).toHaveLength(2)
    expect(erased.marks[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 6, y: 0 },
    ])
    expect(erased.marks[1].points).toEqual([
      { x: 14, y: 0 },
      { x: 20, y: 0 },
    ])
    expect(undoColoringHistory(erased).marks).toEqual([mark])
  })

  it("erases where an eraser path crosses the middle of a long stroke segment", () => {
    const longStroke = {
      ...mark,
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
      ],
    }
    const committed = commitColoringMark(createColoringHistory(), longStroke)
    const erased = eraseColoringMarks(
      committed,
      [
        { x: 10, y: -10 },
        { x: 10, y: 10 },
      ],
      1,
    )

    expect(erased.marks).toHaveLength(2)
    expect(erased.marks[0].points.at(-1)).toEqual({ x: 7, y: 0 })
    expect(erased.marks[1].points[0]).toEqual({ x: 13, y: 0 })
  })

  it("clears without losing the ability to undo", () => {
    const committed = commitColoringMark(createColoringHistory(), mark)
    const cleared = clearColoringHistory(committed)

    expect(cleared.marks).toHaveLength(0)
    expect(undoColoringHistory(cleared).marks).toEqual([mark])
  })
})
