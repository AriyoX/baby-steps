import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Animated, View, useWindowDimensions } from "react-native";
import { Text } from "@/components/StyledText";
import { ActivityAudioButton } from "@/components/learning/ActivityControls";
import { LearningChoiceCard } from "@/components/learning/mechanics/LearningChoiceCard";
import { MechanicScreenFrame } from "@/components/learning/mechanics/MechanicScreenFrame";
import { activityColors } from "@/constants/ActivityTheme";
import { brandColors } from "@/constants/Brand";
import { getLearningActivityLayout } from "@/lib/responsiveLayout";
import { TourTarget } from "./GameTour";

type LearningQuizBoardProps = {
  word: string;
  correctAnswer: string;
  options: string[];
  selectedOption: string | null;
  isCorrect: boolean | null;
  shakingOption: string | null;
  shakeAnimation: Animated.Value;
  celebrationAnimation: Animated.Value;
  onSelect: (option: string) => void;
  onReplay: () => void;
};

export function LearningQuizBoard({
  word,
  correctAnswer,
  options,
  selectedOption,
  isCorrect,
  shakingOption,
  shakeAnimation,
  celebrationAnimation,
  onSelect,
  onReplay,
}: LearningQuizBoardProps) {
  const { width, height } = useWindowDimensions();
  const [measurements, setMeasurements] = useState({
    width: 0, height: 0, windowWidth: width, windowHeight: height,
  });
  const [headerHeight, setHeaderHeight] = useState(0);
  const layout = getLearningActivityLayout(width, height, options.length,
    measurements.windowWidth === width && measurements.windowHeight === height
      ? { ...measurements, headerHeight }
      : undefined,
  );
  const { isShort, isTablet, choiceGap } = layout;

  return (
    <MechanicScreenFrame
      isShortScreen={isShort}
      surface="panel"
      contentPadding={layout.cardPadding}
      style={{ alignSelf: "center", maxWidth: isTablet ? 1280 : 920, width: "100%" }}
      onViewportLayout={(size) => setMeasurements((current) =>
        current.width === size.width && current.height === size.height &&
        current.windowWidth === width && current.windowHeight === height
          ? current
          : { ...size, windowWidth: width, windowHeight: height },
      )}
      footer={<View />}
      footerAside={
        <View style={{ alignItems: "center", columnGap: 8, flexDirection: "row", justifyContent: "center" }}>
        <Text
          accessibilityLiveRegion="polite"
          variant="bold"
          style={{
            color: isCorrect ? brandColors.success : brandColors.orange[700],
            fontSize: isShort ? 16 : 20,
            minHeight: isShort ? 24 : 32,
            textAlign: "center",
          }}
        >
          {isCorrect === null ? "" : isCorrect ? "Correct!" : "Try again!"}
        </Text>
        {isCorrect === true ? (
          <Animated.View style={{ opacity: celebrationAnimation.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }) }}>
            <Ionicons name="sparkles" size={isShort ? 22 : 28} color={activityColors.outline} />
          </Animated.View>
        ) : null}
        </View>
      }
    >
      <TourTarget id="learning-quiz-prompt">
        <View
          onLayout={(event) => setHeaderHeight(Math.ceil(event.nativeEvent.layout.height))}
          style={{ alignItems: "center", columnGap: choiceGap, flexDirection: "row", marginBottom: choiceGap, width: "100%" }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text variant="medium" style={{ color: activityColors.muted, fontSize: isShort ? 13 : 17 }}>
              Pick the meaning
            </Text>
            <Text
              variant="bold"
              style={{ color: activityColors.ink, fontSize: isShort ? 28 : isTablet ? 42 : 34 }}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {word}
            </Text>
          </View>
          <ActivityAudioButton accessibilityLabel={`Hear ${word}`} onPress={onReplay} />
        </View>
      </TourTarget>
      <TourTarget id="learning-quiz-answers">
        <View
          style={{ alignItems: "stretch", columnGap: choiceGap, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: choiceGap, width: "100%" }}
        >
          {options.map((option, index) => {
            const state = selectedOption === null
              ? "default"
              : option === correctAnswer ? "correct"
                : option === selectedOption ? "incorrect" : "default";
            return (
              <Animated.View
                key={`${option}-${index}`}
                style={{
                  width: layout.choiceWidth,
                  transform: option === shakingOption ? [{ translateX: shakeAnimation }] : [],
                }}
              >
                <LearningChoiceCard
                  accessibilityLabel={`Choose ${option}`}
                  disabled={selectedOption !== null}
                  isShortScreen={isShort}
                  onPress={() => onSelect(option)}
                  state={state}
                  style={{ alignItems: "center", justifyContent: "center", minHeight: layout.choiceHeight, padding: isShort ? 12 : 24 }}
                >
                  <Ionicons
                    name={state === "correct" ? "checkmark-circle-outline" : state === "incorrect" ? "refresh" : "text-outline"}
                    size={isShort ? 28 : isTablet ? 52 : 40}
                    color={activityColors.ink}
                  />
                  <Text
                    variant="bold"
                    style={{ color: activityColors.ink, fontSize: isShort ? 18 : isTablet ? 27 : 22, marginTop: isShort ? 8 : 16, textAlign: "center" }}
                    numberOfLines={3}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {option}
                  </Text>
                </LearningChoiceCard>
              </Animated.View>
            );
          })}
        </View>
      </TourTarget>
    </MechanicScreenFrame>
  );
}
