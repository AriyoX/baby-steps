export const BRUSH_SIZES = [6, 10, 14, 18, 24, 32, 42] as const
export const DEFAULT_BRUSH_SIZE = 18

export const ZOOM_LEVELS = [1, 1.5, 2, 3] as const

type StepDirection = -1 | 1

export type CanvasOffset = {
  x: number
  y: number
}

export type CanvasSize = {
  width: number
  height: number
}

const closestIndex = (values: readonly number[], current: number) =>
  values.reduce(
    (bestIndex, value, index) =>
      Math.abs(value - current) < Math.abs(values[bestIndex] - current)
        ? index
        : bestIndex,
    0,
  )

const stepValue = (
  values: readonly number[],
  current: number,
  direction: StepDirection,
) => {
  const currentIndex = closestIndex(values, current)
  const nextIndex = Math.min(values.length - 1, Math.max(0, currentIndex + direction))
  return values[nextIndex]
}

export const stepBrushSize = (current: number, direction: StepDirection) =>
  stepValue(BRUSH_SIZES, current, direction)

export const stepCanvasZoom = (current: number, direction: StepDirection) =>
  stepValue(ZOOM_LEVELS, current, direction)

export const getZoomAdjustedBrushSize = (brushSize: number, zoom: number) =>
  brushSize / Math.max(1, zoom)

export const getZoomAdjustedEraserRadius = (brushSize: number, zoom: number) =>
  (brushSize * 0.8 + 8) / Math.max(1, zoom)

export const clampCanvasOffset = (
  offset: CanvasOffset,
  zoom: number,
  canvasSize: CanvasSize,
): CanvasOffset => {
  if (zoom <= 1) return { x: 0, y: 0 }

  const maxX = Math.max(0, (canvasSize.width * (zoom - 1)) / 2)
  const maxY = Math.max(0, (canvasSize.height * (zoom - 1)) / 2)

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(maxY, Math.max(-maxY, offset.y)),
  }
}
