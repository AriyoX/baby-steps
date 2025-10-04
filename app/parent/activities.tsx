import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Text } from "@/components/StyledText"; // Assuming this is correctly aliased
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { getChildActivities, getFormattedActivities } from "@/lib/utils"; // Ensure these utils exist

// Child interface
interface Child {
  id: string;
  name: string;
  avatar: string;
}

// Add this helper function near the top of your component
const capitalizeFirstLetter = (string: string) => {
  return string.charAt(0).toUpperCase() + string.slice(1);
};

export default function ActivitiesScreen() {
  const router = useRouter();
  interface Activity {
    id: string;
    icon: string;
    color: string;
    childId: string;
    childName: string;
    category: 'stories' | 'counting' | 'museum' | 'other' | 'cultural' | 'words' | 'puzzle' | 'language';
    activity: string;
    time: string; // Expected format like "HH:MM", "HH:MM AM/PM", or "HH:MM:SS"
    date: string; // Expected format parseable by `new Date()`, e.g., "Month Day, Year" or "YYYY-MM-DD"
    score: string;
    details: string | undefined;
  }

  const [activities, setActivities] = useState<Activity[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Helper to create a Date object from activity's date and time strings
  // Returns null if parsing fails
  const parseActivityDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr) return null;
    // Attempt common parsing. `new Date(string)` is quite flexible.
    // E.g., "April 15, 2024 10:30 AM" or "2024-04-15 14:30".
    let parsedDate = new Date(`${dateStr} ${timeStr}`);
    // If dateStr is YYYY-MM-DD and timeStr is HH:MM:SS (common from databases),
    // "YYYY-MM-DDTHH:MM:SS" is the most robust for `new Date()`.
    if (isNaN(parsedDate.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) {
      parsedDate = new Date(`${dateStr}T${timeStr}`);
    }
    return isNaN(parsedDate.getTime()) ? null : parsedDate;
  };


  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session?.user) {
          setLoading(false);
          return;
        }

        const { data: childrenData } = await supabase
          .from("children")
          .select("*")
          .eq("parent_id", sessionData.session.user.id);

        if (childrenData) {
          const transformedChildren = childrenData.map(child => ({
            id: child.id,
            name: child.name,
            avatar: child.gender === "male" ? "👦" : "👧"
          }));
          setChildren(transformedChildren);

          const activityPromises = childrenData.map(child => getChildActivities(child.id));
          const nestedActivities = await Promise.all(activityPromises);
          const allActivitiesRaw = nestedActivities.flat();
          
          const formattedActivities = await getFormattedActivities(allActivitiesRaw);
          
          const sortedActivities = formattedActivities.sort((a, b) => {
            const dateA_obj = parseActivityDateTime(a.date, a.time);
            const dateB_obj = parseActivityDateTime(b.date, b.time);

            if (!dateA_obj && !dateB_obj) return 0;
            if (!dateA_obj) return 1;  // Invalid A is "older"
            if (!dateB_obj) return -1; // Invalid B is "older"
            
            return dateB_obj.getTime() - dateA_obj.getTime(); // Descending (newest first)
          });
          
          setActivities(sortedActivities);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
    const channel = supabase
      .channel('activities-channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'activities' 
      }, (payload) => {
        // console.log('Change received!', payload);
        fetchData(); // Re-fetch data on any change
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredActivities = activities.filter(activity => {
    if (selectedChild !== "all" && activity.childId !== selectedChild) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!activity.activity.toLowerCase().includes(query) &&
          !activity.childName.toLowerCase().includes(query) &&
          !(activity.category?.toLowerCase().includes(query))) { // Handle potentially undefined category
        return false;
      }
    }
    if (filterCategory !== "all" && activity.category !== filterCategory) return false;
    return true;
  });
  
  const sortedFilteredActivities = filteredActivities.sort((a, b) => {
    // Primary sort is already done on `activities`. This sort refines for items with the same date string.
    if (a.date === b.date) {
      // Helper to parse only time string for comparison
      const parseTime = (timeStr: string): Date | null => {
        if (!timeStr) return null;
        // Use a fixed date as context for time parsing
        let parsedTime = new Date(`01/01/1970 ${timeStr}`); // Handles "10:30 AM" or "10:30"
        if (isNaN(parsedTime.getTime()) && /^\d{2}:\d{2}(:\d{2})?$/.test(timeStr)) { // Handles "HH:MM" or "HH:MM:SS"
          parsedTime = new Date(`1970-01-01T${timeStr}`);
        }
        return isNaN(parsedTime.getTime()) ? null : parsedTime;
      };
      
      const timeA_obj = parseTime(a.time);
      const timeB_obj = parseTime(b.time);

      if (!timeA_obj && !timeB_obj) return 0;
      if (!timeA_obj) return 1; 
      if (!timeB_obj) return -1;
      
      return timeB_obj.getTime() - timeA_obj.getTime(); // Most recent time first
    }
    // If dates are different, preserve the order from `filteredActivities`
    // (which is already sorted chronologically by the main sort).
    return 0;
  });

  const groupedActivities = sortedFilteredActivities.reduce<Record<string, Activity[]>>((groups, activity) => {
    const dateKey = activity.date || 'Unknown Date'; // Use a fallback for undefined/empty dates
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    return groups;
  }, {});

  const categories = Array.from(
    new Set(activities.map(activity => activity.category).filter((category): category is Activity['category'] => !!category))
  );

  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView className="flex-1 bg-white" edges={["top", "left", "right"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text variant="bold" className="text-xl text-gray-800">
            All Activities
          </Text>
        </View>

        <View className="px-4 py-3 border-b border-gray-100">
          <View className="flex-row items-center bg-gray-100 rounded-lg px-3 py-2">
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search activities..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="px-4 py-3 border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 ${
                selectedChild === "all" ? "bg-[#7b5af0]" : "bg-gray-100"
              }`}
              onPress={() => setSelectedChild("all")}
            >
              <Text
                className={selectedChild === "all" ? "text-white" : "text-gray-800"}
              >
                All Children
              </Text>
            </TouchableOpacity>
            {children.map((child) => (
              <TouchableOpacity
                key={child.id}
                className={`flex-row items-center px-3 py-1 rounded-full mr-2 ${
                  selectedChild === child.id ? "bg-[#7b5af0]" : "bg-gray-100"
                }`}
                onPress={() => setSelectedChild(child.id)}
              >
                <Text className="mr-1">{child.avatar}</Text>
                <Text
                  className={
                    selectedChild === child.id ? "text-white" : "text-gray-800"
                  }
                >
                  {child.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="px-4 py-3 border-b border-gray-100">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              className={`px-3 py-1 rounded-full mr-2 ${
                filterCategory === "all" ? "bg-[#7b5af0]" : "bg-gray-100"
              }`}
              onPress={() => setFilterCategory("all")}
            >
              <Text
                className={
                  filterCategory === "all" ? "text-white" : "text-gray-800"
                }
              >
                All Categories
              </Text>
            </TouchableOpacity>
            {categories.map((category) => ( // Key should be stable, category name itself is fine if unique
              <TouchableOpacity
                key={category} 
                className={`px-3 py-1 rounded-full mr-2 ${
                  filterCategory === category ? "bg-[#7b5af0]" : "bg-gray-100"
                }`}
                onPress={() => setFilterCategory(category)}
              >
                <Text
                  className={
                    filterCategory === category ? "text-white" : "text-gray-800"
                  }
                >
                  {capitalizeFirstLetter(category)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView className="flex-1">
          {loading ? (
            <View className="p-10 items-center justify-center">
              <Text>Loading activities...</Text>
            </View>
          ) : sortedFilteredActivities.length === 0 ? (
            <View className="p-10 items-center justify-center">
              <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
              <Text className="text-gray-500 text-center mt-4">
                No activities match your filters.
              </Text>
              <TouchableOpacity
                className="mt-4 bg-[#7b5af0] px-4 py-2 rounded-full"
                onPress={() => {
                  setSelectedChild("all");
                  setSearchQuery("");
                  setFilterCategory("all");
                }}
              >
                <Text className="text-white">Clear Filters</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(groupedActivities)
              .sort(([dateAString], [dateBString]) => {
                if (dateAString === 'Unknown Date' && dateBString === 'Unknown Date') return 0;
                if (dateAString === 'Unknown Date') return 1; 
                if (dateBString === 'Unknown Date') return -1;

                const dateA_obj = new Date(dateAString); // Assumes date string key is parseable
                const dateB_obj = new Date(dateBString);

                if (isNaN(dateA_obj.getTime()) && isNaN(dateB_obj.getTime())) return 0;
                if (isNaN(dateA_obj.getTime())) return 1;
                if (isNaN(dateB_obj.getTime())) return -1;
                
                return dateB_obj.getTime() - dateA_obj.getTime(); // Descending (newest date group first)
              })
              .map(([date, dateActivities]) => (
                <View key={date} className="mb-4">
                  <View className="px-4 py-2 bg-gray-50">
                    <Text variant="medium" className="text-gray-500">
                      {date}
                    </Text>
                  </View>
                  {dateActivities.map((activity) => (
                    <TouchableOpacity
                      key={activity.id}
                      className="px-4 py-3 border-b border-gray-100"
                      // onPress={() => router.push(`/activity-detail/${activity.id}`)} // Example for navigation
                    >
                      <View className="flex-row">
                        <View
                          style={{ backgroundColor: `${activity.color}15` }} // Ensure color is a hex string
                          className="w-12 h-12 rounded-full items-center justify-center mr-3"
                        >
                          <FontAwesome5
                            name={activity.icon}
                            size={18}
                            color={activity.color}
                          />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-sm bg-purple-100 text-[#7b5af0] px-2 py-0.5 rounded-full mr-2">
                              {activity.childName}
                            </Text>
                            <Text className="text-xs text-gray-500">
                              {activity.time}
                            </Text>
                          </View>
                          <Text variant="medium" className="text-gray-800 mt-1">
                            {activity.activity}
                          </Text>
                          <View className="flex-row justify-between items-center mt-1">
                            <View className="flex-row items-center">
                              {activity.category && ( // Conditionally render category if it exists
                                <Text className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                  {capitalizeFirstLetter(activity.category)}
                                </Text>
                              )}
                            </View>
                            <Text className="text-[#7b5af0] font-medium">
                              {activity.score}
                            </Text>
                          </View>
                          {activity.details && (
                            <Text className="text-gray-600 text-sm mt-1">
                              {activity.details}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}