import type { ReactNode } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";

interface SettingsScaffoldProps {
  title: string;
  children: ReactNode;
  showBrandIcon?: boolean;
  scroll?: boolean;
}

export function SettingsScaffold({
  title,
  children,
  showBrandIcon = false,
  scroll = true,
}: SettingsScaffoldProps) {
  const router = useRouter();
  const content = scroll ? (
    <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 32 }}>
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 px-4">{children}</View>
  );

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-muted-200 bg-white">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={brandColors.charcoalBlack} />
          </TouchableOpacity>
          {showBrandIcon ? (
            <BrandMark kind="icon" width={32} height={32} containerStyle={{ marginRight: 10 }} />
          ) : null}
          <Text variant="bold" className="text-xl text-neutral-800">
            {title}
          </Text>
        </View>
        {content}
      </SafeAreaView>
    </>
  );
}
