import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsScaffold } from "@/components/settings/SettingsScaffold";
import { Text } from "@/components/StyledText";

interface PlaceholderSettingsScreenProps {
  title: string;
  description: string;
}

export function PlaceholderSettingsScreen({
  title,
  description,
}: PlaceholderSettingsScreenProps) {
  return (
    <SettingsScaffold title={title}>
      <View className="mt-6 bg-white rounded-xl border border-gray-100 p-5">
        <View className="w-12 h-12 rounded-full bg-blue-50 items-center justify-center mb-4">
          <Ionicons name="construct-outline" size={24} color="#2563EB" />
        </View>
        <Text variant="bold" className="text-lg text-gray-800 mb-2">
          {title}
        </Text>
        <Text className="text-gray-600 leading-6">{description}</Text>
      </View>
    </SettingsScaffold>
  );
}
