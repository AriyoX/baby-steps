import {
  getAvailableLearningLanguages,
  getDefaultLearningLanguageCode,
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
  resolveLearningHubLanguageCode,
  stageHasMechanicContent,
} from "../learningHubRepository";
import { DEFAULT_LEARNING_LANGUAGE_CODE } from "../languages";
import type {
  ChooseCorrectWordItem,
  CulturalCardItem,
  ListenAndChooseItem,
  MatchWordPictureItem,
  MiniQuizItem,
  StoryBiteItem,
} from "../learningHubTypes";

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
      "first-words-picture-match",
      "first-words-quick-review",
    ]);
    expect(lessons.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5]);
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

  it("normalizes choose-correct-word items with stable option ids", () => {
    const items = getLessonItemsForLesson("lg", "first-words", "first-words-word-check");
    const chooseItems = items.filter(
      (item): item is ChooseCorrectWordItem => item.mechanic === "choose_correct_word",
    );

    expect(chooseItems.map((item) => item.id)).toEqual([
      "choose-thank-you",
      "choose-water",
    ]);
    expect(chooseItems[0]).toEqual(
      expect.objectContaining({
        id: "choose-thank-you",
        mechanic: "choose_correct_word",
        promptText: "Which word means Thank you?",
        questionText: "Thank you",
        correctOptionId: "webale",
        readiness: "placeholder",
      }),
    );
    expect(chooseItems[0].options.map((option) => option.id)).toEqual([
      "webale",
      "amazzi",
      "maama",
    ]);
    expect(chooseItems[0].options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "webale",
          localText: "Webale",
          englishText: "Thank you",
        }),
      ]),
    );
  });

  it("normalizes match-word-picture items with stable option ids and visual fallbacks", () => {
    const items = getLessonItemsForLesson(
      "lg",
      "first-words",
      "first-words-picture-match",
    );
    const matchItems = items.filter(
      (item): item is MatchWordPictureItem => item.mechanic === "match_word_picture",
    );

    expect(matchItems.map((item) => item.id)).toEqual([
      "match-water-picture",
      "match-mother-picture",
    ]);
    expect(matchItems[0]).toEqual(
      expect.objectContaining({
        id: "match-water-picture",
        mechanic: "match_word_picture",
        promptText: "Tap the picture that matches",
        targetText: "Amazzi",
        targetEnglishText: "Water",
        correctOptionId: "water",
        readiness: "placeholder",
      }),
    );
    expect(matchItems[0].options.map((option) => option.id)).toEqual([
      "water",
      "mother",
      "father",
    ]);
    expect(matchItems[0].options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "water",
          localText: "Amazzi",
          englishText: "Water",
          imageKey: "rain.jpg",
          emoji: "💧",
        }),
      ]),
    );
  });

  it("normalizes the First Words quick-review mini quiz", () => {
    const items = getLessonItemsForLesson(
      "lg",
      "first-words",
      "first-words-quick-review",
    );
    const quizItems = items.filter(
      (item): item is MiniQuizItem => item.mechanic === "mini_quiz",
    );

    expect(quizItems.map((item) => item.id)).toEqual([
      "first-words-review-questions",
    ]);
    expect(quizItems[0]).toEqual(
      expect.objectContaining({
        id: "first-words-review-questions",
        mechanic: "mini_quiz",
        title: "First Words Review",
        instructions: "Choose the best answer.",
        readiness: "placeholder",
      }),
    );
    expect(quizItems[0].questions.map((question) => question.id)).toEqual([
      "thank-you-word",
      "water-word",
    ]);
    expect(quizItems[0].questions[0]).toEqual(
      expect.objectContaining({
        promptText: "Which word means Thank you?",
        correctOptionId: "webale",
        explanationText: "Webale means Thank you.",
      }),
    );
  });

  it("normalizes mini-quiz items with stable question and option ids", () => {
    const items = getLessonItemsForLesson("lg", "family-home", "family-mini-quiz");
    const quizItems = items.filter(
      (item): item is MiniQuizItem => item.mechanic === "mini_quiz",
    );

    expect(quizItems.map((item) => item.id)).toEqual(["family-words-review"]);
    expect(quizItems[0]).toEqual(
      expect.objectContaining({
        id: "family-words-review",
        mechanic: "mini_quiz",
        title: "Family Words Review",
        instructions: "Choose the best answer.",
        readiness: "placeholder",
      }),
    );
    expect(quizItems[0].questions.map((question) => question.id)).toEqual([
      "mother-word",
      "father-word",
      "child-word",
    ]);
    expect(quizItems[0].questions[0]).toEqual(
      expect.objectContaining({
        promptText: "Which word means Mother?",
        promptEnglishText: "Mother",
        correctOptionId: "maama",
        explanationText: "Maama means Mother.",
      }),
    );
    expect(quizItems[0].questions[0].options.map((option) => option.id)).toEqual([
      "maama",
      "taata",
      "omwana",
    ]);
    expect(quizItems[0].questions[0].options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "maama",
          text: "Maama",
          englishText: "Mother",
        }),
      ]),
    );
  });

  it("normalizes cultural-card items with child-friendly card fields", () => {
    const items = getLessonItemsForLesson("lg", "family-home", "home-greeting-card");
    const cardItems = items.filter(
      (item): item is CulturalCardItem => item.mechanic === "cultural_card",
    );

    expect(cardItems.map((item) => item.id)).toEqual(["morning-greeting-home"]);
    expect(cardItems[0]).toEqual(
      expect.objectContaining({
        id: "morning-greeting-home",
        mechanic: "cultural_card",
        title: "Morning Greeting at Home",
        localTitle: "Oluganda",
        localText: "Wasuze otya?",
        bodyText:
          "In many Ugandan homes, morning greetings are a caring way to begin the day. In Luganda, one person can ask Wasuze otya?",
        funFact: "Wasuze otya? means How did you sleep?",
        reflectionPrompt: "Who could you greet kindly this morning?",
        readiness: "placeholder",
      }),
    );
  });

  it("normalizes story-bite items with ordered child-friendly pages", () => {
    const items = getLessonItemsForLesson("lg", "family-home", "thank-you-at-home-story");
    const storyItems = items.filter(
      (item): item is StoryBiteItem => item.mechanic === "story_bite",
    );

    expect(storyItems.map((item) => item.id)).toEqual(["thank-you-at-home-pages"]);
    expect(storyItems[0]).toEqual(
      expect.objectContaining({
        id: "thank-you-at-home-pages",
        mechanic: "story_bite",
        title: "Thank You at Home",
        instructions: "Read each small page.",
        reflectionPrompt: "Who can you thank at home today?",
        readiness: "placeholder",
      }),
    );
    expect(storyItems[0].pages.map((page) => page.id)).toEqual([
      "helping-at-home",
      "kind-words",
    ]);
    expect(storyItems[0].pages[0]).toEqual(
      expect.objectContaining({
        title: "Helping at Home",
        localTitle: "Awaka",
        bodyText: "Ari helps Maama place cups on the table before breakfast.",
        localText: "Awaka means at home.",
        imageKey: "child.png",
      }),
    );
    expect(storyItems[0].pages[1]).toEqual(
      expect.objectContaining({
        title: "Kind Words",
        bodyText: "Maama smiles and says Webale. Ari says Webale nyo.",
        audioKey: "webale",
        audioAsset: "webale",
      }),
    );
  });

  it("returns only startable implemented lessons for a stage", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const lessons = getLessonsForStage("lg", "first-words");

    expect(getStartableLessonsForStage("lg", "first-words").map((lesson) => lesson.id)).toEqual([
      "greetings-1",
      "listen-greetings-1",
      "first-words-word-check",
      "first-words-picture-match",
      "first-words-quick-review",
    ]);
    expect(isLessonStartable(firstWordsStage, lessons[0])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[1])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[2])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[3])).toBe(true);
    expect(isLessonStartable(firstWordsStage, lessons[4])).toBe(true);
    expect(getLessonStatus(lessons[0], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[1], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[2], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[3], firstWordsStage)).toBe("startable");
    expect(getLessonStatus(lessons[4], firstWordsStage)).toBe("startable");
  });

  it("returns startable polished lessons for Family & Home and Everyday Things", () => {
    expect(getStartableLessonsForStage("lg", "family-home").map((lesson) => lesson.id)).toEqual([
      "family-names-1",
      "home-things-1",
      "family-pick-word",
      "family-mini-quiz",
      "home-greeting-card",
      "thank-you-at-home-story",
    ]);
    expect(getStartableLessonsForStage("lg", "everyday-things").map((lesson) => lesson.id)).toEqual([
      "food-objects-1",
      "animals-objects-1",
      "daily-review-1",
    ]);
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

  it("keeps malformed choose-correct-word lessons from becoming startable", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const chooseLesson = getLessonById("lg", "first-words", "first-words-word-check");
    const validItem = chooseLesson?.items.find(
      (item): item is ChooseCorrectWordItem => item.mechanic === "choose_correct_word",
    );

    if (!chooseLesson || !validItem) {
      throw new Error("Expected a normalized choose-correct-word lesson");
    }

    const missingCorrectIdLesson = {
      ...chooseLesson,
      id: "missing-correct-word-option",
      items: [{ ...validItem, correctOptionId: "" }],
    };
    const invalidCorrectIdLesson = {
      ...chooseLesson,
      id: "invalid-correct-word-option",
      items: [{ ...validItem, correctOptionId: "missing-option" }],
    };
    const malformedOptionsLesson = {
      ...chooseLesson,
      id: "malformed-word-options",
      items: [
        {
          ...validItem,
          correctOptionId: "webale",
          options: [{ id: "webale", localText: "Webale" }],
        },
      ],
    };
    const duplicateOptionIdsLesson = {
      ...chooseLesson,
      id: "duplicate-word-options",
      items: [
        {
          ...validItem,
          options: [
            { id: "webale", localText: "Webale" },
            { id: "webale", localText: "Webale" },
          ],
        },
      ],
    };

    expect(() => getLessonStatus(missingCorrectIdLesson, firstWordsStage)).not.toThrow();
    expect(getLessonStatus(missingCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(invalidCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(malformedOptionsLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(duplicateOptionIdsLesson, firstWordsStage)).toBe("empty");
  });

  it("keeps malformed match-word-picture lessons from becoming startable", () => {
    const firstWordsStage = getLearningStageById("lg", "first-words");
    const matchLesson = getLessonById("lg", "first-words", "first-words-picture-match");
    const validItem = matchLesson?.items.find(
      (item): item is MatchWordPictureItem => item.mechanic === "match_word_picture",
    );

    if (!matchLesson || !validItem) {
      throw new Error("Expected a normalized match-word-picture lesson");
    }

    const missingCorrectIdLesson = {
      ...matchLesson,
      id: "missing-picture-correct-option",
      items: [{ ...validItem, correctOptionId: "" }],
    };
    const invalidCorrectIdLesson = {
      ...matchLesson,
      id: "invalid-picture-correct-option",
      items: [{ ...validItem, correctOptionId: "missing-option" }],
    };
    const malformedOptionsLesson = {
      ...matchLesson,
      id: "malformed-picture-options",
      items: [
        {
          ...validItem,
          correctOptionId: "water",
          options: [{ id: "water", localText: "Amazzi", emoji: "💧" }],
        },
      ],
    };
    const duplicateOptionIdsLesson = {
      ...matchLesson,
      id: "duplicate-picture-options",
      items: [
        {
          ...validItem,
          options: [
            { id: "water", localText: "Amazzi", emoji: "💧" },
            { id: "water", localText: "Amazzi", emoji: "💧" },
          ],
        },
      ],
    };

    expect(() => getLessonStatus(missingCorrectIdLesson, firstWordsStage)).not.toThrow();
    expect(getLessonStatus(missingCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(invalidCorrectIdLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(malformedOptionsLesson, firstWordsStage)).toBe("empty");
    expect(getLessonStatus(duplicateOptionIdsLesson, firstWordsStage)).toBe("empty");
  });

  it("keeps malformed mini-quiz lessons from becoming startable", () => {
    const familyStage = getLearningStageById("lg", "family-home");
    const quizLesson = getLessonById("lg", "family-home", "family-mini-quiz");
    const validItem = quizLesson?.items.find(
      (item): item is MiniQuizItem => item.mechanic === "mini_quiz",
    );

    if (!quizLesson || !validItem) {
      throw new Error("Expected a normalized mini-quiz lesson");
    }

    const missingCorrectIdLesson = {
      ...quizLesson,
      id: "missing-quiz-correct-option",
      items: [
        {
          ...validItem,
          questions: [
            {
              ...validItem.questions[0],
              correctOptionId: "",
            },
          ],
        },
      ],
    };
    const invalidCorrectIdLesson = {
      ...quizLesson,
      id: "invalid-quiz-correct-option",
      items: [
        {
          ...validItem,
          questions: [
            {
              ...validItem.questions[0],
              correctOptionId: "missing-option",
            },
          ],
        },
      ],
    };
    const malformedOptionsLesson = {
      ...quizLesson,
      id: "malformed-quiz-options",
      items: [
        {
          ...validItem,
          questions: [
            {
              ...validItem.questions[0],
              options: [{ id: "maama", text: "Maama" }],
            },
          ],
        },
      ],
    };
    const emptyQuestionsLesson = {
      ...quizLesson,
      id: "empty-quiz-questions",
      items: [{ ...validItem, questions: [] }],
    };

    expect(() => getLessonStatus(missingCorrectIdLesson, familyStage)).not.toThrow();
    expect(getLessonStatus(missingCorrectIdLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(invalidCorrectIdLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(malformedOptionsLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(emptyQuestionsLesson, familyStage)).toBe("empty");
  });

  it("keeps malformed cultural-card lessons from becoming startable", () => {
    const familyStage = getLearningStageById("lg", "family-home");
    const cardLesson = getLessonById("lg", "family-home", "home-greeting-card");
    const validItem = cardLesson?.items.find(
      (item): item is CulturalCardItem => item.mechanic === "cultural_card",
    );

    if (!cardLesson || !validItem) {
      throw new Error("Expected a normalized cultural-card lesson");
    }

    const missingTitleLesson = {
      ...cardLesson,
      id: "missing-cultural-card-title",
      items: [{ ...validItem, title: "" }],
    };
    const missingBodyLesson = {
      ...cardLesson,
      id: "missing-cultural-card-body",
      items: [{ ...validItem, bodyText: "" }],
    };

    expect(() => getLessonStatus(missingTitleLesson, familyStage)).not.toThrow();
    expect(getLessonStatus(missingTitleLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(missingBodyLesson, familyStage)).toBe("empty");
    expect(isLessonStartable(familyStage, missingBodyLesson)).toBe(false);
  });

  it("keeps malformed story-bite lessons from becoming startable", () => {
    const familyStage = getLearningStageById("lg", "family-home");
    const storyLesson = getLessonById("lg", "family-home", "thank-you-at-home-story");
    const validItem = storyLesson?.items.find(
      (item): item is StoryBiteItem => item.mechanic === "story_bite",
    );

    if (!storyLesson || !validItem) {
      throw new Error("Expected a normalized story-bite lesson");
    }

    const missingTitleLesson = {
      ...storyLesson,
      id: "missing-story-title",
      items: [{ ...validItem, title: "" }],
    };
    const emptyPagesLesson = {
      ...storyLesson,
      id: "empty-story-pages",
      items: [{ ...validItem, pages: [] }],
    };
    const blankPageBodyLesson = {
      ...storyLesson,
      id: "blank-story-page-body",
      items: [
        {
          ...validItem,
          pages: [{ ...validItem.pages[0], bodyText: "" }],
        },
      ],
    };

    expect(() => getLessonStatus(missingTitleLesson, familyStage)).not.toThrow();
    expect(getLessonStatus(missingTitleLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(emptyPagesLesson, familyStage)).toBe("empty");
    expect(getLessonStatus(blankPageBodyLesson, familyStage)).toBe("empty");
    expect(isLessonStartable(familyStage, blankPageBodyLesson)).toBe(false);
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

  it("resolves Luganda only from its explicit Learning hub bundle", () => {
    expect(resolveLearningHubLanguageCode("lg")).toBe("lg");
    expect(getLearningLanguageContent("lg")).toEqual(
      expect.objectContaining({
        languageCode: "lg",
        displayName: "Luganda",
      }),
    );
    expect(getLearningHubStages("lg").map((stage) => stage.id)).toEqual(
      REQUIRED_STAGE_IDS,
    );
  });

  it("does not fall back to Luganda for Runyankole", () => {
    const requestedLanguageCode = "nyn";

    expect(resolveLearningHubLanguageCode(requestedLanguageCode)).toBe(
      requestedLanguageCode,
    );
    expect(getLearningLanguageContent(requestedLanguageCode)).toBeNull();
    expect(getLearningHubStages(requestedLanguageCode)).toEqual([]);
    expect(
      getLessonById(requestedLanguageCode, "first-words", "greetings-1"),
    ).toBeUndefined();
    expect(
      getFirstStartableLessonForStage(requestedLanguageCode, "first-words"),
    ).toBeUndefined();
  });

  it("does not fall back to Luganda or rewrite an unknown language", () => {
    const requestedLanguageCode = "acholi";

    expect(resolveLearningHubLanguageCode(requestedLanguageCode)).toBe(
      requestedLanguageCode,
    );
    expect(getLearningLanguageContent(requestedLanguageCode)).toBeNull();
    expect(getLearningHubStages(requestedLanguageCode)).toEqual([]);
    expect(
      getLearningStageById(requestedLanguageCode, "first-words"),
    ).toBeUndefined();
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
    expect(getMechanicLabel("story_bite")).toBe("Story bite");
    expect(getMechanicLabel("practice_mix")).toBe("Practice mix");
  });

  it("keeps implemented and planned mechanic startability separate", () => {
    expect(isMechanicImplemented("tap_to_learn")).toBe(true);
    expect(isMechanicImplemented("listen_and_choose")).toBe(true);
    expect(isMechanicImplemented("choose_correct_word")).toBe(true);
    expect(isMechanicImplemented("match_word_picture")).toBe(true);
    expect(isMechanicImplemented("mini_quiz")).toBe(true);
    expect(isMechanicImplemented("cultural_card")).toBe(true);
    expect(isMechanicImplemented("story_bite")).toBe(true);
    expect(stageHasMechanicContent("lg", "first-words", "listen_and_choose")).toBe(
      true,
    );
    expect(stageHasMechanicContent("lg", "first-words", "choose_correct_word")).toBe(true);
    expect(stageHasMechanicContent("lg", "first-words", "match_word_picture")).toBe(true);
    expect(stageHasMechanicContent("lg", "first-words", "mini_quiz")).toBe(true);
    expect(stageHasMechanicContent("lg", "family-home", "match_word_picture")).toBe(
      true,
    );
    expect(stageHasMechanicContent("lg", "family-home", "choose_correct_word")).toBe(true);
    expect(stageHasMechanicContent("lg", "family-home", "mini_quiz")).toBe(true);
    expect(stageHasMechanicContent("lg", "family-home", "cultural_card")).toBe(
      true,
    );
    expect(stageHasMechanicContent("lg", "family-home", "story_bite")).toBe(true);
    expect(stageHasMechanicContent("lg", "everyday-things", "choose_correct_word")).toBe(true);
    expect(stageHasMechanicContent("lg", "everyday-things", "match_word_picture")).toBe(true);
    expect(stageHasMechanicContent("lg", "everyday-things", "mini_quiz")).toBe(true);
    expect(getLessonStatus(getLessonById("lg", "first-words", "first-words-quick-review"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "family-home", "home-things-1"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "family-home", "family-pick-word"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "family-home", "family-mini-quiz"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "family-home", "home-greeting-card"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "family-home", "thank-you-at-home-story"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "everyday-things", "food-objects-1"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "everyday-things", "animals-objects-1"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "everyday-things", "daily-review-1"))).toBe(
      "startable",
    );
    expect(getLessonStatus(getLessonById("lg", "culture-stories", "story-bite-kintu"))).toBe(
      "coming_soon",
    );
  });
});
