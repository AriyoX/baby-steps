import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { TouchableOpacity, View, useWindowDimensions, type ImageSourcePropType } from "react-native";
import { Text } from "@/components/StyledText";
import { CachedImage } from "@/components/common/CachedImage";
import { activityColors, activityStyles } from "@/constants/ActivityTheme";
import { brandColors } from "@/constants/Brand";
import { getLearningReadingLayout, type LearningReadingLayout } from "@/lib/responsiveLayout";
import { MechanicScreenFrame } from "./mechanics/MechanicScreenFrame";

type LearningIllustratedScreenProps = {
  progress?: string;
  imageSource?: ImageSourcePropType;
  fallbackSource?: ImageSourcePropType;
  imageLabel: string;
  emoji?: string;
  fallbackIcon?: keyof typeof Ionicons.glyphMap;
  visualTestID?: string;
  fallbackTestID?: string;
  onCardPress?: () => void;
  cardAccessibilityLabel?: string;
  children: (layout: LearningReadingLayout) => ReactNode;
  footer: ReactNode;
  footerAside?: ReactNode;
};

export function LearningIllustratedScreen({
  progress,
  imageSource,
  fallbackSource,
  imageLabel,
  emoji,
  fallbackIcon = "image-outline",
  visualTestID,
  fallbackTestID,
  onCardPress,
  cardAccessibilityLabel,
  children,
  footer,
  footerAside,
}: LearningIllustratedScreenProps) {
  const { width, height } = useWindowDimensions();
  const [measurements, setMeasurements] = useState({
    width: 0, height: 0, windowWidth: width, windowHeight: height,
  });
  const layout = getLearningReadingLayout(width, height,
    measurements.windowWidth === width && measurements.windowHeight === height
      ? measurements
      : undefined,
  );
  const { isShort, isTablet, isSplit, gap } = layout;
  const cardStyle = [
    activityStyles.card,
    {
      alignItems: "stretch" as const,
      columnGap: gap,
      flexDirection: isSplit ? "row" as const : "column" as const,
      padding: layout.cardPadding,
      rowGap: gap,
      width: "100%" as const,
    },
  ];
  const cardContent = (
    <>
      <View
        testID={visualTestID}
        style={{
          alignItems: "center",
          backgroundColor: brandColors.blue[50],
          borderRadius: 16,
          flexShrink: 0,
          height: layout.imageHeight,
          justifyContent: "center",
          overflow: "hidden",
          width: isSplit ? layout.imageWidth : "100%",
        }}
      >
        {imageSource ? (
          <CachedImage
            source={imageSource}
            fallbackSource={fallbackSource}
            accessibilityLabel={imageLabel}
            resizeMode="cover"
            showRetry={!onCardPress}
            style={{ height: "100%", width: "100%" }}
          />
        ) : emoji ? (
          <Text accessibilityLabel={imageLabel} style={{ fontSize: isShort ? 64 : isTablet ? 104 : 84 }}>
            {emoji}
          </Text>
        ) : (
          <Ionicons
            accessibilityLabel={imageLabel}
            testID={fallbackTestID}
            name={fallbackIcon}
            color={activityColors.ink}
            size={isShort ? 56 : isTablet ? 96 : 72}
          />
        )}
      </View>
      <View
        style={{
          flex: isSplit ? 1 : undefined,
          justifyContent: "center",
          minWidth: 0,
          padding: layout.textPadding,
          width: isSplit ? undefined : "100%",
        }}
      >
        {children(layout)}
      </View>
    </>
  );

  return (
    <MechanicScreenFrame
      isShortScreen={isShort}
      surface="panel"
      contentPadding={layout.contentPadding}
      style={{ alignSelf: "center", maxWidth: 1280, width: "100%" }}
      onViewportLayout={(size) => setMeasurements((current) =>
        current.width === size.width && current.height === size.height &&
        current.windowWidth === width && current.windowHeight === height
          ? current
          : { ...size, windowWidth: width, windowHeight: height },
      )}
      footer={footer}
      footerAside={progress ? (
        <View style={{ alignItems: "center", columnGap: gap, flexDirection: "row", flexWrap: "wrap", rowGap: 4 }}>
          {footerAside}
          <Text style={{ color: activityColors.muted, fontSize: isShort ? 12 : 16 }}>
            {progress}
          </Text>
        </View>
      ) : footerAside}
    >
      {onCardPress ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={cardAccessibilityLabel}
          activeOpacity={0.82}
          onPress={onCardPress}
          style={cardStyle}
        >
          {cardContent}
        </TouchableOpacity>
      ) : <View style={cardStyle}>{cardContent}</View>}
    </MechanicScreenFrame>
  );
}

type LearningWordContentProps = {
  localText: string;
  englishText: string;
  phoneticText?: string;
  example?: string;
  exampleTranslation?: string;
  layout: LearningReadingLayout;
};

export function LearningWordContent({
  localText, englishText, phoneticText, example, exampleTranslation, layout,
}: LearningWordContentProps) {
  const { isShort, isTablet } = layout;
  const normalizeText = (text?: string) => text?.trim().replace(/\s+/g, " ").toLowerCase();
  const exampleText = normalizeText(example) === normalizeText(localText) ? undefined : example;
  const exampleEnglishText = normalizeText(exampleTranslation) === normalizeText(englishText)
    ? undefined
    : exampleTranslation;
  return (
    <View style={{ width: "100%" }}>
      <Text
        variant="bold"
        style={{ color: activityColors.ink, fontSize: isShort ? 30 : isTablet ? 44 : 36 }}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        numberOfLines={3}
      >
        {localText}
      </Text>
      {phoneticText ? <Text style={{ color: activityColors.muted, fontSize: isShort ? 14 : 18, marginTop: 4 }}>{phoneticText}</Text> : null}
      <Text style={{ color: activityColors.muted, fontSize: isShort ? 18 : isTablet ? 27 : 23, marginTop: isShort ? 6 : 8 }}>
        {englishText}
      </Text>
      {exampleText || exampleEnglishText ? (
        <View style={[activityStyles.inset, { marginTop: isShort ? 8 : 20, padding: isShort ? 8 : 14 }]}>
          {exampleText ? <Text variant="medium" style={{ color: activityColors.ink, fontSize: isShort ? 14 : isTablet ? 20 : 17 }}>{exampleText}</Text> : null}
          {exampleEnglishText ? <Text style={{ color: activityColors.muted, fontSize: isShort ? 13 : isTablet ? 17 : 15, marginTop: exampleText ? 6 : 0 }}>{exampleEnglishText}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}
