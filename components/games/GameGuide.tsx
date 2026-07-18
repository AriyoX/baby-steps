import React, { useCallback, useEffect, useState } from "react"
import {
  BackHandler,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { Text } from "@/components/StyledText"
import { brandColors, brandShadows } from "@/constants/Brand"
import {
  hasSeenGameGuide,
  markGameGuideSeen,
  type GameGuideId,
} from "@/lib/gameGuide"

export type GameGuideStep = {
  description: string
  icon: keyof typeof Ionicons.glyphMap
  title: string
}

export const useFirstPlayGuide = (gameId: GameGuideId, childId?: string) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let active = true
    setVisible(false)

    void hasSeenGameGuide(gameId, childId)
      .then((seen) => {
        if (active) setVisible(!seen)
      })
      .catch((error) => {
        console.warn(`Could not load the ${gameId} guide status:`, error)
        if (active) setVisible(true)
      })

    return () => {
      active = false
    }
  }, [childId, gameId])

  const dismiss = useCallback(() => {
    setVisible(false)
    void markGameGuideSeen(gameId, childId).catch((error) => {
      console.warn(`Could not save the ${gameId} guide status:`, error)
    })
  }, [childId, gameId])

  const open = useCallback(() => setVisible(true), [])

  return { dismiss, open, visible }
}

type GameGuideOverlayProps = {
  accentColor?: string
  description: string
  onDismiss: () => void
  steps: GameGuideStep[]
  title: string
  visible: boolean
}

export const GameGuideOverlay = ({
  accentColor = brandColors.victoriaBlue,
  description,
  onDismiss,
  steps,
  title,
  visible,
}: GameGuideOverlayProps) => {
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  const isLandscape = width > height

  useEffect(() => {
    if (!visible) return

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onDismiss()
      return true
    })

    return () => subscription.remove()
  }, [onDismiss, visible])

  if (!visible) return null

  return (
    <View
      accessibilityViewIsModal
      className="absolute inset-0 bg-slate-950/70 items-center justify-center"
      style={[
        styles.overlay,
        {
          paddingBottom: Math.max(insets.bottom, 14),
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
          paddingTop: Math.max(insets.top, 14),
        },
      ]}
    >
      <View
        className="w-full bg-white rounded-3xl border border-blue-100"
        style={[
          brandShadows.lifted,
          {
            maxWidth: 720,
            paddingHorizontal: isLandscape ? 22 : 20,
            paddingVertical: isLandscape ? 18 : 22,
          },
        ]}
      >
        <View className="flex-row items-start">
          <View
            className="w-11 h-11 rounded-2xl items-center justify-center mr-3"
            style={{ backgroundColor: `${accentColor}18` }}
          >
            <Ionicons name="sparkles" size={24} color={accentColor} />
          </View>
          <View className="flex-1 min-w-0">
            <Text variant="bold" className="text-xl text-slate-800" numberOfLines={1}>
              {title}
            </Text>
            <Text className="text-sm text-slate-500 mt-0.5" numberOfLines={2}>
              {description}
            </Text>
          </View>
        </View>

        <View className={`${isLandscape ? "flex-row" : "flex-col"} mt-4`}>
          {steps.map((step, index) => (
            <View
              key={`${step.title}-${index}`}
              className={`bg-slate-50 rounded-2xl border border-slate-100 p-3 ${
                isLandscape ? "flex-1" : "mb-2"
              }`}
              style={isLandscape && index > 0 ? { marginLeft: 10 } : undefined}
            >
              <View className="flex-row items-center mb-1.5">
                <View
                  className="w-8 h-8 rounded-full items-center justify-center mr-2"
                  style={{ backgroundColor: `${accentColor}18` }}
                >
                  <Ionicons name={step.icon} size={17} color={accentColor} />
                </View>
                <Text variant="bold" className="text-sm text-slate-800 flex-1" numberOfLines={1}>
                  {step.title}
                </Text>
              </View>
              <Text className="text-xs text-slate-500 leading-4" numberOfLines={3}>
                {step.description}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          className="self-end min-w-[142px] h-11 rounded-full items-center justify-center px-6 mt-4"
          style={{ backgroundColor: accentColor }}
          onPress={onDismiss}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Close guide and start playing"
        >
          <Text variant="bold" className="text-white text-sm">
            Let&apos;s play
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
}: GameHeaderProps) => (
  <View className="flex-row items-center px-4 py-2 min-h-[58px]">
    <TouchableOpacity
      className="w-11 h-11 rounded-2xl bg-white items-center justify-center border border-blue-100"
      style={brandShadows.soft}
      onPress={onBack}
      activeOpacity={0.76}
      accessibilityRole="button"
      accessibilityLabel={backAccessibilityLabel}
    >
      <Ionicons name="arrow-back" size={21} color={brandColors.victoriaBlue} />
    </TouchableOpacity>

    <View className="flex-1 min-w-0 px-3">
      <Text
        variant="bold"
        className="text-primary-700 text-lg text-center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          className="text-slate-500 text-xs text-center mt-0.5"
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
        className="w-11 h-11 rounded-2xl bg-white items-center justify-center border border-blue-100 ml-2"
        style={brandShadows.soft}
        onPress={onHelp}
        activeOpacity={0.76}
        accessibilityRole="button"
        accessibilityLabel="Show how to play"
      >
        <Ionicons name="help-circle-outline" size={23} color={brandColors.victoriaBlue} />
      </TouchableOpacity>
    </View>
  </View>
)

type GameStatChipProps = {
  accessibilityLabel?: string
  icon: keyof typeof Ionicons.glyphMap
  label: string
  tint?: string
}

export const GameStatChip = ({
  accessibilityLabel,
  icon,
  label,
  tint = brandColors.victoriaBlue,
}: GameStatChipProps) => (
  <View
    className="h-10 min-w-[62px] px-3 rounded-2xl bg-white border border-blue-100 flex-row items-center justify-center ml-2"
    accessibilityLabel={accessibilityLabel}
  >
    <Ionicons name={icon} size={16} color={tint} />
    <Text variant="bold" className="text-sm text-slate-700 ml-1.5" numberOfLines={1}>
      {label}
    </Text>
  </View>
)

const styles = StyleSheet.create({
  overlay: {
    elevation: 100,
    zIndex: 1000,
  },
})
