import type { ReactNode } from "react";
import { View, useWindowDimensions } from "react-native";
import { getAdultFormLayout } from "@/lib/responsiveLayout";

type ResponsiveAuthLayoutProps = {
  children: ReactNode;
  hero: ReactNode;
  testID?: string;
};

export function ResponsiveAuthLayout({
  children,
  hero,
  testID,
}: ResponsiveAuthLayoutProps) {
  const { height, width } = useWindowDimensions();
  const layout = getAdultFormLayout(width, height);

  return (
    <View
      testID={testID}
      style={{
        alignItems: "center",
        alignSelf: "center",
        flexDirection: layout.isSplit ? "row" : "column",
        flexGrow: 1,
        gap: layout.contentGap,
        justifyContent: layout.isSplit ? "center" : "flex-start",
        maxWidth: layout.contentMaxWidth,
        paddingHorizontal: layout.contentPadding,
        width: "100%",
      }}
    >
      <View
        style={{
          flex: layout.isSplit ? 1 : undefined,
          maxWidth: layout.heroMaxWidth,
          width: "100%",
        }}
      >
        {hero}
      </View>
      <View
        style={{
          flex: layout.isSplit ? 1 : undefined,
          maxWidth: layout.formMaxWidth,
          width: "100%",
        }}
      >
        {children}
      </View>
    </View>
  );
}
