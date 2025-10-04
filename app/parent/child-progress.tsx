import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from "react-native";
import { Text } from "@/components/StyledText";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Ionicons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";

const progress = 0.75; // 75% Completion
const achievements = [
  {
    id: "1",
    title: "First Steps",
    description: "Completed the first activity!",
    icon: "walk-outline", // Changed from "footprints" to "walk-outline"
    iconType: "ionicons",
    color: "#10B981",
    achieved: true,
    date: "2 weeks ago",
  },
  {
    id: "2",
    title: "Explorer",
    description: "Visited 5 different sections",
    icon: "compass",
    iconType: "fontawesome",
    color: "#3B82F6",
    achieved: true,
    date: "1 week ago",
  },
  {
    id: "3",
    title: "Fast Learner",
    description: "Completed 10 challenges!",
    icon: "brain",
    iconType: "fontawesome",
    color: "#8B5CF6",
    achieved: true,
    date: "3 days ago",
  },
  {
    id: "4",
    title: "Buganda Historian",
    description: "Learned about Buganda culture!",
    icon: "book-open",
    iconType: "fontawesome",
    color: "#EC4899",
    achieved: true,
    date: "Yesterday",
  },
  {
    id: "5",
    title: "Math Master",
    description: "Completed all number challenges",
    icon: "calculator",
    iconType: "fontawesome",
    color: "#F59E0B",
    achieved: false,
    progress: 0.6,
    remaining: "2 challenges left",
  },
  {
    id: "6",
    title: "Spelling Champion",
    description: "Master spelling 100 words",
    icon: "pencil-alt", // Changed from "spellcheck" to "pencil-alt"
    iconType: "fontawesome",
    color: "#6366F1",
    achieved: false,
    progress: 0.3,
    remaining: "70 words to go",
  },
];

// Overall stats for the child
const stats = [
  { label: "Active Days", value: "14", icon: "calendar", color: "#10B981" },
  {
    label: "Activities Done",
    value: "23",
    icon: "play-circle",
    color: "#3B82F6",
  },
  { label: "Total Stars", value: "86", icon: "star", color: "#F59E0B" },
];

// Weekly activity data
const weeklyActivity = [
  { day: "Mon", minutes: 25 },
  { day: "Tue", minutes: 40 },
  { day: "Wed", minutes: 30 },
  { day: "Thu", minutes: 45 },
  { day: "Fri", minutes: 20 },
  { day: "Sat", minutes: 60 },
  { day: "Sun", minutes: 35 },
];

// Calculate maximum minutes for chart scaling
const maxMinutes = Math.max(...weeklyActivity.map((day) => day.minutes));
const totalMinutes = weeklyActivity.reduce((sum, day) => sum + day.minutes, 0);

export default function ProgressScreen() {
  const router = useRouter();

  // Helper function for icon opacity based on achievement status
  const getBackgroundOpacity = (color: string, achieved: boolean) => {
    return `${color}${achieved ? "20" : "10"}`;
  };

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView
        className="flex-1 bg-white"
        edges={["top", "left", "right"]}
      >
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text variant="bold" className="text-xl text-gray-800">
            Progress & Achievements
          </Text>
        </View>

        <ScrollView className="flex-1 px-4 pt-4 pb-6">
          {/* Stats Cards */}
          <View className="flex-row justify-between mb-6">
            {stats.map((stat, index) => (
              <View
                key={index}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 items-center w-[31%]"
              >
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mb-2"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <FontAwesome5 name={stat.icon} size={16} color={stat.color} />
                </View>
                <Text variant="bold" className="text-gray-800 text-lg">
                  {stat.value}
                </Text>
                <Text className="text-gray-500 text-xs text-center">
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {/* Main Progress Section */}
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <Text variant="bold" className="text-gray-800 text-lg mb-2">
              Learning Journey
            </Text>

            {/* Progress Circle */}
            <View className="items-center justify-center my-4">
              <View className="w-32 h-32 rounded-full border-[10px] border-purple-100 items-center justify-center">
                <View
                  className="absolute top-0 left-0 right-0 bottom-0 rounded-full"
                  style={{
                    borderWidth: 10,
                    borderLeftColor: "#7b5af0",
                    borderTopColor: "#7b5af0",
                    borderRightColor:
                      progress >= 0.5 ? "#7b5af0" : "transparent",
                    borderBottomColor:
                      progress >= 0.75 ? "#7b5af0" : "transparent",
                    transform: [{ rotate: `${progress * 360}deg` }],
                  }}
                />
                <Text variant="bold" className="text-2xl text-gray-800">
                  {Math.round(progress * 100)}%
                </Text>
                <Text className="text-gray-500 text-xs">Completed</Text>
              </View>
            </View>

            {/* Skill Breakdown */}
            <Text
              variant="medium"
              className="text-gray-800 text-base mt-2 mb-3"
            >
              Skill Breakdown
            </Text>

            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700">Reading</Text>
                <Text className="text-gray-700">85%</Text>
              </View>
              <View className="bg-purple-100 h-2 rounded-full overflow-hidden">
                <View
                  className="bg-[#7b5af0] h-full rounded-full"
                  style={{ width: "85%" }}
                />
              </View>
            </View>

            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700">Numbers</Text>
                <Text className="text-gray-700">70%</Text>
              </View>
              <View className="bg-purple-100 h-2 rounded-full overflow-hidden">
                <View
                  className="bg-[#7b5af0] h-full rounded-full"
                  style={{ width: "70%" }}
                />
              </View>
            </View>

            <View className="mb-2">
              <View className="flex-row justify-between mb-1">
                <Text className="text-gray-700">Culture</Text>
                <Text className="text-gray-700">60%</Text>
              </View>
              <View className="bg-purple-100 h-2 rounded-full overflow-hidden">
                <View
                  className="bg-[#7b5af0] h-full rounded-full"
                  style={{ width: "60%" }}
                />
              </View>
            </View>
          </View>

          {/* Weekly Activity */}
          <View className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
            <Text variant="bold" className="text-gray-800 text-lg mb-3">
              Weekly Activity
            </Text>

            <View className="flex-row justify-between items-end h-[120px] mb-2">
              {weeklyActivity.map((day, index) => (
                <View key={index} className="items-center flex-1">
                  <View
                    className="bg-[#7b5af0] rounded-t-lg w-[80%] max-w-6"
                    style={{
                      height: (day.minutes / maxMinutes) * 100,
                      opacity: 0.6 + (day.minutes / maxMinutes) * 0.4,
                    }}
                  />
                </View>
              ))}
            </View>

            <View className="flex-row justify-between">
              {weeklyActivity.map((day, index) => (
                <View key={index} className="items-center flex-1">
                  <Text className="text-gray-500 text-xs">{day.day}</Text>
                  <Text className="text-gray-700 text-xs mt-1">
                    {day.minutes}m
                  </Text>
                </View>
              ))}
            </View>

            <View className="flex-row items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <Text className="text-gray-800">Total this week:</Text>
              <Text variant="bold" className="text-[#7b5af0]">
                {totalMinutes} minutes
              </Text>
            </View>
          </View>

          {/* Achievements */}
          <Text variant="bold" className="text-gray-800 text-lg mb-3">
            Achievements
          </Text>

          {achievements.map((achievement) => (
            <View
              key={achievement.id}
              className={`flex-row items-center bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-3 ${
                !achievement.achieved ? "opacity-80" : ""
              }`}
            >
              <View
                className="w-12 h-12 rounded-full items-center justify-center mr-4"
                style={{
                  backgroundColor: getBackgroundOpacity(
                    achievement.color,
                    achievement.achieved
                  ),
                }}
              >
                {achievement.iconType === "fontawesome" ? (
                  <FontAwesome5
                    name={achievement.icon}
                    size={18}
                    color={achievement.color}
                    style={{ opacity: achievement.achieved ? 1 : 0.5 }}
                  />
                ) : (
                  <Ionicons
                    name={achievement.icon as any}
                    size={22}
                    color={achievement.color}
                    style={{ opacity: achievement.achieved ? 1 : 0.5 }}
                  />
                )}
              </View>

              <View className="flex-1">
                <View className="flex-row justify-between items-center">
                  <Text variant="medium" className="text-gray-800">
                    {achievement.title}
                  </Text>
                  {achievement.achieved ? (
                    <View className="flex-row items-center">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#10B981"
                      />
                      <Text className="text-gray-500 text-xs ml-1">
                        {achievement.date}
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-gray-500 text-xs">In progress</Text>
                  )}
                </View>

                <Text className="text-gray-600 text-sm mt-1">
                  {achievement.description}
                </Text>

                {!achievement.achieved && achievement.progress && (
                  <View className="mt-2">
                    <View className="bg-purple-100 h-2 rounded-full overflow-hidden">
                      <View
                        className="bg-[#7b5af0] h-full rounded-full"
                        style={{ width: `${achievement.progress * 100}%` }}
                      />
                    </View>
                    <Text className="text-gray-500 text-xs mt-1">
                      {achievement.remaining}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}
