import { Tabs } from "expo-router"
import { Image, Platform, StyleSheet, View, useWindowDimensions } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { LinearGradient } from "expo-linear-gradient"
import { Text } from "@/components/StyledText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "@/constants/Brand"
import { CHILD_TAB_ITEMS, type ChildTabId } from "@/constants/ChildNavigation"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import type { ChildUiTranslationKey } from "@/lib/childUiTranslations"

const IS_IOS = Platform.OS === "ios"

// Tweak these values to fine-tune the Android bottom navigation without
// affecting iOS. All spacing values are density-independent pixels.
const ANDROID_NAV_UI = {
  bottomInset: 6,
  contentVerticalOffset: 0,
  height: 60,
  horizontalInset: 0,
  horizontalPadding: 10,
  iconLabelGap: 18,
  safeAreaOffset: 0,
  verticalPadding: 2,
} as const

// iOS has its own controls so it can be tuned without changing Android.
const IOS_NAV_UI = {
  bottomInset: 8,
  contentVerticalOffset: 0,
  height: 66,
  horizontalInset: 12,
  horizontalPadding: 14,
  iconLabelGap: 18,
  // Added to the device safe-area inset before bottomInset is applied.
  safeAreaOffset: -4,
  verticalPadding: 3,
} as const

const NAV_UI = IS_IOS ? IOS_NAV_UI : ANDROID_NAV_UI
const TAB_BAR_HEIGHT = NAV_UI.height
const IOS_TAB_BAR_COLORS: [string, string] = [
  "rgba(7, 69, 104, 0.94)",
  "rgba(2, 116, 187, 0.92)",
]

type NavItem = {
  href: (typeof CHILD_TAB_ITEMS)[number]["href"]
  id: ChildTabId
  labelKey: ChildUiTranslationKey
  icon?: any
  iconName?: keyof typeof Ionicons.glyphMap
  activeIconName?: keyof typeof Ionicons.glyphMap
}

// Your navigation items
const navigationItems: NavItem[] = CHILD_TAB_ITEMS.map((item) => {
  if (item.id === "learning") {
    return {
      ...item,
      iconName: "school-outline",
      activeIconName: "school",
    }
  }

  const iconByTab: Record<Exclude<ChildTabId, "learning">, any> = {
    index: require("@/assets/icons/game.png"),
    Stories: require("@/assets/icons/logic.png"),
    coloring: require("@/assets/icons/coloring.png"),
  }

  return {
    ...item,
    icon: iconByTab[item.id],
  }
})

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  const { width: screenWidth } = useWindowDimensions()
  const { t } = useChildUiLanguage()
  const tabBarBottom = Math.max(
    insets.bottom + NAV_UI.safeAreaOffset,
    NAV_UI.bottomInset,
  )
  const horizontalInset = NAV_UI.horizontalInset
  const androidTabBarWidth = Math.max(
    0,
    screenWidth - ANDROID_NAV_UI.horizontalInset * 2,
  )

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
            backgroundColor: "transparent",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.22)",
            borderRadius: IS_IOS ? 22 : 20,
            height: TAB_BAR_HEIGHT,
            paddingHorizontal: NAV_UI.horizontalPadding,
            paddingVertical: NAV_UI.verticalPadding,
            shadowColor: brandColors.charcoalBlack,
            shadowOffset: {
              width: 0,
              height: 5,
            },
            shadowOpacity: IS_IOS ? 0.18 : 0.12,
            shadowRadius: 10,
            elevation: 9,
            position: "absolute",
            left: horizontalInset,
            ...(IS_IOS
              ? { right: horizontalInset }
              : { right: undefined, width: androidTabBarWidth }),
            bottom: tabBarBottom,
          },
          tabBarItemStyle: {
            height: TAB_BAR_HEIGHT - NAV_UI.verticalPadding * 2,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: IS_IOS ? 4 : 2,
            transform: [{ translateY: NAV_UI.contentVerticalOffset }],
          },
          tabBarIconStyle: { flex: 1, width: "100%" },
          tabBarLabelPosition: "beside-icon",
          tabBarLabelStyle: {
            fontSize: 14,
            lineHeight: 18,
          },
          tabBarActiveTintColor: brandColors.equatorialGold,
          tabBarInactiveTintColor: "rgba(255, 255, 255, 0.9)",
          tabBarShowLabel: false,
          tabBarHideOnKeyboard: true,
          tabBarBackground: () =>
            IS_IOS ? (
              <LinearGradient
                colors={IOS_TAB_BAR_COLORS}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iosTabBarBackground}
              />
            ) : (
              <View style={styles.androidTabBarBackground} />
            ),
        }}
      >
        {navigationItems.map((item) => (
          <Tabs.Screen
            key={item.id}
            name={item.id}
            options={{
              href: item.href,
              tabBarIcon: ({ color, size, focused }) => {
                const iconName = focused ? item.activeIconName ?? item.iconName : item.iconName
                const icon = iconName ? (
                  <Ionicons
                    name={iconName}
                    size={size}
                    color={color}
                    style={{ transform: [{ scale: focused ? 1.04 : 0.94 }] }}
                  />
                ) : (
                  <Image
                    source={item.icon}
                    style={{
                      width: size,
                      height: size,
                      tintColor: color,
                      resizeMode: "contain",
                      transform: [{ scale: focused ? 1.04 : 0.94 }],
                    }}
                  />
                )

                return (
                  <View style={styles.tabItemContent}>
                    {icon}
                    <Text
                      variant={focused ? "bold" : "regular"}
                      numberOfLines={1}
                      style={{
                        color,
                        fontSize: 14,
                        lineHeight: 18,
                        marginLeft: NAV_UI.iconLabelGap,
                      }}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </View>
                )
              },
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
  androidTabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 91, 142, 0.98)",
    borderRadius: 19,
  },
  tabItemContent: {
    alignItems: "center",
    flexDirection: "row",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  iosTabBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 21,
  },
})
