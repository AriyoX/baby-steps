import {
  getDefaultLearningLanguage,
  getFirstLessonByMechanic,
  getLearningHubStages,
  getLearningStageById,
  getLessonsForStage,
  getMechanicLabel,
  stageHasMechanicContent,
} from "../learningHubRepository";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "../languages";

const REQUIRED_STAGE_IDS = [
  "first-words",
  "family-home",
  "everyday-things",
  "culture-stories",
  "practice-mix",
];

describe("learning hub repository", () => {
  it("loads the five official MVP Learning hub stages", () => {
    const stages = getLearningHubStages("lg");

    expect(stages.map((stage) => stage.id)).toEqual(REQUIRED_STAGE_IDS);
    expect(stages.map((stage) => stage.title)).toEqual([
      "First Words",
      "Family & Home",
      "Everyday Things",
      "Culture & Stories",
      "Practice Mix",
    ]);
  });

  it("keeps stage ids unique", () => {
    const stageIds = getLearningHubStages("lg").map((stage) => stage.id);

    expect(new Set(stageIds).size).toBe(stageIds.length);
  });

  it("marks Practice Mix as practice and locked", () => {
    const practiceStage = getLearningStageById("lg", "practice-mix");

    expect(practiceStage).toEqual(
      expect.objectContaining({
        isPractice: true,
        isLocked: true,
        status: "locked",
      }),
    );
  });

  it("can find Stage 1 by id", () => {
    expect(getLearningStageById("lg", "first-words")).toEqual(
      expect.objectContaining({
        id: "first-words",
        stageNumber: 1,
        title: "First Words",
      }),
    );
  });

  it("can find a tap-to-learn lesson for Stage 1", () => {
    const lesson = getFirstLessonByMechanic("lg", "first-words", "tap_to_learn");

    expect(lesson).toEqual(
      expect.objectContaining({
        id: "greetings-1",
        mechanic: "tap_to_learn",
      }),
    );
    expect(lesson?.items.length).toBeGreaterThanOrEqual(5);
    expect(lesson?.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "thank-you",
          audioAsset: "webale",
        }),
        expect.objectContaining({
          id: "water",
          audioAsset: "amazzi",
        }),
      ]),
    );
    expect(stageHasMechanicContent("lg", "first-words", "tap_to_learn")).toBe(
      true,
    );
  });

  it("returns safe empty results for a missing stage", () => {
    expect(getLearningStageById("lg", "missing-stage")).toBeUndefined();
    expect(getLessonsForStage("lg", "missing-stage")).toEqual([]);
    expect(
      getFirstLessonByMechanic("lg", "missing-stage", "tap_to_learn"),
    ).toBeUndefined();
    expect(stageHasMechanicContent("lg", "missing-stage", "tap_to_learn")).toBe(
      false,
    );
  });

  it("does not expose Practice Mix as a startable tap-to-learn lesson", () => {
    expect(stageHasMechanicContent("lg", "practice-mix", "tap_to_learn")).toBe(
      false,
    );
  });

  it("requires child-facing copy and lesson placeholders for every stage", () => {
    const stages = getLearningHubStages("lg");

    for (const stage of stages) {
      expect(stage.title.trim()).toBeTruthy();
      expect(stage.description.trim()).toBeTruthy();
      expect(stage.placeholderMessage.trim()).toBeTruthy();
      expect(stage.learningGoals.length).toBeGreaterThan(0);
      expect(stage.lessons.length).toBeGreaterThan(0);
      expect(stage.lessonCount).toBe(stage.lessons.length);
    }
  });

  it("resolves planned mechanics to child-friendly labels", () => {
    expect(getMechanicLabel("tap_to_learn")).toBe("Tap to learn");
    expect(getMechanicLabel("listen_and_choose")).toBe("Listen and choose");
    expect(getMechanicLabel("match_word_picture")).toBe("Match pictures");
    expect(getMechanicLabel("choose_correct_word")).toBe("Pick the word");
    expect(getMechanicLabel("mini_quiz")).toBe("Quick quiz");
    expect(getMechanicLabel("story_bite")).toBe("Story question");
    expect(getMechanicLabel("cultural_card")).toBe("Culture card");
    expect(getMechanicLabel("practice_mix")).toBe("Practice mix");
  });

  it("falls back safely when a language has no Learning hub path yet", () => {
    expect(getDefaultLearningLanguage("nyn")).toBe(DEFAULT_LEARNING_LANGUAGE_CODE);
    expect(getDefaultLearningLanguage("missing-language")).toBe(
      DEFAULT_LEARNING_LANGUAGE_CODE,
    );
    expect(getLearningHubStages("nyn").map((stage) => stage.id)).toEqual(
      REQUIRED_STAGE_IDS,
    );
    expect(stageHasMechanicContent("nyn", "first-words", "tap_to_learn")).toBe(
      true,
    );
  });
});
