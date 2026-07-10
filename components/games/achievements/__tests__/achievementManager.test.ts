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
  LEARNING_HUB_ACHIEVEMENT_DEFINITIONS,
  LEARNING_HUB_ACHIEVEMENT_IDS,
  LEARNING_HUB_GAME_KEY,
  awardAchievementToChild,
  clearAchievementCaches,
  checkAndGrantNewAchievements,
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

const mockSuccessfulSeededAward = (
  childId: string,
  achievementId: string,
  earnedId = `earned-${achievementId}`,
) => {
  (supabase.from as jest.Mock)
    .mockReturnValueOnce(createChildAchievementsQuery({ data: [], error: null }))
    .mockReturnValueOnce(createExistingAchievementQuery({ data: null, error: null }))
    .mockReturnValueOnce(
      createAwardInsertQuery({
        data: earned(earnedId, childId, achievementId),
        error: null,
      }),
    );
};

const getLearningDefinition = (achievementId: string): AchievementDefinition => {
  const definition = LEARNING_HUB_ACHIEVEMENT_DEFINITIONS.find(
    (achievement) => achievement.id === achievementId,
  );

  if (!definition) {
    throw new Error(`Missing Learning Hub achievement definition: ${achievementId}`);
  }

  return definition;
};

const createLearningEvent = (
  overrides: Partial<Parameters<typeof checkAndGrantNewAchievements>[0]["event"]> = {},
): Parameters<typeof checkAndGrantNewAchievements>[0]["event"] => ({
  type: "learning_hub_lesson_completed",
  gameKey: LEARNING_HUB_GAME_KEY,
  languageCode: "lg",
  stageId: "first-words",
  levelId: "greetings-1",
  lessonId: "greetings-1",
  completedLessonCount: 1,
  completedLessonIds: ["greetings-1"],
  stageStartableLessonIds: [
    "greetings-1",
    "listen-greetings-1",
    "first-words-word-check",
    "first-words-picture-match",
    "first-words-quick-review",
  ],
  mechanicTypes: ["tap_to_learn"],
  ...overrides,
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

    expect(allDefinitions.length).toBeGreaterThanOrEqual(7);
    expect(wordDefinitions.map((item) => item.id)).toEqual(["word-achievement"]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it("includes built-in Learning Hub definitions when remote definitions are empty", async () => {
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createDefinitionsQuery({
        data: [],
        error: null,
      }),
    );

    const learningDefinitions = await fetchAllDefinedAchievements(LEARNING_HUB_GAME_KEY);

    expect(learningDefinitions.map((item) => item.id).sort()).toEqual(
      LEARNING_HUB_ACHIEVEMENT_DEFINITIONS.map((item) => item.id).sort(),
    );
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

  it("prevents duplicate awards from the local child achievement cache", async () => {
    const existing = earned(
      "earned-existing",
      "child-1",
      LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_LEARNING_STEP,
    );
    (supabase.from as jest.Mock).mockReturnValueOnce(
      createChildAchievementsQuery({ data: [existing], error: null }),
    );

    await expect(
      awardAchievementToChild(
        "child-1",
        LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_LEARNING_STEP,
      ),
    ).resolves.toEqual(existing);

    jest.clearAllMocks();

    await expect(
      awardAchievementToChild(
        "child-1",
        LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_LEARNING_STEP,
      ),
    ).resolves.toEqual(existing);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe("Learning Hub achievement checks", () => {
  it("awards First Learning Step after any completed Learning Hub lesson", async () => {
    const definition = getLearningDefinition(
      LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_LEARNING_STEP,
    );
    mockSuccessfulSeededAward("child-1", definition.id);

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent(),
    });

    expect(newlyEarned.map((achievement) => achievement.id)).toEqual([definition.id]);
  });

  it("awards Learning Starter after 3 completed Learning Hub lessons", async () => {
    const definition = getLearningDefinition(
      LEARNING_HUB_ACHIEVEMENT_IDS.LEARNING_STARTER,
    );
    mockSuccessfulSeededAward("child-1", definition.id);

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent({
        completedLessonCount: 3,
        completedLessonIds: [
          "greetings-1",
          "listen-greetings-1",
          "first-words-word-check",
        ],
      }),
    });

    expect(newlyEarned.map((achievement) => achievement.id)).toEqual([definition.id]);
  });

  it("awards First Words Explorer after all startable First Words lessons", async () => {
    const definition = getLearningDefinition(
      LEARNING_HUB_ACHIEVEMENT_IDS.FIRST_WORDS_EXPLORER,
    );
    const firstWordsLessonIds = [
      "greetings-1",
      "listen-greetings-1",
      "first-words-word-check",
      "first-words-picture-match",
      "first-words-quick-review",
    ];
    mockSuccessfulSeededAward("child-1", definition.id);

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent({
        levelId: "first-words-quick-review",
        lessonId: "first-words-quick-review",
        completedLessonCount: firstWordsLessonIds.length,
        completedLessonIds: firstWordsLessonIds,
        stageStartableLessonIds: firstWordsLessonIds,
        mechanicTypes: ["mini_quiz"],
      }),
    });

    expect(newlyEarned.map((achievement) => achievement.id)).toEqual([definition.id]);
  });

  it("awards Quiz Helper after a mini quiz Learning Hub lesson", async () => {
    const definition = getLearningDefinition(LEARNING_HUB_ACHIEVEMENT_IDS.QUIZ_HELPER);
    mockSuccessfulSeededAward("child-1", definition.id);

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent({
        levelId: "family-mini-quiz",
        lessonId: "family-mini-quiz",
        mechanicTypes: ["mini_quiz"],
      }),
    });

    expect(newlyEarned.map((achievement) => achievement.id)).toEqual([definition.id]);
  });

  it("awards Story Listener after a story bite Learning Hub lesson", async () => {
    const definition = getLearningDefinition(
      LEARNING_HUB_ACHIEVEMENT_IDS.STORY_LISTENER,
    );
    mockSuccessfulSeededAward("child-1", definition.id);

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent({
        stageId: "family-home",
        levelId: "thank-you-at-home-story",
        lessonId: "thank-you-at-home-story",
        mechanicTypes: ["story_bite"],
      }),
    });

    expect(newlyEarned.map((achievement) => achievement.id)).toEqual([definition.id]);
  });

  it("does not award Learning Starter before 3 completed lessons", async () => {
    const definition = getLearningDefinition(
      LEARNING_HUB_ACHIEVEMENT_IDS.LEARNING_STARTER,
    );

    const newlyEarned = await checkAndGrantNewAchievements({
      childId: "child-1",
      definedAchievements: [definition],
      earnedAchievementIds: [],
      event: createLearningEvent({
        completedLessonCount: 2,
        completedLessonIds: ["greetings-1", "listen-greetings-1"],
      }),
    });

    expect(newlyEarned).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
