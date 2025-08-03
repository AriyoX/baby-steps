"use client"

import { useState, useEffect } from "react"
import { View, Image, ImageBackground, TouchableOpacity } from "react-native"
import { useRouter } from "expo-router"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { StatusBar } from "expo-status-bar"
import { SafeAreaView } from "react-native-safe-area-context"
import { Ionicons } from "@expo/vector-icons"
import { useChild } from "@/context/ChildContext"

export default function ParentGate() {
  const [input, setInput] = useState("")
  const [correctPin, setCorrectPin] = useState(generateRandomPin())
  const router = useRouter()
  const { setActiveChild } = useChild()

  // Function to generate a random 3-digit PIN
  function generateRandomPin() {
    return Math.floor(Math.random() * 900 + 100).toString()
  }

  const handleDigitPress = (digit: string) => {
    if (input.length < 3) {
      const newInput = input + digit
      setInput(newInput)

      if (newInput.length === 3) {
        if (newInput === correctPin) {
          setActiveChild(null) // Clear active child
          router.push("/parent")
        } else {
          // No alert for incorrect PIN, just redirect back
          router.back() // Using router.back() is safer than hardcoding a path
        }
      }
    }
  }

  const handleClear = () => {
    setInput(input.slice(0, -1))
  }

  // Effect to regenerate PIN every time the component is mounted
  useEffect(() => {
    setCorrectPin(generateRandomPin())
  }, [])

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ImageBackground source={require("@/assets/images/gameBackground.jpg")} className="flex-1">
        <SafeAreaView className="flex-1" edges={["right", "bottom", "left"]}>
          <View className="flex-1 bg-[#7b5af0d9] py-6 px-4">
            {/* Header with back button */}
            <TouchableOpacity className="absolute top-8 left-6 z-10" onPress={() => router.back()}>
              <Ionicons name="arrow-back-circle" size={40} color="#FFD700" />
            </TouchableOpacity>

            <View className="flex-1 flex-row">
              {/* LEFT SECTION */}
              <View className="flex-1 items-center justify-center">
                <View className="rounded-2xl p-8 items-center max-w-[300px]">
                  <TranslatedText variant="bold" className="text-white text-2xl mb-2">
                    Parent Access
                  </TranslatedText>
                  <TranslatedText className="text-white/80 text-base mb-1 text-center">
                    Please enter these digits:
                  </TranslatedText>
                  <Text variant="bold" className="text-[#FFD700] text-3xl mb-6 tracking-widest pt-2">
                    {correctPin.split("").join(" ")}
                  </Text>

                  <Image source={require("@/assets/images/lock-icon.jpg")} className="w-[90px] h-[75px] mb-6" />

                  <View className="flex-row gap-4 mb-2">
                    {[0, 1, 2].map((i) => (
                      <View
                        key={i}
                        className={`w-[50px] h-[60px] rounded-lg justify-center items-center border-2 ${
                          input[i] ? "bg-[#FFD700]/20 border-[#FFD700]" : "bg-white/20 border-white/40"
                        }`}
                      >
                        <Text variant="bold" className="text-white text-3xl">
                          {input[i] || ""}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <TranslatedText className="text-white/60 text-sm italic mt-4">For parents only...</TranslatedText>
                </View>
              </View>

              {/* RIGHT SECTION - NUMPAD */}
              <View className="flex-1 items-center justify-center">
                <View className="flex-row">
                  {/* Numpad container */}
                  <View className="flex-row justify-center gap-3">
                    {/* Column 1 */}
                    <View className="flex-col gap-3">
                      {["1", "4", "7"].map((digit) => (
                        <TouchableOpacity
                          key={digit}
                          className="w-[70px] h-[70px] bg-white/20 rounded-2xl justify-center items-center active:opacity-70"
                          onPress={() => handleDigitPress(digit)}
                          activeOpacity={0.7}
                        >
                          <Text variant="bold" className="text-white text-3xl pt-3">
                            {digit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        className="w-[70px] h-[70px] bg-white/10 rounded-2xl justify-center items-center"
                        onPress={() => handleDigitPress("0")}
                        activeOpacity={0.7}
                      >
                        <Text variant="bold" className="text-white text-3xl">
                          0
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Column 2 */}
                    <View className="flex-col gap-3">
                      {["2", "5", "8"].map((digit) => (
                        <TouchableOpacity
                          key={digit}
                          className="w-[70px] h-[70px] bg-white/20 rounded-2xl justify-center items-center"
                          onPress={() => handleDigitPress(digit)}
                          activeOpacity={0.7}
                        >
                          <Text variant="bold" className="text-white text-3xl pt-3">
                            {digit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        className="w-[70px] h-[70px] bg-amber-600/30 rounded-2xl justify-center items-center"
                        onPress={handleClear}
                        activeOpacity={0.6}
                      >
                        <Ionicons name="backspace-outline" size={28} color="white" />
                      </TouchableOpacity>
                    </View>

                    {/* Column 3 */}
                    <View className="flex-col gap-3">
                      {["3", "6", "9"].map((digit) => (
                        <TouchableOpacity
                          key={digit}
                          className="w-[70px] h-[70px] bg-white/20 rounded-2xl justify-center items-center"
                          onPress={() => handleDigitPress(digit)}
                          activeOpacity={0.7}
                        >
                          <Text variant="bold" className="text-white text-3xl pt-3">
                            {digit}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <View className="w-[70px] h-[70px]" />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </ImageBackground>
    </>
  )
}
