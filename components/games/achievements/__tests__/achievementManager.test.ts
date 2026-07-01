/* eslint-disable import/first, @typescript-eslint/no-require-imports */

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
  awardAchievementToChild,
  clearAchievementCaches,
  fetchAllDefinedAchievements,
  fetchChildEarnedAchievements,
  getChildAchievementsCacheKey,
} from "../achievementManager";
import type { AchievementDefinition, ChildAchievement } from "../achievementTypes";

const definition = (
  id: string,
  gameKey = "word_game",
): AchievementDefinition => ({
  id,
  name: id,
  description: `${id} description`,
  icon_name: "star",
  activity_type: "level_complete",
  points: 10,
  game_key: gameKey,
});

const earned = (
  id: string,
  childId: string,
  achievementId = "achievement-1",
): ChildAchievement => ({
  id,
  child_id: childId,
  achievement_id: achievementId,
  earned_at: "2026-01-01T00:00:00.000Z",
});

const createDefinitionsQuery = (
  result: { data: AchievementDefinition[] | null; error: unknown },
) => ({
  select: jest.fn().mockReturnThis(),
  order: jest.fn().mockResolvedValue(result),
});

const createChildAchievementsQuery = (
  result: { data: ChildAchievement[] | null; error: unknown },
) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockResolvedValue(result),
});

const createExistingAchievementQuery = (
  result: { data: ChildAchievement | null; error: unknown },
) => ({
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockResolvedValue(result),
});

const createAwardInsertQuery = (
  result: { data: ChildAchievement | null; error: unknown },
) => ({
  insert: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue(result),
    }),
  }),
});

beforeEach(async () => {
  jest.clearAllMocks();
  await clearAchievementCaches();
  await AsyncStorage.clear();
});

describe("achievement Supabase read cache", () => {
  it("caches achievement definitions and filters cached definitions by game key", async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createDefinitionsQuery({
        data: [definition("word-achievement"), definition("counting-achievement", "counting_game")],
        error: null,
      }),
    );

    const allDefinitions = await fetchAllDefinedAchievements();
    const wordDefinitions = await fetchAllDefinedAchievements("word_game");

    expect(allDefinitions).toHaveLength(2);
    expect(wordDefinitions.map((item) => item.id)).toEqual(["word-achievement"]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("keeps child achievement caches scoped by child", async () => {
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(
        createChildAchievementsQuery({ data: [earned("earned-1", "child-1")], error: null }),
      )
      .mockReturnValueOnce(
        createChildAchievementsQuery({ data: [earned("earned-2", "child-2")], error: null }),
      );

    const childOne = await fetchChildEarnedAchievements("child-1");
    const childTwo = await fetchChildEarnedAchievements("child-2");
    const cachedChildOne = await fetchChildEarnedAchievements("child-1");

    expect(childOne[0].child_id).toBe("child-1");
    expect(childTwo[0].child_id).toBe("child-2");
    expect(cachedChildOne[0].id).toBe("earned-1");
    expect(getChildAchievementsCacheKey("child-1")).not.toBe(
      getChildAchievementsCacheKey("child-2"),
    );
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it("updates the child-scoped cache after awarding an achievement", async () => {
    const awarded = earned("earned-new", "child-1", "achievement-new");
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createChildAchievementsQuery({ data: [], error: null }))
      .mockReturnValueOnce(createExistingAchievementQuery({ data: null, error: null }))
      .mockReturnValueOnce(createAwardInsertQuery({ data: awarded, error: null }));

    const result = await awardAchievementToChild("child-1", "achievement-new");
    const cachedEarned = await fetchChildEarnedAchievements("child-1");

    expect(result).toEqual(awarded);
    expect(cachedEarned).toEqual([awarded]);
    expect(supabase.from).toHaveBeenCalledTimes(3);
  });

  it("checks the exact remote child achievement before inserting when cache misses", async () => {
    const existing = earned("earned-existing", "child-1", "achievement-existing");
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createChildAchievementsQuery({ data: [], error: null }),
    );

    await fetchChildEarnedAchievements("child-1");
    jest.clearAllMocks();

    const existingQuery = createExistingAchievementQuery({
      data: existing,
      error: null,
    });
    (supabase.from as jest.Mock).mockReturnValueOnce(existingQuery);

    const result = await awardAchievementToChild(
      "child-1",
      "achievement-existing",
    );
    const cachedEarned = await fetchChildEarnedAchievements("child-1");

    expect(result).toEqual(existing);
    expect(cachedEarned).toEqual([existing]);
    expect(existingQuery.maybeSingle).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
