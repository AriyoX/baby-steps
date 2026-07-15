import { ImageBackground, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { Text } from "@/components/StyledText";

type LearningLanguageUnavailableStateProps = {
  languageName?: string;
  title?: string;
  message?: string;
  actionLabel: string;
  onAction: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  bottomClearance?: number;
};

export function LearningLanguageUnavailableState({
  languageName,
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  bottomClearance = 0,
}: LearningLanguageUnavailableStateProps) {
  const subject = languageName ? `${languageName} lessons` : "Lessons for your language";

  return (
    <ImageBackground
      source={require("@/assets/images/gameBackground.jpg")}
      className="flex-1 bg-cover"
    >
      <SafeAreaView
        className="flex-1"
        edges={["top", "bottom", "left", "right"]}
        style={{ backgroundColor: "rgba(2, 116, 187, 0.88)" }}
      >
        <ScrollView
          alwaysBounceVertical={false}
          contentContainerStyle={{
            alignItems: "center",
            flexGrow: 1,
            justifyContent: "center",
            paddingBottom: 24 + bottomClearance,
            paddingHorizontal: 24,
            paddingTop: 24,
          }}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          <View className="bg-white rounded-2xl border-2 border-accent-500 px-6 py-5 w-full max-w-md items-center shadow-md">
            <View className="w-20 h-20 rounded-full bg-primary-50 items-center justify-center mb-3 overflow-hidden">
              <BrandMark kind="mascot" width={48} height={66} />
            </View>
            <Text variant="bold" className="text-primary-700 text-2xl text-center mb-2">
              {title ?? `${subject} are coming soon!`}
            </Text>
            <Text className="text-neutral-600 text-base text-center leading-6 mb-5">
              {message ??
                "We are getting these Learning Hub lessons ready for you. Please come back soon."}
            </Text>
            <View className="flex-row items-center justify-center flex-wrap">
              <TouchableOpacity
                className="bg-primary-600 rounded-full px-6 py-3 m-1"
                onPress={onAction}
                accessibilityRole="button"
                accessibilityLabel={actionLabel}
              >
                <Text variant="bold" className="text-white text-base">
                  {actionLabel}
                </Text>
              </TouchableOpacity>
              {secondaryActionLabel && onSecondaryAction ? (
                <TouchableOpacity
                  className="bg-white border-2 border-primary-600 rounded-full px-6 py-3 m-1"
                  onPress={onSecondaryAction}
                  accessibilityRole="button"
                  accessibilityLabel={secondaryActionLabel}
                >
                  <Text variant="bold" className="text-primary-700 text-base">
                    {secondaryActionLabel}
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}
