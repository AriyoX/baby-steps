import type { ReactNode } from "react";
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
  return (
    <View className="flex-1" style={{ paddingVertical: isShortScreen ? 0 : 4 }}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={{
          alignItems: "center",
          flexGrow: 1,
          justifyContent: "center",
          paddingVertical: isShortScreen ? 0 : 3,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
