jest.mock("@/lib/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import {
  clearRecentActivitiesCache,
  getChildActivities,
  getActivityStats,
  getRecentActivitiesCacheKey,
  saveActivity,
  type Activity,
} from "../utils";

const activity = (
  id: string,
  childId = "child-1",
  languageCode = "lg",
): Activity => ({
  id,
  child_id: childId,
  activity_type: "words",
  activity_name: `Activity ${id}`,
  completed_at: "2026-01-01T00:00:00.000Z",
  language_code: languageCode,
});

const createActivitiesQuery = (
  result: { data: Activity[] | null; error: unknown },
) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue(result),
});

const createChildNameQuery = () => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: { name: "Amina" }, error: null }),
});

const createChildrenLookupQuery = () => ({
  select: jest.fn().mockReturnThis(),
  in: jest.fn().mockResolvedValue({
    data: [{ id: "child-1", name: "Amina" }],
    error: null,
  }),
});

const createActivityInsertQuery = () => ({
  insert: jest.fn().mockResolvedValue({ error: null }),
});

beforeEach(async () => {
  jest.clearAllMocks();
  await clearRecentActivitiesCache();
  await AsyncStorage.clear();
});

describe("recent activity Supabase read cache", () => {
  it("returns cached recent activities without calling Supabase when fresh", async () => {
    const query = createActivitiesQuery({
      data: [activity("activity-1")],
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValueOnce(query);

    const first = await getChildActivities("child-1", { limit: 20 });
    const cached = await getChildActivities("child-1", { limit: 20 });

    expect(first).toEqual([activity("activity-1")]);
    expect(cached).toEqual(first);
    expect(query.limit).toHaveBeenCalledWith(20);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("keeps recent activity cache keys scoped by child and language", async () => {
    const lugandaQuery = createActivitiesQuery({
      data: [activity("lg-activity", "child-1", "lg")],
      error: null,
    });
    const runyankoleQuery = createActivitiesQuery({
      data: [activity("nyn-activity", "child-1", "nyn")],
      error: null,
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(lugandaQuery)
      .mockReturnValueOnce(runyankoleQuery);

    const luganda = await getChildActivities("child-1", { languageCode: "lg" });
    const runyankole = await getChildActivities("child-1", { languageCode: "nyn" });
    const cachedLuganda = await getChildActivities("child-1", { languageCode: "lg" });

    expect(luganda[0].language_code).toBe("lg");
    expect(runyankole[0].language_code).toBe("nyn");
    expect(cachedLuganda[0].id).toBe("lg-activity");
    expect(getRecentActivitiesCacheKey("child-1", "lg")).not.toBe(
      getRecentActivitiesCacheKey("child-1", "nyn"),
    );
    expect(lugandaQuery.eq).toHaveBeenCalledWith("language_code", "lg");
    expect(runyankoleQuery.eq).toHaveBeenCalledWith("language_code", "nyn");
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("invalidates recent activity cache after saving a meaningful activity", async () => {
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(
        createActivitiesQuery({ data: [activity("before")], error: null }),
      )
      .mockReturnValueOnce(createChildNameQuery())
      .mockReturnValueOnce(createActivityInsertQuery())
      .mockReturnValueOnce(
        createActivitiesQuery({ data: [activity("after")], error: null }),
      );

    await getChildActivities("child-1");
    const saved = await saveActivity({
      child_id: "child-1",
      activity_type: "words",
      activity_name: "Completed word level",
      completed_at: "2026-01-01T00:05:00.000Z",
      language_code: "lg",
    });
    const afterSave = await getChildActivities("child-1");

    expect(saved).toBe(true);
    expect(afterSave[0].id).toBe("after");
    expect(supabase.from).toHaveBeenCalledTimes(4);
  });

  it("uses the bounded recent activity reader for dashboard stats", async () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-08T12:00:00.000Z"));

    const activitiesQuery = createActivitiesQuery({
      data: [
        {
          ...activity("recent"),
          completed_at: "2026-01-08T10:00:00.000Z",
          duration: 120,
          score: "80%",
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(activitiesQuery)
      .mockReturnValueOnce(createChildrenLookupQuery());

    const stats = await getActivityStats("child-1");

    expect(activitiesQuery.limit).toHaveBeenCalledWith(50);
    expect(stats?.totalActivities).toBe(1);
    expect(stats?.averageScore).toBe(80);
    expect(stats?.recentActivities).toHaveLength(1);

    jest.useRealTimers();
  });
});
