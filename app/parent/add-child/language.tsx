import { TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { AddChildScaffold } from "@/components/parent/AddChildScaffold"
import { Text } from "@/components/StyledText"
import { useUser } from "@/context/UserContext"
import { LEARNING_LANGUAGES } from "@/content/languages"
import { brandColors } from "@/constants/Brand"

export default function LearningLanguageScreen() {
  const { selectedLanguageCode, setSelectedLanguageCode } = useUser()
  const router = useRouter()

  return (
    <AddChildScaffold
      step={3}
      eyebrow="Choose their learning voice"
      title="Which language comes first?"
      description="Pick the language for lessons and stories. Your app interface can stay in your preferred language."
      onBack={() => router.replace("/parent/add-child/age")}
      onNext={() => router.replace("/parent/add-child/reason")}
      nextDisabled={!selectedLanguageCode}
    >
      <View className="gap-3">
        {LEARNING_LANGUAGES.filter((language) => language.isActive).map((language) => {
          const selected = selectedLanguageCode === language.code
          return (
            <TouchableOpacity
              key={language.code}
              className={`p-4 rounded-2xl border-2 flex-row items-center ${
                selected ? "border-primary-500 bg-primary-50" : "border-neutral-100 bg-neutral-50"
              }`}
              onPress={() => setSelectedLanguageCode(language.code)}
              activeOpacity={0.76}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View className={`w-12 h-12 rounded-2xl items-center justify-center ${selected ? "bg-primary-500" : "bg-white"}`}>
                <Ionicons name="language-outline" size={24} color={selected ? "#fff" : brandColors.victoriaBlue} />
              </View>
              <View className="flex-1 ml-4">
                <Text variant="bold" className="text-lg text-neutral-900">{language.name}</Text>
                <Text className="text-sm text-neutral-500">{language.nativeName}</Text>
              </View>
              <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={selected ? brandColors.victoriaBlue : brandColors.neutral[300]}
              />
            </TouchableOpacity>
          )
        })}
      </View>
    </AddChildScaffold>
  )
}
