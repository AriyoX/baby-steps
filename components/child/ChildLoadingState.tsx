import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import type { ComponentProps } from "react";
import {
  ActivityIndicator,
  type StyleProp,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "@/components/StyledText";
import { BrandMark } from "@/components/brand/BrandMark";
import { brandColors, brandShadows } from "@/constants/Brand";

type LoadingIcon = ComponentProps<typeof Ionicons>["name"];

interface ChildLoadingStateProps {
  title: string;
  message?: string;
  icon?: LoadingIcon;
  onBack?: () => void;
  backLabel?: string;
  testID?: string;
}

interface ChildLoadingCardProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export function ChildLoadingState({
  title,
  message = "Getting everything ready for you.",
  icon = "sparkles",
  onBack,
  backLabel = "Go back",
  testID = "child-loading-state",
}: ChildLoadingStateProps) {
  const { height, width } = useWindowDimensions();
  const isCompactLandscape = width > height && height < 430;
  const cardWidth = Math.min(width - 40, 680);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: brandColors.blue[50] }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={[brandColors.blue[50], brandColors.gold[50], brandColors.orange[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 180,
            height: 180,
            borderRadius: 90,
            backgroundColor: "rgba(248, 194, 62, 0.16)",
            left: -54,
            top: -48,
          }}
        />
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 220,
            height: 220,
            borderRadius: 110,
            backgroundColor: "rgba(2, 116, 187, 0.10)",
            right: -70,
            bottom: -82,
          }}
        />

        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={backLabel}
            onPress={onBack}
            style={{
              position: "absolute",
              left: 20,
              top: 16,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: brandColors.white,
              borderWidth: 1,
              borderColor: brandColors.blue[100],
              ...brandShadows.soft,
            }}
          >
            <Ionicons name="arrow-back" size={22} color={brandColors.victoriaBlue} />
          </TouchableOpacity>
        ) : null}

        <View
          testID={testID}
          accessibilityRole="progressbar"
          accessibilityLabel={title}
          accessibilityValue={{ text: message }}
          accessibilityLiveRegion="polite"
          style={{
            width: cardWidth,
            maxWidth: "100%",
            minHeight: isCompactLandscape ? 190 : 238,
            backgroundColor: "rgba(255,255,255,0.96)",
            borderRadius: 28,
            borderWidth: 2,
            borderColor: brandColors.gold[200],
            paddingHorizontal: isCompactLandscape ? 24 : 30,
            paddingVertical: isCompactLandscape ? 20 : 28,
            flexDirection: isCompactLandscape ? "row" : "column",
            alignItems: "center",
            justifyContent: "center",
            ...brandShadows.lifted,
          }}
        >
          <View
            style={{
              width: isCompactLandscape ? 116 : 104,
              height: isCompactLandscape ? 116 : 104,
              borderRadius: 58,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: brandColors.gold[50],
              borderWidth: 2,
              borderColor: brandColors.gold[200],
              marginRight: isCompactLandscape ? 28 : 0,
              marginBottom: isCompactLandscape ? 0 : 18,
            }}
          >
            <BrandMark
              kind="mascot"
              width={isCompactLandscape ? 56 : 52}
              height={isCompactLandscape ? 76 : 70}
            />
            <View
              style={{
                position: "absolute",
                right: -5,
                bottom: -4,
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: brandColors.victoriaBlue,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 3,
                borderColor: brandColors.white,
              }}
            >
              <Ionicons name={icon} size={19} color={brandColors.white} />
            </View>
          </View>

          <View style={{ flex: isCompactLandscape ? 1 : undefined, alignItems: "center" }}>
            <Text
              variant="display"
              style={{
                color: brandColors.blue[700],
                fontSize: isCompactLandscape ? 28 : 31,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
            <Text
              variant="medium"
              style={{
                color: brandColors.neutral[600],
                fontSize: isCompactLandscape ? 14 : 15,
                lineHeight: isCompactLandscape ? 20 : 22,
                textAlign: "center",
                marginTop: 7,
                maxWidth: 440,
              }}
            >
              {message}
            </Text>
            <View
              style={{
                marginTop: isCompactLandscape ? 14 : 18,
                minHeight: 28,
                flexDirection: "row",
                alignItems: "center",
                borderRadius: 999,
                backgroundColor: brandColors.blue[50],
                paddingHorizontal: 14,
                paddingVertical: 6,
              }}
            >
              <ActivityIndicator size="small" color={brandColors.victoriaBlue} />
              <Text
                variant="bold"
                style={{ color: brandColors.blue[700], fontSize: 12, marginLeft: 9 }}
              >
                Loading safely...
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

export function ChildLoadingCard({
  label = "Loading activities...",
  style,
}: ChildLoadingCardProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={[
        {
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: 22,
          borderWidth: 2,
          borderColor: brandColors.gold[300],
          backgroundColor: brandColors.white,
          padding: 16,
          ...brandShadows.soft,
        },
        style,
      ]}
    >
      <View
        style={{
          width: 54,
          height: 54,
          borderRadius: 27,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: brandColors.blue[50],
          marginBottom: 12,
        }}
      >
        <ActivityIndicator size="small" color={brandColors.victoriaBlue} />
      </View>
      <Text variant="bold" style={{ color: brandColors.blue[700], textAlign: "center" }}>
        {label}
      </Text>
      <View
        style={{
          width: "68%",
          height: 7,
          borderRadius: 99,
          backgroundColor: brandColors.neutral[100],
          marginTop: 12,
        }}
      />
    </View>
  );
}
