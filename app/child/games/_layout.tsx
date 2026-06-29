import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function GamesLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          orientation: "landscape_left",
        }}
      />
    </>
  );
}
