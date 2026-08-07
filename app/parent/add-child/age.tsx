import { useState } from "react"
import { Alert, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { AddChildScaffold } from "@/components/parent/AddChildScaffold"
import { Text } from "@/components/StyledText"
import { useUser } from "@/context/UserContext"
import { brandColors } from "@/constants/Brand"
import {
  CHILD_AGE_OPTIONS,
  OLDER_CHILD_GUIDANCE,
} from "@/lib/childProfileOptions"

export default function AgeSelectionScreen() {
  const { age, setAge } = useUser()
  const [selectedAge, setSelectedAge] = useState(age || "")
  const router = useRouter()

  const handleNext = () => {
    if (!selectedAge) {
      Alert.alert("Choose an age", "Age helps us suggest a comfortable starting point.")
      return
    }
    setAge(selectedAge)
    router.replace("/parent/add-child/language" as any)
  }

  return (
    <AddChildScaffold
      step={2}
      title="How old is your child?"
      onBack={() => router.replace("/parent/add-child/gender")}
      onNext={handleNext}
      nextDisabled={!selectedAge}
      footer={
        <View className="flex-row items-start bg-accent-50 border border-accent-100 rounded-2xl p-4">
          <Ionicons name="information-circle-outline" size={21} color={brandColors.gold[700]} />
          <Text className="flex-1 ml-2 text-sm leading-5 text-neutral-700">
            {OLDER_CHILD_GUIDANCE}
          </Text>
        </View>
      }
    >
      <View className="flex-row flex-wrap justify-between">
        {CHILD_AGE_OPTIONS.map((option) => {
          const selected = selectedAge === option
          return (
            <TouchableOpacity
              key={option}
              className={`w-[23%] aspect-square mb-3 rounded-2xl items-center justify-center border-2 ${
                selected ? "border-secondary-500 bg-secondary-50" : "border-neutral-100 bg-neutral-50"
              }`}
              onPress={() => setSelectedAge(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <Text variant="bold" className={`text-xl ${selected ? "text-secondary-700" : "text-neutral-700"}`}>
                {option}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </AddChildScaffold>
  )
}
