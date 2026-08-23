export interface ColoringPoint {
  x: number
  y: number
}

export interface ColoringMark {
  id: string
  points: ColoringPoint[]
  color: string
  size: number
  type: "stroke" | "stamp"
}

export interface ColoringHistory {
  marks: ColoringMark[]
  undoStack: ColoringMark[][]
  redoStack: ColoringMark[][]
}

export const createColoringHistory = (): ColoringHistory => ({
  marks: [],
  undoStack: [],
  redoStack: [],
})

const cloneMarks = (marks: ColoringMark[]): ColoringMark[] =>
  marks.map((mark) => ({
    ...mark,
    points: mark.points.map((point) => ({ ...point })),
  }))

const squaredDistance = (first: ColoringPoint, second: ColoringPoint): number => {
  const deltaX = second.x - first.x
  const deltaY = second.y - first.y
  return deltaX * deltaX + deltaY * deltaY
}

export const pointDistance = (first: ColoringPoint, second: ColoringPoint): number =>
  Math.sqrt(squaredDistance(first, second))

const GEOMETRY_EPSILON = 1e-7

interface NumberInterval {
  start: number
  end: number
}

const clampUnit = (value: number): number => Math.max(0, Math.min(1, value))

const interpolatePoint = (
  start: ColoringPoint,
  end: ColoringPoint,
  amount: number,
): ColoringPoint => ({
  x: start.x + (end.x - start.x) * amount,
  y: start.y + (end.y - start.y) * amount,
})

const pointsMatch = (first: ColoringPoint, second: ColoringPoint): boolean =>
  squaredDistance(first, second) <= GEOMETRY_EPSILON * GEOMETRY_EPSILON

const intersectLinearRange = (
  offset: number,
  slope: number,
  minimum: number,
  maximum: number,
): NumberInterval | null => {
  if (Math.abs(slope) <= GEOMETRY_EPSILON) {
    return offset >= minimum && offset <= maximum ? { start: 0, end: 1 } : null
  }

  const first = (minimum - offset) / slope
  const second = (maximum - offset) / slope
  const start = Math.max(0, Math.min(first, second))
  const end = Math.min(1, Math.max(first, second))
  return end - start > GEOMETRY_EPSILON ? { start, end } : null
}

const intersectIntervals = (
  first: NumberInterval | null,
  second: NumberInterval | null,
): NumberInterval | null => {
  if (!first || !second) return null
  const start = Math.max(first.start, second.start)
  const end = Math.min(first.end, second.end)
  return end - start > GEOMETRY_EPSILON ? { start, end } : null
}

const getCircleIntersectionInterval = (
  segmentStart: ColoringPoint,
  segmentEnd: ColoringPoint,
  center: ColoringPoint,
  radius: number,
): NumberInterval | null => {
  const deltaX = segmentEnd.x - segmentStart.x
  const deltaY = segmentEnd.y - segmentStart.y
  const relativeX = segmentStart.x - center.x
  const relativeY = segmentStart.y - center.y
  const quadratic = deltaX * deltaX + deltaY * deltaY

  if (quadratic <= GEOMETRY_EPSILON) {
    return squaredDistance(segmentStart, center) < radius * radius
      ? { start: 0, end: 1 }
      : null
  }

  const linear = 2 * (relativeX * deltaX + relativeY * deltaY)
  const constant = relativeX * relativeX + relativeY * relativeY - radius * radius
  const discriminant = linear * linear - 4 * quadratic * constant
  if (discriminant <= GEOMETRY_EPSILON) return null

  const root = Math.sqrt(discriminant)
  const start = clampUnit((-linear - root) / (2 * quadratic))
  const end = clampUnit((-linear + root) / (2 * quadratic))
  return end - start > GEOMETRY_EPSILON ? { start, end } : null
}

const getEraserSegmentIntersectionInterval = (
  strokeStart: ColoringPoint,
  strokeEnd: ColoringPoint,
  eraserStart: ColoringPoint,
  eraserEnd: ColoringPoint,
  radius: number,
): NumberInterval | null => {
  const eraserDeltaX = eraserEnd.x - eraserStart.x
  const eraserDeltaY = eraserEnd.y - eraserStart.y
  const eraserLength = Math.sqrt(
    eraserDeltaX * eraserDeltaX + eraserDeltaY * eraserDeltaY,
  )
  if (eraserLength <= GEOMETRY_EPSILON) return null

  const directionX = eraserDeltaX / eraserLength
  const directionY = eraserDeltaY / eraserLength
  const strokeDeltaX = strokeEnd.x - strokeStart.x
  const strokeDeltaY = strokeEnd.y - strokeStart.y
  const relativeX = strokeStart.x - eraserStart.x
  const relativeY = strokeStart.y - eraserStart.y

  const alongInterval = intersectLinearRange(
    relativeX * directionX + relativeY * directionY,
    strokeDeltaX * directionX + strokeDeltaY * directionY,
    0,
    eraserLength,
  )
  const perpendicularInterval = intersectLinearRange(
    relativeX * -directionY + relativeY * directionX,
    strokeDeltaX * -directionY + strokeDeltaY * directionX,
    -radius,
    radius,
  )

  return intersectIntervals(alongInterval, perpendicularInterval)
}

const mergeIntervals = (intervals: NumberInterval[]): NumberInterval[] => {
  const sorted = intervals
    .map(({ start, end }) => ({ start: clampUnit(start), end: clampUnit(end) }))
    .filter(({ start, end }) => end - start > GEOMETRY_EPSILON)
    .sort((first, second) => first.start - second.start)

  const merged: NumberInterval[] = []
  sorted.forEach((interval) => {
    const previous = merged.at(-1)
    if (!previous || interval.start > previous.end + GEOMETRY_EPSILON) {
      merged.push({ ...interval })
      return
    }

    previous.end = Math.max(previous.end, interval.end)
  })
  return merged
}

const getErasedIntervals = (
  strokeStart: ColoringPoint,
  strokeEnd: ColoringPoint,
  eraserPoints: ColoringPoint[],
  radius: number,
): NumberInterval[] => {
  const intervals: NumberInterval[] = []

  eraserPoints.forEach((eraserPoint) => {
    const interval = getCircleIntersectionInterval(
      strokeStart,
      strokeEnd,
      eraserPoint,
      radius,
    )
    if (interval) intervals.push(interval)
  })

  for (let index = 0; index < eraserPoints.length - 1; index += 1) {
    const interval = getEraserSegmentIntersectionInterval(
      strokeStart,
      strokeEnd,
      eraserPoints[index],
      eraserPoints[index + 1],
      radius,
    )
    if (interval) intervals.push(interval)
  }

  return mergeIntervals(intervals)
}

const isNearEraserPath = (
  point: ColoringPoint,
  eraserPoints: ColoringPoint[],
  radius: number,
): boolean => {
  if (eraserPoints.some((eraserPoint) => pointDistance(point, eraserPoint) < radius)) {
    return true
  }

  for (let index = 0; index < eraserPoints.length - 1; index += 1) {
    const interval = getEraserSegmentIntersectionInterval(
      point,
      point,
      eraserPoints[index],
      eraserPoints[index + 1],
      radius,
    )
    if (interval) return true

    const start = eraserPoints[index]
    const end = eraserPoints[index + 1]
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const lengthSquared = deltaX * deltaX + deltaY * deltaY
    if (lengthSquared <= GEOMETRY_EPSILON) continue
    const projection = clampUnit(
      ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
        lengthSquared,
    )
    if (pointDistance(point, interpolatePoint(start, end, projection)) < radius) {
      return true
    }
  }

  return false
}

export const commitColoringMark = (
  history: ColoringHistory,
  mark: ColoringMark,
): ColoringHistory => {
  if (mark.points.length === 0) return history

  return {
    marks: [...history.marks, mark],
    undoStack: [...history.undoStack, cloneMarks(history.marks)],
    redoStack: [],
  }
}

const eraseStroke = (
  mark: ColoringMark,
  eraserPoints: ColoringPoint[],
  radius: number,
): ColoringMark[] => {
  if (mark.points.length === 1) {
    return isNearEraserPath(mark.points[0], eraserPoints, radius + mark.size / 2)
      ? []
      : [mark]
  }

  const segments: ColoringPoint[][] = []
  let activeSegment: ColoringPoint[] = []
  let removedStroke = false
  const effectiveRadius = radius + mark.size / 2

  const finishActiveSegment = () => {
    if (activeSegment.length >= 2) segments.push(activeSegment)
    activeSegment = []
  }

  const appendPoint = (point: ColoringPoint) => {
    const previous = activeSegment.at(-1)
    if (!previous || !pointsMatch(previous, point)) activeSegment.push(point)
  }

  for (let index = 0; index < mark.points.length - 1; index += 1) {
    const start = mark.points[index]
    const end = mark.points[index + 1]
    const erasedIntervals = getErasedIntervals(
      start,
      end,
      eraserPoints,
      effectiveRadius,
    )

    if (erasedIntervals.length === 0) {
      appendPoint(start)
      appendPoint(end)
      continue
    }

    removedStroke = true
    let keptStart = 0
    erasedIntervals.forEach((erasedInterval) => {
      if (erasedInterval.start - keptStart > GEOMETRY_EPSILON) {
        appendPoint(interpolatePoint(start, end, keptStart))
        appendPoint(interpolatePoint(start, end, erasedInterval.start))
        finishActiveSegment()
      } else {
        finishActiveSegment()
      }
      keptStart = Math.max(keptStart, erasedInterval.end)
    })

    if (1 - keptStart > GEOMETRY_EPSILON) {
      appendPoint(interpolatePoint(start, end, keptStart))
      appendPoint(end)
    } else {
      finishActiveSegment()
    }
  }

  finishActiveSegment()
  if (!removedStroke) return [mark]

  return segments.map((points, index) => ({
    ...mark,
    id: `${mark.id}-part-${index}`,
    points,
  }))
}

export const eraseColoringMarks = (
  history: ColoringHistory,
  eraserPoints: ColoringPoint[],
  radius: number,
): ColoringHistory => {
  if (eraserPoints.length === 0 || history.marks.length === 0) return history

  const nextMarks = history.marks.flatMap((mark) => {
    if (mark.type === "stamp") {
      const center = mark.points[0]
      return center && isNearEraserPath(center, eraserPoints, radius + mark.size)
        ? []
        : [mark]
    }

    return eraseStroke(mark, eraserPoints, radius)
  })

  const changed =
    nextMarks.length !== history.marks.length ||
    nextMarks.some((mark, index) => mark !== history.marks[index])

  if (!changed) return history

  return {
    marks: nextMarks,
    undoStack: [...history.undoStack, cloneMarks(history.marks)],
    redoStack: [],
  }
}

export const clearColoringHistory = (history: ColoringHistory): ColoringHistory => {
  if (history.marks.length === 0) return history

  return {
    marks: [],
    undoStack: [...history.undoStack, cloneMarks(history.marks)],
    redoStack: [],
  }
}

export const undoColoringHistory = (history: ColoringHistory): ColoringHistory => {
  const previousMarks = history.undoStack.at(-1)
  if (!previousMarks) return history

  return {
    marks: cloneMarks(previousMarks),
    undoStack: history.undoStack.slice(0, -1),
    redoStack: [...history.redoStack, cloneMarks(history.marks)],
  }
}

export const redoColoringHistory = (history: ColoringHistory): ColoringHistory => {
  const nextMarks = history.redoStack.at(-1)
  if (!nextMarks) return history

  return {
    marks: cloneMarks(nextMarks),
    undoStack: [...history.undoStack, cloneMarks(history.marks)],
    redoStack: history.redoStack.slice(0, -1),
  }
}

export const getUsedColorCount = (marks: ColoringMark[]): number =>
  new Set(marks.map((mark) => mark.color)).size
