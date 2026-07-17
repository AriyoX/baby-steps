import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { BrandMark } from "@/components/brand/BrandMark";
import { brandColors } from "@/constants/Brand";

interface ComingSoonStateProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  onRetry?: () => void;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
}

export function ComingSoonState({
  title = "Coming soon",
  message = "This activity is being prepared for your learning language.",
  showBackButton = true,
  onRetry,
  actionLabel = "Try again",
  actionAccessibilityLabel = "Retry loading content",
}: ComingSoonStateProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      {showBackButton && (
        <TouchableOpacity
          className="absolute left-5 top-5 w-11 h-11 rounded-full bg-white items-center justify-center border border-muted-200 shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
        </TouchableOpacity>
      )}

      <View className="w-24 h-24 rounded-full bg-white items-center justify-center mb-5 border-2 border-accent-200 shadow-sm overflow-hidden">
        <BrandMark kind="mascot" width={58} height={78} />
      </View>
      <Text variant="display" className="text-3xl text-primary-700 text-center mb-3">
        {title}
      </Text>
      <Text className="text-base text-neutral-600 text-center max-w-md">
        {message}
      </Text>
      {onRetry ? (
        <TouchableOpacity
          className="mt-6 rounded-full bg-primary-600 px-6 py-3"
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel}
        >
          <Text variant="bold" className="text-white">
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}
