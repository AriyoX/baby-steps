"use client"

import React, { useState, useEffect } from "react"
import { View, ScrollView, TouchableOpacity, Image, Animated, SafeAreaView, BackHandler } from "react-native"
import { Audio, type AVPlaybackSource } from "expo-av"
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Text } from "@/components/StyledText"
import { TranslatedText } from "@/components/translated-text"
import { LinearGradient } from "expo-linear-gradient"

export default function InstrumentsScreen() {
  const [sound, setSound] = useState<Audio.Sound | null>(null)
  const [selectedInstrument, setSelectedInstrument] = useState<{
    id: number
    name: string
    image: any
    description: string
    sound: any
    howToPlay: string
  } | null>(null)
  const [playingId, setPlayingId] = useState<number | null>(null)
  const pulseAnim = new Animated.Value(1)
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
      if (selectedInstrument) {
        // Close modal if open
        setSelectedInstrument(null)
        if (sound) {
          sound.stopAsync()
        }
        return true
      }
      router.back()
      return true
    })

    return () => backHandler.remove()
  }, [router, selectedInstrument, sound])

  const instruments = [
    {
      id: 1,
      name: "Engoma (Drums)",
      image: require("@/assets/images/engoma.png"),
      description:
        "The most important musical instruments in Buganda culture. Different types include the large Mujaguzo royal drums and the smaller Nankasa drums used in various ceremonies.",
      sound: require("@/assets/sounds/drums.mp3"),
      howToPlay:
        "Drums are played with hands or sticks, creating complex rhythms and patterns that communicate specific cultural meanings.",
    },
    {
      id: 2,
      name: "Endingidi (Tube Fiddle)",
      image: require("@/assets/images/endingidi.png"),
      description:
        "A one-stringed fiddle made from wood, with a membrane of lizard skin. It produces a unique sound that often accompanies storytelling and traditional songs.",
      sound: require("@/assets/sounds/fiddle.mp3"),
      howToPlay:
        "The player holds the instrument vertically, pressing the string with fingers of one hand while drawing a bow across it with the other hand.",
    },
    {
      id: 3,
      name: "Amadinda (Xylophone)",
      image: require("@/assets/images/amadinda.png"),
      description:
        "A large wooden xylophone with 12 logs laid across banana-stem supports. It's often played by multiple performers simultaneously.",
      sound: require("@/assets/sounds/xylophone.mp3"),
      howToPlay:
        "Players sit on opposite sides, striking the wooden keys with sticks to create interlocking melodies.",
    },
    {
      id: 4,
      name: "Ensasi (Shakers)",
      image: require("@/assets/images/ensasi.png"),
      description:
        "Rattles and shakers made from gourds filled with seeds or small stones, often attached to nets or strings for easy handling.",
      sound: require("@/assets/sounds/shakers.mp3"),
      howToPlay:
        "Shakers are held in the hands and shaken rhythmically to accompany other instruments or dance.",
    },
    {
      id: 5,
      name: "Entenga (Royal Drums)",
      image: require("@/assets/images/entenga.png"),
      description:
        "A set of 15 drums of different sizes arranged in a semicircle. Historically played only for the king of Buganda during special ceremonies.",
      sound: require("@/assets/sounds/drums.mp3"),
      howToPlay:
        "Multiple drummers play simultaneously, each responsible for specific drums in the set, creating complex polyrhythms.",
    },
  ]

  // Start pulsing animation when an instrument is playing
  useEffect(() => {
    if (playingId !== null) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      pulseAnim.setValue(1)
    }
  }, [playingId])

  async function playSound(audioFile: AVPlaybackSource, instrumentId: number | null) {
    // Stop previous sound if playing
    if (sound) {
      await sound.stopAsync()
      await sound.unloadAsync()
    }

    const { sound: newSound } = await Audio.Sound.createAsync(audioFile)
    setSound(newSound)
    setPlayingId(instrumentId)

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        setPlayingId(null)
      }
    })

    await newSound.playAsync()
  }

  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync()
        }
      : undefined
  }, [sound])

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
          Buganda Instruments
        </TranslatedText>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView className="flex-1 p-4">
        <Animated.View style={{ opacity: fadeAnim }}>
          <TranslatedText className="text-base mb-4 text-slate-700">
            Tap on an instrument to learn more, and press the play button to hear how it sounds! (scroll to the right to see more)
          </TranslatedText>

          {/* Horizontal instruments list */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
            className="flex-row mb-6"
          >
            {instruments.map((instrument) => (
              <Animated.View
                key={instrument.id}
                style={{
                  transform: [
                    {
                      scale: playingId === instrument.id ? pulseAnim : 1,
                    },
                  ],
                  marginRight: 16,
                  width: 260,
                  height: 240,
                }}
              >
                <TouchableOpacity
                  onPress={() => setSelectedInstrument(instrument)}
                  activeOpacity={0.7}
                  className="bg-white rounded-xl overflow-hidden shadow-sm border-2 border-indigo-100 h-full"
                >
                  <Image source={instrument.image} className="w-full h-28" resizeMode="cover" />

                  <View className="p-4 flex-1">
                    <View className="flex-row justify-between items-center">
                      <TranslatedText variant="bold" className="text-lg text-indigo-800 flex-1 mr-2">
                        {instrument.name}
                      </TranslatedText>
                      <TouchableOpacity
                        className={`p-2 rounded-full ${
                          playingId === instrument.id ? "bg-indigo-400" : "bg-indigo-600"
                        } shadow-sm`}
                        onPress={(e) => {
                          e.stopPropagation() // Prevent triggering parent's onPress
                          if (playingId === instrument.id) {
                            // Stop playing
                            if (sound) {
                              sound.stopAsync()
                              setPlayingId(null)
                            }
                          } else {
                            // Start playing
                            playSound(instrument.sound, instrument.id)
                          }
                        }}
                      >
                        <MaterialCommunityIcons
                          name={playingId === instrument.id ? "stop" : "play"}
                          size={22}
                          color="white"
                        />
                      </TouchableOpacity>
                    </View>

                    <TranslatedText className="text-slate-700 mt-2" numberOfLines={3}>
                      {instrument.description.substring(0, 70)}...
                    </TranslatedText>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>

      {/* Instrument Detail Modal */}
      {selectedInstrument && (
        <View className="absolute inset-0 bg-black/50 justify-center items-center p-4">
          <View
            className="relative bg-white  rounded-3xl overflow-hidden shadow-xl border-4 border-primary-200"
            style={{ maxHeight: "90%" }}
          >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
              <Image source={selectedInstrument.image} className="w-full h-48" resizeMode="cover" />

              <View className="px-5 pt-4">
                <TranslatedText variant="bold" className="text-xl text-primary-700 mb-2 text-center">
                  {selectedInstrument.name}
                </TranslatedText>

                {/* Description in a styled container */}
                <View className="bg-primary-50 w-full rounded-xl p-4 mb-4">
                  <TranslatedText className="text-base text-primary-700 leading-relaxed">
                    {selectedInstrument.description}
                  </TranslatedText>
                </View>

                <View className="bg-yellow-50 w-full rounded-xl p-4 mb-3 border border-yellow-100">
                  <TranslatedText variant="bold" className="text-primary-700 mb-1">
                    How to Play:
                  </TranslatedText>
                  <TranslatedText className="text-primary-700 leading-relaxed">
                    {selectedInstrument.howToPlay}
                  </TranslatedText>
                </View>
              </View>
              <View className="p-3 pt-0 flex-row justify-center items-center space-x-4">
                {/* Sound button */}
                <TouchableOpacity
                  className="bg-yellow-100 p-2.5 mr-3 rounded-full shadow-sm border-2 border-yellow-200 flex-row items-center"
                  onPress={() => playSound(selectedInstrument.sound, selectedInstrument.id)}
                >
                  <MaterialCommunityIcons name="volume-high" size={20} color="#7b5af0" />
                  <TranslatedText variant="medium" className="text-primary-600 ml-1.5">
                    Play Sound
                  </TranslatedText>
                </TouchableOpacity>

                {/* Close button */}
                <TouchableOpacity
                  className="bg-primary-500 py-2.5 px-6 rounded-full shadow-sm border-2 border-primary-400"
                  onPress={() => setSelectedInstrument(null)}
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
  )
}
