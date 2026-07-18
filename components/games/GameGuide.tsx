import React, { useCallback, useEffect, useState } from "react"
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { StatusBar } from "expo-status-bar"
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
        if (active && !seen) setVisible(true)
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
  actionAccessibilityLabel?: string
  actionLabel?: string
  description: string
  onDismiss: () => void
  steps: GameGuideStep[]
  title: string
  visible: boolean
}

export const GameGuideOverlay = ({
  accentColor = brandColors.victoriaBlue,
  actionAccessibilityLabel = "Close guide and start playing",
  actionLabel = "Let's play",
  description,
  onDismiss,
  steps,
  title,
  visible,
}: GameGuideOverlayProps) => {
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  const isLandscape = width > height

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={["landscape-left", "landscape-right", "portrait"]}
      onRequestClose={onDismiss}
    >
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View
        accessibilityViewIsModal
        className="flex-1 bg-slate-950/70 items-center justify-center"
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
              maxWidth: 760,
              paddingHorizontal: isLandscape ? 24 : 22,
              paddingVertical: isLandscape ? 20 : 24,
            },
          ]}
        >
          <View className="flex-row items-start">
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: `${accentColor}18` }}
            >
              <Ionicons name="sparkles" size={27} color={accentColor} />
            </View>
            <View className="flex-1 min-w-0">
              <Text variant="bold" className="text-2xl text-slate-800" numberOfLines={1}>
                {title}
              </Text>
              <Text className="text-base text-slate-500 mt-0.5" numberOfLines={2}>
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
                    className="w-9 h-9 rounded-full items-center justify-center mr-2"
                    style={{ backgroundColor: `${accentColor}18` }}
                  >
                    <Ionicons name={step.icon} size={19} color={accentColor} />
                  </View>
                  <Text variant="bold" className="text-base text-slate-800 flex-1" numberOfLines={1}>
                    {step.title}
                  </Text>
                </View>
                <Text className="text-sm text-slate-500 leading-5" numberOfLines={3}>
                  {step.description}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            className="self-end min-w-[154px] h-12 rounded-full items-center justify-center px-7 mt-4"
            style={{ backgroundColor: accentColor }}
            onPress={onDismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={actionAccessibilityLabel}
          >
            <Text variant="bold" className="text-white text-base">
              {actionLabel}
            </Text>
          </TouchableOpacity>
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
}: GameHeaderProps) => (
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
        accessibilityLabel="Show how to play"
      >
        <Ionicons name="help-circle-outline" size={25} color={brandColors.victoriaBlue} />
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
    className="h-11 min-w-[68px] px-3 rounded-2xl bg-white border border-blue-100 flex-row items-center justify-center ml-2"
    accessibilityLabel={accessibilityLabel}
  >
    <Ionicons name={icon} size={18} color={tint} />
    <Text variant="bold" className="text-base text-slate-700 ml-1.5" numberOfLines={1}>
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
