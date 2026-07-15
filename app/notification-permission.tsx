import { useState } from "react"
import { Alert, StatusBar, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useLocalSearchParams, useRouter } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { BrandMark } from "@/components/brand/BrandMark"
import { AppButton } from "@/components/common/AppButton"
import { Text } from "@/components/StyledText"
import { brandColors } from "@/constants/Brand"
import { requestAndEnableRecurringReminders } from "@/lib/notifications"

const REMINDER_BENEFITS = [
  {
    icon: "sparkles-outline" as const,
    title: "Helpful check-ins",
    description: "Thoughtful prompts that make it easier to return to Baby Steps.",
  },
  {
    icon: "heart-outline" as const,
    title: "Made for family life",
    description: "Warm, encouraging messages designed to feel supportive, never demanding.",
  },
  {
    icon: "options-outline" as const,
    title: "Always in your control",
    description: "Pause or resume notifications whenever you like from Parent Settings.",
  },
]

export default function NotificationPermissionScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ email?: string; flow?: "signup" }>()
  const [loading, setLoading] = useState(false)

  const continueToEmailCheck = () => {
    router.replace({
      pathname: "/check-email",
      params: { flow: params.flow ?? "signup", email: params.email ?? "" },
    } as any)
  }

  const enableReminders = async () => {
    setLoading(true)
    try {
      const permission = await requestAndEnableRecurringReminders()
      if (permission !== "granted") {
        Alert.alert(
          "Reminders are off",
          "That’s okay. You can turn them on later from Parent Settings.",
        )
      }
    } catch (error) {
      console.error("Could not enable learning reminders:", error)
      Alert.alert("Could not set reminders", "You can try again later from Parent Settings.")
    } finally {
      setLoading(false)
      continueToEmailCheck()
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8F6F1]">
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />
      <View className="absolute -top-14 -right-12 w-48 h-48 rounded-full bg-accent-100 opacity-70" />
      <View className="absolute top-72 -left-16 w-36 h-36 rounded-full bg-primary-100 opacity-60" />

      <View className="flex-1 px-5 pt-5 pb-4">
        <BrandMark kind="wordmark" width={150} height={38} />

        <View className="items-center mt-8 mb-7">
          <View className="w-24 h-24 rounded-[30px] bg-primary-500 items-center justify-center shadow-lg">
            <Ionicons name="notifications-outline" size={44} color="#fff" />
            <View className="absolute -right-1 -top-1 w-8 h-8 rounded-full bg-accent-400 border-4 border-[#F8F6F1] items-center justify-center">
              <Ionicons name="sparkles" size={13} color={brandColors.neutral[900]} />
            </View>
          </View>
        </View>

        <Text variant="bold" className="text-[32px] leading-10 text-neutral-900 text-center mb-3">
          Want a gentle nudge?
        </Text>
        <Text className="text-base leading-6 text-neutral-600 text-center px-3 mb-7">
          Baby Steps can send timely, encouraging messages to help your family stay connected with the app.
        </Text>

        <View className="bg-white rounded-[28px] p-5 border border-primary-100 shadow-sm">
          {REMINDER_BENEFITS.map((benefit, index) => (
            <View
              key={benefit.title}
              className={`flex-row items-center py-3 ${index < REMINDER_BENEFITS.length - 1 ? "border-b border-neutral-100" : ""}`}
            >
              <View className="w-10 h-10 rounded-2xl bg-primary-50 items-center justify-center">
                <Ionicons name={benefit.icon} size={19} color={brandColors.victoriaBlue} />
              </View>
              <View className="flex-1 ml-3">
                <Text variant="bold" className="text-neutral-800">{benefit.title}</Text>
                <Text className="text-sm leading-5 text-neutral-500 mt-0.5">{benefit.description}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className="flex-row items-start mt-5 px-2">
          <Ionicons name="shield-checkmark-outline" size={19} color={brandColors.neutral[500]} />
          <Text className="flex-1 ml-2 text-xs leading-5 text-neutral-500">
            These reminders are scheduled only on this device. Baby Steps does not need a push token or your child’s contact details.
          </Text>
        </View>
      </View>

      <View className="px-5 pb-4 gap-2">
        <AppButton
          label="Turn on gentle reminders"
          icon="notifications-outline"
          loading={loading}
          loadingLabel="Setting reminders…"
          onPress={() => void enableReminders()}
          className="rounded-2xl min-h-[56px]"
        />
        <AppButton
          label="Maybe later"
          variant="ghost"
          onPress={continueToEmailCheck}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  )
}
