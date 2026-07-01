"use client"

import React from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  PanResponder,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PanResponderGestureState,
} from "react-native"
import { Text } from "@/components/StyledText"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { supabase } from "../../lib/supabase"
import { useLanguage } from "@/context/language-context"
import { TranslatedText } from "@/components/translated-text"
import { TestTranslation } from "@/components/test-translation"
import { BrandMark } from "@/components/brand/BrandMark"
import { brandColors } from "@/constants/Brand"
import { useAudio } from "@/context/AudioContext"

// Define the props interface
interface SettingItemProps {
  icon: string
  iconColor: string
  iconType?: "ionicons" | "fontawesome"
  text: string
  action: () => void
  onToggleChange?: (value: boolean) => void
  toggle?: boolean
  value?: boolean
  disabled?: boolean
  last?: boolean
}

interface SectionTitleProps {
  title: string
}

interface ToggleControlProps {
  value: boolean
  disabled?: boolean
}

interface AudioVolumeSliderProps {
  label: string
  value: number
  icon: keyof typeof Ionicons.glyphMap
  iconColor: string
  onChange: (value: number) => void
  disabled?: boolean
  muted?: boolean
}

interface AudioTrackControlProps {
  backgroundTracks: readonly { id: string; title: string }[]
  selectedTrackId: string
  onSelectTrack: (trackId: string) => void
}

const clampSliderValue = (value: number): number => Math.min(1, Math.max(0, value))

const getBackgroundColor = (color: string) => `${color}20`

const ToggleControl: React.FC<ToggleControlProps> = ({ value, disabled = false }) => (
  <View
    style={{
      width: 52,
      height: 30,
      borderRadius: 15,
      padding: 3,
      marginRight: 16,
      backgroundColor: value ? brandColors.blue[200] : "#e5e7eb",
      opacity: disabled ? 0.6 : 1,
      justifyContent: "center",
    }}
  >
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: value ? brandColors.victoriaBlue : "#ffffff",
        transform: [{ translateX: value ? 22 : 0 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 1.5,
        elevation: 2,
      }}
    />
  </View>
)

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  iconColor,
  iconType = "ionicons",
  text,
  action,
  onToggleChange,
  toggle = false,
  value = false,
  disabled = false,
  last = false,
}) => (
  <TouchableOpacity
    className={`flex-row items-center py-4 ${!last ? "border-b border-gray-100" : ""}`}
    onPress={toggle ? () => (onToggleChange ? onToggleChange(!value) : action()) : action}
    activeOpacity={toggle ? 0.85 : 0.7}
    disabled={disabled}
    accessibilityRole={toggle ? "switch" : "button"}
    accessibilityState={toggle ? { checked: value, disabled } : { disabled }}
    style={{ opacity: disabled ? 0.55 : 1 }}
  >
    <View
      className="w-10 h-10 rounded-full items-center justify-center mx-4"
      style={{ backgroundColor: getBackgroundColor(iconColor) }}
    >
      {iconType === "fontawesome" ? (
        <FontAwesome5 name={icon as any} size={18} color={iconColor} />
      ) : (
        <Ionicons name={icon as any} size={22} color={iconColor} />
      )}
    </View>
    <TranslatedText className="flex-1 text-gray-800 text-base">{text}</TranslatedText>
    {toggle ? <ToggleControl value={value} disabled={disabled} /> : <Ionicons name="chevron-forward" size={20} color="#9ca3af" />}
  </TouchableOpacity>
)

const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => (
  <TranslatedText variant="medium" className="text-gray-500 text-sm uppercase tracking-wider mt-6 mb-2 px-1">
    {title}
  </TranslatedText>
)

const AudioVolumeSlider: React.FC<AudioVolumeSliderProps> = ({
  label,
  value,
  icon,
  iconColor,
  onChange,
  disabled = false,
  muted = false,
}) => {
  const trackRef = React.useRef<View>(null)
  const trackMetricsRef = React.useRef({ pageX: 0, width: 1, measured: false })
  const isDraggingRef = React.useRef(false)
  const [trackWidth, setTrackWidth] = React.useState(1)
  const clampedValue = clampSliderValue(value)
  const effectiveValue = muted ? 0 : clampedValue
  const [displayValue, setDisplayValue] = React.useState(effectiveValue)
  const pendingDragValueRef = React.useRef(effectiveValue)
  const controlsDisabled = disabled || muted
  const percent = Math.round(displayValue * 100)

  React.useEffect(() => {
    if (isDraggingRef.current) {
      return
    }

    pendingDragValueRef.current = effectiveValue
    setDisplayValue(effectiveValue)
  }, [effectiveValue])

  const measureTrack = React.useCallback((afterMeasure?: () => void) => {
    if (!trackRef.current) {
      afterMeasure?.()
      return
    }

    trackRef.current.measure((_x, _y, width, _height, pageX) => {
      if (Number.isFinite(width) && width > 1 && Number.isFinite(pageX)) {
        trackMetricsRef.current = { pageX, width, measured: true }
        setTrackWidth((currentWidth) => (Math.abs(currentWidth - width) > 0.5 ? width : currentWidth))
      }

      afterMeasure?.()
    })
  }, [])

  const handleTrackLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const nextWidth = event.nativeEvent.layout.width

      if (Number.isFinite(nextWidth) && nextWidth > 1) {
        trackMetricsRef.current = {
          ...trackMetricsRef.current,
          width: nextWidth,
        }
        setTrackWidth(nextWidth)
      }

      requestAnimationFrame(() => measureTrack())
    },
    [measureTrack],
  )

  const updateDraftFromPageX = React.useCallback(
    (pageX: number) => {
      if (controlsDisabled || !isDraggingRef.current || !Number.isFinite(pageX)) {
        return
      }

      const metrics = trackMetricsRef.current

      if (!metrics.measured || metrics.width <= 1) {
        return
      }

      const nextValue = clampSliderValue((pageX - metrics.pageX) / metrics.width)
      pendingDragValueRef.current = nextValue
      setDisplayValue(nextValue)
    },
    [controlsDisabled],
  )

  const beginDrag = React.useCallback(
    (event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (controlsDisabled) {
        return
      }

      isDraggingRef.current = true
      const pageX = Number.isFinite(event.nativeEvent.pageX) ? event.nativeEvent.pageX : gestureState.x0

      updateDraftFromPageX(pageX)
      measureTrack(() => updateDraftFromPageX(pageX))
    },
    [controlsDisabled, measureTrack, updateDraftFromPageX],
  )

  const updateDrag = React.useCallback(
    (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      updateDraftFromPageX(gestureState.moveX)
    },
    [updateDraftFromPageX],
  )

  const finishDrag = React.useCallback(
    (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (!isDraggingRef.current) {
        return
      }

      if (Number.isFinite(gestureState.moveX) && gestureState.moveX > 0) {
        updateDraftFromPageX(gestureState.moveX)
      }

      const nextValue = pendingDragValueRef.current
      isDraggingRef.current = false

      if (controlsDisabled) {
        pendingDragValueRef.current = effectiveValue
        setDisplayValue(effectiveValue)
        return
      }

      setDisplayValue(nextValue)
      onChange(nextValue)
    },
    [controlsDisabled, effectiveValue, onChange, updateDraftFromPageX],
  )

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !controlsDisabled,
        onMoveShouldSetPanResponder: () => !controlsDisabled,
        onPanResponderGrant: beginDrag,
        onPanResponderMove: updateDrag,
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
      }),
    [beginDrag, controlsDisabled, finishDrag, updateDrag],
  )

  const stepVolume = (delta: number) => {
    if (controlsDisabled) return

    const nextValue = clampSliderValue(clampedValue + delta)
    pendingDragValueRef.current = nextValue
    setDisplayValue(nextValue)
    onChange(nextValue)
  }

  const thumbLeft = trackWidth <= 20
    ? 0
    : Math.max(0, Math.min(trackWidth - 20, trackWidth * displayValue - 10))

  return (
    <View className="px-4 py-4 border-b border-gray-100" style={{ opacity: disabled ? 0.55 : 1 }}>
      <View className="flex-row items-center mb-3">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getBackgroundColor(iconColor) }}
        >
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <TranslatedText className="text-gray-800 text-base">{label}</TranslatedText>
        </View>
        <Text variant="medium" className="text-gray-500 text-sm">
          {percent}%
        </Text>
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center mr-3"
          onPress={() => stepVolume(-0.1)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
        >
          <Ionicons name="remove" size={18} color="#4b5563" />
        </TouchableOpacity>

        <View
          ref={trackRef}
          className="flex-1 h-9 justify-center"
          onLayout={handleTrackLayout}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: 100, now: percent }}
          {...panResponder.panHandlers}
        >
          <View className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${displayValue * 100}%`, backgroundColor: iconColor }}
            />
          </View>
          <View
            className="absolute w-5 h-5 rounded-full bg-white border-2"
            style={{
              left: thumbLeft,
              borderColor: iconColor,
            }}
          />
        </View>

        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-gray-100 items-center justify-center ml-3"
          onPress={() => stepVolume(0.1)}
          disabled={controlsDisabled}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
        >
          <Ionicons name="add" size={18} color="#4b5563" />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const AudioTrackControl: React.FC<AudioTrackControlProps> = ({
  backgroundTracks,
  selectedTrackId,
  onSelectTrack,
}) => {
  if (backgroundTracks.length <= 1) {
    return null
  }

  const selectedBackgroundTrack = backgroundTracks.find((track) => track.id === selectedTrackId) ?? backgroundTracks[0]

  return (
    <View className="px-4 py-4">
      <View className="flex-row items-center">
        <View
          className="w-10 h-10 rounded-full items-center justify-center mr-3"
          style={{ backgroundColor: getBackgroundColor("#F59E0B") }}
        >
          <Ionicons name="musical-notes-outline" size={20} color="#F59E0B" />
        </View>
        <View className="flex-1">
          <TranslatedText className="text-gray-800 text-base">Background track</TranslatedText>
          <Text className="text-gray-500 text-sm mt-0.5">{selectedBackgroundTrack?.title ?? "Default"}</Text>
        </View>
      </View>

      <View className="flex-row flex-wrap mt-3">
        {backgroundTracks.map((track) => {
          const isSelected = track.id === selectedTrackId
          return (
            <TouchableOpacity
              key={track.id}
              className={`mr-2 mb-2 px-3 py-2 rounded-full border ${
                isSelected ? "bg-blue-50 border-blue-300" : "bg-white border-gray-200"
              }`}
              onPress={() => onSelectTrack(track.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Text className={isSelected ? "text-blue-700" : "text-gray-600"}>{track.title}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

export default function SettingsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState(true)
  const { isLuganda, toggleLanguage } = useLanguage()
  const [showTestTool, setShowTestTool] = React.useState(false)
  const {
    settings: audioSettings,
    isSettingsLoaded,
    backgroundTracks,
    setBackgroundMusicMuted,
    setBackgroundMusicVolume,
    setAppSoundsMuted,
    setAppSoundsVolume,
    selectBackgroundTrack,
  } = useAudio()
  const audioControlsDisabled = !isSettingsLoaded
  const handleBackgroundMusicEnabledChange = React.useCallback(
    (enabled: boolean) => setBackgroundMusicMuted(!enabled),
    [setBackgroundMusicMuted],
  )
  const handleAppSoundsEnabledChange = React.useCallback(
    (enabled: boolean) => setAppSoundsMuted(!enabled),
    [setAppSoundsMuted],
  )

  const handleSignOut = async () => {
    Alert.alert("Confirm Logout", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase.auth.signOut()
          if (error) {
            console.error("Error signing out:", error.message)
            Alert.alert("Error", "Could not sign out. Please try again.")
          } else {
            console.log("Signed out successfully")
            router.replace("/")
          }
        },
      },
    ])
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-muted-200 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color={brandColors.charcoalBlack} />
          </TouchableOpacity>
          <BrandMark kind="icon" width={32} height={32} containerStyle={{ marginRight: 10 }} />
          <TranslatedText variant="bold" className="text-xl text-neutral-800">
            Settings
          </TranslatedText>
        </View>

        <ScrollView className="flex-1 px-4">
          {/* API Test Tool */}
          {showTestTool && <TestTranslation />}

          {/* Child Management Section */}
          <SectionTitle title="Child Management" />
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingItem
              icon="child"
              iconColor={brandColors.victoriaBlue}
              iconType="fontawesome"
              text="Manage Child Profiles"
              action={() => router.push("/child-list")}
            />
            <SettingItem
              icon="chart-line"
              iconColor="#F87171"
              iconType="fontawesome"
              text="Learning Progress & Achievements"
              action={() => router.push("/parent/child-progress")}
            />
          </View>

          {/* Audio Section */}
          <SectionTitle title="Audio" />
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingItem
              icon={audioSettings.backgroundMusicMuted ? "volume-mute" : "musical-notes"}
              iconColor="#F59E0B"
              text="Background music"
              toggle
              value={!audioSettings.backgroundMusicMuted}
              action={() => handleBackgroundMusicEnabledChange(audioSettings.backgroundMusicMuted)}
              onToggleChange={handleBackgroundMusicEnabledChange}
              disabled={audioControlsDisabled}
            />
            <AudioVolumeSlider
              icon="musical-notes-outline"
              iconColor="#F59E0B"
              label="Music volume"
              value={audioSettings.backgroundMusicVolume}
              onChange={setBackgroundMusicVolume}
              disabled={audioControlsDisabled}
              muted={audioSettings.backgroundMusicMuted}
            />
            <SettingItem
              icon={audioSettings.appSoundsMuted ? "volume-mute" : "volume-high"}
              iconColor="#3B82F6"
              text="App sounds"
              toggle
              value={!audioSettings.appSoundsMuted}
              action={() => handleAppSoundsEnabledChange(audioSettings.appSoundsMuted)}
              onToggleChange={handleAppSoundsEnabledChange}
              disabled={audioControlsDisabled}
            />
            <AudioVolumeSlider
              icon="volume-high-outline"
              iconColor="#3B82F6"
              label="App sounds volume"
              value={audioSettings.appSoundsVolume}
              onChange={setAppSoundsVolume}
              disabled={audioControlsDisabled}
              muted={audioSettings.appSoundsMuted}
            />
            <AudioTrackControl
              backgroundTracks={backgroundTracks}
              selectedTrackId={audioSettings.selectedBackgroundTrackId}
              onSelectTrack={selectBackgroundTrack}
            />
          </View>

          {/* App Settings Section */}
          <SectionTitle title="App Settings" />
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingItem
              icon="notifications-outline"
              iconColor="#10B981"
              text="Notifications"
              toggle
              value={notifications}
              action={() => setNotifications(!notifications)}
            />
            <SettingItem
              icon="language"
              iconColor="#8B5CF6"
              text="Language"
              toggle
              value={isLuganda}
              action={toggleLanguage}
            />
            <SettingItem
              icon="moon"
              iconColor="#6366F1"
              text="Dark Mode"
              action={() => console.log("Toggle theme!")}
              last
            />
          </View>

          {/* Content Section */}
          <SectionTitle title="Content & Privacy" />
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingItem
              icon="cloud-download"
              iconColor="#EC4899"
              text="Content Management"
              action={() => router.push("/content-management" as any)}
            />
            <SettingItem
              icon="lock-closed"
              iconColor="#0891B2"
              text="Privacy Settings"
              action={() => router.push("/privacy-settings" as any)}
            />
            <SettingItem
              icon="help-circle"
              iconColor="#6366F1"
              text="Help & Support"
              action={() => router.push("/help-support" as any)}
              last
            />
          </View>

          {/* Account Section */}
          <SectionTitle title="Account" />
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <SettingItem
              icon="person"
              iconColor={brandColors.victoriaBlue}
              text="Account Information"
              action={() => router.push("/account-info" as any)}
            />
            <SettingItem icon="log-out" iconColor="#EF4444" text="Logout" action={handleSignOut} last />
          </View>

          <View className="py-6 items-center">
            <Text className="text-gray-400 text-sm">Baby Steps v1.0.0</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}
