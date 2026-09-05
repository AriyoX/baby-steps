import type { ReactNode, RefObject } from "react";
import { ScrollView, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";
import { brandColors } from "@/constants/Brand";
import { getParentScreenLayout } from "@/lib/responsiveLayout";

interface SettingsScaffoldProps {
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
  scrollRef?: RefObject<ScrollView | null>;
  showBrandIcon?: boolean;
  scroll?: boolean;
  contentMaxWidth?: number;
}

export function SettingsScaffold({
  title,
  children,
  headerAction,
  scrollRef,
  showBrandIcon = false,
  scroll = true,
  contentMaxWidth,
}: SettingsScaffoldProps) {
  const { height, width } = useWindowDimensions();
  const responsiveLayout = getParentScreenLayout(width, height);
  const resolvedContentMaxWidth = contentMaxWidth ?? responsiveLayout.readableMaxWidth;
  const router = useRouter();
  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      className="flex-1"
      contentContainerStyle={{ alignItems: "center", paddingBottom: 32 }}
    >
      <View
        style={{
          maxWidth: resolvedContentMaxWidth,
          paddingHorizontal: responsiveLayout.contentPadding,
          width: "100%",
        }}
      >
        {children}
      </View>
    </ScrollView>
  ) : (
    <View className="flex-1 items-center">
      <View
        className="flex-1"
        style={{
          maxWidth: resolvedContentMaxWidth,
          paddingHorizontal: responsiveLayout.contentPadding,
          width: "100%",
        }}
      >
        {children}
      </View>
    </View>
  );

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-background" edges={["top", "left", "right"]}>
        <View className="border-b border-muted-200 bg-white">
        <View
          className="flex-row items-center py-3"
          style={{
            alignSelf: "center",
            maxWidth: resolvedContentMaxWidth,
            paddingHorizontal: responsiveLayout.contentPadding,
            width: "100%",
          }}
        >
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
          <Text variant="bold" className="flex-1 text-xl text-neutral-800">
            {title}
          </Text>
          {headerAction}
        </View>
        </View>
        {content}
      </SafeAreaView>
    </>
  );
}
