import { Stack, usePathname, useRouter } from "expo-router";
import { useEffect } from "react";
import { LanguageProvider } from "@/context/language-context";
import { useChild } from "@/context/ChildContext";

export const shouldGateParentRoute = (
  routePathname: string,
  activeChildId?: string | null,
  requiresParentUnlock = false,
  isEnteringChildMode = false,
): boolean =>
  (routePathname === "/parent" || routePathname.startsWith("/parent/")) &&
  (requiresParentUnlock ||
    (Boolean(activeChildId) && !isEnteringChildMode));

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    activeChild,
    isEnteringChildMode,
    isRestoringActiveChild,
    requiresParentUnlock,
  } = useChild();
  const shouldGateCurrentRoute = shouldGateParentRoute(
    pathname,
    activeChild?.id,
    requiresParentUnlock,
    isEnteringChildMode,
  );
  const shouldHideParentRoutes =
    requiresParentUnlock ||
    (Boolean(activeChild?.id) && !isEnteringChildMode);

  useEffect(() => {
    // Parent layouts can remain mounted underneath a child route. Only the
    // currently visible parent route may initiate the gate redirect.
    if (!isRestoringActiveChild && shouldGateCurrentRoute) {
      router.replace("/child/parent-gate");
    }
  }, [
    isRestoringActiveChild,
    router,
    shouldGateCurrentRoute,
  ]);

  if (isRestoringActiveChild || shouldHideParentRoutes) {
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
