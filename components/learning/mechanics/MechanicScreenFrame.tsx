import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

type MechanicScreenFrameProps = {
  children: ReactNode;
  footer: ReactNode;
  isShortScreen: boolean;
};

export function MechanicScreenFrame({
  children,
  footer,
  isShortScreen,
}: MechanicScreenFrameProps) {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const shouldScroll = viewportHeight > 0 && contentHeight > viewportHeight + 2;

  return (
    <View className="flex-1" style={{ paddingVertical: isShortScreen ? 0 : 4 }}>
      <ScrollView
        alwaysBounceVertical={false}
        bounces={shouldScroll}
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: isShortScreen ? 0 : 3,
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
        }}
        overScrollMode={shouldScroll ? "auto" : "never"}
        scrollEnabled={shouldScroll}
        showsVerticalScrollIndicator={shouldScroll}
        style={{ flex: 1, width: "100%" }}
      >
        <View className="items-center" style={{ width: "100%" }}>
          {children}
        </View>
      </ScrollView>

      <View
        className="items-end"
        style={{
          flexShrink: 0,
          paddingTop: isShortScreen ? 7 : 9,
          width: "100%",
        }}
      >
        {footer}
      </View>
    </View>
  );
}
