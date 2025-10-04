"use client"

import { useEffect, useState } from "react"
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  BackHandler,
  SafeAreaView,
  Animated,
} from "react-native"
import { Audio, type AVPlaybackSource } from "expo-av"
import { MaterialIcons, Ionicons } from "@expo/vector-icons"
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { TranslatedText } from "@/components/translated-text"

interface Textile {
  id: number
  name: string
  image: any
  description: string
  closeupImage: any
  audio: AVPlaybackSource
}

export default function TextilesScreen() {
  const [selectedTextile, setSelectedTextile] = useState<Textile | null>(null)
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const windowWidth = Dimensions.get("window").width
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
      if (selectedTextile) {
        setSelectedTextile(null)
        if (sound) {
          sound.stopAsync()
        }
        return true
      }
      router.back()
      return true
    })

    return () => backHandler.remove()
  }, [router, selectedTextile, sound])

  const textiles = [
    {
      id: 1,
      name: "Barkcloth (Lubugo)",
      image: require("@/assets/images/barkcloth(Lubugo).png"),
      description:
        "Made from the inner bark of the Mutuba tree (Ficus natalensis), barkcloth has been used for centuries in Buganda for ceremonial wear, burial shrouds, and as a canvas for art. The UNESCO-recognized process involves beating the bark to create a soft, textured cloth with a reddish-brown color.",
      closeupImage: require("@/assets/images/barkcloth(Lubugo)_closeup.png"),
      audio: require("@/assets/sounds/touch-1.mp3"),
    },
    {
      id: 2,
      name: "Royal Backcloth (Lubugo Olukoba)",
      image: require("@/assets/images/royal_cloth.png"),
      description:
        "Special barkcloth reserved for royalty, often decorated with patterns significant to the Buganda monarchy. These cloths feature more detailed processing and sometimes incorporate dyes or decorative elements to signify their importance.",
      closeupImage: require("@/assets/images/royal_cloth_closeup.png"),
      audio: require("@/assets/sounds/touch-1.mp3"),
    },
    {
      id: 3,
      name: "Buganda Baskets",
      image: require("@/assets/images/textile_baskets.png"),
      description:
        "Woven from plant fibers like raffia and palm leaves, these colorful baskets display intricate patterns that tell stories and represent cultural symbols. Each design carries meaning and showcases the weaver's skill and artistry.",
      closeupImage: require("@/assets/images/textile_baskets_closeup.png"),
      audio: require("@/assets/sounds/touch-1.mp3"),
    },
  ]

  async function playSound(audioFile: AVPlaybackSource) {
    if (sound) {
      await sound.unloadAsync()
    }

    const { sound: newSound } = await Audio.Sound.createAsync(audioFile)
    setSound(newSound)
    await newSound.playAsync()
  }

  const TextileCard = ({ item }: { item: Textile; key?: React.Key }) => {
    const scaleAnim = useState(new Animated.Value(1))[0]

    const pinchGesture = Gesture.Pinch()
      .onUpdate((event) => {
        const scale = event.scale > 0.5 ? (event.scale < 3 ? event.scale : 3) : 0.5
        scaleAnim.setValue(scale)
      })
      .onEnd(() => {
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start()
      })

    return (
      <TouchableOpacity
        onPress={() => setSelectedTextile(item)}
        activeOpacity={0.7}
        className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-indigo-100 h-full"
        style={{
          width: 250,
          marginRight: 16,
          height: 240,
        }}
      >
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Image source={item.image} className="w-full h-32" resizeMode="cover" />
          </Animated.View>
        </GestureDetector>

        <View className="p-4 flex-1">
          <View className="flex-row justify-between items-center">
            <TranslatedText variant="bold" className="text-lg text-indigo-800 flex-1 mr-2">
              {item.name}
            </TranslatedText>
          </View>

          <TranslatedText className="text-slate-700 mt-2" numberOfLines={2}>
            {item.description.substring(0, 70)}...
          </TranslatedText>
        </View>
      </TouchableOpacity>
    )
  }

  useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync()
        }
      : undefined
  }, [sound])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
            Buganda Textiles
          </TranslatedText>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1 p-4">
          <Animated.View style={{ opacity: fadeAnim }}>
            <TranslatedText className="text-base mb-4 text-slate-700">
              Discover the beautiful textiles and fabric arts of the Buganda Kingdom. Tap for more details
            </TranslatedText>

            {/* Horizontal scrolling textiles */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
              className="flex-row mb-6"
            >
              {textiles.map((textile) => (
                <TextileCard key={textile.id} item={textile} />
              ))}
            </ScrollView>

            {/* Featured textiles section */}
            <TranslatedText variant="bold" className="text-lg text-indigo-800 mt-6 mb-3">
              Featured Textile Art
            </TranslatedText>

            <View className="mb-3">
              {textiles.slice(0, 2).map((textile) => (
                <TouchableOpacity
                  key={`featured-${textile.id}`}
                  onPress={() => setSelectedTextile(textile)}
                  activeOpacity={0.7}
                  className="flex-row bg-white rounded-xl overflow-hidden shadow-sm border border-indigo-100 mb-4"
                >
                  <Image source={textile.closeupImage} className="w-28 h-28" resizeMode="cover" />
                  <View className="flex-1 p-3">
                    <TranslatedText variant="bold" className="text-base text-indigo-800">
                      {textile.name}
                    </TranslatedText>
                    <TranslatedText className="text-slate-700 text-sm" numberOfLines={2}>
                      {textile.description.substring(0, 80)}...
                    </TranslatedText>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>

        {/* Textile Detail Modal */}
        {selectedTextile && (
          <View className="absolute inset-0 bg-black/50 justify-center items-center p-4">
            <View
              className="relative bg-white rounded-3xl overflow-hidden shadow-xl border-4 border-primary-200"
              style={{ maxHeight: "90%" }}
            >
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
                <Image source={selectedTextile.closeupImage} className="w-full h-48" resizeMode="cover" />

                <View className="px-5 pt-4">
                  <TranslatedText variant="bold" className="text-xl text-primary-700 mb-2 text-center">
                    {selectedTextile.name}
                  </TranslatedText>

                  {/* Description in a styled container */}
                  <View className="bg-primary-50 w-full rounded-xl p-4 mb-4">
                    <TranslatedText className="text-base text-primary-700 leading-relaxed">
                      {selectedTextile.description}
                    </TranslatedText>
                  </View>

                  <View className="bg-yellow-50 w-full rounded-xl p-4 mb-3 border border-yellow-100">
                    <TranslatedText variant="bold" className="text-primary-700 mb-1">
                      About the Texture:
                    </TranslatedText>
                    <TranslatedText className="text-primary-700 leading-relaxed">
                      This closeup image shows the detailed texture and craftsmanship of the{" "}
                      {selectedTextile.name.toLowerCase()}, highlighting the intricate patterns and traditional
                      techniques used in its creation.
                    </TranslatedText>
                  </View>
                </View>
                <View className="p-3 pt-0 flex-row justify-center items-center space-x-4">
                  {/* Sound button */}
                  <TouchableOpacity
                    className="bg-yellow-100 p-2.5 mr-3 rounded-full shadow-sm border-2 border-yellow-200 flex-row items-center"
                    onPress={() => playSound(selectedTextile.audio)}
                  >
                    <MaterialIcons name="volume-up" size={20} color="#7b5af0" />
                    <TranslatedText variant="medium" className="text-primary-600 ml-1.5">
                      Play Sound
                    </TranslatedText>
                  </TouchableOpacity>

                  {/* Close button */}
                  <TouchableOpacity
                    className="bg-primary-500 py-2.5 px-6 rounded-full shadow-sm border-2 border-primary-400"
                    onPress={() => setSelectedTextile(null)}
                    activeOpacity={0.8}
                  >
                    <TranslatedText variant="bold" className="text-white">
                      Close
                    </TranslatedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  )
}
