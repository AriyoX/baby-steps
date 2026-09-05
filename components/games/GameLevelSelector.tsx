import { Ionicons } from "@expo/vector-icons"
import { TouchableOpacity, View } from "react-native"

import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"

export type GameLevelStatus =
  | "locked"
  | "available"
  | "current"
  | "review"
  | "completed"

export interface GameLevelChoice {
  id: number
  meta?: string
  order: number
  status: GameLevelStatus
  title: string
}

export type GameLevelStatusLabels = Record<GameLevelStatus, string>

const DEFAULT_STATUS_LABELS: GameLevelStatusLabels = {
  available: "Start",
  completed: "Completed",
  current: "Continue",
  locked: "Locked",
  review: "Review",
}

const STATUS_STYLES: Record<
  GameLevelStatus,
  {
    backgroundColor: string
    borderColor: string
    icon: keyof typeof Ionicons.glyphMap
    textColor: string
  }
> = {
  locked: {
    backgroundColor: brandColors.neutral[100],
    borderColor: brandColors.neutral[200],
    icon: "lock-closed",
    textColor: brandColors.neutral[600],
  },
  available: {
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.equatorialGold,
    icon: "play-circle",
    textColor: brandColors.victoriaBlue,
  },
  current: {
    backgroundColor: brandColors.blue[50],
    borderColor: brandColors.equatorialGold,
    icon: "location",
    textColor: brandColors.victoriaBlue,
  },
  review: {
    backgroundColor: "#ECFDF5",
    borderColor: brandColors.success,
    icon: "refresh-circle",
    textColor: brandColors.success,
  },
  completed: {
    backgroundColor: "#ECFDF5",
    borderColor: brandColors.success,
    icon: "checkmark-circle",
    textColor: brandColors.success,
  },
}

export const getGameLevelGridMetrics = (
  availableWidth: number,
  compact: boolean,
) => {
  const expansive = availableWidth >= 900 && !compact
  const columnCount = availableWidth >= 680 ? 3 : 2
  const gap = compact ? 10 : expansive ? 18 : 14
  const selectorWidth = Math.min(
    availableWidth,
    columnCount === 3 ? (expansive ? 1040 : 820) : 540,
  )
  const cardWidth = Math.max(
    112,
    (selectorWidth - gap * (columnCount - 1)) / columnCount,
  )

  return {
    cardMinHeight: compact ? 112 : expansive ? 156 : 132,
    cardPadding: compact ? 12 : expansive ? 18 : 16,
    cardWidth,
    columnCount,
    expansive,
    gap,
    numberSize: expansive ? 56 : 48,
    selectorWidth,
    titleFontSize: expansive ? 20 : 18,
  }
}

interface GameLevelSelectorProps {
  availableWidth: number
  choices: GameLevelChoice[]
  compact?: boolean
  containerTestID?: string
  metaIcon?: keyof typeof Ionicons.glyphMap
  onSelect: (id: number) => void
  statusLabels?: Partial<GameLevelStatusLabels>
  testIDPrefix?: string
}

export function GameLevelSelector({
  availableWidth,
  choices,
  compact = false,
  containerTestID = "game-level-selector",
  metaIcon = "albums-outline",
  onSelect,
  statusLabels,
  testIDPrefix = "game-level",
}: GameLevelSelectorProps) {
  const metrics = getGameLevelGridMetrics(availableWidth, compact)
  const labels = { ...DEFAULT_STATUS_LABELS, ...statusLabels }

  return (
    <View
      testID={containerTestID}
      className="flex-row flex-wrap justify-between"
      style={{ alignSelf: "center", width: metrics.selectorWidth }}
    >
      {choices.map((choice, index) => {
        const statusStyle = STATUS_STYLES[choice.status]
        const statusLabel = labels[choice.status]
        const disabled = choice.status === "locked"
        const isSelected =
          choice.status === "current" || choice.status === "completed"
        const isLastRow =
          index >=
          choices.length -
            (choices.length % metrics.columnCount || metrics.columnCount)

        return (
          <TouchableOpacity
            key={choice.id}
            testID={`${testIDPrefix}-${choice.id}`}
            className="bg-white rounded-2xl shadow-sm overflow-hidden border-2"
            style={{
              backgroundColor: disabled ? brandColors.neutral[100] : "#FFFFFF",
              borderColor: statusStyle.borderColor,
              marginBottom: isLastRow ? 0 : metrics.gap,
              minHeight: metrics.cardMinHeight,
              opacity: disabled ? 0.76 : 1,
              width: metrics.cardWidth,
            }}
            onPress={() => onSelect(choice.id)}
            disabled={disabled}
            activeOpacity={disabled ? 1 : 0.74}
            accessibilityRole="button"
            accessibilityLabel={`${choice.title}. ${statusLabel}.${choice.meta ? ` ${choice.meta}.` : ""}`}
            accessibilityState={{ disabled, selected: isSelected }}
          >
            <View
              className="flex-1 justify-between"
              style={{ padding: metrics.cardPadding }}
            >
              <View className="flex-row items-start justify-between">
                <View
                  className="w-12 h-12 rounded-full justify-center items-center mr-3"
                  style={{
                    backgroundColor: statusStyle.backgroundColor,
                    borderRadius: metrics.numberSize / 2,
                    height: metrics.numberSize,
                    width: metrics.numberSize,
                  }}
                >
                  <Text variant="bold" className="text-primary-700 text-lg">
                    {choice.order}
                  </Text>
                </View>
                <View
                  className="rounded-full px-3 py-1.5 flex-row items-center"
                  style={{ backgroundColor: statusStyle.backgroundColor }}
                >
                  <Ionicons
                    name={statusStyle.icon}
                    size={14}
                    color={statusStyle.textColor}
                  />
                  <Text
                    variant="bold"
                    className="text-[11px] ml-1"
                    style={{ color: statusStyle.textColor }}
                    numberOfLines={1}
                  >
                    {statusLabel}
                  </Text>
                </View>
              </View>

              <View className="mt-3">
                <Text
                  variant="bold"
                  className="text-primary-700 leading-5"
                  style={{ fontSize: metrics.titleFontSize }}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.84}
                >
                  {choice.title}
                </Text>
                {choice.meta ? (
                  <View className="flex-row items-center mt-2">
                    <Ionicons
                      name={metaIcon}
                      size={15}
                      color={brandColors.neutral[600]}
                    />
                    <Text className="text-neutral-600 text-xs ml-1" numberOfLines={1}>
                      {choice.meta}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )
      })}
    </View>
  )
}
