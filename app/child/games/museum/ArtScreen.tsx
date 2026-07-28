"use client"

import React, { useEffect, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  BackHandler,
  Animated,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { TranslatedText } from "@/components/translated-text"
import { childHaptics } from "@/lib/childHaptics"

export default function ArtScreen() {
  const [selectedArtwork, setSelectedArtwork] = useState<{
    id: number
    title: string
    artist: string
    image: any
    description: string
  } | null>(null)
  const [contrastLevel, setContrastLevel] = useState("normal")
  const router = useRouter()
  const fadeAnim = useState<Animated.Value>(new Animated.Value(0))[0]

  useEffect(() => {
    // Fade in animation when screen loads
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (selectedArtwork) {
        setSelectedArtwork(null)
        return true
      }
      router.back()
      return true
    })

    return () => backHandler.remove()
  }, [router, selectedArtwork, fadeAnim])

  const artworks = [
    {
      id: 1,
      title: "Barkcloth Paintings",
      artist: "Traditional Buganda Artists",
      image: require("@/assets/images/barkcloth_art.png"),
      description:
        "Paintings created on traditional barkcloth (lubugo) using natural pigments. These artworks often depict daily life, cultural symbols, and stories from Buganda history.",
    },
    {
      id: 2,
      title: "Kasubi Tombs Artwork",
      artist: "Various Buganda Artists",
      image: require("@/assets/images/kasubi_art.png"),
      description:
        "Decorative art found at the Kasubi Tombs, a UNESCO World Heritage site where Buganda kings are buried. These artworks include symbolic patterns and royal emblems.",
    },
    {
      id: 3,
      title: "Traditional Basketry Designs",
      artist: "Buganda Craft Artisans",
      image: require("@/assets/images/basket_art.jpg"),
      description:
        "Intricate patterns and designs used in traditional Buganda basketry, which are considered both functional crafts and artistic expressions.",
    },
    {
      id: 4,
      title: "Royal Court Scenes",
      artist: "Contemporary Ugandan Artists",
      image: require("@/assets/images/court_art.png"),
      description:
        "Modern interpretations of the Buganda royal court, showing the Kabaka and his officials. These paintings blend traditional themes with contemporary artistic styles.",
    },
    {
      id: 5,
      title: "Cultural Symbol Paintings",
      artist: "Modern Buganda Artists",
      image: require("@/assets/images/symbol_art.jpg"),
      description:
        "Modern artwork featuring traditional Buganda symbols and motifs, reimagined through contemporary artistic techniques and materials.",
    },
  ]

  const toggleContrast = () => {
    childHaptics.selection()
    if (contrastLevel === "normal") {
      setContrastLevel("high")
    } else if (contrastLevel === "high") {
      setContrastLevel("low")
    } else {
      setContrastLevel("normal")
    }
  }

  const getContrastStyle = () => {
    switch (contrastLevel) {
      case "high":
        return "bg-white border-4 border-indigo-600"
      case "low":
        return "bg-slate-100 border border-indigo-200"
      default:
        return "bg-white border-2 border-indigo-200"
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Header with back button and title */}
      <View className="flex-row justify-between items-center px-4 pt-6 pb-2">
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
          onPress={() => {
            childHaptics.tap()
            router.back()
          }}
        >
          <Ionicons name="arrow-back" size={20} color="#7b5af0" />
        </TouchableOpacity>

        <TranslatedText variant="bold" className="text-xl text-indigo-800">
          Buganda Art Gallery
        </TranslatedText>

        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-white justify-center items-center shadow-sm border border-indigo-200"
          onPress={toggleContrast}
        >
          <MaterialIcons name="contrast" size={20} color="#7b5af0" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 p-4">
        <Animated.View style={{ opacity: fadeAnim }}>
          <TranslatedText className="text-base mb-4 text-slate-700">
            Explore beautiful art from the Buganda Kingdom! Tap on any artwork to learn more. (scroll to the right for more)
          </TranslatedText>

          {/* Replace the vertical layout with horizontal scrolling */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            className="flex-row"
          >
            {artworks.map((artwork) => (
              <TouchableOpacity
                key={artwork.id}
                className={`rounded-xl overflow-hidden shadow-sm mr-4 ${getContrastStyle()}`}
                style={{ width: 250 }}
                onPress={() => {
                  childHaptics.selection()
                  setSelectedArtwork(artwork)
                }}
                activeOpacity={0.7}
              >
                <Image source={artwork.image} className="w-full h-36" resizeMode="cover" />
                <View className="p-3">
                  <TranslatedText variant="bold" className="text-lg text-indigo-800 mb-1">
                    {artwork.title}
                  </TranslatedText>
                  <TranslatedText className="text-indigo-600">{artwork.artist}</TranslatedText>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Artwork Detail Modal */}
      {selectedArtwork && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4">
          <View
            className="relative bg-white w-4/5 max-w-md rounded-3xl overflow-hidden shadow-xl border-4 border-primary-200"
            style={{ maxHeight: "90%" }}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Image source={selectedArtwork.image} className="w-full h-48" resizeMode="cover" />

              <View className="px-5 pt-4">
                <TranslatedText variant="bold" className="text-xl text-primary-700 mb-1 text-center">
                  {selectedArtwork.title}
                </TranslatedText>
                <TranslatedText className="text-primary-600 mb-3 text-center">
                  {selectedArtwork.artist}
                </TranslatedText>

                {/* Description in a styled container */}
                <View className="bg-primary-50 w-full rounded-xl p-4 mb-3">
                  <TranslatedText className="text-base text-primary-700 text-center leading-relaxed">
                    {selectedArtwork.description}
                  </TranslatedText>
                </View>
              </View>
            </ScrollView>

            {/* Buttons section outside ScrollView to ensure visibility */}
            <View className="p-3 pt-0 flex-row justify-center items-center bg-white border-slate-100">
              <TouchableOpacity
                className="bg-primary-500 py-2.5 px-6 rounded-full shadow-sm border-2 border-primary-400"
                onPress={() => {
                  childHaptics.tap()
                  setSelectedArtwork(null)
                }}
                activeOpacity={0.8}
              >
                <TranslatedText variant="bold" className="text-white">
                  Close
                </TranslatedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

    </SafeAreaView>
  )
}
