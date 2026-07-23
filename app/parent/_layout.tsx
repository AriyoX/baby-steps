import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { LanguageProvider } from "@/context/language-context";
import { useChild } from "@/context/ChildContext";

export const shouldGateParentRoute = (activeChildId?: string | null): boolean =>
  Boolean(activeChildId);

export default function RootLayout() {
  const router = useRouter();
  const { activeChild, isRestoringActiveChild, requiresParentUnlock } = useChild();

  useEffect(() => {
    if (
      !isRestoringActiveChild &&
      (shouldGateParentRoute(activeChild?.id) || requiresParentUnlock)
    ) {
      router.replace("/child/parent-gate");
    }
  }, [activeChild?.id, isRestoringActiveChild, requiresParentUnlock, router]);

  if (
    isRestoringActiveChild ||
    shouldGateParentRoute(activeChild?.id) ||
    requiresParentUnlock
  ) {
    return null;
  }

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false, orientation: "portrait_up" }}>
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
      </Stack>
    </LanguageProvider>
  );
}
