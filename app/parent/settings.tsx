"use client";

import { useCallback, useMemo, useRef } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { BrandMark } from "@/components/brand/BrandMark";
import {
  GameTour,
  GameTourProvider,
  TourTarget,
  useGameTour,
} from "@/components/games/GameTour";
import { Text } from "@/components/StyledText";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { brandColors } from "@/constants/Brand";
import { useParentProfile } from "@/context/ParentProfileContext";
import { SETTINGS_SECTIONS } from "@/lib/settingsOptions";
import { getAppRuntimeMetadata } from "@/lib/appMetadata";
import {
  PARENT_SCREEN_TOUR_POSITIONING,
  PARENT_SETTINGS_TOUR_STEPS,
} from "@/lib/parentScreenTours";

const SETTINGS_SECTION_TOUR_IDS = [
  "parent-settings-family",
  "parent-settings-preferences",
  "parent-settings-support",
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { profile } = useParentProfile();
  const appMetadata = getAppRuntimeMetadata();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsetsRef = useRef<Record<string, number>>({});
  const settingsTour = useGameTour(
    "parent-settings",
    profile?.id,
    Boolean(profile?.id),
  );
  const prepareTourTarget = useCallback((stepId: string) => {
    scrollRef.current?.scrollTo({
      animated: false,
      y: Math.max(0, (sectionOffsetsRef.current[stepId] ?? 0) - 12),
    });
  }, []);
  const settingsTourSteps = useMemo(
    () =>
      PARENT_SETTINGS_TOUR_STEPS.map((step) => ({
        ...step,
        prepareTarget: () => prepareTourTarget(step.id),
      })),
    [prepareTourTarget],
  );

  return (
    <GameTourProvider>
      <>
        <SettingsScaffold
          headerAction={
            <TouchableOpacity
              accessibilityLabel="Show the Settings guide"
              accessibilityRole="button"
              className="h-10 w-10 items-center justify-center rounded-full bg-primary-50"
              onPress={settingsTour.open}
            >
              <Ionicons
                color={brandColors.victoriaBlue}
                name="help-circle-outline"
                size={23}
              />
            </TouchableOpacity>
          }
          scrollRef={scrollRef}
          showBrandIcon
          title="Settings"
        >
          <View className="items-center py-6">
            <View className="w-24 h-24 rounded-full bg-white border border-gray-100 shadow-sm items-center justify-center overflow-hidden">
              <BrandMark kind="icon" width={82} height={82} />
            </View>
            <Text variant="bold" className="text-xl text-gray-800 mt-3">
              Baby Steps
            </Text>
            <Text className="text-gray-500 mt-1">Family settings</Text>
          </View>

          {SETTINGS_SECTIONS.map((section, sectionIndex) => {
            const stepId = PARENT_SETTINGS_TOUR_STEPS[sectionIndex]?.id;
            const targetId = SETTINGS_SECTION_TOUR_IDS[sectionIndex];

            return (
              <TourTarget key={section.title} id={targetId}>
                <View
                  className="mb-5"
                  onLayout={({ nativeEvent }) => {
                    if (stepId) {
                      sectionOffsetsRef.current[stepId] = nativeEvent.layout.y;
                    }
                  }}
                >
                  <Text
                    variant="medium"
                    className="text-gray-500 text-sm uppercase tracking-wider mb-2 px-1"
                  >
                    {section.title}
                  </Text>
                  <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {section.entries.map((entry, index) => (
                      <SettingsRow
                        key={entry.title}
                        title={entry.title}
                        description={entry.description}
                        icon={entry.icon as any}
                        iconColor={entry.iconColor}
                        onPress={() => router.push(entry.route as any)}
                        last={index === section.entries.length - 1}
                      />
                    ))}
                  </View>
                </View>
              </TourTarget>
            );
          })}

          <View className="py-6 items-center">
            <Text className="text-gray-400 text-sm">
              Baby Steps v{appMetadata.version}
            </Text>
          </View>
        </SettingsScaffold>
        <GameTour
          finishLabel="Done"
          onComplete={settingsTour.complete}
          onDismiss={settingsTour.dismiss}
          onUnavailable={settingsTour.close}
          positioning={PARENT_SCREEN_TOUR_POSITIONING}
          steps={settingsTourSteps}
          visible={settingsTour.visible}
        />
      </>
    </GameTourProvider>
  );
}
