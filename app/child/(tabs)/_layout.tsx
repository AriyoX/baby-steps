import { Tabs } from "expo-router"
import { Image, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { Text } from "@/components/StyledText"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { brandColors } from "@/constants/Brand"
import { CHILD_TAB_ITEMS, type ChildTabId } from "@/constants/ChildNavigation"
import { useChildUiLanguage } from "@/context/ChildUiLanguageContext"
import type { ChildUiTranslationKey } from "@/lib/childUiTranslations"

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
  const { t } = useChildUiLanguage()
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
            backgroundColor: "rgba(2, 116, 187, 0.95)",
            borderTopWidth: 0,
            paddingVertical: 8,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            // Shadow for iOS
            shadowColor: "#000",
            shadowOffset: {
              width: 0,
              height: -2,
            },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            // Elevation for Android
            elevation: 8,
            position: "absolute",
            bottom: 0,
          },
          tabBarItemStyle: {
            height: 50,
            paddingHorizontal: 0,
          },
          tabBarActiveTintColor: brandColors.equatorialGold,
          tabBarInactiveTintColor: "#fff",
          tabBarShowLabel: true,
        }}
      >
        {navigationItems.map((item) => (
          <Tabs.Screen
            key={item.id}
            name={item.id}
            options={{
              href: item.href,
              tabBarLabel: ({ focused, color }) => (
                <Text
                  variant={focused ? "bold" : "regular"}
                  className={`${focused ? "text-accent-500" : "text-white"}`}
                  style={{ textAlign: "center", marginBottom: 4 }}
                >
                  {t(item.labelKey)}
                </Text>
              ),
              tabBarIcon: ({ color, size, focused }) => {
                const iconName = focused ? item.activeIconName ?? item.iconName : item.iconName

                return (
                  <View className="items-center justify-center">
                    {iconName ? (
                      <Ionicons
                        name={iconName}
                        size={focused ? size + 2 : size}
                        color={color}
                        style={{ transform: [{ scale: focused ? 1.08 : 0.92 }] }}
                      />
                    ) : (
                      <View className="relative">
                        {focused && <View className="bg-accent-500" style={{ width: size + 10 }} />}
                        <Image
                          source={item.icon}
                          style={{
                            width: size,
                            height: size,
                            tintColor: color,
                            resizeMode: "contain",
                            transform: [{ scale: focused ? 1.1 : 0.9 }],
                          }}
                        />
                      </View>
                    )}
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
