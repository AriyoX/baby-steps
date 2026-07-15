"use client"

import { useState } from "react"
import { ImageBackground, TouchableOpacity, View } from "react-native"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { brandColors } from "@/constants/Brand"
import { useChild } from "@/context/ChildContext"
import {
  generateParentGateChallenge,
  isCorrectParentGateAnswer,
} from "@/lib/parentGateChallenge"

const NUMBER_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
]

export default function ParentGate() {
  const [challenge, setChallenge] = useState(() => generateParentGateChallenge())
  const [input, setInput] = useState("")
  const [showRetryMessage, setShowRetryMessage] = useState(false)
  const router = useRouter()
  const { setActiveChild } = useChild()

  const handleDigitPress = (digit: string) => {
    if (input.length >= 2) return
    setShowRetryMessage(false)
    setInput((current) => current + digit)
  }

  const handleClear = () => {
    setShowRetryMessage(false)
    setInput((current) => current.slice(0, -1))
  }

  const handleSubmit = () => {
    if (!input) return

    if (isCorrectParentGateAnswer(challenge, input)) {
      setActiveChild(null)
      router.replace("/parent")
      return
    }

    setInput("")
    setChallenge(generateParentGateChallenge())
    setShowRetryMessage(true)
  }

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1">
        <SafeAreaView className="flex-1 bg-primary-800/90">
          <View className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-primary-400/30" />
          <View className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-accent-400/20" />

          <TouchableOpacity
            className="absolute top-5 left-5 z-20 w-12 h-12 rounded-2xl bg-white/15 items-center justify-center border border-white/20"
            onPress={() => router.back()}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Return to child mode"
          >
            <Ionicons name="arrow-back" size={25} color={brandColors.white} />
          </TouchableOpacity>

          <View className="flex-1 flex-row px-8 py-5 gap-8">
            <View className="flex-1 justify-center pl-8">
              <View className="self-start flex-row items-center rounded-full bg-accent-400 px-4 py-2 mb-4">
                <Ionicons name="shield-checkmark" size={18} color={brandColors.neutral[900]} />
                <TranslatedText variant="bold" className="text-neutral-900 text-sm ml-2">
                  Grown-up space
                </TranslatedText>
              </View>

              <TranslatedText variant="bold" className="text-white text-[34px] leading-10">
                Parent Access
              </TranslatedText>
              <TranslatedText className="text-primary-100 text-base leading-6 mt-2 max-w-[390px]">
                Solve one quick puzzle to leave child mode.
              </TranslatedText>

              <View className="mt-5 max-w-[390px] rounded-[28px] bg-white p-5 border border-white/40 shadow-lg">
                <View className="flex-row items-center mb-2">
                  <View className="w-9 h-9 rounded-xl bg-primary-50 items-center justify-center">
                    <Ionicons name="calculator-outline" size={20} color={brandColors.victoriaBlue} />
                  </View>
                  <TranslatedText variant="bold" className="text-neutral-600 text-sm ml-3">
                    What number is missing?
                  </TranslatedText>
                </View>
                <Text
                  variant="bold"
                  className="text-primary-800 text-[38px] leading-[48px] text-center py-2"
                  accessibilityLabel={`Solve ${challenge.expression}`}
                >
                  {challenge.expression}
                </Text>
              </View>

              <View className="min-h-[28px] mt-3">
                {showRetryMessage ? (
                  <View className="flex-row items-center">
                    <Ionicons name="refresh-circle" size={20} color={brandColors.equatorialGold} />
                    <TranslatedText variant="bold" className="text-accent-300 text-sm ml-2">
                      Almost! Here’s a fresh puzzle to try.
                    </TranslatedText>
                  </View>
                ) : (
                  <TranslatedText className="text-white/65 text-sm">
                    A tiny pause helps keep this area for grown-ups.
                  </TranslatedText>
                )}
              </View>
            </View>

            <View className="w-[300px] justify-center items-center pr-5">
              <View className="w-full rounded-[30px] bg-neutral-900/35 border border-white/15 p-4">
                <View className="h-[56px] rounded-2xl bg-white/15 border border-white/20 items-center justify-center mb-3">
                  <Text
                    variant="bold"
                    className={`text-[30px] ${input ? "text-white" : "text-white/40"}`}
                    accessibilityLabel={input ? `Entered answer ${input}` : "No answer entered"}
                  >
                    {input || "—"}
                  </Text>
                </View>

                {NUMBER_ROWS.map((row) => (
                  <View key={row.join("")} className="flex-row gap-3 mb-3">
                    {row.map((digit) => (
                      <TouchableOpacity
                        key={digit}
                        className="flex-1 h-[56px] bg-white/20 rounded-2xl justify-center items-center border border-white/10"
                        onPress={() => handleDigitPress(digit)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`Enter ${digit}`}
                      >
                        <Text variant="bold" className="text-white text-2xl">{digit}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="w-[70px] h-[56px] bg-white/10 rounded-2xl justify-center items-center"
                    onPress={handleClear}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Delete last digit"
                  >
                    <Ionicons name="backspace-outline" size={25} color={brandColors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="w-[70px] h-[56px] bg-white/20 rounded-2xl justify-center items-center border border-white/10"
                    onPress={() => handleDigitPress("0")}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Enter 0"
                  >
                    <Text variant="bold" className="text-white text-2xl">0</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 h-[56px] rounded-2xl justify-center items-center flex-row ${input ? "bg-accent-400" : "bg-white/10"}`}
                    onPress={handleSubmit}
                    disabled={!input}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Check answer"
                    accessibilityState={{ disabled: !input }}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={24}
                      color={input ? brandColors.neutral[900] : brandColors.neutral[400]}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}
