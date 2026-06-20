import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";

interface ComingSoonStateProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
}

export function ComingSoonState({
  title = "Coming soon",
  message = "This activity is being prepared for your learning language.",
  showBackButton = true,
}: ComingSoonStateProps) {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-50 items-center justify-center px-8">
      {showBackButton && (
        <TouchableOpacity
          className="absolute left-5 top-5 w-11 h-11 rounded-full bg-white items-center justify-center border border-slate-200 shadow-sm"
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={22} color="#6366f1" />
        </TouchableOpacity>
      )}

      <View className="w-20 h-20 rounded-full bg-indigo-100 items-center justify-center mb-5">
        <Ionicons name="sparkles-outline" size={34} color="#6366f1" />
      </View>
      <Text variant="bold" className="text-2xl text-slate-800 text-center mb-3">
        {title}
      </Text>
      <Text className="text-base text-slate-500 text-center max-w-md">
        {message}
      </Text>
    </SafeAreaView>
  );
}
