"use client"

import type React from "react"
import { createContext, useState, useContext, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { translations } from "@/lib/translations"

// Create a simple context
export const LanguageContext = createContext({
  isLuganda: false,
  toggleLanguage: () => {},
  translate: (text: string) => text,
})

// Provider component
export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [isLuganda, setIsLuganda] = useState(false)

  // Load saved preference on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem("isLuganda")
        if (savedLanguage === "true") {
          setIsLuganda(true)
          console.log("Loaded language preference: Luganda")
        } else {
          console.log("Loaded language preference: English")
        }
      } catch (error) {
        console.error("Failed to load language preference:", error)
      }
    }

    loadLanguage()
  }, [])

  // Toggle language function
  const toggleLanguage = () => {
    const newValue = !isLuganda
    setIsLuganda(newValue)
    console.log("Language toggled to:", newValue ? "Luganda" : "English")

    // Save preference
    AsyncStorage.setItem("isLuganda", newValue.toString()).catch((err) =>
      console.error("Failed to save language preference:", err),
    )
  }

  // Simple translate function using hardcoded translations
  const translate = (text: string): string => {
    if (!isLuganda || !text) return text

    // Add debug logging
    const translation = translations[text as keyof typeof translations] || text
    if (translations[text as keyof typeof translations]) {
      console.log(`Translation found for "${text}": "${translation}"`)
    } else {
      console.log(`No translation found for: "${text}"`)
    }

    // Return the translation if it exists, otherwise return the original text
    return translation
  }

  return (
    <LanguageContext.Provider value={{ isLuganda, toggleLanguage, translate }}>{children}</LanguageContext.Provider>
  )
}

// Custom hook
export const useLanguage = () => useContext(LanguageContext)
