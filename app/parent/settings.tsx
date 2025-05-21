"use client"

import React, { useEffect } from "react"
import { View, ScrollView, TouchableOpacity, Switch, Alert, Text as RNText } from "react-native"
import { Text } from "@/components/StyledText"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons, FontAwesome5 } from "@expo/vector-icons"
import { supabase } from "../../lib/supabase"
import * as ScreenOrientation from "expo-screen-orientation"
import { useLanguage } from "@/context/language-context"
import { TranslatedText } from "@/components/translated-text"
import { TestTranslation } from "@/components/test-translation"

// Define the props interface
interface SettingItemProps {
  icon: string
  iconColor: string
  iconType?: "ionicons" | "fontawesome"
  text: string
  action: () => void
  toggle?: boolean
  value?: boolean
  last?: boolean
}

interface SectionTitleProps {
  title: string
}

export default function SettingsScreen() {
  const router = useRouter()
  const [notifications, setNotifications] = React.useState(true)
  const [soundEffects, setSoundEffects] = React.useState(true)
  const { isLuganda, toggleLanguage } = useLanguage()
  const [showTestTool, setShowTestTool] = React.useState(false)

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

  useEffect(() => {
    // Lock to portrait initially when screen loads
    const lockToPortrait = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
    }

    lockToPortrait()

    return () => {}
  }, [])

  // Fixed component with proper TypeScript typing
  const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    iconColor,
    iconType = "ionicons", // Default to Ionicons
    text,
    action,
    toggle = false,
    value = false,
    last = false,
  }) => (
    <TouchableOpacity
      className={`flex-row items-center py-4 ${!last ? "border-b border-gray-100" : ""}`}
      onPress={action}
      activeOpacity={toggle ? 1 : 0.7}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mx-4"
        style={{ backgroundColor: `${getBackgroundColor(iconColor)}` }}
      >
        {iconType === "fontawesome" ? (
          <FontAwesome5 name={icon as any} size={18} color={iconColor} />
        ) : (
          <Ionicons name={icon as any} size={22} color={iconColor} />
        )}
      </View>
      <TranslatedText className="flex-1 text-gray-800 text-base">{text}</TranslatedText>
      {toggle ? (
        <Switch
          value={value}
          onValueChange={action}
          trackColor={{ false: "#e5e7eb", true: "#c4b5fd" }}
          thumbColor={value ? "#7b5af0" : "#f4f3f4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  )

  // Helper function to get the right background color with opacity
  const getBackgroundColor = (color: string) => {
    // Add opacity to the color
    return `${color}20` // 20 is the hex value for ~12% opacity
  }

  const SectionTitle: React.FC<SectionTitleProps> = ({ title }) => (
    <TranslatedText variant="medium" className="text-gray-500 text-sm uppercase tracking-wider mt-6 mb-2 px-1">
      {title}
    </TranslatedText>
  )

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <TranslatedText variant="bold" className="text-xl text-gray-800">
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
              iconColor="#7b5af0"
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
              icon="volume-high"
              iconColor="#3B82F6"
              text="Sound Effects"
              toggle
              value={soundEffects}
              action={() => setSoundEffects(!soundEffects)}
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
              iconColor="#7b5af0"
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
