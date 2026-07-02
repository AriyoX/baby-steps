import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/StyledText";

interface SettingsRowProps {
  title: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  onPress: () => void;
  destructive?: boolean;
  last?: boolean;
  disabled?: boolean;
}

const getIconBackground = (color: string): string => `${color}18`;

export function SettingsRow({
  title,
  description,
  icon,
  iconColor,
  onPress,
  destructive = false,
  last = false,
  disabled = false,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      className={`flex-row items-center px-4 py-4 ${!last ? "border-b border-gray-100" : ""}`}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: getIconBackground(iconColor) }}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View className="flex-1 pr-3">
        <Text
          variant="medium"
          className={destructive ? "text-red-700 text-base" : "text-gray-800 text-base"}
        >
          {title}
        </Text>
        {description ? (
          <Text className="text-gray-500 text-sm mt-0.5 leading-5">{description}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
    </TouchableOpacity>
  );
}
