import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand/BrandMark";
import { AppButton } from "@/components/common/AppButton";
import {
  OnboardingArtwork,
  type OnboardingArtworkVariant,
} from "@/components/onboarding/OnboardingArtwork";
import { Text } from "@/components/StyledText";
import { brandColors, brandShadows } from "@/constants/Brand";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { setOnboardingCompleted } from "@/lib/onboarding";

type OnboardingSlide = {
  accentColor: string;
  artwork: OnboardingArtworkVariant;
  backgroundColor: string;
  description: string;
  id: string;
  kicker: string;
  title: string;
};

export const ONBOARDING_SLIDES: readonly OnboardingSlide[] = [
  {
    id: "little-steps",
    kicker: "WELCOME TO BABY STEPS",
    title: "Little steps, big adventures",
    description:
      "Stories, games and first words help children learn with confidence and stay connected to culture.",
    artwork: "play",
    backgroundColor: brandColors.blue[100],
    accentColor: brandColors.blue[700],
  },
  {
    id: "stories-and-play",
    kicker: "DISCOVER AND CREATE",
    title: "Learn through stories and play",
    description:
      "Explore Luganda, African stories, puzzles and creative activities designed for young learners.",
    artwork: "discover",
    backgroundColor: brandColors.orange[100],
    accentColor: brandColors.orange[700],
  },
  {
    id: "family-space",
    kicker: "MADE FOR FAMILIES",
    title: "Their journey stays with you",
    description:
      "Create a profile for each child and follow their progress from one private family space.",
    artwork: "family",
    backgroundColor: brandColors.gold[100],
    accentColor: brandColors.gold[800],
  },
] as const;

const MIN_HORIZONTAL_GUTTER = 20;
const ARTWORK_BASE_HEIGHT = 260;
const ARTWORK_BASE_WIDTH = 340;
const protectTextEdges = (value: string) => `\u00A0${value}\u00A0`;

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const floatValue = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const currentIndexRef = useRef(0);
  const previousWidthRef = useRef(0);
  const completionInFlightRef = useRef(false);
  const reduceMotion = useReducedMotion();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();

  const isVeryCompact = height < 620;
  const isCompact = height < 700 || width < 350;
  const isTablet = width >= 600 && height >= 700;
  const footerEstimate =
    (isVeryCompact ? 104 : isCompact ? 108 : 118) + Math.max(insets.bottom, 12);
  const carouselHeightEstimate = Math.max(0, height - footerEstimate);
  const artworkHeight = Math.min(
    isTablet ? 520 : 390,
    Math.max(
      isVeryCompact ? 220 : isCompact ? 250 : 305,
      carouselHeightEstimate * (isTablet ? 0.52 : 0.5),
    ),
  );
  const availableArtworkWidth = Math.max(240, width - MIN_HORIZONTAL_GUTTER * 2);
  const compactHeightScale = isVeryCompact ? 0.68 : height < 700 ? 0.78 : 1;
  const artworkScale =
    Math.min(isTablet ? 1.16 : 0.96, availableArtworkWidth / ARTWORK_BASE_WIDTH) *
    compactHeightScale;
  const scaledArtworkHeight = ARTWORK_BASE_HEIGHT * artworkScale;
  const scaledArtworkWidth = ARTWORK_BASE_WIDTH * artworkScale;
  const contentWidth = Math.min(width - MIN_HORIZONTAL_GUTTER * 2, isTablet ? 520 : 430);
  const horizontalInset = Math.max(MIN_HORIZONTAL_GUTTER, insets.left, insets.right);

  useEffect(() => {
    if (previousWidthRef.current === width) return;

    previousWidthRef.current = width;
    const offset = currentIndexRef.current * width;
    scrollX.setValue(offset);
    flatListRef.current?.scrollToOffset({ animated: false, offset });
  }, [scrollX, width]);

  useEffect(() => {
    if (reduceMotion) {
      floatValue.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatValue, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatValue, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [floatValue, reduceMotion]);

  const updateCurrentIndex = useCallback((nextIndex: number, announce = true) => {
    const clampedIndex = Math.max(0, Math.min(ONBOARDING_SLIDES.length - 1, nextIndex));
    if (currentIndexRef.current === clampedIndex) return;

    currentIndexRef.current = clampedIndex;
    setCurrentIndex(clampedIndex);
    setCompletionError(null);

    if (announce) {
      AccessibilityInfo.announceForAccessibility(
        `Onboarding screen ${clampedIndex + 1} of ${ONBOARDING_SLIDES.length}`,
      );
    }
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      updateCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    },
    [updateCurrentIndex, width],
  );

  const goToNextSlide = useCallback(() => {
    const nextIndex = Math.min(currentIndexRef.current + 1, ONBOARDING_SLIDES.length - 1);
    updateCurrentIndex(nextIndex);
    flatListRef.current?.scrollToOffset({ animated: true, offset: nextIndex * width });
  }, [updateCurrentIndex, width]);

  const handleOnboardingComplete = useCallback(async () => {
    if (completionInFlightRef.current) return;

    completionInFlightRef.current = true;
    setIsCompleting(true);
    setCompletionError(null);

    try {
      await setOnboardingCompleted();
      router.replace("/login");
    } catch (error) {
      console.error("Failed to save onboarding status", error);
      setCompletionError("We couldn't continue just now. Please try again.");
    } finally {
      completionInFlightRef.current = false;
      setIsCompleting(false);
    }
  }, [router]);

  const floatTranslateY = floatValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  const renderItem = useCallback(
    ({ item, index }: { item: OnboardingSlide; index: number }) => (
      <View
        accessibilityElementsHidden={index !== currentIndex}
        importantForAccessibility={index === currentIndex ? "auto" : "no-hide-descendants"}
        style={[styles.slide, { backgroundColor: item.backgroundColor, width }]}
      >
        <View
          style={[
            styles.artworkArea,
            {
              height: artworkHeight,
              paddingTop: Math.max(insets.top + 52, 66),
            },
          ]}
        >
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            testID="onboarding-artwork-frame"
            style={{
              height: scaledArtworkHeight,
              transform: [{ translateY: floatTranslateY }],
              width: scaledArtworkWidth,
            }}
          >
            <View
              style={{
                left: (scaledArtworkWidth - ARTWORK_BASE_WIDTH) / 2,
                position: "absolute",
                top: (scaledArtworkHeight - ARTWORK_BASE_HEIGHT) / 2,
                transform: [{ scale: artworkScale }],
              }}
            >
              <OnboardingArtwork variant={item.artwork} />
            </View>
          </Animated.View>
        </View>

        <View style={[styles.copySheet, isVeryCompact && styles.veryCompactCopySheet]}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.copyContent}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            style={[styles.copyScroller, { maxWidth: contentWidth }]}
          >
            <Text variant="bold" style={[styles.kicker, { color: item.accentColor }]}>
              {protectTextEdges(item.kicker)}
            </Text>
            <Text
              variant="display"
              style={[
                styles.title,
                isCompact && styles.compactTitle,
                isVeryCompact && styles.veryCompactTitle,
                isTablet && styles.tabletTitle,
              ]}
            >
              {protectTextEdges(item.title)}
            </Text>
            <Text
              style={[
                styles.description,
                isCompact && styles.compactDescription,
                isVeryCompact && styles.veryCompactDescription,
                isTablet && styles.tabletDescription,
              ]}
            >
              {protectTextEdges(item.description)}
            </Text>
          </ScrollView>
        </View>
      </View>
    ),
    [
      artworkHeight,
      artworkScale,
      contentWidth,
      currentIndex,
      floatTranslateY,
      insets.top,
      isCompact,
      isTablet,
      isVeryCompact,
      scaledArtworkHeight,
      scaledArtworkWidth,
      width,
    ],
  );

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <Animated.FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES as readonly OnboardingSlide[]}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        snapToInterval={width}
        decelerationRate="fast"
        disableIntervalMomentum
        bounces={false}
        removeClippedSubviews={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        getItemLayout={(_, index) => ({ index, length: width, offset: width * index })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
          useNativeDriver: false,
        })}
        style={styles.carousel}
        contentContainerStyle={styles.carouselContent}
        extraData={currentIndex}
        accessibilityLabel="Baby Steps introduction"
        testID="onboarding-carousel"
      />

      <View
        pointerEvents="box-none"
        style={[
          styles.header,
          {
            height: insets.top + 60,
            paddingLeft: horizontalInset,
            paddingRight: horizontalInset,
            paddingTop: insets.top,
          },
        ]}
      >
        <BrandMark kind="wordmark" width={142} height={35} />
        <TouchableOpacity
          accessibilityLabel="Skip introduction and continue to sign in"
          accessibilityRole="button"
          activeOpacity={0.72}
          disabled={isCompleting}
          onPress={() => void handleOnboardingComplete()}
          style={styles.skipButton}
          testID="onboarding-skip"
        >
          <Text variant="semibold" style={styles.skipText}>
            {protectTextEdges("Skip")}
          </Text>
          <Ionicons name="arrow-forward" color={brandColors.blue[700]} size={17} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            paddingLeft: horizontalInset,
            paddingRight: horizontalInset,
          },
        ]}
      >
        <View style={[styles.footerContent, { maxWidth: contentWidth }]}>
          <View
            accessible
            accessibilityLabel={`Page ${currentIndex + 1} of ${ONBOARDING_SLIDES.length}`}
            style={styles.pagination}
          >
            {ONBOARDING_SLIDES.map((slide, index) => {
              const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
              const dotWidth = scrollX.interpolate({
                inputRange,
                outputRange: [8, 24, 8],
                extrapolate: "clamp",
              });
              const dotOpacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.3, 1, 0.3],
                extrapolate: "clamp",
              });

              return (
                <Animated.View
                  key={`onboarding-dot-${slide.id}`}
                  accessible={false}
                  importantForAccessibility="no"
                  style={[styles.paginationDot, { opacity: dotOpacity, width: dotWidth }]}
                />
              );
            })}
          </View>

          <AppButton
            accessibilityLabel={isLastSlide ? "Get started with Baby Steps" : "Continue to the next introduction screen"}
            className="rounded-2xl"
            fullWidth
            icon={isLastSlide ? "sparkles-outline" : "arrow-forward"}
            label={isLastSlide ? "Get started" : "Continue"}
            loading={isCompleting}
            loadingLabel="Opening Baby Steps..."
            onPress={isLastSlide ? () => void handleOnboardingComplete() : goToNextSlide}
            style={styles.primaryAction}
            testID="onboarding-primary-action"
          />

          <View style={styles.errorSlot}>
            {completionError ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.completionError}
                testID="onboarding-completion-error"
              >
                {completionError}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  artworkArea: {
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden",
    width: "100%",
  },
  carousel: {
    flex: 1,
  },
  carouselContent: {
    flexGrow: 1,
  },
  compactDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  compactTitle: {
    fontSize: 29,
    lineHeight: 35,
  },
  completionError: {
    color: brandColors.danger,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  copyContent: {
    alignItems: "center",
    paddingHorizontal: 20,
    width: "100%",
  },
  copyScroller: {
    flex: 1,
    width: "100%",
  },
  copySheet: {
    alignItems: "center",
    backgroundColor: brandColors.babyStepsWhite,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    flex: 1,
    marginTop: -16,
    paddingBottom: 12,
    paddingTop: 27,
    width: "100%",
  },
  description: {
    alignSelf: "center",
    color: brandColors.neutral[700],
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 440,
    paddingHorizontal: 4,
    paddingVertical: 1,
    textAlign: "center",
    width: "100%",
  },
  errorSlot: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    minHeight: 18,
    width: "100%",
  },
  footer: {
    alignItems: "center",
    backgroundColor: brandColors.babyStepsWhite,
    paddingTop: 10,
    width: "100%",
  },
  footerContent: {
    alignItems: "center",
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10,
  },
  kicker: {
    alignSelf: "center",
    fontSize: 11,
    letterSpacing: 1.4,
    lineHeight: 18,
    marginBottom: 7,
    paddingHorizontal: 8,
    paddingVertical: 1,
    textAlign: "center",
    width: "100%",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    height: 12,
    justifyContent: "center",
    marginBottom: 13,
  },
  paginationDot: {
    backgroundColor: brandColors.victoriaBlue,
    borderRadius: 4,
    height: 8,
    marginHorizontal: 4,
  },
  primaryAction: {
    ...brandShadows.soft,
    minHeight: 58,
  },
  root: {
    backgroundColor: brandColors.babyStepsWhite,
    flex: 1,
  },
  skipButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 82,
    paddingHorizontal: 15,
  },
  skipText: {
    color: brandColors.blue[700],
    fontSize: 14,
    lineHeight: 20,
    marginRight: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  slide: {
    flex: 1,
  },
  tabletDescription: {
    fontSize: 18,
    lineHeight: 28,
  },
  tabletTitle: {
    fontSize: 38,
    lineHeight: 46,
  },
  title: {
    alignSelf: "center",
    color: brandColors.neutral[900],
    fontSize: 33,
    lineHeight: 41,
    marginBottom: 12,
    maxWidth: 500,
    paddingHorizontal: 8,
    paddingVertical: 2,
    textAlign: "center",
    width: "100%",
  },
  veryCompactCopySheet: {
    paddingTop: 20,
  },
  veryCompactDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  veryCompactTitle: {
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 9,
  },
});
