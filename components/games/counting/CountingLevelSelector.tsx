import {
  GameLevelSelector,
  getGameLevelGridMetrics,
  type GameLevelStatus,
} from "@/components/games/GameLevelSelector"

export type CountingLevelStatus = GameLevelStatus

export interface CountingLevelChoice {
  level: number
  status: CountingLevelStatus
}

export const buildCountingLevelChoices = ({
  completedLevels = [],
  highestUnlockedLevel,
  levelCount,
  selectedLevel,
  stageCompleted,
}: {
  completedLevels?: number[]
  highestUnlockedLevel: number
  levelCount: number
  selectedLevel: number
  stageCompleted: boolean
}): CountingLevelChoice[] => {
  const safeLevelCount = Math.max(1, levelCount)
  const unlockedThrough = stageCompleted
    ? safeLevelCount
    : Math.min(safeLevelCount, Math.max(1, highestUnlockedLevel))
  const completed = new Set(
    stageCompleted
      ? Array.from({ length: safeLevelCount }, (_, index) => index + 1)
      : completedLevels,
  )

  return Array.from({ length: safeLevelCount }, (_, index) => {
    const level = index + 1
    if (level > unlockedThrough) return { level, status: "locked" }
    if (level === selectedLevel && completed.has(level)) {
      return { level, status: "completed" }
    }
    if (level === selectedLevel) return { level, status: "current" }
    if (completed.has(level)) return { level, status: "review" }
    return { level, status: "available" }
  })
}

export const getCountingLevelGridMetrics = (
  availableWidth: number,
  compact: boolean,
) => getGameLevelGridMetrics(availableWidth, compact)

interface CountingLevelSelectorProps {
  availableWidth?: number
  choices: CountingLevelChoice[]
  compact?: boolean
  levelLabel?: string
  metaLabel?: string
  onSelect: (level: number) => void
}

export function CountingLevelSelector({
  availableWidth = 560,
  choices,
  compact = false,
  levelLabel = "Level",
  metaLabel,
  onSelect,
}: CountingLevelSelectorProps) {
  return (
    <GameLevelSelector
      availableWidth={availableWidth}
      choices={choices.map(({ level, status }) => ({
        id: level,
        meta: metaLabel,
        order: level,
        status,
        title: `${levelLabel} ${level}`,
      }))}
      compact={compact}
      containerTestID="counting-level-selector"
      metaIcon="calculator-outline"
      onSelect={onSelect}
      statusLabels={{ current: "Current" }}
      testIDPrefix="counting-level"
    />
  )
}
