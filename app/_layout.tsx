"use client";

import { Stack } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { AppState, type AppStateStatus } from "react-native"; // Add AppState
import type { Session } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, usePathname } from "expo-router";
import { useFonts } from "expo-font";
import { SplashScreen } from "expo-router";
import { Audio } from "expo-av";
import "@/global.css";
import { ChildProvider } from '@/context/ChildContext';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMusicInitialized = useRef(false);
  const appState = useRef(AppState.currentState); // Track app state
  const router = useRouter();
  const pathname = usePathname();

  // Use the useFonts hook instead of loadAsync
  const [fontsLoaded] = useFonts({
    "Atma-Bold": require("../assets/fonts/Atma-Bold.ttf"),
    "Atma-Light": require("../assets/fonts/Atma-Light.ttf"),
    "Atma-Medium": require("../assets/fonts/Atma-Medium.ttf"),
    "Atma-Regular": require("../assets/fonts/Atma-Regular.ttf"),
    "Atma-SemiBold": require("../assets/fonts/Atma-SemiBold.ttf"),
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
  }, [isLoading, fontsLoaded, showOnboarding, session, pathname]);

  // Return null until everything is ready
  if (!fontsLoaded || isLoading) {
    return null; // This keeps the splash screen visible
  }

  return (
    <ChildProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: "Atma-Medium" }, // Use Atma for headers
          headerShown: false, // Set headerShown false globally
        }}
      >
        <Stack.Screen name="index" options={{ gestureEnabled: false }} />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="child-list" />
        <Stack.Screen name="parent" />
      </Stack>
    </ChildProvider>
  );
}
