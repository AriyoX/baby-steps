import {
  getAvailableLearningLanguages,
  getDefaultLearningLanguageCode,
  getDefaultLearningLanguage,
  getFirstLessonByMechanic,
  getFirstStartableLessonForStage,
  getLearningContentBundle,
  getLearningHubStages,
  getLearningLanguageContent,
  getLearningStageById,
  getLessonById,
  getLessonItemCount,
  getLessonItemsForLesson,
  getLessonStatus,
  getLessonItemsForStage,
  getLessonsForStage,
  getMechanicLabel,
  getStartableLessonsForStage,
  isLessonLocked,
  isLessonStartable,
  isMechanicImplemented,
  stageHasMechanicContent,
} from "../learningHubRepository";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "../languages";
import type { ListenAndChooseItem } from "../learningHubTypes";

const REQUIRED_STAGE_IDS = [
  "first-words",
  "family-home",
  "everyday-things",
  "culture-stories",
  "practice-mix",
];

describe("learning hub repository", () => {
  it("loads a versioned DB-ready content bundle with a default language", () => {
    const bundle = getLearningContentBundle();

    expect(bundle.version).toBe("1.1");
    expect(bundle.defaultLanguage).toBe(DEFAULT_LEARNING_LANGUAGE_CODE);
    expect(bundle.languages.lg).toEqual(
      expect.objectContaining({
        languageCode: "lg",
        displayName: "Luganda",
        localName: "Oluganda",
      }),
    );
    expect(getDefaultLearningLanguageCode()).toBe(DEFAULT_LEARNING_LANGUAGE_CODE);
  });

  it("lists available local Learning hub language bundles", () => {
    expect(getAvailableLearningLanguages()).toEqual([
      expect.objectContaining({
        languageCode: "lg",
        displayName: "Luganda",
        localName: "Oluganda",
      }),
    ]);
  });

  it("loads the five official MVP Learning hub stages", () => {
    const stages = getLearningHubStages("lg");

    expect(stages.map((stage) => stage.id)).toEqual(REQUIRED_STAGE_IDS);
    expect(stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5]);
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

  it("can find Stage 1 by id", () => {
    expect(getLearningStageById("lg", "first-words")).toEqual(
      expect.objectContaining({
        id: "first-words",
        order: 1,
        stageNumber: 1,
        title: "First Words",
        readiness: "draft",
      }),
    );
  });

  it("finds a startable tap-to-learn lesson for Stage 1", () => {
    const lesson = getFirstStartableLessonForStage("lg", "first-words");

    expect(lesson).toEqual(
      expect.objectContaining({
        id: "greetings-1",
        mechanic: "tap_to_learn",
      }),
    );
    expect(stageHasMechanicContent("lg", "first-words", "tap_to_learn")).toBe(
      true,
    );
  });

  it("returns ordered lessons for a stage", () => {
    const lessons = getLessonsForStage("lg", "first-words");

    expect(lessons.map((lesson) => lesson.id)).toEqual([
      "greetings-1",
      "listen-greetings-1",
      "first-words-word-check",
    ]);
    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3]);
  });

  it("finds a specific lesson by lessonId", () => {
    expect(getLessonById("lg", "first-words", "listen-greetings-1")).toEqual(
      expect.objectContaining({
        id: "listen-greetings-1",
        title: "Listen Practice",
        mechanic: "listen_and_choose",
        order: 2,
        status: "startable",
      }),
    );
    expect(getLessonById("lg", "first-words", "missing-lesson")).toBeUndefined();
  });

  it("orders Stage 1 tap-to-learn items by item order", () => {
    const items = getLessonItemsForStage("lg", "first-words");

    expect(items.map((item) => item.id)).toEqual([
      "well-done",
      "thank-you",
      "mother",
      "father",
      "water",
    ]);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "thank-you",
          mechanic: "tap_to_learn",
          localText: "Webale",
          englishText: "Thank you",
          word: "Webale",
          translation: "Thank you",
          audioKey: "webale",
          audioAsset: "webale",
          order: 2,
        }),
        expect.objectContaining({
          id: "water",
          localText: "Amazzi",
          englishText: "Water",
          word: "Amazzi",
          translation: "Water",
          audioKey: "amazzi",
          audioAsset: "amazzi",
          order: 5,
        }),
      ]),
    );
  });

  it("returns ordered items for a specific lesson", () => {
    const items = getLessonItemsForLesson("lg", "first-words", "greetings-1");

    expect(items.map((item) => item.id)).toEqual([
      "well-done",
      "thank-you",
      "mother",
      "father",
      "water",
    ]);
    expect(getLessonItemCount("lg", "first-words", "greetings-1")).toBe(5);
    expect(getLessonItemsForLesson("lg", "first-words", "missing-lesson")).toEqual([]);
    expect(getLessonItemCount("lg", "first-words", "missing-lesson")).toBe(0);
  });

  it("normalizes tap-to-learn text and asset fields into a stable item shape", () => {
    const items = getLessonItemsForLesson("lg", "first-words", "greetings-1");

    expect(items[0]).toEqual(
      expect.objectContaining({
        id: "well-done",
        mechanic: "tap_to_learn",
        localText: "Gyebale ko",
        englishText: "Hello / well done",
        word: "Gyebale ko",
        translation: "Hello / well done",
        imageKey: "learning-beginner.jpg",
        readiness: "draft",
      }),
    );
    expect(items[1]).toEqual(
      expect.objectContaining({
        audioKey: "webale",
        audioAsset: "webale",
        imageKey: "learning-beginner.jpg",
      }),
    );
  });

  it("normalizes listen-and-choose items with stable ordered options", () => {
    const items = getLessonItemsForLesson("lg", "first-words", "listen-greetings-1");
    const listenItems = items.filter(
      (item): item is ListenAndChooseItem => item.mechanic === "listen_and_choose",
    );

    expect(listenItems.map((item) => item.id)).toEqual([
      "listen-gyebale-ko",
      "listen-webale",
    ]);
    expect(listenItems[0]).toEqual(
      expect.objectContaining({
        id: "listen-gyebale-ko",
        mechanic: "listen_and_choose",
        promptText: "Tap the word you hear",
        audioKey: "luganda.first_words.greetings.gyebale_ko",
        audioAsset: "placeholder_learning_cue",
        correctOptionId: "gyebale-ko",
        readiness: "placeholder",
      }),
    );
    expect(listenItems[0].options.map((option) => option.id)).toEqual([
      "gyebale-ko",
      "webale",
      "amazzi",
    ]);
    expect(listenItems[0].options.map((option) => option.order)).toEqual([1, 2, 3]);
    expect(listenItems[0].options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "gyebale-ko",
          localText: "Gyebale ko",
          englishText: "Hello / well done",
        }),
      ]),
    );
  });

  it("returns only startable implemented lessons for a stage", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const lessons = getLessonsForStage("lg", "first-words");

    expect(getStartableLessonsForStage("lg", "first-words").map((lesson) => lesson.id)).toEqual([
      "greetings-1",
      "listen-greetings-1",
    ]);
    expect(isLessonStartable(firstWordsStage, lessons[0])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[1])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[2])).toBe(false);
    expect(getLessonStatus(lessons[0], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[1], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[2], firstWordsStage)).toBe("coming_soon");
  });

  it("keeps malformed listen-and-choose lessons from becoming startable", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const listenLesson = getLessonById("lg", "first-words", "listen-greetings-1");
    const validItem = listenLesson?.items.find(
      (item): item is ListenAndChooseItem => item.mechanic === "listen_and_choose",
    );

    if (!listenLesson || !validItem) {
      throw new Error("Expected a normalized listen-and-choose lesson");
    }

    const missingCorrectIdLesson = {
      ...listenLesson,
      id: "missing-correct-option",
      items: [{ ...validItem, correctOptionId: "" }],
    };
    const invalidCorrectIdLesson = {
      ...listenLesson,
      id: "invalid-correct-option",
      items: [{ ...validItem, correctOptionId: "missing-option" }],
    };
    const malformedOptionsLesson = {
      ...listenLesson,
      id: "malformed-options",
      items: [
        {
          ...validItem,
          correctOptionId: "webale",
          options: [{ id: "webale", localText: "Webale" }],
        },
      ],
    };

    expect(() => getLessonStatus(missingCorrectIdLesson, firstWordsStage)).not.toThrow();
    expect(getLessonStatus(missingCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(invalidCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(malformedOptionsLesson, firstWordsStage)).toBe("empty");
  });

  it("marks empty lessons as not startable", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const lesson = getLessonById("lg", "first-words", "greetings-1");
    const emptyLesson = lesson ? { ...lesson, id: "empty-lesson", items: [] } : undefined;

    expect(getLessonStatus(emptyLesson, firstWordsStage)).toBe("empty");
    expect(isLessonStartable(firstWordsStage, emptyLesson)).toBe(false);
  });

  it("returns safe empty results for a missing stage", () => {
    expect(getLearningStageById("lg", "missing-stage")).toBeUndefined();
    expect(getLessonsForStage("lg", "missing-stage")).toEqual([]);
    expect(getLessonById("lg", "missing-stage", "missing-lesson")).toBeUndefined();
    expect(getLessonItemsForStage("lg", "missing-stage")).toEqual([]);
    expect(getLessonItemsForLesson("lg", "missing-stage", "missing-lesson")).toEqual([]);
    expect(getStartableLessonsForStage("lg", "missing-stage")).toEqual([]);
    expect(
      getFirstLessonByMechanic("lg", "missing-stage", "tap_to_learn"),
    ).toBeUndefined();
    expect(getFirstStartableLessonForStage("lg", "missing-stage")).toBeUndefined();
    expect(stageHasMechanicContent("lg", "missing-stage", "tap_to_learn")).toBe(
      false,
    );
    expect(getLessonStatus(undefined)).toBe("empty");
  });

  it("falls back safely when a language has no Learning hub path yet", () => {
    expect(getDefaultLearningLanguage("nyn")).toBe(DEFAULT_LEARNING_LANGUAGE_CODE);
    expect(getDefaultLearningLanguage("missing-language")).toBe(
      DEFAULT_LEARNING_LANGUAGE_CODE,
    );
    expect(getLearningHubStages("nyn").map((stage) => stage.id)).toEqual(
      REQUIRED_STAGE_IDS,
    );
    expect(getLearningLanguageContent("nyn")).toEqual(
      expect.objectContaining({
        languageCode: "lg",
        displayName: "Luganda",
      }),
    );
    expect(getLessonById("nyn", "first-words", "greetings-1")).toEqual(
      expect.objectContaining({
        id: "greetings-1",
        mechanic: "tap_to_learn",
      }),
    );
    expect(getFirstStartableLessonForStage("nyn", "first-words")).toEqual(
      expect.objectContaining({
        mechanic: "tap_to_learn",
      }),
    );
  });

  it("keeps Practice Mix locked and not startable", () => {
    const practiceStage = getLearningStageById("lg", "practice-mix");

    expect(practiceStage).toEqual(
      expect.objectContaining({
        isPractice: true,
        isLocked: true,
        status: "locked",
      }),
    );
    expect(getFirstStartableLessonForStage("lg", "practice-mix")).toBeUndefined();
    expect(getStartableLessonsForStage("lg", "practice-mix")).toEqual([]);
    expect(isLessonLocked(practiceStage?.lessons[0], practiceStage)).toBe(true);
    expect(getLessonStatus(practiceStage?.lessons[0], practiceStage)).toBe("locked");
    expect(isLessonStartable(practiceStage, practiceStage?.lessons[0])).toBe(false);
    expect(stageHasMechanicContent("lg", "practice-mix", "practice_mix")).toBe(
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
    expect(getMechanicLabel("cultural_card")).toBe("Culture card");
    expect(getMechanicLabel("choose_correct_word")).toBe("Pick the word");
    expect(getMechanicLabel("listen_and_choose")).toBe("Listen and choose");
    expect(getMechanicLabel("match_word_picture")).toBe("Match pictures");
    expect(getMechanicLabel("mini_quiz")).toBe("Quick quiz");
    expect(getMechanicLabel("story_bite")).toBe("Story question");
    expect(getMechanicLabel("practice_mix")).toBe("Practice mix");
  });

  it("keeps implemented and planned mechanic startability separate", () => {
    expect(isMechanicImplemented("tap_to_learn")).toBe(true);
    expect(isMechanicImplemented("listen_and_choose")).toBe(true);
    expect(isMechanicImplemented("choose_correct_word")).toBe(false);
    expect(isMechanicImplemented("mini_quiz")).toBe(false);
    expect(stageHasMechanicContent("lg", "first-words", "listen_and_choose")).toBe(
      true,
    );
    expect(stageHasMechanicContent("lg", "first-words", "choose_correct_word")).toBe(false);
  });
});
