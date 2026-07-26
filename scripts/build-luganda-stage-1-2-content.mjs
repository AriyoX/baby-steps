import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-07-23T21:00:00+03:00";
const publishedAt = "2026-07-23 18:00:00+00";
const contentVersion = 4;

const curriculumSources = [
  "curriculum_guide/Baby_Steps_Lgeacy_Content_Lead.md",
  "curriculum_guide/Baby_Steps_Content_Tracker_Stages_1_2.md",
];

const reviewStatus =
  "Draft text plus temporary bundled images and a placeholder audio cue. Native Luganda, early-years, cultural, accessibility, and final-media review are still required.";

const evidenceBoundary =
  "Completion records exposure or supported selection only; it does not prove speaking, independent recall, or mastery.";

const imageCatalog = {
  "learning-beginner.jpg": {
    purpose: "Generic Learning Hub and game fallback",
    status: "temporary-bundled-placeholder",
  },
  "african-focus.png": {
    purpose: "Temporary greeting, body, menu, and puzzle scene",
    status: "temporary-bundled-placeholder",
  },
  "african-logic.png": {
    purpose: "Temporary body, game menu, and puzzle scene",
    status: "temporary-bundled-placeholder",
  },
  "african-patterns.png": {
    purpose: "Temporary body, game menu, and puzzle scene",
    status: "temporary-bundled-placeholder",
  },
  "cards-matching.png": {
    purpose: "Temporary body and Cards Matching artwork",
    status: "temporary-bundled-placeholder",
  },
  "numbers.png": {
    purpose: "Existing Counting Game artwork",
    status: "existing-bundled-asset",
  },
  "child.png": {
    purpose: "Temporary child, body, feeling, and story scene",
    status: "temporary-bundled-placeholder",
  },
  "black-kid.jpg": {
    purpose: "Temporary child, introduction, body, and feeling scene",
    status: "temporary-bundled-placeholder",
  },
  "river-kids.jpg": {
    purpose: "Temporary greeting, farewell, and story scene",
    status: "temporary-bundled-placeholder",
  },
  "culture.jpg": {
    purpose: "Temporary morning, courtesy, feeling, and story scene",
    status: "temporary-bundled-placeholder",
  },
  "coin.png": {
    purpose: "Existing small-object fallback for Counting Game",
    status: "existing-bundled-asset",
  },
  "rain.jpg": {
    purpose: "Temporary later-day, tired, and afraid scene",
    status: "temporary-bundled-placeholder",
  },
  "learning/lg/coloring/greeting.png": {
    purpose: "Existing bundled greeting coloring card",
    status: "existing-bundled-asset",
  },
  "learning/lg/coloring/omwana.png": {
    purpose: "Existing bundled child coloring card",
    status: "existing-bundled-asset",
  },
};

const concept = ({
  id,
  localText,
  englishText,
  audioKey,
  imageKey,
  symbol,
}) => ({
  id,
  localText,
  englishText,
  audioKey,
  imageKey,
  symbol,
});

const stage1Concepts = [
  concept({
    id: "lg-greet-how-are-you",
    localText: "Oli otya?",
    englishText: "How are you?",
    audioKey: "lg-s1-oli-otya",
    imageKey: "river-kids.jpg",
    symbol: "👋",
  }),
  concept({
    id: "lg-greet-im-fine",
    localText: "Gyendi.",
    englishText: "I am fine.",
    audioKey: "lg-s1-gyendi",
    imageKey: "black-kid.jpg",
    symbol: "🙂",
  }),
  concept({
    id: "lg-greet-morning",
    localText: "Wasuze otya nno?",
    englishText: "Morning greeting: How did you spend the night?",
    audioKey: "lg-s1-wasuze-otya-nno",
    imageKey: "culture.jpg",
    symbol: "🌅",
  }),
  concept({
    id: "lg-greet-day",
    localText: "Osiibye otya nno?",
    englishText: "Later-day greeting: How have you spent the day?",
    audioKey: "lg-s1-osiibye-otya-nno",
    imageKey: "rain.jpg",
    symbol: "☀️",
  }),
  concept({
    id: "lg-courtesy-thanks",
    localText: "Weebale.",
    englishText: "Thank you.",
    audioKey: "lg-s1-weebale",
    imageKey: "child.png",
    symbol: "🙏",
  }),
  concept({
    id: "lg-courtesy-forgive",
    localText: "Nsonyiwa.",
    englishText: "Forgive me / excuse me.",
    audioKey: "lg-s1-nsonyiwa",
    imageKey: "learning-beginner.jpg",
    symbol: "💛",
  }),
  concept({
    id: "lg-farewell-goodbye",
    localText: "Weeraba.",
    englishText: "Goodbye.",
    audioKey: "lg-s1-weeraba",
    imageKey: "river-kids.jpg",
    symbol: "👋",
  }),
  concept({
    id: "lg-intro-i-am-amina",
    localText: "Nze Amina.",
    englishText: "I am Amina.",
    audioKey: "lg-s1-nze-amina",
    imageKey: "black-kid.jpg",
    symbol: "🙋",
  }),
  concept({
    id: "lg-intro-who-are-you",
    localText: "Ggwe ani?",
    englishText: "Who are you?",
    audioKey: "lg-s1-ggwe-ani",
    imageKey: "child.png",
    symbol: "❓",
  }),
];

const stage2Concepts = [
  concept({
    id: "lg-body-head",
    localText: "Omutwe",
    englishText: "Head",
    audioKey: "lg-s2-omutwe",
    imageKey: "child.png",
    symbol: "🧑",
  }),
  concept({
    id: "lg-body-eyes",
    localText: "Amaaso",
    englishText: "Eyes",
    audioKey: "lg-s2-amaaso",
    imageKey: "black-kid.jpg",
    symbol: "👀",
  }),
  concept({
    id: "lg-body-ears",
    localText: "Amatu",
    englishText: "Ears",
    audioKey: "lg-s2-amatu",
    imageKey: "river-kids.jpg",
    symbol: "👂",
  }),
  concept({
    id: "lg-body-nose",
    localText: "Ennyindo",
    englishText: "Nose",
    audioKey: "lg-s2-ennyindo",
    imageKey: "learning-beginner.jpg",
    symbol: "👃",
  }),
  concept({
    id: "lg-body-mouth",
    localText: "Akamwa",
    englishText: "Mouth",
    audioKey: "lg-s2-akamwa",
    imageKey: "african-focus.png",
    symbol: "👄",
  }),
  concept({
    id: "lg-body-hand-arm",
    localText: "Omukono",
    englishText: "Hand / arm",
    audioKey: "lg-s2-omukono",
    imageKey: "african-logic.png",
    symbol: "🖐️",
  }),
  concept({
    id: "lg-body-leg",
    localText: "Okugulu",
    englishText: "Leg",
    audioKey: "lg-s2-okugulu",
    imageKey: "cards-matching.png",
    symbol: "🦵",
  }),
  concept({
    id: "lg-body-foot",
    localText: "Ekigere",
    englishText: "Foot",
    audioKey: "lg-s2-ekigere",
    imageKey: "african-patterns.png",
    symbol: "🦶",
  }),
  concept({
    id: "lg-feeling-happy",
    localText: "Ndi musanyufu.",
    englishText: "I am happy.",
    audioKey: "lg-s2-ndi-musanyufu",
    imageKey: "black-kid.jpg",
    symbol: "😊",
  }),
  concept({
    id: "lg-feeling-sad",
    localText: "Ndi munakuwavu.",
    englishText: "I am sad.",
    audioKey: "lg-s2-ndi-munakuwavu",
    imageKey: "river-kids.jpg",
    symbol: "😔",
  }),
  concept({
    id: "lg-feeling-tired",
    localText: "Nkooye.",
    englishText: "I am tired.",
    audioKey: "lg-s2-nkooye",
    imageKey: "rain.jpg",
    symbol: "🥱",
  }),
  concept({
    id: "lg-feeling-afraid",
    localText: "Ntya.",
    englishText: "I am afraid.",
    audioKey: "lg-s2-ntya",
    imageKey: "culture.jpg",
    symbol: "😟",
  }),
];

const allConcepts = [...stage1Concepts, ...stage2Concepts];
const conceptsById = Object.fromEntries(
  allConcepts.map((entry) => [entry.id, entry]),
);

const getConcept = (id) => {
  const entry = conceptsById[id];
  if (!entry) {
    throw new Error(`Unknown curriculum concept: ${id}`);
  }
  return entry;
};

const conceptMetadata = (entry) => ({
  conceptId: entry.id,
  curriculumScope: "luganda-initial-stages-1-2",
  reviewStatus,
  mediaStatus: "temporary-bundled-image-and-placeholder-audio-cue",
  evidenceBoundary,
});

const tapItem = (id, order, conceptId) => {
  const entry = getConcept(conceptId);
  return {
    id,
    mechanic: "tap_to_learn",
    order,
    word: entry.localText,
    localText: entry.localText,
    translation: entry.englishText,
    englishText: entry.englishText,
    exampleSentence: entry.localText,
    imageKey: entry.imageKey,
    audioKey: entry.audioKey,
    audioAsset: "placeholder_learning_cue",
    readiness: "placeholder",
    metadata: conceptMetadata(entry),
  };
};

const orderedOptions = (conceptIds) =>
  conceptIds.map((conceptId, index) => {
    const entry = getConcept(conceptId);
    return {
      id: entry.id,
      order: index + 1,
      localText: entry.localText,
      englishText: entry.englishText,
      imageKey: entry.imageKey,
    };
  });

const listenItem = (id, order, targetConceptId, optionConceptIds) => {
  const target = getConcept(targetConceptId);
  return {
    id,
    mechanic: "listen_and_choose",
    order,
    promptText: "Wulira, olonde ekifaananyi ekituufu. / Listen and choose the correct picture.",
    correctOptionId: target.id,
    options: orderedOptions(optionConceptIds),
    imageKey: target.imageKey,
    audioKey: target.audioKey,
    audioAsset: "placeholder_learning_cue",
    readiness: "placeholder",
    metadata: conceptMetadata(target),
  };
};

const chooseWordItem = ({
  id,
  order,
  localPrompt,
  englishPrompt,
  targetConceptId,
  optionConceptIds,
}) => {
  const target = getConcept(targetConceptId);
  return {
    id,
    mechanic: "choose_correct_word",
    order,
    promptText: `${localPrompt} / ${englishPrompt}`,
    questionText: englishPrompt,
    correctOptionId: target.id,
    options: orderedOptions(optionConceptIds).map(
      ({ order: _order, ...option }) => option,
    ),
    readiness: "placeholder",
    metadata: conceptMetadata(target),
  };
};

const quizQuestion = ({
  id,
  localPrompt,
  englishPrompt,
  optionConceptIds,
  targetConceptId,
  explanationText,
}) => {
  const target = getConcept(targetConceptId);
  return {
    id,
    promptText: `${localPrompt} / ${englishPrompt}`,
    promptEnglishText: englishPrompt,
    correctOptionId: target.id,
    options: optionConceptIds.map((conceptId) => {
      const entry = getConcept(conceptId);
      return {
        id: entry.id,
        text: entry.localText,
        englishText: entry.englishText,
      };
    }),
    explanationText,
  };
};

const stage1StoryPages = [
  {
    id: "lg-story-01-p01",
    localText: "Ku makya, Amina alaba Kato.",
    englishText: "In the morning, Amina sees Kato.",
    imageKey: "culture.jpg",
    audioKey: "lg-s1-story-p01",
  },
  {
    id: "lg-story-01-p02",
    localText: 'Amina agamba nti, "Oli otya, Kato?"',
    englishText: 'Amina says, "How are you, Kato?"',
    imageKey: "river-kids.jpg",
    audioKey: "lg-s1-story-p02",
  },
  {
    id: "lg-story-01-p03",
    localText: 'Kato addamu nti, "Gyendi. Weebale."',
    englishText: 'Kato replies, "I am fine. Thank you."',
    imageKey: "black-kid.jpg",
    audioKey: "lg-s1-story-p03",
  },
  {
    id: "lg-story-01-p04",
    localText: 'Bwe baba bagenda, bagamba nti, "Weeraba."',
    englishText: 'When they are leaving, they say, "Goodbye."',
    imageKey: "river-kids.jpg",
    audioKey: "lg-s1-story-p04",
  },
];

const stage2StoryPages = [
  {
    id: "lg-story-02-p01",
    localText: "Kato akwata omupiira n'emikono gye.",
    englishText: "Kato holds the ball with his hands.",
    imageKey: "child.png",
    audioKey: "lg-s2-story-p01",
  },
  {
    id: "lg-story-02-p02",
    localText: "Agukuba n'ekigere kye.",
    englishText: "He kicks it with his foot.",
    imageKey: "african-focus.png",
    audioKey: "lg-s2-story-p02",
  },
  {
    id: "lg-story-02-p03",
    localText: "Omupiira gugenda wala. Kato munakuwavu.",
    englishText: "The ball goes far away. Kato is sad.",
    imageKey: "river-kids.jpg",
    audioKey: "lg-s2-story-p03",
  },
  {
    id: "lg-story-02-p04",
    localText:
      'Amina aguleeta. Kato musanyufu era agamba nti, "Weebale."',
    englishText:
      'Amina brings it back. Kato is happy and says, "Thank you."',
    imageKey: "black-kid.jpg",
    audioKey: "lg-s2-story-p04",
  },
];

const hubStoryPages = (pages) =>
  pages.map((page) => ({
    id: page.id,
    localText: page.localText,
    bodyText: page.englishText,
    imageKey: page.imageKey,
    audioKey: page.audioKey,
    audioAsset: "placeholder_learning_cue",
  }));

const stage1QuizQuestions = [
  quizQuestion({
    id: "lg-s1-q01",
    localPrompt: "Londa ebigambo eby'okubuuza embeera y'omuntu.",
    englishPrompt: "Choose the words used to ask how a person is.",
    optionConceptIds: [
      "lg-greet-how-are-you",
      "lg-greet-im-fine",
      "lg-farewell-goodbye",
    ],
    targetConceptId: "lg-greet-how-are-you",
    explanationText: 'Oli otya? asks, "How are you?"',
  }),
  quizQuestion({
    id: "lg-s1-q02",
    localPrompt: "Londa eky'okuddamu ekitegeeza nti oli bulungi.",
    englishPrompt: "Choose the response that says you are fine.",
    optionConceptIds: [
      "lg-courtesy-forgive",
      "lg-greet-im-fine",
      "lg-intro-who-are-you",
    ],
    targetConceptId: "lg-greet-im-fine",
    explanationText: 'Gyendi. means "I am fine."',
  }),
  quizQuestion({
    id: "lg-s1-q03",
    localPrompt: "Londa ekigambo eky'okwebaza.",
    englishPrompt: "Choose the word used for thanking.",
    optionConceptIds: [
      "lg-courtesy-thanks",
      "lg-farewell-goodbye",
      "lg-courtesy-forgive",
    ],
    targetConceptId: "lg-courtesy-thanks",
    explanationText: 'Weebale. means "Thank you."',
  }),
  quizQuestion({
    id: "lg-s1-q04",
    localPrompt: "Londa ekigambo eky'okusaba okusonyiyibwa.",
    englishPrompt: "Choose the word used to ask forgiveness.",
    optionConceptIds: [
      "lg-greet-im-fine",
      "lg-courtesy-forgive",
      "lg-greet-how-are-you",
    ],
    targetConceptId: "lg-courtesy-forgive",
    explanationText: 'Nsonyiwa. means "Forgive me / excuse me."',
  }),
  quizQuestion({
    id: "lg-s1-q05",
    localPrompt: "Londa ekigambo eky'okusiibula.",
    englishPrompt: "Choose the goodbye word.",
    optionConceptIds: [
      "lg-farewell-goodbye",
      "lg-courtesy-thanks",
      "lg-intro-i-am-amina",
    ],
    targetConceptId: "lg-farewell-goodbye",
    explanationText: 'Weeraba. means "Goodbye."',
  }),
];

const stage2QuizQuestions = [
  quizQuestion({
    id: "lg-s2-q01",
    localPrompt: "Londa ekigambo ekitegeeza 'head'.",
    englishPrompt: "Choose the Luganda word for head.",
    optionConceptIds: ["lg-body-head", "lg-body-ears", "lg-body-foot"],
    targetConceptId: "lg-body-head",
    explanationText: 'Omutwe means "head."',
  }),
  quizQuestion({
    id: "lg-s2-q02",
    localPrompt: "Londa ekigambo ekitegeeza 'ears'.",
    englishPrompt: "Choose the Luganda word for ears.",
    optionConceptIds: ["lg-body-eyes", "lg-body-ears", "lg-body-mouth"],
    targetConceptId: "lg-body-ears",
    explanationText: 'Amatu means "ears."',
  }),
  quizQuestion({
    id: "lg-s2-q03",
    localPrompt: "Mu Luganda, ogamba otya nti 'I am happy'?",
    englishPrompt: 'How do you say "I am happy" in Luganda?',
    optionConceptIds: [
      "lg-feeling-tired",
      "lg-feeling-happy",
      "lg-feeling-sad",
    ],
    targetConceptId: "lg-feeling-happy",
    explanationText: 'Ndi musanyufu. means "I am happy."',
  }),
  quizQuestion({
    id: "lg-s2-q04",
    localPrompt: "Mu Luganda, ogamba otya nti 'I am tired'?",
    englishPrompt: 'How do you say "I am tired" in Luganda?',
    optionConceptIds: [
      "lg-feeling-afraid",
      "lg-feeling-happy",
      "lg-feeling-tired",
    ],
    targetConceptId: "lg-feeling-tired",
    explanationText: 'Nkooye. means "I am tired."',
  }),
  quizQuestion({
    id: "lg-s2-q05",
    localPrompt: "Londa ekigambo ekitegeeza 'foot'.",
    englishPrompt: "Choose the Luganda word for foot.",
    optionConceptIds: ["lg-body-hand-arm", "lg-body-leg", "lg-body-foot"],
    targetConceptId: "lg-body-foot",
    explanationText: 'Ekigere means "foot."',
  }),
];

const lesson = ({
  id,
  order,
  title,
  description,
  mechanic,
  items,
}) => ({
  id,
  order,
  title,
  description,
  mechanic,
  isStartable: true,
  isLocked: false,
  readiness: "placeholder",
  status: "startable",
  items,
  metadata: {
    reviewStatus,
    implementationStatus: "playable-technical-draft",
  },
});

const stage1Lessons = [
  lesson({
    id: "lg-s1-l1-meet-greetings",
    order: 1,
    title: "Meet the greetings",
    description: "Tap each card to meet four everyday greetings and replies.",
    mechanic: "tap_to_learn",
    items: [
      tapItem("lg-s1-l1-i01", 1, "lg-greet-how-are-you"),
      tapItem("lg-s1-l1-i02", 2, "lg-greet-im-fine"),
      tapItem("lg-s1-l1-i03", 3, "lg-greet-morning"),
      tapItem("lg-s1-l1-i04", 4, "lg-greet-day"),
    ],
  }),
  lesson({
    id: "lg-s1-l2-listen-greet",
    order: 2,
    title: "Listen and greet",
    description: "Listen, then choose the matching greeting scene.",
    mechanic: "listen_and_choose",
    items: [
      listenItem("lg-s1-l2-i01", 1, "lg-greet-morning", [
        "lg-greet-morning",
        "lg-greet-day",
        "lg-courtesy-thanks",
      ]),
      listenItem("lg-s1-l2-i02", 2, "lg-greet-day", [
        "lg-greet-day",
        "lg-greet-morning",
        "lg-farewell-goodbye",
      ]),
      listenItem("lg-s1-l2-i03", 3, "lg-greet-how-are-you", [
        "lg-greet-how-are-you",
        "lg-courtesy-forgive",
        "lg-farewell-goodbye",
      ]),
      listenItem("lg-s1-l2-i04", 4, "lg-greet-im-fine", [
        "lg-greet-im-fine",
        "lg-courtesy-forgive",
        "lg-farewell-goodbye",
      ]),
    ],
  }),
  lesson({
    id: "lg-s1-l3-courtesy",
    order: 3,
    title: "Courtesy words",
    description: "Meet words for thanking, apologising, and saying goodbye.",
    mechanic: "tap_to_learn",
    items: [
      tapItem("lg-s1-l3-i01", 1, "lg-courtesy-thanks"),
      tapItem("lg-s1-l3-i02", 2, "lg-courtesy-forgive"),
      tapItem("lg-s1-l3-i03", 3, "lg-farewell-goodbye"),
    ],
  }),
  lesson({
    id: "lg-s1-l4-names-responses",
    order: 4,
    title: "Names and responses",
    description: "Meet a fixed name model and an informal question.",
    mechanic: "tap_to_learn",
    items: [
      tapItem("lg-s1-l4-i01", 1, "lg-intro-i-am-amina"),
      tapItem("lg-s1-l4-i02", 2, "lg-intro-who-are-you"),
    ],
  }),
  lesson({
    id: "lg-s1-l5-morning-story",
    order: 5,
    title: "A morning greeting",
    description: "Read or listen together as Amina and Kato greet each other.",
    mechanic: "story_bite",
    items: [
      {
        id: "lg-s1-l5-story",
        mechanic: "story_bite",
        order: 1,
        title: "Ennamusa y'oku makya / A morning greeting",
        instructions: "Wulira oba soma awamu. / Listen or read together.",
        pages: hubStoryPages(stage1StoryPages),
        reflectionPrompt:
          "Amina ne Kato bakozesezza ennamusa ki? / Which greetings did Amina and Kato use?",
        imageKey: "culture.jpg",
        readiness: "placeholder",
        metadata: {
          storyId: "lg-story-01-morning-greeting",
          reviewStatus,
          evidenceBoundary,
        },
      },
    ],
  }),
  lesson({
    id: "lg-s1-l6-friendly-review",
    order: 6,
    title: "Friendly review",
    description: "Choose the best answer in five short review questions.",
    mechanic: "mini_quiz",
    items: [
      {
        id: "lg-s1-l6-quiz",
        mechanic: "mini_quiz",
        order: 1,
        title: "Friendly review",
        instructions: "Londa eky'okuddamu ekituufu. / Choose the best answer.",
        questions: stage1QuizQuestions,
        readiness: "placeholder",
        metadata: {
          quizId: "lg-quiz-stage-01",
          reviewStatus,
          evidenceBoundary,
        },
      },
    ],
  }),
];

const stage2Lessons = [
  lesson({
    id: "lg-s2-l1-my-body",
    order: 1,
    title: "My body",
    description: "Tap each card to meet eight common body-part words.",
    mechanic: "tap_to_learn",
    items: [
      tapItem("lg-s2-l1-i01", 1, "lg-body-head"),
      tapItem("lg-s2-l1-i02", 2, "lg-body-eyes"),
      tapItem("lg-s2-l1-i03", 3, "lg-body-ears"),
      tapItem("lg-s2-l1-i04", 4, "lg-body-nose"),
      tapItem("lg-s2-l1-i05", 5, "lg-body-mouth"),
      tapItem("lg-s2-l1-i06", 6, "lg-body-hand-arm"),
      tapItem("lg-s2-l1-i07", 7, "lg-body-leg"),
      tapItem("lg-s2-l1-i08", 8, "lg-body-foot"),
    ],
  }),
  lesson({
    id: "lg-s2-l2-listen-point",
    order: 2,
    title: "Listen and point",
    description: "Listen, then choose the matching body picture.",
    mechanic: "listen_and_choose",
    items: [
      listenItem("lg-s2-l2-i01", 1, "lg-body-head", [
        "lg-body-head",
        "lg-body-eyes",
        "lg-body-ears",
      ]),
      listenItem("lg-s2-l2-i02", 2, "lg-body-eyes", [
        "lg-body-nose",
        "lg-body-eyes",
        "lg-body-mouth",
      ]),
      listenItem("lg-s2-l2-i03", 3, "lg-body-ears", [
        "lg-body-hand-arm",
        "lg-body-ears",
        "lg-body-foot",
      ]),
      listenItem("lg-s2-l2-i04", 4, "lg-body-foot", [
        "lg-body-leg",
        "lg-body-hand-arm",
        "lg-body-foot",
      ]),
    ],
  }),
  lesson({
    id: "lg-s2-l3-how-i-feel",
    order: 3,
    title: "How I feel",
    description: "Meet four simple first-person feeling statements.",
    mechanic: "tap_to_learn",
    items: [
      tapItem("lg-s2-l3-i01", 1, "lg-feeling-happy"),
      tapItem("lg-s2-l3-i02", 2, "lg-feeling-sad"),
      tapItem("lg-s2-l3-i03", 3, "lg-feeling-tired"),
      tapItem("lg-s2-l3-i04", 4, "lg-feeling-afraid"),
    ],
  }),
  lesson({
    id: "lg-s2-l4-body-word-check",
    order: 4,
    title: "Body-word check",
    description: "Choose the Luganda word that matches each English meaning.",
    mechanic: "choose_correct_word",
    items: [
      chooseWordItem({
        id: "lg-s2-l4-i01",
        order: 1,
        localPrompt: "Londa ekigambo ekitegeeza 'nose'.",
        englishPrompt: "Choose the Luganda word for nose.",
        targetConceptId: "lg-body-nose",
        optionConceptIds: ["lg-body-nose", "lg-body-mouth", "lg-body-head"],
      }),
      chooseWordItem({
        id: "lg-s2-l4-i02",
        order: 2,
        localPrompt: "Londa ekigambo ekitegeeza 'mouth'.",
        englishPrompt: "Choose the Luganda word for mouth.",
        targetConceptId: "lg-body-mouth",
        optionConceptIds: ["lg-body-eyes", "lg-body-mouth", "lg-body-ears"],
      }),
      chooseWordItem({
        id: "lg-s2-l4-i03",
        order: 3,
        localPrompt: "Londa ekigambo ekitegeeza 'hand or arm'.",
        englishPrompt: "Choose the Luganda word for hand or arm.",
        targetConceptId: "lg-body-hand-arm",
        optionConceptIds: [
          "lg-body-foot",
          "lg-body-hand-arm",
          "lg-body-leg",
        ],
      }),
      chooseWordItem({
        id: "lg-s2-l4-i04",
        order: 4,
        localPrompt: "Londa ekigambo ekitegeeza 'leg'.",
        englishPrompt: "Choose the Luganda word for leg.",
        targetConceptId: "lg-body-leg",
        optionConceptIds: ["lg-body-head", "lg-body-foot", "lg-body-leg"],
      }),
    ],
  }),
  lesson({
    id: "lg-s2-l5-kato-ball-story",
    order: 5,
    title: "Kato and the ball",
    description: "Read or listen together as Kato plays with a ball.",
    mechanic: "story_bite",
    items: [
      {
        id: "lg-s2-l5-story",
        mechanic: "story_bite",
        order: 1,
        title: "Kato n'omupiira / Kato and the ball",
        instructions: "Wulira oba soma awamu. / Listen or read together.",
        pages: hubStoryPages(stage2StoryPages),
        reflectionPrompt:
          "Kato awulira atya ku nkomerero y'olugero? / How does Kato feel at the end of the story?",
        imageKey: "child.png",
        readiness: "placeholder",
        metadata: {
          storyId: "lg-story-02-kato-ball",
          reviewStatus,
          evidenceBoundary,
        },
      },
    ],
  }),
  lesson({
    id: "lg-s2-l6-body-feelings-review",
    order: 6,
    title: "Body and feelings review",
    description: "Choose the best answer in five short review questions.",
    mechanic: "mini_quiz",
    items: [
      {
        id: "lg-s2-l6-quiz",
        mechanic: "mini_quiz",
        order: 1,
        title: "Body and feelings review",
        instructions: "Londa eky'okuddamu ekituufu. / Choose the best answer.",
        questions: stage2QuizQuestions,
        readiness: "placeholder",
        metadata: {
          quizId: "lg-quiz-stage-02",
          reviewStatus,
          evidenceBoundary,
        },
      },
    ],
  }),
];

const learningHub = {
  languageCode: "lg",
  displayName: "Luganda",
  localName: "Oluganda",
  pathTitle: "Initial Luganda Learning Path",
  metadata: {
    curriculumSources,
    scope: "Initial stages 1 and 2 only",
    implementationStatus: "playable-technical-draft",
    reviewStatus,
    progressReset: `progressRevision ${contentVersion}`,
  },
  stages: [
    {
      id: "lg-stage-01-greetings",
      order: 1,
      stageNumber: 1,
      title: "Ennamusa, amannya n'empisa ennungi",
      description:
        "Greetings, names, thanking, apologising, and saying goodbye.",
      imageKey: "river-kids.jpg",
      status: "preview",
      estimatedMinutes: 24,
      lessonCount: stage1Lessons.length,
      isPractice: false,
      isLocked: false,
      readiness: "placeholder",
      mechanics: [
        "tap_to_learn",
        "listen_and_choose",
        "story_bite",
        "mini_quiz",
      ],
      learningGoals: [
        "Recognize four greetings and replies from supplied choices.",
        "Meet three courtesy and farewell words.",
        "Use a fixed name model and an informal question with adult support.",
      ],
      placeholderMessage:
        "Temporary bundled pictures and an audio cue are used until reviewed media is supplied.",
      lessons: stage1Lessons,
      metadata: {
        parentSummary:
          "This stage practises greetings, saying one's name, thanking, apologising, and saying goodbye.",
        parentFollowUp:
          "Mulumusagane ku makya ne ku ggulo. Buli omu yeeyanjule n'erinnya lye.",
        conceptIds: stage1Concepts.map((entry) => entry.id),
        reviewStatus,
      },
    },
    {
      id: "lg-stage-02-body-feelings",
      order: 2,
      stageNumber: 2,
      title: "Nze, omubiri gwange n'enneewulira zange",
      description: "Eight common body parts and four simple feeling statements.",
      imageKey: "child.png",
      status: "preview",
      estimatedMinutes: 28,
      lessonCount: stage2Lessons.length,
      isPractice: false,
      isLocked: false,
      readiness: "placeholder",
      mechanics: [
        "tap_to_learn",
        "listen_and_choose",
        "choose_correct_word",
        "story_bite",
        "mini_quiz",
      ],
      learningGoals: [
        "Recognize eight common body-part words from supplied choices.",
        "Meet four simple first-person feeling statements.",
        "Revisit body and feeling words in a short story and mixed review.",
      ],
      placeholderMessage:
        "Temporary bundled pictures and an audio cue are used until reviewed media is supplied.",
      lessons: stage2Lessons,
      metadata: {
        prerequisiteStageId: "lg-stage-01-greetings",
        parentSummary:
          "This stage practises common body parts and simple ways of saying happy, sad, tired, and afraid.",
        parentFollowUp:
          "Mulage omutwe, amaaso, amatu n'ekigere. Oluvannyuma buli omu alonde ebigambo ebitegeeza engeri gy'awuliramu.",
        conceptIds: stage2Concepts.map((entry) => entry.id),
        reviewStatus,
      },
    },
  ],
};

const learningWord = (levelId, order, conceptId) => {
  const entry = getConcept(conceptId);
  return {
    id: `lg-level-${levelId}-${entry.id}`,
    order,
    targetText: entry.localText,
    english: entry.englishText,
    audio: entry.audioKey,
    example: entry.localText,
    exampleTranslation: entry.englishText,
    image: entry.imageKey,
    notes: reviewStatus,
  };
};

const learningLevel = (id, order, title, conceptIds) => ({
  id,
  order,
  title,
  isLocked: false,
  words: conceptIds.map((conceptId, index) =>
    learningWord(id, index + 1, conceptId),
  ),
});

const learningGame = {
  title: "Yiga era Zannya: Initial Luganda Practice",
  metadata: {
    curriculumSources,
    scope:
      "Sixteen short reinforcement levels that repeat only the 21 concepts introduced in Learning Hub stages 1 and 2.",
    evidenceBoundary,
    reviewStatus,
  },
  stages: [
    {
      id: 1,
      order: 1,
      title: "Stage 1: Greetings and courtesy",
      description:
        "Eight short levels move from pairs to a complete Stage 1 review.",
      isLocked: false,
      requiredScore: 0,
      image: "river-kids.jpg",
      color: "#F59E0B",
      levels: [
        learningLevel(1, 1, "Hello and reply", [
          "lg-greet-how-are-you",
          "lg-greet-im-fine",
        ]),
        learningLevel(2, 2, "Morning and later day", [
          "lg-greet-morning",
          "lg-greet-day",
        ]),
        learningLevel(3, 3, "Kind words", [
          "lg-courtesy-thanks",
          "lg-courtesy-forgive",
          "lg-farewell-goodbye",
        ]),
        learningLevel(4, 4, "Meet by name", [
          "lg-intro-i-am-amina",
          "lg-intro-who-are-you",
        ]),
        learningLevel(5, 5, "Greeting round", [
          "lg-greet-how-are-you",
          "lg-greet-im-fine",
          "lg-greet-morning",
          "lg-greet-day",
        ]),
        learningLevel(6, 6, "Courtesy round", [
          "lg-courtesy-thanks",
          "lg-courtesy-forgive",
          "lg-farewell-goodbye",
        ]),
        learningLevel(7, 7, "Conversation round", [
          "lg-greet-how-are-you",
          "lg-greet-im-fine",
          "lg-intro-i-am-amina",
          "lg-intro-who-are-you",
        ]),
        learningLevel(
          8,
          8,
          "Stage 1 review",
          stage1Concepts.map((entry) => entry.id),
        ),
      ],
    },
    {
      id: 2,
      order: 2,
      title: "Stage 2: Body and feelings",
      description:
        "Eight short levels move from body groups and feelings to a complete Stage 2 review.",
      isLocked: false,
      requiredScore: 0,
      image: "child.png",
      color: "#10B981",
      levels: [
        learningLevel(9, 1, "Face words", [
          "lg-body-head",
          "lg-body-eyes",
          "lg-body-ears",
          "lg-body-nose",
          "lg-body-mouth",
        ]),
        learningLevel(10, 2, "Arms and legs", [
          "lg-body-hand-arm",
          "lg-body-leg",
          "lg-body-foot",
        ]),
        learningLevel(11, 3, "Feelings", [
          "lg-feeling-happy",
          "lg-feeling-sad",
          "lg-feeling-tired",
          "lg-feeling-afraid",
        ]),
        learningLevel(12, 4, "Face review", [
          "lg-body-head",
          "lg-body-eyes",
          "lg-body-ears",
          "lg-body-nose",
          "lg-body-mouth",
        ]),
        learningLevel(
          13,
          5,
          "Body review",
          stage2Concepts.slice(0, 8).map((entry) => entry.id),
        ),
        learningLevel(
          14,
          6,
          "Feelings review",
          stage2Concepts.slice(8).map((entry) => entry.id),
        ),
        learningLevel(15, 7, "Body and feelings mix", [
          "lg-body-head",
          "lg-body-ears",
          "lg-body-hand-arm",
          "lg-body-foot",
          "lg-feeling-happy",
          "lg-feeling-tired",
        ]),
        learningLevel(
          16,
          8,
          "Stage 2 review",
          stage2Concepts.map((entry) => entry.id),
        ),
      ],
    },
  ],
};

const wordGameConceptIds = [
  "lg-greet-im-fine",
  "lg-courtesy-thanks",
  "lg-courtesy-forgive",
  "lg-farewell-goodbye",
  "lg-body-head",
  "lg-body-eyes",
  "lg-body-ears",
  "lg-body-nose",
  "lg-body-mouth",
  "lg-body-hand-arm",
  "lg-body-leg",
  "lg-body-foot",
  "lg-feeling-tired",
  "lg-feeling-afraid",
];

const wordGameLevels = wordGameConceptIds.map((conceptId, index) => {
  const entry = getConcept(conceptId);
  const targetText = entry.localText.replace(/[?.]/g, "");
  return {
    id: `word-${entry.id}`,
    order: index + 1,
    targetText,
    question: `Build the Luganda word for: ${entry.englishText}`,
    hint: entry.englishText,
    subHint: "The first letter is already shown.",
    firstLetter: targetText[0].toUpperCase(),
    image: entry.imageKey,
  };
});

const countingGame = {
  title: "Okubala 1-5: Count from 1 to 5",
  metadata: {
    scope:
      "Optional early counting reinforcement in three small steps; this is supplementary to the two Learning Hub stages.",
    reviewStatus,
  },
  stages: [
    {
      id: 1,
      order: 1,
      title: "Count 1-2",
      description: "Begin with one and two.",
      numbersRange: { min: 1, max: 2 },
      levels: 2,
      useBunches: false,
      usesCurrency: false,
      prompt: "How many can you see?",
    },
    {
      id: 2,
      order: 2,
      title: "Count 1-3",
      description: "Add three in a second short step.",
      numbersRange: { min: 1, max: 3 },
      levels: 3,
      useBunches: false,
      usesCurrency: false,
      prompt: "How many can you see?",
    },
    {
      id: 3,
      order: 3,
      title: "Count 1-5",
      description: "Review one through five.",
      numbersRange: { min: 1, max: 5 },
      levels: 5,
      useBunches: false,
      usesCurrency: false,
      prompt: "How many can you see?",
    },
  ],
  numbers: [
    { number: 1, order: 1, targetText: "Emu" },
    { number: 2, order: 2, targetText: "Bbiri" },
    { number: 3, order: 3, targetText: "Ssatu" },
    { number: 4, order: 4, targetText: "Nnya" },
    { number: 5, order: 5, targetText: "Ttaano" },
  ],
  culturalItems: [
    { id: "count-child", order: 1, name: "Children", image: "child.png" },
    { id: "count-cards", order: 2, name: "Cards", image: "cards-matching.png" },
    { id: "count-patterns", order: 3, name: "Patterns", image: "african-patterns.png" },
    { id: "count-coins", order: 4, name: "Counters", image: "coin.png" },
    { id: "count-numbers", order: 5, name: "Numbers", image: "numbers.png" },
  ],
  currency: [],
};

const cardGame = {
  title: "Stage 1-2 Luganda Matching Cards",
  metadata: {
    scope: "All 21 concepts introduced by the two Learning Hub stages.",
    reviewStatus,
    evidenceBoundary,
  },
  items: allConcepts.map((entry, index) => ({
    id: `card-${entry.id}`,
    order: index + 1,
    value: entry.localText,
    info: entry.englishText,
    imageSymbol: entry.symbol,
  })),
};

const puzzleGame = {
  title: "Stage 1-2 Scene Puzzles",
  metadata: {
    scope:
      "Ten optional scene puzzles using existing bundled artwork as temporary visual placeholders.",
    reviewStatus,
  },
  puzzles: [
    {
      id: 1,
      order: 1,
      name: "Oli otya?",
      description: "Put the greeting picture together.",
      image: "river-kids.jpg",
    },
    {
      id: 2,
      order: 2,
      name: "Wasuze otya nno?",
      description: "Put the morning greeting picture together.",
      image: "culture.jpg",
    },
    {
      id: 3,
      order: 3,
      name: "Weebale, Nsonyiwa, Weeraba",
      description: "Put the courtesy picture together.",
      image: "learning-beginner.jpg",
    },
    {
      id: 4,
      order: 4,
      name: "Nze Amina",
      description: "Put the introduction picture together.",
      image: "black-kid.jpg",
    },
    {
      id: 5,
      order: 5,
      name: "Omubiri gwange",
      description: "Put the body picture together.",
      image: "child.png",
    },
    {
      id: 6,
      order: 6,
      name: "Omutwe n'amaaso",
      description: "Put the face-word picture together.",
      image: "african-focus.png",
    },
    {
      id: 7,
      order: 7,
      name: "Omukono n'ekigere",
      description: "Put the hand-and-foot picture together.",
      image: "african-logic.png",
    },
    {
      id: 8,
      order: 8,
      name: "Musanyufu oba munakuwavu",
      description: "Put the feelings picture together.",
      image: "cards-matching.png",
    },
    {
      id: 9,
      order: 9,
      name: "Nkooye oba ntya",
      description: "Put the feelings picture together.",
      image: "rain.jpg",
    },
    {
      id: 10,
      order: 10,
      name: "Kato n'omupiira",
      description: "Put the ball-story picture together.",
      image: "african-patterns.png",
    },
  ],
};

const storyMetadata = {
  status: "placeholder",
  notes: reviewStatus,
  sources: curriculumSources.map((label) => ({ label })),
};

const standaloneStoryPages = (pages) =>
  pages.map((page) => ({
    id: page.id,
    text: page.localText,
    translation: page.englishText,
    image: page.imageKey,
    altText: `Temporary bundled illustration for: ${page.englishText}`,
  }));

const stories = [
  {
    id: "morning-greeting",
    languageCode: "lg",
    title: "Ennamusa y'oku makya",
    summary: "Amina and Kato greet each other in four short pages.",
    metadata: storyMetadata,
    pages: standaloneStoryPages(stage1StoryPages),
    questions: [
      {
        id: "morning-greeting-q1",
        question: "Which words ask how a person is?",
        options: ["Oli otya?", "Gyendi.", "Weeraba."],
        correctAnswer: 0,
      },
      {
        id: "morning-greeting-q2",
        question: "Which words say that you are fine?",
        options: ["Nsonyiwa.", "Gyendi.", "Ggwe ani?"],
        correctAnswer: 1,
      },
      {
        id: "morning-greeting-q3",
        question: "Which word says goodbye?",
        options: ["Weeraba.", "Weebale.", "Nze Amina."],
        correctAnswer: 0,
      },
    ],
  },
  {
    id: "kato-and-the-ball",
    languageCode: "lg",
    title: "Kato n'omupiira",
    summary: "Kato plays with a ball and names body parts and feelings.",
    metadata: storyMetadata,
    pages: standaloneStoryPages(stage2StoryPages),
    questions: [
      {
        id: "kato-ball-q1",
        question: "Which Luganda word means foot?",
        options: ["Omukono", "Okugulu", "Ekigere"],
        correctAnswer: 2,
      },
      {
        id: "kato-ball-q2",
        question: 'How do you say "I am happy" in Luganda?',
        options: ["Nkooye.", "Ndi musanyufu.", "Ndi munakuwavu."],
        correctAnswer: 1,
      },
      {
        id: "kato-ball-q3",
        question: 'How do you say "I am tired" in Luganda?',
        options: ["Ntya.", "Ndi musanyufu.", "Nkooye."],
        correctAnswer: 2,
      },
    ],
  },
];

const menuCards = {
  games: [
    {
      id: "learning",
      order: 1,
      title: "Yiga era Zannya",
      description: "Practise all 21 Stage 1-2 concepts in 16 short levels.",
      image: "african-focus.png",
      targetPage: "child/games/learninggame",
    },
    {
      id: "words",
      order: 2,
      title: "Ebigambo",
      description: "Build 14 single Luganda words, one letter at a time.",
      image: "learning-beginner.jpg",
      targetPage: "child/games/wordgame",
    },
    {
      id: "cards",
      order: 3,
      title: "Okugatta Kaadi",
      description: "Find matching pairs drawn from all 21 tracked concepts.",
      image: "cards-matching.png",
      targetPage: "child/games/cardgame",
    },
    {
      id: "puzzles",
      order: 4,
      title: "Ebifaananyi",
      description: "Complete 10 Stage 1-2 picture puzzles.",
      image: "african-logic.png",
      targetPage: "child/games/puzzlegame",
    },
    {
      id: "numbers",
      order: 5,
      title: "Okubala 1-5",
      description: "Count from 1 to 5 in three small steps.",
      image: "numbers.png",
      targetPage: "child/games/lugandacountinggame",
    },
  ],
  stories: [
    {
      id: "morning-greeting",
      order: 1,
      title: "Ennamusa y'oku makya",
      description: "Amina and Kato greet each other.",
      image: "culture.jpg",
      targetPage: "child/stories/morning-greeting",
    },
    {
      id: "kato-and-the-ball",
      order: 2,
      title: "Kato n'omupiira",
      description: "Kato plays with a ball and talks about feelings.",
      image: "child.png",
      targetPage: "child/stories/kato-and-the-ball",
    },
  ],
  coloring: [
    {
      id: "greeting",
      order: 1,
      title: "Oli otya?",
      description: "Color the bundled greeting picture.",
      image: "learning/lg/coloring/greeting.png",
      targetPage: "child/games/coloring/greeting",
    },
    {
      id: "me",
      order: 2,
      title: "Nze",
      description: "Color the bundled child picture.",
      image: "learning/lg/coloring/omwana.png",
      targetPage: "child/games/coloring/child",
    },
  ],
};

const PROGRESS_BEARING_CONTENT_TYPES = new Set([
  "learning_hub",
  "learning_game",
  "word_game",
  "counting_game",
  "card_game",
  "puzzle_game",
  "story",
]);

const bundle = (contentType, slug, title, sortOrder, payload) => ({
  languageCode: "lg",
  contentType,
  slug,
  title,
  sortOrder,
  isActive: true,
  editorialStatus: "published",
  isStartable: true,
  contentVersion,
  publishedAt,
  payload: PROGRESS_BEARING_CONTENT_TYPES.has(contentType)
    ? { ...payload, progressRevision: contentVersion }
    : payload,
});

const bundles = [
  bundle("child_menu", "games", "Initial Luganda Games", 10, {
    cards: menuCards.games,
  }),
  bundle("child_menu", "stories", "Initial Luganda Stories", 11, {
    cards: menuCards.stories,
  }),
  bundle("child_menu", "coloring", "Initial Luganda Coloring", 12, {
    cards: menuCards.coloring,
  }),
  bundle(
    "learning_hub",
    "curriculum",
    "Luganda Curriculum: Initial Stages 1-2",
    20,
    learningHub,
  ),
  bundle(
    "learning_game",
    "starter",
    "Initial Stage 1-2 Learning Practice",
    30,
    learningGame,
  ),
  bundle("word_game", "levels", "Initial Stage 1-2 Word Practice", 40, {
    title: "Ebigambo: Luganda Words",
    metadata: {
      scope:
        "Fourteen single-word targets from the initial curriculum. Multi-word phrases are intentionally excluded because this mechanic builds one continuous word.",
      reviewStatus,
      evidenceBoundary,
    },
    levels: wordGameLevels,
  }),
  bundle("counting_game", "stages", "Count 1-5 in Luganda", 50, countingGame),
  bundle("card_game", "cards", "Initial Stage 1-2 Matching Cards", 55, cardGame),
  bundle("puzzle_game", "puzzles", "Initial Stage 1-2 Scene Puzzles", 56, puzzleGame),
  ...stories.map((story, index) =>
    bundle("story", story.id, story.title, 100 + index, story),
  ),
];

const audioManifest = [
  ...allConcepts.map((entry) => ({
    key: entry.audioKey,
    transcript: entry.localText,
    purpose: `Pronunciation for ${entry.id}`,
    runtimeAsset: "placeholder_learning_cue",
    status: "registered-placeholder-cue",
  })),
  ...[...stage1StoryPages, ...stage2StoryPages].map((page) => ({
    key: page.audioKey,
    transcript: page.localText,
    purpose: `Narration for ${page.id}`,
    runtimeAsset: "placeholder_learning_cue",
    status: "registered-placeholder-cue",
  })),
];

const manifest = {
  schemaVersion: 2,
  generatedAt,
  languageCode: "lg",
  contentVersion,
  curriculumSources,
  scope:
    "Initial Luganda stages 1 and 2 plus optional reinforcement that reuses the same concepts.",
  publicationBoundary:
    "Playable technical seed. Top-level rows are published so the app can load them, but nested readiness and metadata preserve the draft/review-required status.",
  freshStart: {
    behavior:
      "The seed replaces Luganda runtime content and bumps progressRevision to 4.",
    preserves:
      "Historic progress, activity, achievement, auth, and child-profile rows remain stored but revision-3 completions do not unlock revision-4 content.",
  },
  purgePolicy: {
    target: "public.content_items",
    languageCode: "lg",
    contentTypes: [
      "child_menu",
      "learning_hub",
      "learning_game",
      "word_game",
      "counting_game",
      "card_game",
      "puzzle_game",
      "story",
    ],
    preserves: [
      "child progress",
      "activity history",
      "achievements",
      "auth users",
      "child profiles",
      "non-Luganda editorial content",
    ],
  },
  media: {
    images: Object.entries(imageCatalog).map(([reference, details]) => ({
      reference,
      ...details,
    })),
    audio: audioManifest,
  },
  curriculumInventory: {
    stageCount: 2,
    lessonCount: 12,
    lessonItemCount: 37,
    conceptCount: 21,
    storyPageCount: 8,
    quizQuestionCount: 10,
    learningGameLevelCount: 16,
    wordGameLevelCount: 14,
    countingLevelCount: 10,
    cardConceptCount: 21,
    puzzleCount: 10,
  },
  bundles,
};

const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const jsonLiteral = (value) =>
  `$content$${JSON.stringify(value)}$content$::jsonb`;

const insertStatement = (entry) => `INSERT INTO public.content_items (
  language_code, content_type, slug, title, payload, sort_order,
  is_active, editorial_status, is_startable, content_version, published_at
)
VALUES (
  ${sqlQuote(entry.languageCode)}, ${sqlQuote(entry.contentType)}, ${sqlQuote(entry.slug)},
  ${sqlQuote(entry.title)},
  ${jsonLiteral(entry.payload)},
  ${entry.sortOrder}, ${entry.isActive}, ${sqlQuote(entry.editorialStatus)},
  ${entry.isStartable}, ${entry.contentVersion}, TIMESTAMPTZ ${sqlQuote(entry.publishedAt)}
)
ON CONFLICT (language_code, content_type, slug) DO UPDATE
SET
  title = EXCLUDED.title,
  payload = EXCLUDED.payload,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  editorial_status = EXCLUDED.editorial_status,
  is_startable = EXCLUDED.is_startable,
  content_version = EXCLUDED.content_version,
  published_at = EXCLUDED.published_at;`;

const seedSql = `-- Generated by scripts/build-luganda-stage-1-2-content.mjs.
-- Development reset seed for the initial Luganda curriculum stages.
-- The rows are playable, but text still needs review and missing media resolves
-- to registered, non-empty assets already bundled with the application.

BEGIN;

-- Replace Luganda runtime content only. Learner history, progress, achievements,
-- auth records, child profiles, and other-language editorial rows are preserved.
DELETE FROM public.content_items
WHERE language_code = 'lg'
  AND content_type IN (
    'child_menu',
    'learning_hub',
    'learning_game',
    'word_game',
    'counting_game',
    'card_game',
    'puzzle_game',
    'story'
  );

${bundles.map(insertStatement).join("\n\n")}

COMMIT;
`;

const writeJson = (relativePath, value) => {
  const absolutePath = join(repositoryRoot, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

writeJson("content/curriculum/lg-stage-1-2.json", manifest);
writeFileSync(join(repositoryRoot, "supabase/seed.sql"), seedSql, "utf8");

console.log(`Generated ${bundles.length} content rows at revision ${contentVersion}.`);
console.log(
  `Included ${manifest.curriculumInventory.lessonCount} Hub lessons, ${manifest.curriculumInventory.learningGameLevelCount} Learning Game levels, and ${manifest.curriculumInventory.conceptCount} tracked concepts.`,
);
console.log(
  `Referenced ${manifest.media.images.length} registered images and ${manifest.media.audio.length} stable placeholder-audio keys; no empty media files were created.`,
);
