import { useState, type ReactNode } from "react";
import { ScrollView, View, type StyleProp, type ViewStyle } from "react-native";

import { TourTarget } from "@/components/games/GameTour";

type MechanicScreenFrameProps = {
  children: ReactNode;
  footer: ReactNode;
  footerAside?: ReactNode;
  isShortScreen: boolean;
  contentPadding?: number;
  onViewportLayout?: (size: { width: number; height: number }) => void;
  style?: StyleProp<ViewStyle>;
  surface?: "plain" | "panel";
};

export function MechanicScreenFrame({
  children,
  footer,
  footerAside,
  isShortScreen,
  contentPadding = 0,
  onViewportLayout,
  style,
  surface = "plain",
}: MechanicScreenFrameProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const shouldScroll = viewportHeight > 0 && contentHeight > viewportHeight + 2;
  const hasPanel = surface === "panel";

  return (
    <View
      style={[
        { flex: 1, minHeight: 0, paddingVertical: isShortScreen ? 0 : 4 },
        hasPanel && {
          backgroundColor: "#FFFFFF",
          borderRadius: isShortScreen ? 20 : 26,
          overflow: "hidden",
          paddingVertical: 0,
        },
        style,
      ]}
    >
      <TourTarget id="learning-lesson-content">
        <ScrollView
          alwaysBounceVertical={false}
          bounces={shouldScroll}
          contentContainerStyle={{
            alignItems: "center",
            flexGrow: 1,
            justifyContent: hasPanel || shouldScroll ? "flex-start" : "center",
            paddingHorizontal: contentPadding,
            paddingVertical: hasPanel ? contentPadding : isShortScreen ? 0 : 3,
          }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={(_, nextContentHeight) => {
            const roundedHeight = Math.round(nextContentHeight);
            setContentHeight((currentHeight) =>
              currentHeight === roundedHeight ? currentHeight : roundedHeight,
            );
          }}
          onLayout={(event) => {
            const roundedHeight = Math.round(event.nativeEvent.layout.height);
            setViewportHeight((currentHeight) =>
              currentHeight === roundedHeight ? currentHeight : roundedHeight,
            );
            onViewportLayout?.({
              width: event.nativeEvent.layout.width,
              height: event.nativeEvent.layout.height,
            });
          }}
          overScrollMode={shouldScroll ? "auto" : "never"}
          scrollEnabled={shouldScroll}
          showsVerticalScrollIndicator={shouldScroll}
          style={{ flex: 1, minHeight: 0, width: "100%" }}
        >
          <View style={{ alignItems: "center", flexShrink: 0, width: "100%" }}>
            {children}
          </View>
        </ScrollView>
      </TourTarget>

      <View
        style={{
          alignItems: hasPanel ? "center" : "flex-end",
          columnGap: hasPanel ? 12 : 0,
          flexDirection: hasPanel ? "row" : "column",
          flexShrink: 0,
          paddingTop: hasPanel ? 0 : isShortScreen ? 4 : 9,
          paddingHorizontal: hasPanel ? contentPadding : 0,
          paddingBottom: hasPanel ? (isShortScreen ? 6 : 10) : 0,
          width: "100%",
        }}
      >
        {hasPanel ? (
          <View style={{ flex: 1, minWidth: 0 }}>{footerAside}</View>
        ) : null}
        <TourTarget id="learning-lesson-action">
          <View style={{ maxWidth: hasPanel ? "65%" : "100%" }}>
            {footer}
          </View>
        </TourTarget>
      </View>
    </View>
  );
}
