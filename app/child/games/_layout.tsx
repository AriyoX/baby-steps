import { Stack, useRouter } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

export default function GamesLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </>
  );
}