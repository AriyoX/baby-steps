import { Tabs } from "expo-router"
import { Image, View } from "react-native"
import { TranslatedText } from "@/components/translated-text"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { LanguageProvider } from "@/context/language-context"

type NavItem = {
  id: string
  icon: any
  label: string
}

// Your navigation items
const navigationItems: NavItem[] = [
  {
    id: "index",
    icon: require("@/assets/icons/game.png"),
    label: "Games",
  },
  {
    id: "coloring",
    icon: require("@/assets/icons/coloring.png"),
    label: "Coloring",
  },
  {
    id: "Stories",
    icon: require("@/assets/icons/logic.png"),
    label: "Stories",
  },
  {
    id: "museum",
    icon: require("@/assets/icons/museum.png"),
    label: "Museum",
  },
]

export default function TabLayout() {
  const insets = useSafeAreaInsets()
  return (
    <LanguageProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "rgba(123, 90, 240, 0.95)",
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
          // Active color is gold to match African theme
          tabBarActiveTintColor: "#FFD700",
          tabBarInactiveTintColor: "#fff",
          tabBarShowLabel: true,
        }}
      >
        {navigationItems.map((item) => (
          <Tabs.Screen
            key={item.id}
            name={item.id}
            options={{
              tabBarLabel: ({ focused, color }) => (
                <TranslatedText
                  variant={focused ? "bold" : "regular"}
                  className={`${focused ? "text-[#FFD700]" : "text-white"}`}
                  style={{ textAlign: "center", marginBottom: 4 }}
                >
                  {item.label}
                </TranslatedText>
              ),
              tabBarIcon: ({ color, size, focused }) => (
                <View className="items-center justify-center">
                  <View className="relative">
                    {focused && <View className="bg-[#FFD700]" style={{ width: size + 10 }} />}
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
                </View>
              ),
            }}
          />
        ))}
      </Tabs>
    </LanguageProvider>
  )
}
