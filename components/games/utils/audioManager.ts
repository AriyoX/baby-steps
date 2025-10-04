// audioManager.ts
import { Audio } from "expo-av"
import type { WordItem } from "./lugandawords"

// Define a type for the audio files mapping
type AudioFiles = {
  [key: string]: any // Add index signature to allow string indexing
  // Word pronunciations
  "Oli otya": any
  Bulungi: any
  Webale: any
  Ssebo: any
  Omukazi: any
  Omusajja: any
  Omwana: any
  Abawala: any
  Amazzi: any
  Emmere: any
  Ennyumba: any
  Ekitabo: any
  Ekibuga: any
  Ekyalo: any
  Essomero: any
  Eddwaliro: any
  Okukyala: any
  Okuyiga: any
  Okulya: any
  Okunywa: any
  Bubi: any
  Kinene: any
  Kitono: any
  Eggulu: any
  Emmunyeenye: any
  Omusana: any
  Omwezi: any
  Olukalu: any
  Ekibira: any
  Enyanja: any
  Olusozi: any
  Leero: any
  Enkya: any
  Jjo: any
  Essawa: any
  "Nsanyuse okukulaba": any
  "Tewali mutawaana": any
  Nkwagala: any
  Simanyi: any

  // Game sounds
  correct: any
  wrong: any
  complete: any
  backgroundMusic: any
}

// Audio files mapping
export const AUDIO_FILES: AudioFiles = {
  // Word pronunciations
  "Oli otya": require("@/assets/audio/oli-otya.m4a"),
  Bulungi: require("@/assets/audio/Bulungi.mp3"),
  Webale: require("@/assets/audio/webale.m4a"),
  Ssebo: require("@/assets/audio/ssebo.m4a"),
  Omukazi: require("@/assets/audio/omukazi.m4a"),
  Omusajja: require("@/assets/audio/omusajja.m4a"),
  Omwana: require("@/assets/audio/omwana.m4a"),
  Abawala: require("@/assets/audio/abawala.m4a"),
  Amazzi: require("@/assets/audio/Amazzi.mp3"),
  Emmere: require("@/assets/audio/Emmere.mp3"),
  Ennyumba: require("@/assets/audio/Ennyumba.mp3"),
  Ekitabo: require("@/assets/audio/Ekitabo.mp3"),
  Ekibuga: require("@/assets/audio/Ekibuga.mp3"),
  Ekyalo: require("@/assets/audio/Ekyalo.mp3"),
  Essomero: require("@/assets/audio/Essomero.mp3"),
  Eddwaliro: require("@/assets/audio/Eddwaliro.mp3"),
  Okukyala: require("@/assets/audio/Okukyala.mp3"),
  Okuyiga: require("@/assets/audio/Okuyiga.mp3"),
  Okulya: require("@/assets/audio/Okulya.mp3"),
  Okunywa: require("@/assets/audio/Okunywa.mp3"),
  Bubi: require("@/assets/audio/Bubi.mp3"),
  Kinene: require("@/assets/audio/Kinene.mp3"),
  Kitono: require("@/assets/audio/Kitono.mp3"),
  Eggulu: require("@/assets/audio/Eggulu.mp3"),
  Emmunyeenye: require("@/assets/audio/Emmunyeenye.mp3"),
  Omusana: require("@/assets/audio/Omusana.mp3"),
  Omwezi: require("@/assets/audio/Omwezi.mp3"),
  Olukalu: require("@/assets/audio/Olukalu.mp3"),
  Ekibira: require("@/assets/audio/Ekibira.mp3"),
  Enyanja: require("@/assets/audio/Enyanja.mp3"),
  Olusozi: require("@/assets/audio/Olusozi.mp3"),
  Leero: require("@/assets/audio/Leero.mp3"),
  Enkya: require("@/assets/audio/Enkya.mp3"),
  Jjo: require("@/assets/audio/Jjo.mp3"),
  Essawa: require("@/assets/audio/Essawa.mp3"),
  "Nsanyuse okukulaba": require("@/assets/audio/Nsanyuse-okulaba.mp3"),
  "Tewali mutawaana": require("@/assets/audio/Tewali-mutawana.mp3"),
  Nkwagala: require("@/assets/audio/Nkwagala.mp3"),
  Simanyi: require("@/assets/audio/Simanyi.mp3"),

  // Game sounds
  correct: require("@/assets/audio/correct.mp3"),
  wrong: require("@/assets/audio/wrong.mp3"),
  complete: require("@/assets/audio/complete.mp3"),
  backgroundMusic: require("@/assets/audio/background-music.mp3"),
}

// Get the appropriate audio file for a word
export const getAudioForWord = (lugandaWord: string): any => {
  // Use a safer approach with optional chaining and nullish coalescing
  return AUDIO_FILES[lugandaWord] ?? AUDIO_FILES.correct
}

// Play a word's audio
export const playWordAudio = async (word: WordItem, currentSound?: Audio.Sound): Promise<Audio.Sound> => {
  try {
    // Unload previous sound if it exists
    if (currentSound) {
      await currentSound.unloadAsync()
    }

    // Get the audio file for this word
    const audioFile = getAudioForWord(word.luganda)

    // Load and play the sound
    const { sound: newSound } = await Audio.Sound.createAsync(audioFile)
    await newSound.playAsync()

    return newSound
  } catch (error) {
    console.error("Error playing word audio:", error)
    throw error
  }
}

// Load game sounds (correct, wrong, etc.)
export const loadGameSounds = async (): Promise<{
  correctSound: Audio.Sound
  wrongSound: Audio.Sound
}> => {
  try {
    const correctSoundObject = new Audio.Sound()
    await correctSoundObject.loadAsync(AUDIO_FILES.correct)

    const wrongSoundObject = new Audio.Sound()
    await wrongSoundObject.loadAsync(AUDIO_FILES.wrong)

    return {
      correctSound: correctSoundObject,
      wrongSound: wrongSoundObject,
    }
  } catch (error) {
    console.error("Error loading game sounds:", error)
    throw error
  }
}
