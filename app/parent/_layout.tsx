import { Stack } from "expo-router";
import { LanguageProvider } from "@/context/language-context";

export default function RootLayout() {
  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-child"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="child-progress"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </LanguageProvider>
  );
}
