import { Ionicons } from "@expo/vector-icons"
import { StatusBar as ExpoStatusBar } from "expo-status-bar"
import React, {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  StatusBar as NativeStatusBar,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import Svg, { Path as SvgPath, Rect as SvgRect } from "react-native-svg"

import { Text } from "@/components/StyledText"
import { brandColors, brandShadows } from "@/constants/Brand"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import {
  hasSeenGameGuide,
  markGameGuideSeen,
  type GameGuideId,
} from "@/lib/gameGuide"

export type GameTourStep = {
  id: string
  targetId: string
  title: string
  description: string
  icon?: keyof typeof Ionicons.glyphMap
  placement?: "top" | "bottom" | "left" | "right" | "auto"
  prepareTarget?: () => Promise<void> | void
}

type MeasurableNode = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void
}

type TargetRegistry = {
  getTarget: (id: string) => MeasurableNode | undefined
  registerTarget: (id: string, node: MeasurableNode | null) => void
}

const TourTargetRegistryContext = createContext<TargetRegistry | null>(null)

const useTourSafeAreaInsets =
  typeof useSafeAreaInsets === "function"
    ? useSafeAreaInsets
    : () => ({ bottom: 0, left: 0, right: 0, top: 0 })

export function GameTourProvider({ children }: { children: ReactNode }) {
  const targetsRef = useRef(new Map<string, MeasurableNode>())

  const registerTarget = useCallback((id: string, node: MeasurableNode | null) => {
    if (node) {
      targetsRef.current.set(id, node)
      return
    }

    targetsRef.current.delete(id)
  }, [])

  const getTarget = useCallback(
    (id: string) => targetsRef.current.get(id),
    [],
  )

  const registry = useMemo(
    () => ({ getTarget, registerTarget }),
    [getTarget, registerTarget],
  )

  return (
    <TourTargetRegistryContext.Provider value={registry}>
      {children}
    </TourTargetRegistryContext.Provider>
  )
}

const setRefValue = (ref: Ref<MeasurableNode> | undefined, node: MeasurableNode | null) => {
  if (!ref) return
  if (typeof ref === "function") {
    ref(node)
    return
  }

  ref.current = node
}

type TourTargetProps = {
  children: ReactElement
  id: string
}

export function TourTarget({ children, id }: TourTargetProps) {
  const registry = useContext(TourTargetRegistryContext)
  const onlyChild = Children.only(children)
  const originalRef = isValidElement(onlyChild)
    ? (onlyChild.props as { ref?: Ref<MeasurableNode> }).ref
    : undefined

  const mergedRef = useCallback(
    (node: MeasurableNode | null) => {
      setRefValue(originalRef, node)
      registry?.registerTarget(id, node)
    },
    [id, originalRef, registry],
  )

  if (!isValidElement(onlyChild)) return onlyChild

  return cloneElement(onlyChild as ReactElement<Record<string, unknown>>, {
    collapsable: false,
    ref: mergedRef,
  })
}

export const useGameTour = (guideId: GameGuideId, childId?: string, enabled = true) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let active = true
    setVisible(false)

    if (!enabled) {
      return () => {
        active = false
      }
    }

    void hasSeenGameGuide(guideId, childId)
      .then((seen) => {
        if (active && !seen) setVisible(true)
      })
      .catch((error) => {
        console.warn(`Could not load the ${guideId} tour status:`, error)
      })

    return () => {
      active = false
    }
  }, [childId, enabled, guideId])

  const complete = useCallback(() => {
    setVisible(false)
    void markGameGuideSeen(guideId, childId).catch((error) => {
      console.warn(`Could not save the ${guideId} tour status:`, error)
    })
  }, [childId, guideId])

  const close = useCallback(() => setVisible(false), [])
  const dismiss = complete
  const open = useCallback(() => setVisible(true), [])

  return { close, complete, dismiss, open, visible }
}

export type TourRect = {
  height: number
  width: number
  x: number
  y: number
}

// Android measureInWindow and a translucent Modal use different vertical
// origins. StatusBar.currentHeight supplies the shared baseline correction;
// androidSpotlightOffsetY is the one manual device-test tuning point. Increase
// it to move every Android spotlight/tooltip target lower; iOS always uses 0.
export const GAME_TOUR_LAYOUT = {
  androidSpotlightOffsetY: -16,
  dimColor: "#07182B",
  dimOpacity: 0.82,
  measurementMinimumSize: 1,
  overlayEdgeInset: 2,
  safeAreaMargin: 10,
  spotlightBorderWidth: 3,
  spotlightCornerRadius: 16,
  spotlightGlowOpacity: 0.3,
  spotlightGlowWidth: 9,
  spotlightPadding: 8,
  targetMinimumVisiblePixels: 12,
  targetPrepareDelayMs: 80,
  targetMeasurementTolerance: 1,
  targetRetryCount: 18,
  targetRetryDelayMs: 120,
  tooltipBoundsInset: 8,
  tooltipEstimatedHeight: 190,
  tooltipGap: 12,
} as const

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, duration)
  })

const isValidMeasurement = (rect: TourRect) =>
  [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
  rect.width > GAME_TOUR_LAYOUT.measurementMinimumSize &&
  rect.height > GAME_TOUR_LAYOUT.measurementMinimumSize

export const isTourTargetVisible = (
  rect: TourRect,
  screenWidth: number,
  screenHeight: number,
) => {
  if (!isValidMeasurement(rect) || screenWidth <= 0 || screenHeight <= 0) {
    return false
  }

  const visibleWidth = Math.max(
    0,
    Math.min(rect.x + rect.width, screenWidth) - Math.max(rect.x, 0),
  )
  const visibleHeight = Math.max(
    0,
    Math.min(rect.y + rect.height, screenHeight) - Math.max(rect.y, 0),
  )
  const requiredWidth = Math.min(
    rect.width,
    GAME_TOUR_LAYOUT.targetMinimumVisiblePixels,
  )
  const requiredHeight = Math.min(
    rect.height,
    GAME_TOUR_LAYOUT.targetMinimumVisiblePixels,
  )

  return visibleWidth >= requiredWidth && visibleHeight >= requiredHeight
}

const measureNode = (node: MeasurableNode | null | undefined): Promise<TourRect | null> =>
  new Promise((resolve) => {
    if (!node?.measureInWindow) {
      resolve(null)
      return
    }

    try {
      node.measureInWindow((x, y, width, height) => {
        const rect = { x, y, width, height }
        if (isValidMeasurement(rect)) {
          resolve(rect)
          return
        }

        resolve(null)
      })
    } catch {
      resolve(null)
    }
  })

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), Math.max(minimum, maximum))

export const areTourMeasurementsStable = (
  previous: TourRect,
  next: TourRect,
) =>
  Math.abs(previous.x - next.x) <= GAME_TOUR_LAYOUT.targetMeasurementTolerance &&
  Math.abs(previous.y - next.y) <= GAME_TOUR_LAYOUT.targetMeasurementTolerance &&
  Math.abs(previous.width - next.width) <=
    GAME_TOUR_LAYOUT.targetMeasurementTolerance &&
  Math.abs(previous.height - next.height) <=
    GAME_TOUR_LAYOUT.targetMeasurementTolerance

export const getModalCoordinateOffsetY = ({
  androidSpotlightOffsetY = GAME_TOUR_LAYOUT.androidSpotlightOffsetY,
  platform = Platform.OS,
  safeAreaTop,
  statusBarHeight = NativeStatusBar.currentHeight,
}: {
  androidSpotlightOffsetY?: number
  platform?: typeof Platform.OS
  safeAreaTop: number
  statusBarHeight?: number
}) => {
  if (platform !== "android") return 0

  return (
    Math.max(0, statusBarHeight ?? safeAreaTop) +
    androidSpotlightOffsetY
  )
}

const getPaddedTarget = (
  rect: TourRect,
  screenWidth: number,
  screenHeight: number,
): TourRect => {
  const { overlayEdgeInset, spotlightPadding } = GAME_TOUR_LAYOUT
  const x = clamp(
    rect.x - spotlightPadding,
    overlayEdgeInset,
    screenWidth - overlayEdgeInset,
  )
  const y = clamp(
    rect.y - spotlightPadding,
    overlayEdgeInset,
    screenHeight - overlayEdgeInset,
  )
  const right = clamp(
    rect.x + rect.width + spotlightPadding,
    x + 1,
    screenWidth - overlayEdgeInset,
  )
  const bottom = clamp(
    rect.y + rect.height + spotlightPadding,
    y + 1,
    screenHeight - overlayEdgeInset,
  )

  return { x, y, width: right - x, height: bottom - y }
}

export const getTourSpotlightPath = (
  target: TourRect,
  screenWidth: number,
  screenHeight: number,
) => {
  const right = target.x + target.width
  const bottom = target.y + target.height
  const radius = Math.min(
    GAME_TOUR_LAYOUT.spotlightCornerRadius,
    target.width / 2,
    target.height / 2,
  )

  return [
    `M 0 0 H ${screenWidth} V ${screenHeight} H 0 Z`,
    `M ${target.x + radius} ${target.y}`,
    `H ${right - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right} ${target.y + radius}`,
    `V ${bottom - radius}`,
    `A ${radius} ${radius} 0 0 1 ${right - radius} ${bottom}`,
    `H ${target.x + radius}`,
    `A ${radius} ${radius} 0 0 1 ${target.x} ${bottom - radius}`,
    `V ${target.y + radius}`,
    `A ${radius} ${radius} 0 0 1 ${target.x + radius} ${target.y}`,
    "Z",
  ].join(" ")
}

export type TooltipSize = { height: number; width: number }

export const getTourTooltipSize = ({
  availableHeight,
  measuredSize,
  width,
}: {
  availableHeight: number
  measuredSize: TooltipSize | null
  width: number
}): TooltipSize =>
  measuredSize ?? {
    height: Math.min(GAME_TOUR_LAYOUT.tooltipEstimatedHeight, availableHeight),
    width,
  }

const getTooltipPosition = ({
  bounds,
  placement,
  target,
  tooltip,
}: {
  bounds: { bottom: number; left: number; right: number; top: number }
  placement: GameTourStep["placement"]
  target: TourRect
  tooltip: TooltipSize
}) => {
  const gap = GAME_TOUR_LAYOUT.tooltipGap
  const available = {
    top: target.y - bounds.top - gap,
    bottom: bounds.bottom - (target.y + target.height) - gap,
    left: target.x - bounds.left - gap,
    right: bounds.right - (target.x + target.width) - gap,
  }
  const requested = placement ?? "auto"
  const fits = {
    top: available.top >= tooltip.height,
    bottom: available.bottom >= tooltip.height,
    left: available.left >= tooltip.width,
    right: available.right >= tooltip.width,
  }
  let resolved: Exclude<GameTourStep["placement"], "auto" | undefined>

  if (requested !== "auto" && fits[requested]) {
    resolved = requested
  } else if (fits.bottom) {
    resolved = "bottom"
  } else if (fits.top) {
    resolved = "top"
  } else if (fits.right) {
    resolved = "right"
  } else if (fits.left) {
    resolved = "left"
  } else {
    resolved = available.bottom >= available.top ? "bottom" : "top"
  }

  const centeredX = target.x + target.width / 2 - tooltip.width / 2
  const centeredY = target.y + target.height / 2 - tooltip.height / 2
  let left = centeredX
  let top = target.y + target.height + gap

  if (resolved === "top") top = target.y - tooltip.height - gap
  if (resolved === "left") {
    left = target.x - tooltip.width - gap
    top = centeredY
  }
  if (resolved === "right") {
    left = target.x + target.width + gap
    top = centeredY
  }

  return {
    left: clamp(left, bounds.left, bounds.right - tooltip.width),
    top: clamp(top, bounds.top, bounds.bottom - tooltip.height),
  }
}

type GameTourProps = {
  accentColor?: string
  androidSpotlightOffsetY?: number
  finishLabel?: string
  onComplete: () => void
  onDismiss: () => void
  onUnavailable: (step?: GameTourStep) => void
  steps: GameTourStep[]
  visible: boolean
}

export function GameTour({
  accentColor = brandColors.victoriaBlue,
  androidSpotlightOffsetY = GAME_TOUR_LAYOUT.androidSpotlightOffsetY,
  finishLabel = "Let's play",
  onComplete,
  onDismiss,
  onUnavailable,
  steps,
  visible,
}: GameTourProps) {
  const { t } = useChildUiLanguage()
  const registry = useContext(TourTargetRegistryContext)
  const insets = useTourSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  const [activeIndex, setActiveIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TourRect | null>(null)
  const [tooltipSize, setTooltipSize] = useState<TooltipSize | null>(null)
  const stepsRef = useRef(steps)
  stepsRef.current = steps
  const stepsKey = steps.map((step) => `${step.id}:${step.targetId}`).join("|")
  const currentStep = steps[activeIndex]

  useEffect(() => {
    if (!visible) {
      setActiveIndex(0)
      setTargetRect(null)
      setTooltipSize(null)
      return
    }

    const step = stepsRef.current[activeIndex]
    if (!registry || !step) {
      setTargetRect(null)
      onUnavailable(step)
      return
    }

    let cancelled = false
    setTargetRect(null)
    setTooltipSize(null)

    const findTarget = async () => {
      try {
        await step.prepareTarget?.()
      } catch (error) {
        console.warn(`Could not prepare the ${step.id} tour target:`, error)
      }

      if (cancelled) return
      if (step.prepareTarget) {
        await wait(GAME_TOUR_LAYOUT.targetPrepareDelayMs)
      }

      let measured: TourRect | null = null
      let candidate: TourRect | null = null

      for (
        let attempt = 0;
        attempt < GAME_TOUR_LAYOUT.targetRetryCount;
        attempt += 1
      ) {
        const rect = await measureNode(registry.getTarget(step.targetId))

        if (!rect || !isTourTargetVisible(rect, width, height)) {
          candidate = null
        } else if (candidate && areTourMeasurementsStable(candidate, rect)) {
          measured = rect
          break
        } else {
          // iOS can report a valid but stale window position while the route's
          // layout is settling. Keep retrying until two samples agree.
          candidate = rect
        }

        if (cancelled) return
        await wait(GAME_TOUR_LAYOUT.targetRetryDelayMs)
      }

      if (cancelled) return

      // A latest visible sample is still safer than failing a continuously
      // animating target that never becomes pixel-stable.
      const nextRect = measured ?? candidate
      if (!nextRect) {
        console.warn(
          `Could not show the ${step.id} tour step because its target was unavailable or off-screen.`,
        )
        onUnavailable(step)
        return
      }

      setTargetRect(nextRect)
    }

    void findTarget()

    return () => {
      cancelled = true
    }
  }, [activeIndex, height, onUnavailable, registry, stepsKey, visible, width])

  if (!visible || !currentStep) return null

  if (!targetRect) {
    return (
      <Modal
        animationType="fade"
        navigationBarTranslucent
        onRequestClose={onDismiss}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible
      >
        <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
        <View
          accessibilityLabel="Preparing tour guide"
          accessibilityViewIsModal
          style={[styles.overlay, styles.loadingOverlay]}
        >
          <ActivityIndicator color={brandColors.white} size="large" />
        </View>
      </Modal>
    )
  }

  const target = getPaddedTarget(
    {
      ...targetRect,
      y:
        targetRect.y +
        getModalCoordinateOffsetY({
          androidSpotlightOffsetY,
          safeAreaTop: insets.top,
        }),
    },
    width,
    height,
  )
  const bounds = {
    bottom:
      height -
      Math.max(insets.bottom, GAME_TOUR_LAYOUT.safeAreaMargin) -
      GAME_TOUR_LAYOUT.tooltipBoundsInset,
    left:
      Math.max(insets.left, GAME_TOUR_LAYOUT.safeAreaMargin) +
      GAME_TOUR_LAYOUT.tooltipBoundsInset,
    right:
      width -
      Math.max(insets.right, GAME_TOUR_LAYOUT.safeAreaMargin) -
      GAME_TOUR_LAYOUT.tooltipBoundsInset,
    top:
      Math.max(insets.top, GAME_TOUR_LAYOUT.safeAreaMargin) +
      GAME_TOUR_LAYOUT.tooltipBoundsInset,
  }
  const tooltipWidth = Math.min(380, Math.max(1, bounds.right - bounds.left))
  const positionedTooltipSize = getTourTooltipSize({
    availableHeight: Math.max(1, bounds.bottom - bounds.top),
    measuredSize: tooltipSize,
    width: tooltipWidth,
  })
  const tooltipPosition = getTooltipPosition({
    bounds,
    placement: currentStep.placement,
    target,
    tooltip: positionedTooltipSize,
  })
  const spotlightPath = getTourSpotlightPath(target, width, height)
  const spotlightRadius = Math.min(
    GAME_TOUR_LAYOUT.spotlightCornerRadius,
    target.width / 2,
    target.height / 2,
  )
  const spotlightStrokeInset = GAME_TOUR_LAYOUT.spotlightBorderWidth / 2
  const isFirst = activeIndex === 0
  const isLast = activeIndex === steps.length - 1

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      supportedOrientations={[
        "portrait",
        "portrait-upside-down",
        "landscape",
        "landscape-left",
        "landscape-right",
      ]}
      transparent
      visible={visible}
    >
      <ExpoStatusBar style="light" translucent backgroundColor="transparent" />
      <View accessibilityViewIsModal style={styles.overlay}>
        <Svg
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
        >
          <SvgPath
            d={spotlightPath}
            fill={GAME_TOUR_LAYOUT.dimColor}
            fillOpacity={GAME_TOUR_LAYOUT.dimOpacity}
            fillRule="evenodd"
          />
          <SvgRect
            x={target.x + spotlightStrokeInset}
            y={target.y + spotlightStrokeInset}
            width={Math.max(0, target.width - GAME_TOUR_LAYOUT.spotlightBorderWidth)}
            height={Math.max(0, target.height - GAME_TOUR_LAYOUT.spotlightBorderWidth)}
            rx={Math.max(0, spotlightRadius - spotlightStrokeInset)}
            fill="none"
            stroke={brandColors.equatorialGold}
            strokeOpacity={GAME_TOUR_LAYOUT.spotlightGlowOpacity}
            strokeWidth={GAME_TOUR_LAYOUT.spotlightGlowWidth}
          />
          <SvgRect
            x={target.x + spotlightStrokeInset}
            y={target.y + spotlightStrokeInset}
            width={Math.max(0, target.width - GAME_TOUR_LAYOUT.spotlightBorderWidth)}
            height={Math.max(0, target.height - GAME_TOUR_LAYOUT.spotlightBorderWidth)}
            rx={Math.max(0, spotlightRadius - spotlightStrokeInset)}
            fill="none"
            stroke={brandColors.equatorialGold}
            strokeWidth={GAME_TOUR_LAYOUT.spotlightBorderWidth}
          />
        </Svg>

            <View
              onLayout={({ nativeEvent }) => {
                const nextSize = nativeEvent.layout
                if (
                  !tooltipSize ||
                  Math.abs(nextSize.height - tooltipSize.height) > 0.5 ||
                  Math.abs(nextSize.width - tooltipSize.width) > 0.5
                ) {
                  setTooltipSize({ height: nextSize.height, width: nextSize.width })
                }
              }}
              style={[
                styles.tooltip,
                brandShadows.lifted,
                {
                  left: tooltipPosition.left,
                  maxHeight: Math.max(1, bounds.bottom - bounds.top),
                  top: tooltipPosition.top,
                  width: tooltipWidth,
                },
              ]}
            >
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            showsVerticalScrollIndicator
            style={styles.tooltipScrollable}
          >
            <View
              accessible
              accessibilityLabel={`${currentStep.title}. ${currentStep.description}. Step ${activeIndex + 1} of ${steps.length}.`}
              style={styles.tooltipHeader}
            >
              <View style={[styles.iconBubble, { backgroundColor: `${accentColor}18` }]}>
                <Ionicons
                  name={currentStep.icon ?? "sparkles"}
                  size={24}
                  color={accentColor}
                />
              </View>
              <View style={styles.tooltipCopy}>
                <Text variant="bold" style={styles.title}>
                  {currentStep.title}
                </Text>
                <Text style={styles.description}>{currentStep.description}</Text>
              </View>
              <View style={styles.progressPill}>
                <Text variant="bold" style={styles.progressText}>
                  {activeIndex + 1} of {steps.length}
                </Text>
              </View>
            </View>

            <View
              accessibilityLabel={`Tour step ${activeIndex + 1} of ${steps.length}`}
              style={styles.dots}
            >
              {steps.map((step, index) => (
                <View
                  key={step.id}
                  accessible={false}
                  style={[
                    styles.dot,
                    index === activeIndex && [styles.activeDot, { backgroundColor: accentColor }],
                  ]}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              accessibilityLabel={t("common.skip")}
              accessibilityRole="button"
              activeOpacity={0.75}
              onPress={onComplete}
              style={styles.skipButton}
            >
              <Text variant="bold" style={styles.skipText}>{t("common.skip")}</Text>
            </TouchableOpacity>

            <View style={styles.navigationActions}>
              <TouchableOpacity
                accessibilityLabel="Previous tour step"
                accessibilityRole="button"
                accessibilityState={{ disabled: isFirst }}
                activeOpacity={0.75}
                disabled={isFirst}
                onPress={() => {
                  setTargetRect(null)
                  setTooltipSize(null)
                  setActiveIndex((index) => Math.max(0, index - 1))
                }}
                style={[styles.backButton, isFirst && styles.disabledButton]}
              >
                <Ionicons name="arrow-back" size={17} color={brandColors.neutral[700]} />
                <Text variant="bold" style={styles.backText}>{t("common.back")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityLabel={isLast ? finishLabel : "Next tour step"}
                accessibilityRole="button"
                activeOpacity={0.8}
                onPress={() => {
                  if (isLast) {
                    onComplete()
                    return
                  }
                  setTargetRect(null)
                  setTooltipSize(null)
                  setActiveIndex((index) => Math.min(steps.length - 1, index + 1))
                }}
                style={[styles.nextButton, { backgroundColor: accentColor }]}
              >
                <Text variant="bold" style={styles.nextText}>
                  {isLast ? finishLabel : t("common.next")}
                </Text>
                <Ionicons
                  name={isLast ? "sparkles" : "arrow-forward"}
                  size={17}
                  color={brandColors.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

type GameHeaderProps = {
  backAccessibilityLabel: string
  onBack: () => void
  onHelp: () => void
  subtitle?: string
  title: string
  trailing?: React.ReactNode
}

export const GameHeader = ({
  backAccessibilityLabel,
  onBack,
  onHelp,
  subtitle,
  title,
  trailing,
}: GameHeaderProps) => {
  const { t } = useChildUiLanguage()

  return (
  <View className="flex-row items-center px-4 py-2 min-h-[64px]">
    <TouchableOpacity
      className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-blue-100"
      style={brandShadows.soft}
      onPress={onBack}
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={backAccessibilityLabel}
    >
      <Ionicons name="arrow-back" size={23} color={brandColors.victoriaBlue} />
    </TouchableOpacity>

    <View className="flex-1 min-w-0 px-3">
      <Text
        variant="bold"
        className="text-primary-700 text-xl text-center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className="text-slate-500 text-sm text-center mt-0.5"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>

    <View className="flex-row items-center">
      {trailing}
      <TouchableOpacity
        className="w-12 h-12 rounded-2xl bg-white items-center justify-center border border-blue-100 ml-2"
        style={brandShadows.soft}
        onPress={onHelp}
        activeOpacity={0.76}
        accessibilityRole="button"
        accessibilityLabel={t("games.howToPlay")}
      >
        <Ionicons name="help-circle-outline" size={25} color={brandColors.victoriaBlue} />
      </TouchableOpacity>
    </View>
  </View>
  )
}

type GameStatChipProps = {
  accessibilityLabel?: string
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tint?: string
  tourTargetId?: string
}

export const GameStatChip = ({
  accessibilityLabel,
  icon,
  label,
  tint = brandColors.victoriaBlue,
  tourTargetId,
}: GameStatChipProps) => {
  const chip = (
    <View
      className="h-11 min-w-[68px] px-3 rounded-2xl bg-white border border-blue-100 flex-row items-center justify-center ml-2"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={18} color={tint} />
      <Text variant="bold" className="text-base text-slate-700 ml-1.5" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )

  return tourTargetId ? <TourTarget id={tourTargetId}>{chip}</TourTarget> : chip
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    elevation: 100,
    zIndex: 1000,
  },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: `rgba(7, 24, 43, ${GAME_TOUR_LAYOUT.dimOpacity})`,
    justifyContent: "center",
  },
  tooltip: {
    position: "absolute",
    backgroundColor: brandColors.white,
    borderColor: brandColors.blue[100],
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  tooltipHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  tooltipScrollable: {
    flexShrink: 1,
  },
  iconBubble: {
    alignItems: "center",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  tooltipCopy: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
  },
  title: {
    color: brandColors.neutral[800],
    fontSize: 19,
    lineHeight: 24,
  },
  description: {
    color: brandColors.neutral[600],
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3,
  },
  progressPill: {
    backgroundColor: brandColors.blue[50],
    borderRadius: 12,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  progressText: {
    color: brandColors.victoriaBlue,
    fontSize: 11,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 22,
    marginTop: 10,
  },
  dot: {
    backgroundColor: brandColors.neutral[200],
    borderRadius: 4,
    height: 8,
    marginHorizontal: 3,
    width: 8,
  },
  activeDot: {
    width: 22,
  },
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  navigationActions: {
    alignItems: "center",
    flexDirection: "row",
    marginLeft: 8,
  },
  skipButton: {
    alignItems: "center",
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  skipText: {
    color: brandColors.neutral[600],
    fontSize: 14,
  },
  backButton: {
    alignItems: "center",
    backgroundColor: brandColors.neutral[50],
    borderColor: brandColors.neutral[200],
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  disabledButton: {
    opacity: 0.38,
  },
  backText: {
    color: brandColors.neutral[700],
    fontSize: 14,
    marginLeft: 5,
  },
  nextButton: {
    alignItems: "center",
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "center",
    marginLeft: 8,
    minHeight: 44,
    minWidth: 88,
    paddingHorizontal: 15,
  },
  nextText: {
    color: brandColors.white,
    fontSize: 14,
    marginRight: 6,
  },
})
