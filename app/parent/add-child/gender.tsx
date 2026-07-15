import { Alert, TextInput, TouchableOpacity, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { AddChildScaffold } from "@/components/parent/AddChildScaffold"
import { Text } from "@/components/StyledText"
import { useUser } from "@/context/UserContext"
import { brandColors } from "@/constants/Brand"
import { readableTextInputStyle } from "@/constants/formStyles"

const profileOptions = [
  { value: "male", label: "Boy", icon: "happy-outline" as const, tint: "bg-primary-50" },
  { value: "female", label: "Girl", icon: "sparkles-outline" as const, tint: "bg-secondary-50" },
  { value: "", label: "Skip", icon: "person-outline" as const, tint: "bg-neutral-50" },
]

export default function GenderScreen() {
  const { setName, setGender, name, gender } = useUser()
  const router = useRouter()
  const canContinue = Boolean(name?.trim())

  const handleNext = () => {
    if (!canContinue) {
      Alert.alert("Add a name", "Please enter the name your child would like to see in the app.")
      return
    }
    router.replace("/parent/add-child/age")
  }

  return (
    <AddChildScaffold
      step={1}
      eyebrow="Let’s make it theirs"
      title="Who is learning?"
      description="Create a simple profile so stories and progress feel personal. You can change these details later."
      onBack={() => router.replace("/parent")}
      onNext={handleNext}
      nextDisabled={!canContinue}
    >
      <Text variant="bold" className="text-sm text-neutral-700 mb-2">Display name</Text>
      <View className="flex-row items-center bg-neutral-50 rounded-2xl px-4 border border-neutral-200 min-h-[58px] mb-6">
        <Ionicons name="person-outline" size={21} color={brandColors.victoriaBlue} />
        <TextInput
          className="flex-1 ml-3 text-lg text-neutral-900"
          placeholder="e.g. Amina"
          placeholderTextColor={brandColors.neutral[400]}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="done"
          style={readableTextInputStyle}
          accessibilityLabel="Child display name"
        />
      </View>

      <Text variant="bold" className="text-sm text-neutral-700 mb-3">How should we represent them?</Text>
      <View className="flex-row gap-2">
        {profileOptions.map((option) => {
          const selected = gender === option.value
          return (
            <TouchableOpacity
              key={option.label}
              className={`flex-1 items-center py-4 px-2 rounded-2xl border-2 ${
                selected ? "border-primary-500 bg-primary-50" : `border-neutral-100 ${option.tint}`
              }`}
              onPress={() => setGender(option.value)}
              activeOpacity={0.76}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
            >
              <View className={`w-11 h-11 rounded-full items-center justify-center mb-2 ${selected ? "bg-primary-500" : "bg-white"}`}>
                <Ionicons name={option.icon} size={22} color={selected ? "#fff" : brandColors.neutral[600]} />
              </View>
              <Text variant={selected ? "bold" : "medium"} className={selected ? "text-primary-700" : "text-neutral-600"}>
                {option.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </AddChildScaffold>
  )
}
