import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const CHILD_ROUTE_ORIENTATION = "landscape_left" as const;

export default function GamesLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack 
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          orientation: CHILD_ROUTE_ORIENTATION,
        }}
      />
    </>
  );
}
