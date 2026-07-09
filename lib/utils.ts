import AsyncStorage from "@react-native-async-storage/async-storage";
import { brandColors } from "@/constants/Brand";
import {
  hasCompletedOnboarding,
  resetOnboardingForDev,
} from "@/lib/onboarding";
import { supabase } from "./supabase";

// Activity type definitions
export type ActivityType =
  | 'counting'
  | 'language'
  | 'cultural'
  | 'stories'
  | 'museum'
  | 'other'
  | 'words'
  | 'puzzle';

export interface GameActivity {
  id?: string;
  child_id: string;
  activity_type: ActivityType | string;
  activity_name: string;
  score?: number | string;
  duration?: number;
  completed_at: string;
  details?: string;
  stage?: number;
  level?: number;
  language_code?: string;
}

export interface Activity {
  id?: string;
  child_id: string;
  activity_type: ActivityType | string;
  activity_name: string;
  score?: string;
  duration?: number;
  completed_at: string;
  details?: string;
  stage?: number;
  level?: number;
  language_code?: string;
}

export interface FormattedActivity {
  id: string;
  icon: string;
  color: string;
  childId: string;
  childName: string;
  category: string;
  categoryLabel: string;
  activity: string;
  time: string;
  date: string;
  score: string;
  details?: string;
}

export const RECENT_ACTIVITIES_CACHE_TTL_MS = 10 * 60 * 1000;
export const DEFAULT_RECENT_ACTIVITIES_LIMIT = 50;

type CacheEntry<T> = {
  version: number;
  loadedAt: number;
  data: T;
};

interface RecentActivitiesOptions {
  languageCode?: string;
  limit?: number;
  forceRefresh?: boolean;
  maxAgeMs?: number;
}

interface ActivityStatsOptions {
  limit?: number;
  forceRefresh?: boolean;
  maxAgeMs?: number;
}

const CACHE_VERSION = 1;
const RECENT_ACTIVITIES_CACHE_PREFIX = 'cache:activities:recent';
const recentActivitiesMemoryCache = new Map<string, CacheEntry<Activity[]>>();
const recentActivitiesBackgroundRefreshes = new Map<string, Promise<void>>();

export const getRecentActivitiesCacheKey = (
  childId: string,
  languageCode?: string,
): string => {
  const childKey = encodeURIComponent(childId);
  return languageCode
    ? `${RECENT_ACTIVITIES_CACHE_PREFIX}:${childKey}:${encodeURIComponent(languageCode)}`
    : `${RECENT_ACTIVITIES_CACHE_PREFIX}:${childKey}`;
};

const isActivityArray = (data: unknown): data is Activity[] => Array.isArray(data);

const parseCacheEntry = <T,>(
  value: string | null,
  isValidData: (data: unknown) => data is T,
): CacheEntry<T> | undefined => {
  if (!value) return undefined;

  try {
    const parsed = JSON.parse(value) as Partial<CacheEntry<unknown>>;
    if (
      parsed.version !== CACHE_VERSION ||
      typeof parsed.loadedAt !== 'number' ||
      !isValidData(parsed.data)
    ) {
      return undefined;
    }

    return parsed as CacheEntry<T>;
  } catch (error) {
    console.warn('Could not parse recent activities cache.', error);
    return undefined;
  }
};

const isCacheFresh = <T,>(entry: CacheEntry<T>, maxAgeMs: number): boolean =>
  Date.now() - entry.loadedAt <= maxAgeMs;

const readRecentActivitiesCache = async (
  cacheKey: string,
  maxAgeMs: number,
  allowExpired = false,
): Promise<CacheEntry<Activity[]> | undefined> => {
  const memoryEntry = recentActivitiesMemoryCache.get(cacheKey);
  if (memoryEntry && (allowExpired || isCacheFresh(memoryEntry, maxAgeMs))) {
    return memoryEntry;
  }

  try {
    const storedEntry = parseCacheEntry(
      await AsyncStorage.getItem(cacheKey),
      isActivityArray,
    );

    if (!storedEntry) {
      return undefined;
    }

    recentActivitiesMemoryCache.set(cacheKey, storedEntry);

    if (!allowExpired && !isCacheFresh(storedEntry, maxAgeMs)) {
      return undefined;
    }

    return storedEntry;
  } catch (error) {
    console.warn('Could not read recent activities cache.', error);
    return undefined;
  }
};

const writeRecentActivitiesCache = async (
  cacheKey: string,
  activities: Activity[],
): Promise<void> => {
  const entry: CacheEntry<Activity[]> = {
    version: CACHE_VERSION,
    loadedAt: Date.now(),
    data: activities,
  };

  recentActivitiesMemoryCache.set(cacheKey, entry);

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Could not write recent activities cache.', error);
  }
};

export const clearRecentActivitiesCache = async (
  childId?: string,
  languageCode?: string,
): Promise<void> => {
  if (childId) {
    const childCachePrefix = getRecentActivitiesCacheKey(childId);
    let keysToRemove = [childCachePrefix];

    if (languageCode) {
      keysToRemove.push(getRecentActivitiesCacheKey(childId, languageCode));
    } else {
      const keys = await AsyncStorage.getAllKeys();
      keysToRemove = keys.filter(
        (key) => key === childCachePrefix || key.startsWith(`${childCachePrefix}:`),
      );
    }

    keysToRemove.forEach((key) => recentActivitiesMemoryCache.delete(key));
    await AsyncStorage.multiRemove(keysToRemove);
    return;
  }

  recentActivitiesMemoryCache.clear();
  recentActivitiesBackgroundRefreshes.clear();

  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(
    keys.filter((key) => key.startsWith(`${RECENT_ACTIVITIES_CACHE_PREFIX}:`)),
  );
};

const fetchRecentActivitiesFromRemote = async (
  childId: string,
  options: Required<Pick<RecentActivitiesOptions, 'limit'>> &
    Pick<RecentActivitiesOptions, 'languageCode'>,
): Promise<Activity[]> => {
  let query = supabase
    .from('activities')
    .select('*')
    .eq('child_id', childId);

  if (options.languageCode) {
    query = query.eq('language_code', options.languageCode);
  }

  const { data, error } = await query
    .order('completed_at', { ascending: false })
    .limit(options.limit);

  if (error) throw error;
  return (data ?? []) as Activity[];
};

const refreshRecentActivitiesInBackground = (
  childId: string,
  cacheKey: string,
  options: Required<Pick<RecentActivitiesOptions, 'limit'>> &
    Pick<RecentActivitiesOptions, 'languageCode'>,
): void => {
  if (recentActivitiesBackgroundRefreshes.has(cacheKey)) {
    return;
  }

  const refresh = fetchRecentActivitiesFromRemote(childId, options)
    .then((activities) => writeRecentActivitiesCache(cacheKey, activities))
    .catch((error) => {
      console.warn(`Could not refresh recent activities cache for ${childId}.`, error);
    })
    .then(() => undefined)
    .finally(() => {
      recentActivitiesBackgroundRefreshes.delete(cacheKey);
    });

  recentActivitiesBackgroundRefreshes.set(cacheKey, refresh);
};

/**
 * Save activity to Supabase
 */
export const saveActivity = async (activity: Activity): Promise<boolean> => {
  try {
    // Get child's name first
    const { data: childData, error: childError } = await supabase
      .from('children')
      .select('name')
      .eq('id', activity.child_id)
      .is('deleted_at', null)
      .single();

    if (childError) {
      console.error('Error finding child for activity:', childError);
      return false;
    }

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

    await clearRecentActivitiesCache(activity.child_id, activity.language_code);

    return true;
  } catch (error) {
    console.error('Error in saveActivity:', error);
    return false;
  }
};

/**
 * Get child's activities
 */
export const getChildActivities = async (
  childId: string,
  options: RecentActivitiesOptions = {},
): Promise<Activity[]> => {
  if (!childId) return [];

  const limit = options.limit ?? DEFAULT_RECENT_ACTIVITIES_LIMIT;
  const maxAgeMs = options.maxAgeMs ?? RECENT_ACTIVITIES_CACHE_TTL_MS;
  const cacheKey = getRecentActivitiesCacheKey(childId, options.languageCode);

  if (!options.forceRefresh) {
    const cached = await readRecentActivitiesCache(cacheKey, maxAgeMs);
    if (cached) {
      return cached.data.slice(0, limit);
    }

    const staleCached = await readRecentActivitiesCache(cacheKey, maxAgeMs, true);
    if (staleCached) {
      refreshRecentActivitiesInBackground(childId, cacheKey, {
        languageCode: options.languageCode,
        limit,
      });
      return staleCached.data.slice(0, limit);
    }
  }

  try {
    const activities = await fetchRecentActivitiesFromRemote(childId, {
      languageCode: options.languageCode,
      limit,
    });
    await writeRecentActivitiesCache(cacheKey, activities);
    return activities;
  } catch (error) {
    console.error('Error fetching activities:', error);
    const cached = await readRecentActivitiesCache(cacheKey, maxAgeMs, true);
    return cached?.data.slice(0, limit) ?? [];
  }
};

export { hasCompletedOnboarding, resetOnboardingForDev };

export const resetOnboardingStatus = async (): Promise<void> => {
  await resetOnboardingForDev();
};

const titleizeActivityType = (activityType?: string | null): string => {
  const parts = activityType
    ?.split(/[_\s-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!parts?.length) {
    return 'Activity';
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const getActivityDisplay = (
  activityType?: string | null,
): { icon: string; color: string; label: string } => {
  switch (activityType) {
    case 'stories':
      return { icon: 'book', color: brandColors.victoriaBlue, label: 'Stories' };
    case 'counting':
      return { icon: 'calculator', color: brandColors.success, label: 'Counting' };
    case 'museum':
      return { icon: 'university', color: brandColors.shanaOrange, label: 'Museum' };
    case 'language':
      return { icon: 'graduation-cap', color: brandColors.victoriaBlue, label: 'Learning' };
    case 'other':
      return { icon: 'award', color: brandColors.equatorialGold, label: 'Other' };
    default:
      return {
        icon: 'star',
        color: brandColors.shanaOrange,
        label: titleizeActivityType(activityType),
      };
  }
};

const isLearningHubActivity = (activity: Activity): boolean =>
  activity.activity_type === 'language' &&
  (
    activity.details?.includes('source=learning_hub') ||
    /^Completed ".+" (Lesson|Stage)$/.test(activity.activity_name)
  );

const getParentSafeActivityDetails = (activity: Activity): string | undefined => {
  if (!activity.details) {
    return undefined;
  }

  if (isLearningHubActivity(activity)) {
    return undefined;
  }

  return activity.details;
};

const formatActivityDateParts = (
  completedAt: string,
): { time: string; date: string } => {
  const date = new Date(completedAt);

  if (Number.isNaN(date.getTime())) {
    return { time: 'Recently', date: 'Unknown Date' };
  }

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

  return {
    time: timeDisplay,
    date: date.toLocaleDateString(),
  };
};

/**
 * Get formatted recent activities for parent dashboard
 */
export const getFormattedActivities = async (
  activities: Activity[],
): Promise<FormattedActivity[]> => {
  if (activities.length === 0) {
    return [];
  }

  // Get all unique child IDs from activities
  const childIds = [...new Set(activities.map(a => a.child_id))];
  
  // Fetch all child names at once
  const { data: childrenData } = await supabase
    .from('children')
    .select('id, name')
    .in('id', childIds)
    .is('deleted_at', null);

  // Create a map of child IDs to names
  const childNames = (childrenData || []).reduce((map, child) => {
    map[child.id] = child.name;
    return map;
  }, {} as Record<string, string>);

  return activities.map(activity => {
    const display = getActivityDisplay(activity.activity_type);
    const dateParts = formatActivityDateParts(activity.completed_at);
    const childName = childNames[activity.child_id] || 'Unknown Child';

    return {
      id: activity.id || `${activity.child_id}:${activity.completed_at}:${activity.activity_name}`,
      icon: display.icon,
      color: display.color,
      childId: activity.child_id,
      childName,
      category: activity.activity_type,
      categoryLabel: display.label,
      activity: activity.activity_name,
      time: dateParts.time,
      date: dateParts.date,
      score: activity.score || 'Completed',
      details: getParentSafeActivityDetails(activity),
    };
  });
};

/**
 * Get summary statistics for a child's activities
 */
export const getActivityStats = async (
  childId: string,
  options: ActivityStatsOptions = {},
) => {
  try {
    const data = await getChildActivities(childId, {
      limit: options.limit ?? DEFAULT_RECENT_ACTIVITIES_LIMIT,
      forceRefresh: options.forceRefresh,
      maxAgeMs: options.maxAgeMs,
    });

    // Get activities from last 7 days
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
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
    const formattedRecentActivities = await getFormattedActivities(
      recentActivities.slice(0, 5),
    );

    return {
      dailyMinutes,
      totalActivities,
      averageScore: Math.round(averageScore),
      recentActivities: formattedRecentActivities // Get 5 most recent
    };
  } catch (error) {
    console.error('Error getting activity stats:', error);
    return null;
  }
};
