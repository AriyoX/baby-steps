import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// Activity type definitions
export interface GameActivity {
  id?: string;
  child_id: string;
  activity_type: 'counting' | 'language' | 'cultural' | 'stories' | 'museum' | 'other' | 'words' | 'puzzle';
  activity_name: string;
  score?: number | string;
  duration?: number;
  completed_at: string;
  details?: string;
  stage?: number;
  level?: number;
}

interface Activity {
  child_id: string;
  activity_type: 'stories' | 'counting' | 'museum' | 'other' | 'cultural' | 'words' | 'puzzle' | 'language';
  activity_name: string;
  score?: string;
  duration?: number;
  completed_at: string;
  details?: string;
  stage?: number;
  level?: number;
}

/**
 * Save activity to Supabase
 */
export const saveActivity = async (activity: Activity): Promise<boolean> => {
  try {
    // Get child's name first
    const { data: childData } = await supabase
      .from('children')
      .select('name')
      .eq('id', activity.child_id)
      .single();

    if (!childData) {
      console.error('Child not found');
      return false;
    }

    // Add child's name to activity details
    const activityWithChildName = {
      ...activity,
      details: `${childData.name} ${activity.details || ''}`
    };

    const { error } = await supabase
      .from('activities')
      .insert([activityWithChildName]);

    if (error) {
      console.error('Error saving activity:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveActivity:', error);
    return false;
  }
};

/**
 * Get child's activities
 */
export const getChildActivities = async (childId: string) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

/**
 * Reset onboarding status for testing purposes
 */
export const resetOnboardingStatus = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem("@onboarding_completed");
    console.log("Onboarding status reset successfully");
  } catch (error) {
    console.error("Failed to reset onboarding status", error);
  }
};

/**
 * Check if onboarding has been completed
 */
export const hasCompletedOnboarding = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem("@onboarding_completed");
    return value === "true";
  } catch (error) {
    console.error("Failed to get onboarding status", error);
    return false;
  }
};

/**
 * Get formatted recent activities for parent dashboard
 */
export const getFormattedActivities = async (activities: Activity[]) => {
  // Get all unique child IDs from activities
  const childIds = [...new Set(activities.map(a => a.child_id))];
  
  // Fetch all child names at once
  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name')
    .in('id', childIds);

  // Create a map of child IDs to names
  const childNames = (childrenData || []).reduce((map, child) => {
    map[child.id] = child.name;
    return map;
  }, {} as Record<string, string>);

  return activities.map(activity => {
    let icon = 'star'; // default
    let color = '#FF9F43'; // default orange

    // Determine icon and color based on activity type
    switch (activity.activity_type) {
      case 'stories':
        icon = 'book';
        color = '#6C5CE7'; // purple
        break;
      case 'counting':
        icon = 'calculator';
        color = '#1DD1A1'; // green
        break;
      case 'museum':
        icon = 'university';
        color = '#FF6B6B'; // red
        break;
      case 'other':
        icon = 'award';
        color = '#54A0FF'; // blue
        break;
    }

    // Format relative time
    const date = new Date(activity.completed_at);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let timeDisplay;
    if (diffDays === 0) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      timeDisplay = `${hours}:${minutes.toString().padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`;
    } else if (diffDays === 1) {
      timeDisplay = 'Yesterday';
    } else if (diffDays <= 7) {
      timeDisplay = `${diffDays} days ago`;
    } else {
      timeDisplay = date.toLocaleDateString();
    }

    const childName = childNames[activity.child_id] || 'Unknown Child';

    return {
      id: Math.random().toString(),
      icon,
      color,
      childId: activity.child_id,
      childName,
      category: activity.activity_type,
      activity: activity.activity_name,
      time: timeDisplay,
      date: date.toLocaleDateString(),
      score: activity.score || 'Completed',
      details: activity.details
    };
  });
};

/**
 * Get summary statistics for a child's activities
 */
export const getActivityStats = async (childId: string) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('child_id', childId)
      .order('completed_at', { ascending: false });

    if (error) throw error;

    // Get activities from last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
    
    const recentActivities = data.filter(activity => 
      new Date(activity.completed_at) >= sevenDaysAgo
    );

    // Calculate daily activity minutes
    const dailyMinutes = new Array(7).fill(0);
    recentActivities.forEach(activity => {
      if (activity.duration) {
        const date = new Date(activity.completed_at);
        const dayIndex = 6 - Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          dailyMinutes[dayIndex] += Math.round(activity.duration / 60);
        }
      }
    });

    // Calculate completion rates
    const totalActivities = data.length;
    const completedWithScore = data.filter(a => a.score).length;
    const averageScore = data
      .filter(a => a.score)
      .reduce((acc, curr) => {
        const score = parseInt(curr.score!.replace('%', ''));
        return acc + (isNaN(score) ? 0 : score);
      }, 0) / (completedWithScore || 1);

    return {
      dailyMinutes,
      totalActivities,
      averageScore: Math.round(averageScore),
      recentActivities: getFormattedActivities(recentActivities.slice(0, 5)) // Get 5 most recent
    };
  } catch (error) {
    console.error('Error getting activity stats:', error);
    return null;
  }
};