import { Tabs } from "expo-router"
import { StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "@/constants/Brand"
import { CHILD_TAB_ITEMS, type ChildTabId } from "@/constants/ChildNavigation"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import type { ChildUiTranslationKey } from "@/lib/childUiTranslations"

const TAB_BAR_HEIGHT = 64
const TAB_BAR_EDGE_GAP = 10
const TAB_BAR_BOTTOM_GAP = 8
const TAB_ICON_SIZE = 24

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
  const { t } = useChildUiLanguage()
  const horizontalInset = Math.max(TAB_BAR_EDGE_GAP, insets.left, insets.right)
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
          backgroundColor: brandColors.blue[700],
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.18)",
          borderRadius: 20,
          height: TAB_BAR_HEIGHT,
          paddingHorizontal: 8,
          paddingVertical: 4,
          shadowColor: brandColors.charcoalBlack,
          shadowOffset: {
            width: 0,
            height: 3,
          },
          shadowOpacity: 0.14,
          shadowRadius: 7,
          elevation: 6,
          position: "absolute",
          left: horizontalInset,
          right: horizontalInset,
          bottom: bottomInset,
        },
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
        tabBarActiveTintColor: brandColors.equatorialGold,
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.86)",
        tabBarLabelPosition: "below-icon",
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
      }}
    >
      {navigationItems.map((item) => (
        <Tabs.Screen
          key={item.id}
          name={item.id}
          options={{
            href: item.href,
            title: t(item.labelKey),
            tabBarAccessibilityLabel: t(item.labelKey),
            tabBarIcon: ({ color, focused }) => {
              return (
                <Ionicons
                  name={focused ? item.activeIconName : item.iconName}
                  size={TAB_ICON_SIZE}
                  color={color}
                />
              )
            },
            tabBarLabel: ({ color, focused }) => (
              <Text
                variant={focused ? "bold" : "medium"}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
                style={[styles.tabBarLabel, { color }]}
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
    marginTop: 1,
  },
  tabBarItem: {
    alignItems: "center",
    height: TAB_BAR_HEIGHT - 8,
    justifyContent: "center",
    paddingVertical: 2,
  },
  tabBarLabel: {
    fontSize: 12,
    lineHeight: 15,
    maxWidth: "100%",
    paddingHorizontal: 2,
    textAlign: "center",
  },
})
