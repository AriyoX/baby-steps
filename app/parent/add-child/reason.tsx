import { useState } from "react"
import { TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { AddChildScaffold } from "@/components/parent/AddChildScaffold"
import { Text } from "@/components/StyledText"
import { useUser } from "@/context/UserContext"
import { brandColors } from "@/constants/Brand"

const reasonOptions = [
  { value: "Build language and memory", icon: "chatbubbles-outline" as const },
  { value: "Grow creativity", icon: "color-palette-outline" as const },
  { value: "Connect with culture", icon: "earth-outline" as const },
  { value: "Prepare for school", icon: "school-outline" as const },
  { value: "Enjoy healthier screen time", icon: "time-outline" as const },
  { value: "Explore and have fun", icon: "sparkles-outline" as const },
]

export default function ReasonForDownloadingScreen() {
  const { reason, setReason } = useUser()
  const [selectedReason, setSelectedReason] = useState(reason || "")
  const router = useRouter()

  const handleNext = () => {
    setReason(selectedReason)
    router.replace("/parent/add-child/final")
  }

  return (
    <AddChildScaffold
      step={4}
      eyebrow="One last detail"
      title="What matters most right now?"
      description="Choose one focus. This helps us recommend a friendly first activity, and you can explore everything later."
      onBack={() => router.replace("/parent/add-child/language" as any)}
      onNext={handleNext}
      nextLabel="Build their profile"
      nextDisabled={!selectedReason}
    >
      <View className="flex-row flex-wrap justify-between">
        {reasonOptions.map((option) => {
          const selected = selectedReason === option.value
          return (
            <TouchableOpacity
              key={option.value}
              className={`w-[48.5%] min-h-[126px] mb-3 p-4 rounded-2xl border-2 ${
                selected ? "border-secondary-500 bg-secondary-50" : "border-neutral-100 bg-neutral-50"
              }`}
              onPress={() => setSelectedReason(option.value)}
              activeOpacity={0.76}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View className={`w-10 h-10 rounded-xl items-center justify-center mb-3 ${selected ? "bg-secondary-500" : "bg-white"}`}>
                <Ionicons name={option.icon} size={21} color={selected ? "#fff" : brandColors.neutral[600]} />
              </View>
              <Text variant={selected ? "bold" : "medium"} className={`text-sm leading-5 ${selected ? "text-secondary-800" : "text-neutral-700"}`}>
                {option.value}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </AddChildScaffold>
  )
}
