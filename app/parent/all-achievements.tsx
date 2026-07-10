"use client";

import React, { useState, useEffect, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Text } from "@/components/StyledText";
import { TranslatedText } from "@/components/translated-text";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase"; // Your Supabase client
import {
  AchievementCard,
  type AchievementChildBadge,
} from "@/components/games/achievements/AchievementCard";

import { 
    fetchAllDefinedAchievements, 
    fetchChildEarnedAchievements 
} from "@/components/games/achievements/achievementManager"; // Adjust path
import { AchievementDefinition, ChildAchievement } from "@/components/games/achievements/achievementTypes"; // Adjust path

// Type for child data needed on this screen
interface BasicChildInfo {
  id: string;
  name: string;
  avatar?: string;
}

// Type for processed achievement data
interface DisplayableMasterAchievement extends AchievementDefinition {
  earnedByChildren: BasicChildInfo[]; // List of children who earned this
}

interface GroupedAchievements {
  [gameKey: string]: DisplayableMasterAchievement[];
}

// Helper for game display names
const getGameDisplayName = (gameKey: string | null | undefined): string => {
    if (!gameKey) return "General Achievements";
    switch (gameKey) {
        case "counting_game": return "Counting Game";
        case "luganda_learning_game": return "Luganda Learning";
        case "learning_hub": return "Learning Hub";
        case "card_matching_game": return "Cultural Cards Match";
        case "word_game": return "Word Game";
        case "puzzle_game": return "Puzzle Game";
        default: return gameKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Default formatting
    }
};


export default function AllAchievementsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allDefinedAchievements, setAllDefinedAchievements] = useState<AchievementDefinition[]>([]);
  const [childrenProfiles, setChildrenProfiles] = useState<BasicChildInfo[]>([]);
  // Store earned achievements per child: Record<childId, ChildAchievement[]>
  const [earnedAchievementsByChild, setEarnedAchievementsByChild] = useState<Record<string, ChildAchievement[]>>({});
  // Add state for game filter
  const [selectedGameFilter, setSelectedGameFilter] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        // 1. Fetch current parent's children
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) {
          console.log("No active session found for achievements screen");
          setLoading(false);
          return;
        }
        const userId = sessionData.session.user.id;
        const { data: childrenData, error: childrenError } = await supabase
          .from("children")
          .select("id, name, gender")
          .eq("parent_id", userId)
          .is("deleted_at", null);

        if (childrenError) throw childrenError;

        const profiles: BasicChildInfo[] = childrenData?.map(c => ({
          id: c.id,
          name: c.name,
          avatar: c.gender === "male" ? "👦" : c.gender === "female" ? "👧" : "👶",
        })) || [];
        setChildrenProfiles(profiles);

        // 2. Fetch all defined achievements
        const definedAch = await fetchAllDefinedAchievements(); // Fetches all, not game-specific
        setAllDefinedAchievements(definedAch);

        // 3. For each child, fetch their earned achievements
        const earnedByChildMap: Record<string, ChildAchievement[]> = {};
        for (const child of profiles) {
          const earned = await fetchChildEarnedAchievements(child.id);
          earnedByChildMap[child.id] = earned;
        }
        setEarnedAchievementsByChild(earnedByChildMap);

      } catch (error) {
        console.error("Error fetching data for AllAchievementsScreen:", error);
        setErrorMessage("We could not load achievements right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Memoize processed achievements to avoid re-computation on every render
  const groupedAndProcessedAchievements = useMemo((): GroupedAchievements => {
    if (!allDefinedAchievements.length || !childrenProfiles.length) return {};

    const processed: DisplayableMasterAchievement[] = allDefinedAchievements.map(achDef => {
      const earnedBy: BasicChildInfo[] = [];
      for (const child of childrenProfiles) {
        const childsEarned = earnedAchievementsByChild[child.id] || [];
        if (childsEarned.some(earnedAch => earnedAch.achievement_id === achDef.id)) {
          earnedBy.push({ id: child.id, name: child.name, avatar: child.avatar });
        }
      }
      return { ...achDef, earnedByChildren: earnedBy };
    });

    // Group by game_key
    return processed.reduce((acc, ach) => {
      const key = ach.game_key || "general"; // Group achievements without a game_key under 'general'
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(ach);
      return acc;
    }, {} as GroupedAchievements);

  }, [allDefinedAchievements, childrenProfiles, earnedAchievementsByChild]);

  // Get unique game keys for the filter options
  const gameFilterOptions = useMemo(() => {
    const gameKeys = Object.keys(groupedAndProcessedAchievements);
    // Sort the game keys for consistent display order
    return gameKeys.sort((a, b) => getGameDisplayName(a).localeCompare(getGameDisplayName(b)));
  }, [groupedAndProcessedAchievements]);

  // Filter the achievements to display based on selected filter
  const filteredAchievements = useMemo(() => {
    if (!selectedGameFilter) {
      return groupedAndProcessedAchievements; // Show all when no filter selected
    }
    
    // Create a new object with only the selected game
    return {
      [selectedGameFilter]: groupedAndProcessedAchievements[selectedGameFilter] || []
    };
  }, [groupedAndProcessedAchievements, selectedGameFilter]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#7b5af0" />
        <Text className="mt-3 text-slate-600">Loading All Achievements...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-slate-50" edges={["top", "left", "right"]}>
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <TranslatedText variant="bold" className="text-xl text-gray-800">
            All Achievements
          </TranslatedText>
        </View>

        {/* Game Filter Tabs */}
        {gameFilterOptions.length > 0 && (
          <View className="bg-white border-b border-gray-100 pb-2">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 8 }}
            >
              {/* All Games filter option */}
              <TouchableOpacity 
                onPress={() => setSelectedGameFilter(null)}
                className={`px-3 py-2 mr-2 rounded-full ${!selectedGameFilter ? 'bg-indigo-100 border border-indigo-200' : 'bg-gray-50 border border-gray-200'}`}
              >
                <Text 
                  variant={!selectedGameFilter ? "medium" : "regular"} 
                  className={!selectedGameFilter ? "text-indigo-700" : "text-gray-500"}
                >
                  All Games
                </Text>
              </TouchableOpacity>
              
              {/* Game-specific filter options */}
              {gameFilterOptions.map(gameKey => (
                <TouchableOpacity 
                  key={gameKey}
                  onPress={() => setSelectedGameFilter(gameKey)}
                  className={`px-3 py-2 mr-2 rounded-full ${selectedGameFilter === gameKey ? 'bg-indigo-100 border border-indigo-200' : 'bg-gray-50 border border-gray-200'}`}
                >
                  <Text 
                    variant={selectedGameFilter === gameKey ? "medium" : "regular"} 
                    className={selectedGameFilter === gameKey ? "text-indigo-700" : "text-gray-500"}
                  >
                    {getGameDisplayName(gameKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <ScrollView className="flex-1" contentContainerStyle={styles.scrollContent}>
          {errorMessage && (
            <View style={styles.stateBox}>
              <Ionicons name="alert-circle-outline" size={42} color="#FF7B6C" />
              <Text className="text-slate-600 text-center mt-2">{errorMessage}</Text>
            </View>
          )}

          {Object.keys(filteredAchievements).length === 0 && !loading && !errorMessage && (
            <View style={styles.stateBox}>
                <Ionicons name="trophy-outline" size={48} color="#cbd5e1" />
                <Text className="text-slate-500 text-center mt-2">No badges yet. Complete Learning Hub lessons and games to see them here.</Text>
            </View>
          )}

          {Object.entries(filteredAchievements)
            // Optional: Sort game groups
            .sort(([gameKeyA], [gameKeyB]) => getGameDisplayName(gameKeyA).localeCompare(getGameDisplayName(gameKeyB)))
            .map(([gameKey, achievementsInGroup]) => (
            <View key={gameKey} className="p-4">
              <Text variant="bold" className="text-lg text-indigo-700 mb-3 border-b-2 border-indigo-200 pb-1">
                {getGameDisplayName(gameKey)}
              </Text>
              {achievementsInGroup.length > 0 ? (
                <View style={styles.cardList}>
                  {achievementsInGroup.map((ach) => {
                    const unearnedChildren: AchievementChildBadge[] = childrenProfiles.filter(
                      (child) =>
                        !ach.earnedByChildren.find((earnedChild) => earnedChild.id === child.id),
                    );

                    return (
                      <AchievementCard
                        key={ach.id}
                        achievement={ach}
                        unlocked={ach.earnedByChildren.length > 0}
                        earnedByChildren={ach.earnedByChildren}
                        unearnedChildren={unearnedChildren}
                        emptyEarnedText="No child has earned this badge yet."
                      />
                    );
                  })}
                </View>
              ) : (
                <Text className="text-slate-500">No achievements defined for this game yet.</Text>
              )}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 24,
  },
  stateBox: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  cardList: {
    gap: 12,
  },
});
