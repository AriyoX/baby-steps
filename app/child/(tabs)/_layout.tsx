import { Tabs } from "expo-router"
import { StyleSheet, View, useWindowDimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "@/constants/Brand"
import { CHILD_TAB_ITEMS, type ChildTabId } from "@/constants/ChildNavigation"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import type { ChildUiTranslationKey } from "@/lib/childUiTranslations"
import { childHaptics } from "@/lib/childHaptics"
import { getChildNavigationLayout } from "@/components/child/childInterfaceSizing"

const TAB_BAR_HEIGHT = 58
const TAB_BAR_BOTTOM_GAP = 6

type NavItem = {
  href: (typeof CHILD_TAB_ITEMS)[number]["href"]
  id: ChildTabId
  labelKey: ChildUiTranslationKey
  iconName: keyof typeof Ionicons.glyphMap
  activeIconName: keyof typeof Ionicons.glyphMap
}

const TAB_ICONS: Record<
  ChildTabId,
  Pick<NavItem, "iconName" | "activeIconName">
> = {
  learning: { iconName: "school-outline", activeIconName: "school" },
  index: { iconName: "game-controller-outline", activeIconName: "game-controller" },
  Stories: { iconName: "book-outline", activeIconName: "book" },
  coloring: { iconName: "color-palette-outline", activeIconName: "color-palette" },
}

const navigationItems: NavItem[] = CHILD_TAB_ITEMS.map((item) => ({
  ...item,
  ...TAB_ICONS[item.id],
}))

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { height, width } = useWindowDimensions()
  const { t } = useChildUiLanguage()
  const navigationLayout = getChildNavigationLayout(width, height)
  const horizontalInset = Math.max(
    navigationLayout.edgeGap,
    insets.left,
    insets.right,
  )
  const bottomInset = Math.max(TAB_BAR_BOTTOM_GAP, insets.bottom)

  return (
    <Tabs
      initialRouteName="learning"
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        animation: "none",
        freezeOnBlur: false,
        lazy: false,
        tabBarStyle: {
          backgroundColor: "rgba(255, 255, 255, 0.97)",
          borderWidth: 1.5,
          borderColor: brandColors.gold[200],
          borderRadius: 21,
          height: navigationLayout.barHeight,
          paddingHorizontal: 8,
          paddingVertical: 4,
          shadowColor: brandColors.charcoalBlack,
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 8,
          position: "absolute",
          left: horizontalInset,
          right: horizontalInset,
          bottom: bottomInset,
        },
        tabBarItemStyle: [
          styles.tabBarItem,
          { height: navigationLayout.barHeight - 8 },
        ],
        tabBarIconStyle: styles.tabBarIcon,
        tabBarActiveTintColor: brandColors.victoriaBlue,
        tabBarInactiveTintColor: brandColors.neutral[500],
        tabBarLabelPosition: "below-icon",
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      {navigationItems.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.id}
          listeners={{
            tabPress: () => childHaptics.selection(),
          }}
          options={{
            href: item.href,
            title: t(item.labelKey),
            tabBarAccessibilityLabel: t(item.labelKey),
            tabBarIcon: ({ color, focused }) => {
              return (
                <View
                  style={[
                    styles.iconPill,
                    {
                      height: navigationLayout.iconPillHeight,
                      width: navigationLayout.iconPillWidth,
                    },
                    focused && styles.iconPillFocused,
                  ]}
                >
                  <Ionicons
                    name={focused ? item.activeIconName : item.iconName}
                    size={
                      focused
                        ? navigationLayout.iconSize
                        : navigationLayout.iconSize - 1
                    }
                    color={color}
                  />
                </View>
              )
            },
            tabBarLabel: ({ color, focused }) => (
              <Text
                variant={focused ? "bold" : "medium"}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[
                  styles.tabBarLabel,
                  {
                    color,
                    fontSize: navigationLayout.labelFontSize,
                    lineHeight: navigationLayout.labelLineHeight,
                  },
                ]}
              >
                {t(item.labelKey)}
              </Text>
            ),
          }}
        />
      ))}
      {/* Museum is intentionally archived and hidden while the Learning hub replaces it in child tabs. */}
      <Tabs.Screen
        name="museum"
        options={{
          href: null,
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tabBarIcon: {
    marginTop: 0,
  },
  tabBarItem: {
    alignItems: "center",
    height: TAB_BAR_HEIGHT - 8,
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: 10,
    lineHeight: 12,
    maxWidth: "100%",
    paddingHorizontal: 2,
    textAlign: "center",
  },
  iconPill: {
    alignItems: "center",
    borderRadius: 13,
    height: 27,
    justifyContent: "center",
    width: 38,
  },
  iconPillFocused: {
    backgroundColor: brandColors.gold[100],
    borderColor: brandColors.gold[200],
    borderWidth: 1,
  },
})
