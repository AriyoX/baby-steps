import { UserProvider } from "@/context/UserContext"
import { Stack } from "expo-router"
import { LanguageProvider } from "@/context/language-context"

export default function OnboardingLayout() {
  return (
    <UserProvider>
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="gender"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="age"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="reason"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="activities"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="ourPriority"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="knowledge"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="mindCapacity"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="final"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </LanguageProvider>
    </UserProvider>
  )
}
