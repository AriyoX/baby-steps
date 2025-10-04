"use client"

import React, { useEffect, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  BackHandler,
  Dimensions,
  Modal,
  Animated,
} from "react-native"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { WebView } from "react-native-webview"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { LinearGradient } from "expo-linear-gradient"

export default function ArtScreen() {
  const [selectedArtwork, setSelectedArtwork] = useState<{
    id: number
    title: string
    artist: string
    image: any
    description: string
    videoUrl: string
  } | null>(null)
  const [contrastLevel, setContrastLevel] = useState("normal")
  const [videoModalVisible, setVideoModalVisible] = useState(false)
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
      if (videoModalVisible) {
        setVideoModalVisible(false)
        return true
      }
      if (selectedArtwork) {
        setSelectedArtwork(null)
        return true
      }
      router.back()
      return true
    })

    return () => backHandler.remove()
  }, [router, selectedArtwork, videoModalVisible])

  const artworks = [
    {
      id: 1,
      title: "Barkcloth Paintings",
      artist: "Traditional Buganda Artists",
      image: require("@/assets/images/barkcloth_art.png"),
      description:
        "Paintings created on traditional barkcloth (lubugo) using natural pigments. These artworks often depict daily life, cultural symbols, and stories from Buganda history.",
      videoUrl: "https://www.youtube.com/watch?v=uhznFtHhkBo",
    },
    {
      id: 2,
      title: "Kasubi Tombs Artwork",
      artist: "Various Buganda Artists",
      image: require("@/assets/images/kasubi_art.png"),
      description:
        "Decorative art found at the Kasubi Tombs, a UNESCO World Heritage site where Buganda kings are buried. These artworks include symbolic patterns and royal emblems.",
      videoUrl: "https://www.youtube.com/watch?v=G2PDZZO6h68",
    },
    {
      id: 3,
      title: "Traditional Basketry Designs",
      artist: "Buganda Craft Artisans",
      image: require("@/assets/images/basket_art.jpg"),
      description:
        "Intricate patterns and designs used in traditional Buganda basketry, which are considered both functional crafts and artistic expressions.",
      videoUrl: "https://www.youtube.com/watch?v=ddqvWZhdOzM",
    },
    {
      id: 4,
      title: "Royal Court Scenes",
      artist: "Contemporary Ugandan Artists",
      image: require("@/assets/images/court_art.png"),
      description:
        "Modern interpretations of the Buganda royal court, showing the Kabaka and his officials. These paintings blend traditional themes with contemporary artistic styles.",
      videoUrl: "https://www.youtube.com/embed/exampleVideo2",
    },
    {
      id: 5,
      title: "Cultural Symbol Paintings",
      artist: "Modern Buganda Artists",
      image: require("@/assets/images/symbol_art.jpg"),
      description:
        "Modern artwork featuring traditional Buganda symbols and motifs, reimagined through contemporary artistic techniques and materials.",
      videoUrl: "https://www.youtube.com/embed/exampleVideo5",
    },
  ]

  const toggleContrast = () => {
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

  const handleWatchVideo = () => {
    if (selectedArtwork) {
      setVideoModalVisible(true)
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
                onPress={() => setSelectedArtwork(artwork)}
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
            <View className="p-3 pt-0 flex-row justify-center items-center space-x-4 bg-white border-slate-100">
              {/* YouTube button */}
              <TouchableOpacity
                className="bg-red-100 p-2.5 mr-3 rounded-full shadow-sm border-2 border-red-200 flex-row items-center"
                onPress={handleWatchVideo}
              >
                <Ionicons name="logo-youtube" size={20} color="#e11d48" />
                <TranslatedText variant="medium" className="text-red-600 ml-1.5">
                  Watch
                </TranslatedText>
              </TouchableOpacity>

              {/* Close button */}
              <TouchableOpacity
                className="bg-primary-500 py-2.5 px-6 rounded-full shadow-sm border-2 border-primary-400"
                onPress={() => setSelectedArtwork(null)}
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

      {/* Video Modal - Full Screen Version */}
      <Modal
        visible={videoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVideoModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-black">
          {/* Close button positioned at top right */}
          <View className="absolute top-4 right-4 z-10">
            <TouchableOpacity
              className="bg-primary-500 w-12 h-12 rounded-full justify-center items-center shadow-md border-2 border-white"
              onPress={() => setVideoModalVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Video container taking up full screen */}
          <View className="flex-1 bg-black">
            {selectedArtwork && (
              <WebView
                source={{ uri: selectedArtwork.videoUrl }}
                allowsFullscreenVideo={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                style={{ flex: 1 }}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}
