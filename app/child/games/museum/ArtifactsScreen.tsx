"use client"

import React, { useEffect, useState } from "react"
import {
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  BackHandler,
  Animated,
  Dimensions,
} from "react-native"
import { Audio, type AVPlaybackSource } from "expo-av"
import { MaterialIcons } from "@expo/vector-icons"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { TranslatedText } from "@/components/translated-text"
import { LinearGradient } from "expo-linear-gradient"

export default function ArtifactsScreen() {
  const [selectedArtifact, setSelectedArtifact] = useState<{
    id: number
    name: string
    image: any
    description: string
    audio: AVPlaybackSource
  } | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const router = useRouter()
  const { width } = Dimensions.get("window")
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0]

  useEffect(() => {
    // Fade in animation when screen loads
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedArtifact) {
        // Close modal if open
        setSelectedArtifact(null)
        if (sound) {
          sound.stopAsync()
        }
        return true
      }
      router.back()
      return true
    })

    return () => backHandler.remove()
  }, [router, selectedArtifact, sound])

  const artifacts = [
    {
      id: 1,
      name: "Royal Drums (Mujaguzo)",
      image: require("@/assets/images/engoma.png"),
      description:
        "These sacred royal drums symbolize the authority of the Kabaka (king). Each drum has a specific name and purpose in royal ceremonies.",
      audio: require("@/assets/sounds/drums.mp3"),
    },
    {
      id: 2,
      name: "Traditional Spears",
      image: require("@/assets/images/spears.png"),
      description:
        "Used both for hunting and warfare, these spears represent the strength and bravery of Buganda warriors throughout history.",
      audio: require("@/assets/sounds/spears_hit.mp3"),
    },
    {
      id: 3,
      name: "Royal Stool (Entebe)",
      image: require("@/assets/images/royal_stool.png"),
      description:
        "Special wooden stools used by the Kabaka and other royal officials during important ceremonies and meetings.",
      audio: require("@/assets/sounds/bar-stool.mp3"),
    },
    {
      id: 4,
      name: "Drinking Vessels",
      image: require("@/assets/images/vessels.png"),
      description: "Beautifully crafted cups and containers for traditional drinks made from gourds, clay, or wood.",
      audio: require("@/assets/sounds/vessels.mp3"),
    },
    {
      id: 5,
      name: "Royal Regalia",
      image: require("@/assets/images/regalia.jpg"),
      description:
        "Special items used by the Kabaka including crowns, staffs, and emblems that represent royal authority.",
      audio: require("@/assets/sounds/regalia.mp3"),
    },
  ]

  async function playSound(audioFile: AVPlaybackSource) {
    // Stop any currently playing sound
    if (sound) {
      await sound.unloadAsync()
    }

    const { sound: newSound } = await Audio.Sound.createAsync(audioFile)
    setSound(newSound)
    await newSound.playAsync()
  }

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync()
        }
      : undefined
  }, [sound])

  const handleArtifactPress = (artifact: {
    id: number
    name: string
    image: any
    description: string
    audio: AVPlaybackSource
  }) => {
    setSelectedArtifact(artifact)
  }

  const closeModal = () => {
    setSelectedArtifact(null)
    if (sound) {
      sound.stopAsync()
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Header with back button and title */}
      <View className="flex-row justify-between items-center px-4 pt-6 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={20} color="#7b5af0" />
        </TouchableOpacity>

        <TranslatedText variant="bold" className="text-xl text-indigo-800">
          Buganda Artifacts
        </TranslatedText>

        <View style={{ width: 40 }} />
      </View>

      <LinearGradient colors={["#6366f1", "#7b5af0"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="py-4 px-6">
        <TranslatedText className="text-white text-center">Discover treasures from the Buganda Kingdom</TranslatedText>
      </LinearGradient>

      <ScrollView className="flex-1 p-4">
        <Animated.View style={{ opacity: fadeAnim }}>
          <TranslatedText className="text-base mb-4 text-slate-700">
            Tap on any artifact to learn more about its history and importance in Buganda culture!
          </TranslatedText>

          <View className="flex-row flex-wrap justify-center">
            {artifacts.map((artifact) => (
              <TouchableOpacity
                key={artifact.id}
                className="w-40 h-48 mx-2 bg-white rounded-xl shadow-sm border-slate-200 overflow-hidden"
                onPress={() => handleArtifactPress(artifact)}
                activeOpacity={0.7}
              >
                <Image source={artifact.image} className="w-full h-28" resizeMode="cover" />
                <View className="p-2 bg-white flex-1 justify-center">
                  <TranslatedText variant="bold" className="text-slate-800 text-center">
                    {artifact.name}
                  </TranslatedText>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Detailed artifact modal */}
      {selectedArtifact && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4">
          <ScrollView className="relative bg-white w-4/5 max-w-md rounded-3xl overflow-hidden shadow-xl border-4 border-primary-200">
            {/* Main image display */}
            <View className="w-full pt-12 pb-4 bg-indigo-50">
              <Image source={selectedArtifact.image} className="w-full h-48" resizeMode="contain" />
            </View>

            <View className="p-6">
              <TranslatedText variant="bold" className="text-2xl text-primary-700 mb-4 text-center">
                {selectedArtifact.name}
              </TranslatedText>

              {/* Description in a styled container */}
              <View className="bg-primary-50 w-full rounded-xl p-4 mb-5">
                <TranslatedText className="text-lg text-primary-700 text-center leading-relaxed">
                  {selectedArtifact.description}
                </TranslatedText>
              </View>

              <View className="flex-row justify-center items-center space-x-4">
                {/* Sound button */}
                <TouchableOpacity
                  className="bg-yellow-100 p-3 mr-3 rounded-full shadow-md border-2 border-yellow-200"
                  onPress={() => playSound(selectedArtifact.audio)}
                >
                  <MaterialIcons name="volume-up" size={28} color="#7b5af0" />
                </TouchableOpacity>

                {/* Close button */}
                <TouchableOpacity
                  className="bg-primary-500 py-3 px-7 rounded-full shadow-md border-2 border-primary-400"
                  onPress={closeModal}
                  activeOpacity={0.8}
                >
                  <TranslatedText variant="bold" className="text-white text-lg">
                    Close
                  </TranslatedText>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  )
}
