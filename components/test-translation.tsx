"use client"

import { useState } from "react"
import { View, Button, TextInput, ActivityIndicator } from "react-native"
import { Text } from "@/components/StyledText"
import { translateText } from "@/lib/sunbirdApi"

export const TestTranslation = () => {
  const [inputText, setInputText] = useState("Hello, how are you?")
  const [translatedText, setTranslatedText] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTranslate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Using "eng" instead of "en" for the source language
      const result = await translateText(inputText, "eng", "lug")
      console.log("Test translation result:", JSON.stringify(result))

      // Try to extract the translated text from different possible response structures
      const translated =
        result.translated_text ||
        (result.result && result.result.translated_text) ||
        (result.data && result.data.translated_text)

      if (translated) {
        setTranslatedText(translated)
      } else {
        setError("Could not find translated text in API response")
        console.error("API response structure:", result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View className="p-4 bg-white rounded-lg border border-gray-200 mb-4">
      <Text variant="bold" className="text-lg mb-2">
        Test Sunbird Translation API
      </Text>

      <TextInput
        value={inputText}
        onChangeText={setInputText}
        className="border border-gray-300 rounded p-2 mb-3"
        placeholder="Enter text to translate"
      />

      <Button title="Translate to Luganda" onPress={handleTranslate} disabled={isLoading} />

      {isLoading && (
        <View className="my-2 items-center">
          <ActivityIndicator size="small" color="#7b5af0" />
          <Text className="text-sm text-gray-500 mt-1">Translating...</Text>
        </View>
      )}

      {error && (
        <View className="my-2 p-2 bg-red-50 border border-red-200 rounded">
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}

      {translatedText && (
        <View className="mt-3">
          <Text variant="medium" className="mb-1">
            Translation:
          </Text>
          <View className="p-2 bg-purple-50 rounded">
            <Text>{translatedText}</Text>
          </View>
        </View>
      )}
    </View>
  )
}