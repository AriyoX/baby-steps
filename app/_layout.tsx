"use client";

import { SplashScreen, Stack, usePathname, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AppState, View } from "react-native";
import type { Session } from "@supabase/supabase-js";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import * as ScreenOrientation from "expo-screen-orientation";
import {
  getAccountDeletionState,
  isAccountDeletionBlockingNormalAccess,
  type AccountDeletionState,
} from "@/lib/accountManagement";
import { AnimatedSplashTransition } from "@/components/brand/AnimatedSplashTransition";
import { rememberAuthRedirectUrl } from "@/lib/authRedirectEvents";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import "@/global.css";
import { ChildProvider } from '@/context/ChildContext';
import { AudioProvider } from "@/context/AudioContext";
import {
  NetworkStatusNotice,
  shouldShowPersistentNetworkBanner,
} from "@/components/common/NetworkStatusNotice";
import {
  configureNotificationPresentation,
  observeNotificationOpens,
  syncRecurringRemindersIfEnabled,
} from "@/lib/notifications";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const ADULT_ROUTE_ORIENTATION = "portrait_up" as const;
const CHILD_ROUTE_ORIENTATION = "landscape_left" as const;
const ADULT_ORIENTATION_LOCK = ScreenOrientation.OrientationLock.PORTRAIT_UP;
const CHILD_ORIENTATION_LOCK = ScreenOrientation.OrientationLock.LANDSCAPE_LEFT;
type RouteOrientationMode = "adult" | "child";

const getRouteOrientationMode = (routePathname: string): RouteOrientationMode =>
  routePathname.startsWith("/child") ? "child" : "adult";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountStateLoading, setIsAccountStateLoading] = useState(false);
  const [showSplashTransition, setShowSplashTransition] = useState(true);
  const [accountDeletionState, setAccountDeletionState] =
    useState<AccountDeletionState | null>(null);
  const pathnameRef = useRef("/");
  const blockedRouteRefreshPathRef = useRef<string | null>(null);
  const lastRequestedOrientationMode = useRef<RouteOrientationMode | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [fontsLoaded] = useFonts({
  "SuperChips": require("../assets/fonts/SuperChips.ttf"),
  "Quicksand-Light": require("../assets/fonts/Quicksand-Light.ttf"),
  "Quicksand-Regular": require("../assets/fonts/Quicksand-Regular.ttf"),
  "Quicksand-Medium": require("../assets/fonts/Quicksand-Medium.ttf"),
  "Quicksand-SemiBold": require("../assets/fonts/Quicksand-SemiBold.ttf"),
  "Quicksand-Bold": require("../assets/fonts/Quicksand-Bold.ttf"),
});

  // Add a function to check onboarding status
  const checkOnboardingStatus = async () => {
    try {
      setShowOnboarding(!(await hasCompletedOnboarding()));
    } catch (error) {
      console.error("Failed to get onboarding status", error);
      setShowOnboarding(true);
    }
  };

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    configureNotificationPresentation();
    void syncRecurringRemindersIfEnabled().catch((error) => {
      console.warn("Could not sync learning reminders:", error);
    });

    return observeNotificationOpens((url) => {
      router.push(url as any);
    });
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    void Linking.getInitialURL().then((url) => {
      if (isMounted) rememberAuthRedirectUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      rememberAuthRedirectUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const loadAccountDeletionState = useCallback(async (currentSession: Session | null) => {
    if (!currentSession) {
      setAccountDeletionState(null);
      setIsAccountStateLoading(false);
      return;
    }

    setIsAccountStateLoading(true);
    try {
      const state = await getAccountDeletionState(currentSession.user.id);
      setAccountDeletionState(state);
    } catch (error) {
      console.error("Could not load account deletion state:", error);
      setAccountDeletionState(null);
    } finally {
      setIsAccountStateLoading(false);
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await checkOnboardingStatus();

      // Check Supabase session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadAccountDeletionState(data.session);

      setIsLoading(false);
    };

    initApp();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      void loadAccountDeletionState(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadAccountDeletionState]);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Handle routing based on authentication and onboarding state
  useEffect(() => {
    if (isLoading || isAccountStateLoading || !fontsLoaded) return;

    const isAccountReactivationRoute = pathname === "/account-reactivation";
    const accountAccessBlocked = isAccountDeletionBlockingNormalAccess(accountDeletionState);

    if (!session && isAccountReactivationRoute) {
      router.replace("/login");
      return;
    }

    if (session && accountAccessBlocked && !isAccountReactivationRoute) {
      if (blockedRouteRefreshPathRef.current !== pathname) {
        blockedRouteRefreshPathRef.current = pathname;
        void loadAccountDeletionState(session);
        return;
      }

      router.replace("/account-reactivation" as any);
      return;
    }

    blockedRouteRefreshPathRef.current = null;

    if (session && !accountAccessBlocked && isAccountReactivationRoute) {
      router.replace("/parent");
      return;
    }

    // Only redirect if we're on the root ("/") to avoid redirect loops
    if (pathname === "/") {
      if (session) {
        router.replace(accountAccessBlocked ? ("/account-reactivation" as any) : "/parent");
      } else if (showOnboarding === false) {
        router.replace("/login");
      }
    }
  }, [
    accountDeletionState,
    fontsLoaded,
    isAccountStateLoading,
    isLoading,
    loadAccountDeletionState,
    pathname,
    router,
    session,
    showOnboarding,
  ]);

  const applyRouteOrientation = useCallback(async (routePathname: string, reason: string, force = false) => {
    const orientationMode = getRouteOrientationMode(routePathname);

    if (!force && lastRequestedOrientationMode.current === orientationMode) {
      return;
    }

    const targetLock = orientationMode === "child" ? CHILD_ORIENTATION_LOCK : ADULT_ORIENTATION_LOCK;
    const targetLabel = orientationMode === "child" ? CHILD_ROUTE_ORIENTATION : ADULT_ROUTE_ORIENTATION;

    try {
      const currentLock = await ScreenOrientation.getOrientationLockAsync();
      if (force || currentLock !== targetLock) {
        await ScreenOrientation.lockAsync(targetLock);
      }
      lastRequestedOrientationMode.current = orientationMode;

      if (__DEV__) {
        console.log(`[orientation] ${reason}: ${routePathname} -> ${targetLabel}`);
      }
    } catch (error) {
      console.error(`Failed to lock ${routePathname} to ${targetLabel}:`, error);
    }
  }, []);

  const handleSplashTransitionDone = useCallback(() => {
    setShowSplashTransition(false);
  }, []);

  useEffect(() => {
    if (isLoading || isAccountStateLoading || !fontsLoaded) return;

    void applyRouteOrientation(pathname, "route change");
  }, [applyRouteOrientation, fontsLoaded, isAccountStateLoading, isLoading, pathname]);

  useEffect(() => {
    if (isLoading || isAccountStateLoading || !fontsLoaded) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void applyRouteOrientation(pathnameRef.current, "app resume", true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [applyRouteOrientation, fontsLoaded, isAccountStateLoading, isLoading]);

  // Return null until everything is ready
  if (!fontsLoaded || isLoading) {
    return null; // This keeps the splash screen visible
  }

  return (
    <AudioProvider>
      <ChildProvider>
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              animation: "fade_from_bottom",
              headerTitleStyle: { fontFamily: "Quicksand-Medium" },
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" options={{ gestureEnabled: false, orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="login" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="signup" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="notification-permission" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="check-email" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="forgot-password" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="auth/callback" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="reset-password" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="account-reactivation" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="child-list" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
            <Stack.Screen name="parent" options={{ orientation: ADULT_ROUTE_ORIENTATION, animation: "none" }} />
            <Stack.Screen name="child" options={{ orientation: CHILD_ROUTE_ORIENTATION, animation: "none" }} />
          </Stack>
          {showSplashTransition ? (
            <AnimatedSplashTransition onDone={handleSplashTransitionDone} />
          ) : null}
          <NetworkStatusNotice
            ready={!showSplashTransition}
            showPersistentBanner={shouldShowPersistentNetworkBanner(pathname)}
          />
        </View>
      </ChildProvider>
    </AudioProvider>
  );
}
