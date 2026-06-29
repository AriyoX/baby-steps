"use client";

import { SplashScreen, Stack, usePathname, useRouter } from "expo-router";
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { AppState, type AppStateStatus } from "react-native"; // Add AppState
import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { Audio } from "expo-av";
import * as ScreenOrientation from "expo-screen-orientation";
import "@/global.css";
import { ChildProvider } from '@/context/ChildContext';

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
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMusicInitialized = useRef(false);
  const appState = useRef(AppState.currentState); // Track app state
  const pathnameRef = useRef("/");
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
      const value = await AsyncStorage.getItem("@onboarding_completed");
      setShowOnboarding(value !== "true");
    } catch (error) {
      console.error("Failed to get onboarding status", error);
      setShowOnboarding(true);
    }
  };

  // Audio setup for playing background music
  const playBackgroundMusic = async () => {
    // Only initialize music if it hasn't been initialized yet
    if (isMusicInitialized.current) return;

    try {
      // Configure audio mode first
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false, // Changed to false to stop in background
        shouldDuckAndroid: true, // Lower volume when notifications occur
      });

      const { sound } = await Audio.Sound.createAsync(
        require("../assets/audio/background-music.mp3"),
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0.2, // Set volume during creation
        }
      );

      // Store the sound in the ref
      soundRef.current = sound;
      isMusicInitialized.current = true;

      // Add status update listener to handle interruptions
      sound.setOnPlaybackStatusUpdate((status) => {
        if (
          status.isLoaded &&
          !status.isPlaying &&
          isMusicInitialized.current &&
          appState.current === "active" // Only auto-restart if app is active
        ) {
          // If music stops unexpectedly but should be playing, restart it
          sound.playAsync();
        }
      });

      console.log("Background music started successfully");
    } catch (error) {
      console.error("Error playing background music:", error);
    }
  };

  // Handle app state changes
  const handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      // App has come to the foreground
      console.log("App has come to the foreground!");
      // Resume audio if it was initialized before
      if (isMusicInitialized.current && soundRef.current) {
        try {
          await soundRef.current.playAsync();
          console.log("Background music resumed");
        } catch (error) {
          console.error("Error resuming background music:", error);
        }
      }
    } else if (
      appState.current === "active" &&
      nextAppState.match(/inactive|background/)
    ) {
      // App has gone to the background
      console.log("App has gone to the background!");
      // Pause audio
      if (soundRef.current) {
        try {
          await soundRef.current.pauseAsync();
          console.log("Background music paused");
        } catch (error) {
          console.error("Error pausing background music:", error);
        }
      }
    }

    // Update the AppState
    appState.current = nextAppState;
  };

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    const initApp = async () => {
      await checkOnboardingStatus();

      // Check Supabase session
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      setIsLoading(false);
    };

    initApp();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Set up AppState event listener
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Cleanup subscription
    return () => {
      data.subscription.unsubscribe();
      subscription.remove(); // Remove AppState listener
    };
  }, []);

  // Cleanup sound when component unmounts
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
        isMusicInitialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded && !isLoading) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, isLoading]);

  // Start playing the background music when the component is ready
  useEffect(() => {
    if (!isLoading && fontsLoaded && !isMusicInitialized.current) {
      playBackgroundMusic(); // Start background music only once
    }
  }, [isLoading, fontsLoaded]);

  // Handle routing based on authentication and onboarding state
  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    // Only redirect if we're on the root ("/") to avoid redirect loops
    if (pathname === "/") {
      if (showOnboarding) {
        router.replace("/");
      } else if (session) {
        router.replace("/parent");
      } else {
        router.replace("/login");
      }
    }
  }, [isLoading, fontsLoaded, showOnboarding, session, pathname, router]);

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

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    void applyRouteOrientation(pathname, "route change");
  }, [applyRouteOrientation, isLoading, fontsLoaded, pathname]);

  useEffect(() => {
    if (isLoading || !fontsLoaded) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        void applyRouteOrientation(pathnameRef.current, "app resume", true);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [applyRouteOrientation, isLoading, fontsLoaded]);

  // Return null until everything is ready
  if (!fontsLoaded || isLoading) {
    return null; // This keeps the splash screen visible
  }

  return (
    <ChildProvider>
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
        <Stack.Screen name="forgot-password" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
        <Stack.Screen name="reset-password" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
        <Stack.Screen name="child-list" options={{ orientation: ADULT_ROUTE_ORIENTATION }} />
        <Stack.Screen name="parent" options={{ orientation: ADULT_ROUTE_ORIENTATION, animation: "none" }} />
        <Stack.Screen name="child" options={{ orientation: CHILD_ROUTE_ORIENTATION, animation: "none" }} />
      </Stack>
    </ChildProvider>
  );
}
