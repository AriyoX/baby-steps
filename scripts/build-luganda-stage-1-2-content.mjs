import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-07-18T12:00:00+03:00";
const publishedAt = "2026-07-18 09:00:00+00";
const contentVersion = 3;

const image = (path, purpose) => ({
  path: `assets/images/${path}`,
  reference: path,
  purpose,
  status: "empty-placeholder",
});

const audio = (key, path, purpose) => ({
  key,
  path: `assets/audio/${path}`,
  reference: `assets/audio/${path}`,
  purpose,
  status: "empty-placeholder",
});

const images = [
  image("learning/lg/stage-1/stage-card.png", "Stage 1 card"),
  image("learning/lg/stage-1/greeting-oli-otya.png", "Oli otya? greeting scene"),
  image("learning/lg/stage-1/reply-gyendi.png", "Gyendi reply scene"),
  image("learning/lg/stage-1/work-greeting-gyebale-ko.png", "Gyebale ko work-greeting scene"),
  image("learning/lg/stage-1/thanks-webale.png", "Webale gratitude scene"),
  image("learning/lg/stage-1/story-greeting-1.png", "Stage 1 story page 1"),
  image("learning/lg/stage-1/story-greeting-2.png", "Stage 1 story page 2"),
  image("learning/lg/stage-1/story-greeting-3.png", "Stage 1 story page 3"),
  image("learning/lg/stage-2/stage-card.png", "Stage 2 card"),
  image("learning/lg/stage-2/maama.png", "Maama concept image"),
  image("learning/lg/stage-2/taata.png", "Taata concept image"),
  image("learning/lg/stage-2/omwana.png", "Omwana concept image"),
  image("learning/lg/stage-2/ennyumba.png", "Ennyumba concept image"),
  image("learning/lg/stage-2/amazzi.png", "Amazzi concept image"),
  image("learning/lg/stage-2/ekitabo.png", "Ekitabo concept image"),
  image("learning/lg/stage-2/story-home-1.png", "Stage 2 story page 1"),
  image("learning/lg/stage-2/story-home-2.png", "Stage 2 story page 2"),
  image("learning/lg/stage-2/story-home-3.png", "Stage 2 story page 3"),
  image("learning/lg/stage-2/story-home-4.png", "Stage 2 story page 4"),
  image("learning/lg/menus/words.png", "Word Game menu card"),
  image("learning/lg/menus/puzzles.png", "Puzzle Game menu card"),
  image("learning/lg/menus/cards.png", "Cards Matching menu card"),
  image("learning/lg/menus/learning.png", "Learning Game menu card"),
  image("learning/lg/menus/numbers.png", "Counting Game menu card"),
  image("learning/lg/puzzles/greeting.png", "Greeting-scene puzzle"),
  image("learning/lg/puzzles/family-home.png", "Family-at-home puzzle"),
  image("learning/lg/puzzles/book-and-water.png", "Book-and-water puzzle"),
  image("learning/lg/counting/children.png", "Counting children"),
  image("learning/lg/counting/books.png", "Counting books"),
  image("learning/lg/counting/cups.png", "Counting cups"),
  image("learning/lg/counting/houses.png", "Counting houses"),
  image("learning/lg/counting/water-cups.png", "Counting cups of water"),
  image("learning/lg/coloring/greeting.png", "Greeting coloring page"),
  image("learning/lg/coloring/maama.png", "Maama coloring page"),
  image("learning/lg/coloring/taata.png", "Taata coloring page"),
  image("learning/lg/coloring/omwana.png", "Omwana coloring page"),
  image("learning/lg/coloring/ennyumba.png", "Ennyumba coloring page"),
];

const audioFiles = [
  audio("lg.stage1.oli_otya", "learning/lg/stage-1/oli-otya.mp3", "Oli otya?"),
  audio("lg.stage1.gyendi", "learning/lg/stage-1/gyendi.mp3", "Gyendi"),
  audio("lg.stage1.gyebale_ko", "learning/lg/stage-1/gyebale-ko.mp3", "Gyebale ko"),
  audio("lg.stage1.webale", "learning/lg/stage-1/webale.mp3", "Webale"),
  audio("lg.stage1.story.1", "learning/lg/stage-1/story-greeting-1.mp3", "Stage 1 story page 1"),
  audio("lg.stage1.story.2", "learning/lg/stage-1/story-greeting-2.mp3", "Stage 1 story page 2"),
  audio("lg.stage1.story.3", "learning/lg/stage-1/story-greeting-3.mp3", "Stage 1 story page 3"),
  audio("lg.stage2.maama", "learning/lg/stage-2/maama.mp3", "Maama"),
  audio("lg.stage2.taata", "learning/lg/stage-2/taata.mp3", "Taata"),
  audio("lg.stage2.omwana", "learning/lg/stage-2/omwana.mp3", "Omwana"),
  audio("lg.stage2.ennyumba", "learning/lg/stage-2/ennyumba.mp3", "Ennyumba"),
  audio("lg.stage2.amazzi", "learning/lg/stage-2/amazzi.mp3", "Amazzi"),
  audio("lg.stage2.ekitabo", "learning/lg/stage-2/ekitabo.mp3", "Ekitabo"),
  audio("lg.stage2.story.1", "learning/lg/stage-2/story-home-1.mp3", "Stage 2 story page 1"),
  audio("lg.stage2.story.2", "learning/lg/stage-2/story-home-2.mp3", "Stage 2 story page 2"),
  audio("lg.stage2.story.3", "learning/lg/stage-2/story-home-3.mp3", "Stage 2 story page 3"),
  audio("lg.stage2.story.4", "learning/lg/stage-2/story-home-4.mp3", "Stage 2 story page 4"),
  audio("lg.counting.emu", "learning/lg/counting/emu.mp3", "Emu / one"),
  audio("lg.counting.bbiri", "learning/lg/counting/bbiri.mp3", "Bbiri / two"),
  audio("lg.counting.ssatu", "learning/lg/counting/ssatu.mp3", "Ssatu / three"),
  audio("lg.counting.nnya", "learning/lg/counting/nnya.mp3", "Nnya / four"),
  audio("lg.counting.ttaano", "learning/lg/counting/ttaano.mp3", "Ttaano / five"),
];

const audioByKey = Object.fromEntries(audioFiles.map((entry) => [entry.key, entry]));

const assetFields = (audioKey, imageKey) => ({
  audioKey,
  audioAsset: audioByKey[audioKey].reference,
  imageKey,
});

const itemReview = (conceptId, source) => ({
  conceptId,
  curriculumScope: "luganda-stage-1-2",
  source,
  reviewStatus: "native-speaker-educator-cultural-and-asset-review-required",
  evidenceBoundary: "Completion records viewing or eventual selection, not speaking or mastery.",
});

const greetingConcepts = [
  {
    id: "oli-otya",
    itemId: "how-are-you",
    localText: "Oli otya?",
    englishText: "How are you?",
    imageKey: "learning/lg/stage-1/greeting-oli-otya.png",
    audioKey: "lg.stage1.oli_otya",
    source: "Peace Corps Uganda, Introductory Luganda Lessons (2008), Lesson 3",
  },
  {
    id: "gyendi",
    itemId: "i-am-fine",
    localText: "Gyendi.",
    englishText: "I am fine.",
    imageKey: "learning/lg/stage-1/reply-gyendi.png",
    audioKey: "lg.stage1.gyendi",
    source: "Peace Corps Uganda, Introductory Luganda Lessons (2008), Lesson 3",
  },
  {
    id: "gyebale-ko",
    itemId: "work-greeting",
    localText: "Gyebale ko.",
    englishText: "Thank you for your work.",
    imageKey: "learning/lg/stage-1/work-greeting-gyebale-ko.png",
    audioKey: "lg.stage1.gyebale_ko",
    source: "Peace Corps Uganda, Introductory Luganda Lessons (2008), Lesson 3",
  },
  {
    id: "webale",
    itemId: "thank-you",
    localText: "Webale.",
    englishText: "Thank you.",
    imageKey: "learning/lg/stage-1/thanks-webale.png",
    audioKey: "lg.stage1.webale",
    source: "Peace Corps Uganda, Introductory Luganda Lessons (2008)",
  },
];

const homeConcepts = [
  {
    id: "maama",
    itemId: "mother",
    localText: "Maama",
    englishText: "Mother",
    imageKey: "learning/lg/stage-2/maama.png",
    audioKey: "lg.stage2.maama",
    source: "Peace Corps Luganda learner materials; cross-checked against the existing app glossary",
  },
  {
    id: "taata",
    itemId: "father",
    localText: "Taata",
    englishText: "Father",
    imageKey: "learning/lg/stage-2/taata.png",
    audioKey: "lg.stage2.taata",
    source: "Peace Corps Luganda learner materials; cross-checked against the existing app glossary",
  },
  {
    id: "omwana",
    itemId: "child",
    localText: "Omwana",
    englishText: "Child",
    imageKey: "learning/lg/stage-2/omwana.png",
    audioKey: "lg.stage2.omwana",
    source: "Snoxall, Luganda-English Dictionary; cross-checked against the existing app glossary",
  },
  {
    id: "ennyumba",
    itemId: "house",
    localText: "Ennyumba",
    englishText: "House",
    imageKey: "learning/lg/stage-2/ennyumba.png",
    audioKey: "lg.stage2.ennyumba",
    source: "Peace Corps Luganda learner materials, household vocabulary",
  },
  {
    id: "amazzi",
    itemId: "water",
    localText: "Amazzi",
    englishText: "Water",
    imageKey: "learning/lg/stage-2/amazzi.png",
    audioKey: "lg.stage2.amazzi",
    source: "Peace Corps Luganda learner materials; cross-checked against the existing app glossary",
  },
  {
    id: "ekitabo",
    itemId: "book",
    localText: "Ekitabo",
    englishText: "Book",
    imageKey: "learning/lg/stage-2/ekitabo.png",
    audioKey: "lg.stage2.ekitabo",
    source: "Peace Corps Luganda learner materials, household vocabulary",
  },
];

const option = (concept, order) => ({
  id: concept.id,
  order,
  localText: concept.localText,
  englishText: concept.englishText,
  imageKey: concept.imageKey,
});

const orderedOptions = (concepts, correctIndex) => {
  const rotated = [...concepts.slice(correctIndex), ...concepts.slice(0, correctIndex)];
  return rotated.map((concept, index) => option(concept, index + 1));
};

const tapItems = (concepts) => concepts.map((concept, index) => ({
  id: concept.itemId,
  mechanic: "tap_to_learn",
  order: index + 1,
  word: concept.localText,
  localText: concept.localText,
  translation: concept.englishText,
  englishText: concept.englishText,
  exampleSentence: concept.localText,
  ...assetFields(concept.audioKey, concept.imageKey),
  readiness: "placeholder",
  metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
}));

const listenItems = greetingConcepts.map((concept, index) => ({
  id: index < 2
    ? ["listen-oli-otya", "listen-gyendi"][index]
    : ["listen-gyebale-ko", "listen-webale"][index - 2],
  mechanic: "listen_and_choose",
  order: index + 1,
  promptText: "Listen. Tap the words you hear.",
  ...assetFields(concept.audioKey, concept.imageKey),
  correctOptionId: concept.id,
  options: orderedOptions(greetingConcepts, index),
  readiness: "placeholder",
  metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
}));

const greetingStoryPages = [
  {
    id: "greeting-story-page-1",
    localText: "Oli otya, Kato?",
    bodyText: "How are you, Kato?",
    imageKey: "learning/lg/stage-1/story-greeting-1.png",
    audioKey: "lg.stage1.story.1",
  },
  {
    id: "greeting-story-page-2",
    localText: "Gyendi.",
    bodyText: "I am fine.",
    imageKey: "learning/lg/stage-1/story-greeting-2.png",
    audioKey: "lg.stage1.story.2",
  },
  {
    id: "greeting-story-page-3",
    localText: "Gyebale ko. Kale, naawe gyebale.",
    bodyText: "Thank you for your work. Okay, thank you too.",
    imageKey: "learning/lg/stage-1/story-greeting-3.png",
    audioKey: "lg.stage1.story.3",
  },
].map((page) => ({
  ...page,
  audioAsset: audioByKey[page.audioKey].reference,
}));

const homeStoryPages = [
  {
    id: "helping-at-home",
    localText: "Maama ne Taata bali mu nnyumba.",
    bodyText: "Mother and father are in the house.",
    imageKey: "learning/lg/stage-2/story-home-1.png",
    audioKey: "lg.stage2.story.1",
  },
  {
    id: "book-at-home",
    localText: "Omwana alina ekitabo.",
    bodyText: "The child has a book.",
    imageKey: "learning/lg/stage-2/story-home-2.png",
    audioKey: "lg.stage2.story.2",
  },
  {
    id: "water-at-home",
    localText: "Omwana anywa amazzi.",
    bodyText: "The child drinks water.",
    imageKey: "learning/lg/stage-2/story-home-3.png",
    audioKey: "lg.stage2.story.3",
  },
  {
    id: "kind-words",
    localText: "Webale, Maama. Webale, Taata.",
    bodyText: "Thank you, Mother. Thank you, Father.",
    imageKey: "learning/lg/stage-2/story-home-4.png",
    audioKey: "lg.stage2.story.4",
  },
].map((page) => ({
  ...page,
  audioAsset: audioByKey[page.audioKey].reference,
}));

const learningHub = {
  languageCode: "lg",
  displayName: "Luganda",
  localName: "Oluganda",
  pathTitle: "Yiga Oluganda: Learn Luganda",
  metadata: {
    curriculumGuide: "curriculum_guide/learning-hub-curriculum-analysis.md",
    scope: "Stages 1 and 2 only",
    targetSupport: "Shared/pre-reader with optional early-reader print practice",
    reviewStatus: "Technical draft; native Luganda, educator, cultural, accessibility, and asset review required",
  },
  stages: [
    {
      id: "first-words",
      order: 1,
      stageNumber: 1,
      title: "Okulamusa n'Okwebaza: Greetings & Thanks",
      description: "Learn four Luganda phrases for saying hello and thank you.",
      imageKey: "learning/lg/stage-1/stage-card.png",
      status: "preview",
      estimatedMinutes: 18,
      lessonCount: 6,
      isPractice: false,
      isLocked: false,
      readiness: "draft",
      mechanics: [
        "tap_to_learn",
        "listen_and_choose",
        "match_word_picture",
        "choose_correct_word",
        "story_bite",
        "mini_quiz",
      ],
      learningGoals: [
        "Encounter four reviewed greeting and gratitude phrases with pictures and audio placeholders.",
        "Eventually select a matching phrase after hearing or seeing a supported prompt.",
        "Meet the phrases again in a short dialogue and mixed review.",
      ],
      placeholderMessage: "Replace empty images/audio and complete native-language and educator review before production release.",
      metadata: {
        pathway: "shared-pre-reader-with-early-reader-options",
        objectiveIds: ["lg.s1.exposure", "lg.s1.recognition", "lg.s1.context", "lg.s1.review"],
        source: "Peace Corps Uganda, Introductory Luganda Lessons (2008), Lesson 3",
        reviewStatus: "review-required",
      },
      lessons: [
        {
          id: "greetings-1",
          order: 1,
          title: "Wuliriza era Olabe: Look and Listen",
          description: "Tap each picture and listen to the Luganda words.",
          mechanic: "tap_to_learn",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.exposure", ageSupport: "audio-and-image-first" },
          items: tapItems(greetingConcepts),
        },
        {
          id: "listen-greetings-1",
          order: 2,
          title: "Wuliriza Olonde: Listen and Pick",
          description: "Listen. Then tap the words you hear.",
          mechanic: "listen_and_choose",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.audio-recognition", requiresReviewedAudio: true },
          items: listenItems,
        },
        {
          id: "first-words-picture-match",
          order: 3,
          title: "Gatta Ekifaananyi: Match the Scene",
          description: "Tap the picture that matches the words.",
          mechanic: "match_word_picture",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.image-recognition" },
          items: [greetingConcepts[0], greetingConcepts[2]].map((concept, index) => ({
            id: index === 0 ? "match-how-are-you-picture" : "match-work-greeting-picture",
            mechanic: "match_word_picture",
            order: index + 1,
            promptText: "Tap the picture that matches.",
            targetText: concept.localText,
            targetEnglishText: concept.englishText,
            correctOptionId: concept.id,
            options: greetingConcepts.map(option),
            readiness: "placeholder",
            metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
          })),
        },
        {
          id: "first-words-word-check",
          order: 4,
          title: "Londa Ekigambo: Pick the Words",
          description: "Find two Luganda phrases you know.",
          mechanic: "choose_correct_word",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.print-recognition", ageSupport: "optional-early-reader" },
          items: [greetingConcepts[3], greetingConcepts[1]].map((concept, index) => ({
            id: index === 0 ? "choose-thank-you" : "choose-i-am-fine",
            mechanic: "choose_correct_word",
            order: index + 1,
            promptText: `What means “${concept.englishText.replace(/\.$/, "")}” in Luganda?`,
            questionText: concept.englishText,
            correctOptionId: concept.id,
            options: greetingConcepts.map(({ id, localText, englishText, imageKey }) => ({
              id,
              localText,
              englishText,
              imageKey,
            })),
            readiness: "placeholder",
            metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
          })),
        },
        {
          id: "first-words-greeting-story",
          order: 5,
          title: "Olugero Olutono: A Tiny Greeting Story",
          description: "Read a short hello story.",
          mechanic: "story_bite",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.context", source: "Adapted from Peace Corps Uganda Lesson 3 dialogue" },
          items: [{
            id: "first-words-greeting-story-pages",
            mechanic: "story_bite",
            order: 1,
            title: "Oli otya?",
            instructions: "Listen or read. Point to each speaker.",
            pages: greetingStoryPages,
            reflectionPrompt: "Which phrase would you use to ask how someone is?",
            readiness: "placeholder",
            metadata: itemReview("lg.s1.story.greeting", "Adapted from Peace Corps Uganda, Lesson 3"),
          }],
        },
        {
          id: "first-words-quick-review",
          order: 6,
          title: "Okwejjukanya: Quick Review",
          description: "Pick the right Luganda phrase.",
          mechanic: "mini_quiz",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.review", evidenceBoundary: "eventual-choice-only" },
          items: [{
            id: "first-words-review-questions",
            mechanic: "mini_quiz",
            order: 1,
            title: "Stage 1 Check",
            instructions: "Tap the right answer. Try again if you need to.",
            questions: greetingConcepts.map((concept, index) => ({
              id: `stage-1-review-${concept.id}`,
              promptText: `What means “${concept.englishText.replace(/\.$/, "")}” in Luganda?`,
              promptEnglishText: concept.englishText,
              correctOptionId: concept.id,
              options: orderedOptions(greetingConcepts, index).map(({ id, localText, englishText }) => ({
                id,
                text: localText,
                englishText,
              })),
              explanationText: `${concept.localText}: ${concept.englishText}`,
            })),
            readiness: "placeholder",
            metadata: itemReview("lg.s1.review", "Stage 1 reviewed-concept set"),
          }],
        },
      ],
    },
    {
      id: "family-home",
      order: 2,
      stageNumber: 2,
      title: "Ab'omu Maka: Family & Home",
      description: "Learn six Luganda words about family and home.",
      imageKey: "learning/lg/stage-2/stage-card.png",
      status: "preview",
      estimatedMinutes: 20,
      lessonCount: 6,
      isPractice: false,
      isLocked: false,
      readiness: "draft",
      mechanics: [
        "tap_to_learn",
        "match_word_picture",
        "choose_correct_word",
        "cultural_card",
        "story_bite",
        "mini_quiz",
      ],
      learningGoals: [
        "Encounter six concrete family and home words with pictures and audio placeholders.",
        "Eventually select matching pictures or written words with support.",
        "Meet the words in a short home context and mixed review.",
      ],
      placeholderMessage: "Replace empty images/audio and complete native-language and educator review before production release.",
      metadata: {
        pathway: "shared-pre-reader-with-early-reader-options",
        prerequisiteStageId: "first-words",
        objectiveIds: ["lg.s2.exposure", "lg.s2.recognition", "lg.s2.context", "lg.s2.review"],
        reviewStatus: "review-required",
      },
      lessons: [
        {
          id: "family-names-1",
          order: 1,
          title: "Ab'omu Maka: Family and Home Words",
          description: "Tap each picture and listen to the Luganda word.",
          mechanic: "tap_to_learn",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.exposure", ageSupport: "audio-and-image-first" },
          items: tapItems(homeConcepts),
        },
        {
          id: "home-things-1",
          order: 2,
          title: "Gatta Ekifaananyi: Match the Picture",
          description: "Tap the picture that matches the word.",
          mechanic: "match_word_picture",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.image-recognition" },
          items: [homeConcepts[0], homeConcepts[3], homeConcepts[5]].map((concept, index) => ({
            id: ["match-home-mother", "match-home-house", "match-home-book"][index],
            mechanic: "match_word_picture",
            order: index + 1,
            promptText: "Tap the picture that matches.",
            targetText: concept.localText,
            targetEnglishText: concept.englishText,
            correctOptionId: concept.id,
            options: [homeConcepts[index], homeConcepts[index + 2], concept]
              .filter((candidate, candidateIndex, all) =>
                all.findIndex((entry) => entry.id === candidate.id) === candidateIndex)
              .concat(homeConcepts.filter((candidate) => candidate.id !== concept.id))
              .slice(0, 3)
              .map(option),
            readiness: "placeholder",
            metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
          })),
        },
        {
          id: "family-pick-word",
          order: 3,
          title: "Londa Ekigambo: Pick the Word",
          description: "Find three Luganda words you know.",
          mechanic: "choose_correct_word",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.print-recognition", ageSupport: "optional-early-reader" },
          items: [homeConcepts[1], homeConcepts[2], homeConcepts[4]].map((concept, index) => ({
            id: ["choose-family-father", "choose-family-child", "choose-home-water"][index],
            mechanic: "choose_correct_word",
            order: index + 1,
            promptText: `What is “${concept.englishText}” in Luganda?`,
            questionText: concept.englishText,
            correctOptionId: concept.id,
            options: orderedOptions(
              homeConcepts,
              homeConcepts.findIndex((candidate) => candidate.id === concept.id),
            ).slice(0, 4).map(({ id, localText, englishText, imageKey }) => ({
              id,
              localText,
              englishText,
              imageKey,
            })),
            readiness: "placeholder",
            metadata: itemReview(`lg.concept.${concept.id}`, concept.source),
          })),
        },
        {
          id: "home-greeting-card",
          order: 4,
          title: "Okulamusa Awaka: Greeting at Home",
          description: "Use kind words at home.",
          mechanic: "cultural_card",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.context", cultureScope: "everyday Luganda-speaking home; review required" },
          items: [{
            id: "morning-greeting-home",
            mechanic: "cultural_card",
            order: 1,
            title: "Kind Words at Home",
            localTitle: "Okulamusa Awaka",
            localText: "Oli otya? Gyendi. Webale.",
            bodyText: "Say Oli otya? to greet someone. Say Webale to thank them.",
            imageKey: "learning/lg/stage-2/story-home-1.png",
            reflectionPrompt: "Who could you greet or thank today?",
            funFact: "Kind words help people feel welcome.",
            readiness: "placeholder",
            metadata: itemReview("lg.s2.context.greeting-home", "Stage 1 greeting set in a Stage 2 home context"),
          }],
        },
        {
          id: "thank-you-at-home-story",
          order: 5,
          title: "Awaka: A Tiny Home Story",
          description: "Read a short story about a family at home.",
          mechanic: "story_bite",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.context", languageReview: "sentence-level native review required" },
          items: [{
            id: "thank-you-at-home-pages",
            mechanic: "story_bite",
            order: 1,
            title: "Awaka: At Home",
            instructions: "Listen or read. Point to the people and things.",
            pages: homeStoryPages,
            reflectionPrompt: "Can you point to Maama, Taata, Omwana, Ekitabo, and Amazzi?",
            readiness: "placeholder",
            metadata: itemReview("lg.s2.story.home", "Drafted from the reviewed Stage 2 word set; sentence review required"),
          }],
        },
        {
          id: "family-mini-quiz",
          order: 6,
          title: "Okwejjukanya: Quick Review",
          description: "Pick the right family and home words.",
          mechanic: "mini_quiz",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.review", evidenceBoundary: "eventual-choice-only" },
          items: [homeConcepts.slice(0, 3), homeConcepts.slice(3)].map(
            (conceptGroup, itemIndex) => ({
              id: itemIndex === 0 ? "family-words-review" : "home-words-review",
              mechanic: "mini_quiz",
              order: itemIndex + 1,
              title: itemIndex === 0 ? "Family Word Check" : "Home Word Check",
              instructions: "Tap the right answer. Try again if you need to.",
              questions: conceptGroup.map((concept) => {
                const conceptIndex = homeConcepts.findIndex(
                  (candidate) => candidate.id === concept.id,
                );
                return {
                  id: `stage-2-review-${concept.id}`,
                  promptText: `What is “${concept.englishText}” in Luganda?`,
                  promptEnglishText: concept.englishText,
                  correctOptionId: concept.id,
                  options: orderedOptions(homeConcepts, conceptIndex)
                    .slice(0, 4)
                    .map(({ id, localText, englishText }) => ({
                      id,
                      text: localText,
                      englishText,
                    })),
                  explanationText: `${concept.localText}: ${concept.englishText}`,
                };
              }),
              readiness: "placeholder",
              metadata: itemReview("lg.s2.review", "Stage 2 reviewed-concept set"),
            }),
          ),
        },
      ],
    },
  ],
};

const menuCards = {
  games: [
    ["words", "Ebigambo: Words", "Build Luganda words, one letter at a time.", "learning/lg/menus/words.png", "child/games/wordgame"],
    ["logic", "Ebifaananyi: Puzzles", "Put the Luganda pictures back together.", "learning/lg/menus/puzzles.png", "child/games/puzzlegame"],
    ["cards", "Okugatta Kaadi: Match Cards", "Turn over cards and find matching Luganda words.", "learning/lg/menus/cards.png", "child/games/cardgame"],
    ["learning", "Okuyiga: Learn and Play", "See a word, hear it, then pick its meaning.", "learning/lg/menus/learning.png", "child/games/learninggame"],
    ["numbers", "Okubala 1–5: Counting", "Count from 1 to 5 in Luganda.", "learning/lg/menus/numbers.png", "child/games/lugandacountinggame"],
  ].map(([id, title, description, imageKey, targetPage], index) => ({
    id,
    order: index + 1,
    title,
    description,
    image: imageKey,
    targetPage,
  })),
  stories: [
    {
      id: "greetings-at-work",
      order: 1,
      title: "Oli otya?: A Greeting",
      description: "Say hello with Kato in three short pages.",
      image: "learning/lg/stage-1/story-greeting-1.png",
      targetPage: "child/stories/greetings-at-work",
    },
    {
      id: "family-at-home",
      order: 2,
      title: "Awaka: At Home",
      description: "Find family, a book, and water at home.",
      image: "learning/lg/stage-2/story-home-1.png",
      targetPage: "child/stories/family-at-home",
    },
  ],
  coloring: [
    ["greeting", "Oli otya?", "Color the hello picture.", "learning/lg/coloring/greeting.png", "child/games/coloring/greeting"],
    ["maama", "Maama", "Color the Maama picture.", "learning/lg/coloring/maama.png", "child/games/coloring/mother"],
    ["taata", "Taata", "Color the Taata picture.", "learning/lg/coloring/taata.png", "child/games/coloring/father"],
    ["omwana", "Omwana", "Color the Omwana picture.", "learning/lg/coloring/omwana.png", "child/games/coloring/child"],
    ["ennyumba", "Ennyumba", "Color the house picture.", "learning/lg/coloring/ennyumba.png", "child/games/coloring/house"],
  ].map(([id, title, description, imageKey, targetPage], index) => ({
    id,
    order: index + 1,
    title,
    description,
    image: imageKey,
    targetPage,
  })),
};

const learningGame = {
  title: "Okuyiga Oluganda: Learn Luganda",
  metadata: {
    curriculumScope: "Stages 1–2 optional reinforcement",
    evidenceBoundary: "Game completion is not curriculum mastery.",
    reviewStatus: "Empty media and native-language review required",
  },
  stages: [
    {
      id: 1,
      order: 1,
      title: "Stage 1: Hello and Thanks",
      description: "Learn four phrases for saying hello and thank you.",
      isLocked: false,
      requiredScore: 0,
      image: "learning/lg/stage-1/stage-card.png",
      color: "#0274BB",
      levels: [
        {
          id: 3,
          order: 1,
          title: "Hello",
          isLocked: false,
          words: greetingConcepts.slice(0, 2).map((concept, index) => ({
            id: `lg-s1-${concept.id}-hello-v1`,
            order: index + 1,
            targetText: concept.localText.replace(/\.$/, ""),
            english: concept.englishText.replace(/\.$/, ""),
            example: concept.localText,
            exampleTranslation: concept.englishText,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Small practice set; reuses the concept recording placeholder.",
          })),
        },
        {
          id: 4,
          order: 2,
          title: "Kind Words",
          isLocked: false,
          words: greetingConcepts.slice(2).map((concept, index) => ({
            id: `lg-s1-${concept.id}-kind-words-v1`,
            order: index + 1,
            targetText: concept.localText.replace(/\.$/, ""),
            english: concept.englishText.replace(/\.$/, ""),
            example: concept.localText,
            exampleTranslation: concept.englishText,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Small practice set; reuses the concept recording placeholder.",
          })),
        },
        {
          id: 1,
          order: 3,
          title: "All 4 Words",
          isLocked: false,
          words: greetingConcepts.map((concept, index) => ({
            id: `lg-s1-${concept.id}-practice-v1`,
            order: index + 1,
            targetText: concept.localText.replace(/\.$/, ""),
            english: concept.englishText.replace(/\.$/, ""),
            example: concept.localText,
            exampleTranslation: concept.englishText,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Full review set; reuses the concept recording placeholder.",
          })),
        },
      ],
    },
    {
      id: 2,
      order: 2,
      title: "Stage 2: Family and Home",
      description: "Learn six words about family and home.",
      isLocked: false,
      requiredScore: 0,
      image: "learning/lg/stage-2/stage-card.png",
      color: "#2E7D32",
      levels: [
        {
          id: 5,
          order: 1,
          title: "Family",
          isLocked: false,
          words: homeConcepts.slice(0, 3).map((concept, index) => ({
            id: `lg-s2-${concept.id}-family-v1`,
            order: index + 1,
            targetText: concept.localText,
            english: concept.englishText,
            example: `${concept.localText}.`,
            exampleTranslation: `${concept.englishText}.`,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Small practice set; reuses the concept recording placeholder.",
          })),
        },
        {
          id: 6,
          order: 2,
          title: "Home Things",
          isLocked: false,
          words: homeConcepts.slice(3).map((concept, index) => ({
            id: `lg-s2-${concept.id}-home-v1`,
            order: index + 1,
            targetText: concept.localText,
            english: concept.englishText,
            example: `${concept.localText}.`,
            exampleTranslation: `${concept.englishText}.`,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Small practice set; reuses the concept recording placeholder.",
          })),
        },
        {
          id: 2,
          order: 3,
          title: "All 6 Words",
          isLocked: false,
          words: homeConcepts.map((concept, index) => ({
            id: `lg-s2-${concept.id}-practice-v1`,
            order: index + 1,
            targetText: concept.localText,
            english: concept.englishText,
            example: `${concept.localText}.`,
            exampleTranslation: `${concept.englishText}.`,
            audio: audioByKey[concept.audioKey].reference,
            image: concept.imageKey,
            notes: "Full review set; reuses the concept recording placeholder.",
          })),
        },
      ],
    },
  ],
};

const wordGameWords = [
  ["webale", "WEBALE", "Make the Luganda word for ‘thank you’.", "You say it when someone helps you.", "It starts with W.", "learning/lg/stage-1/thanks-webale.png"],
  ["gyendi", "GYENDI", "Make the Luganda word for ‘I am fine’.", "It answers Oli otya?", "It starts with G.", "learning/lg/stage-1/reply-gyendi.png"],
  ["maama", "MAAMA", "Make the Luganda word for ‘mother’.", "It is a family word.", "It starts with M.", "learning/lg/stage-2/maama.png"],
  ["taata", "TAATA", "Make the Luganda word for ‘father’.", "It is a family word.", "It starts with T.", "learning/lg/stage-2/taata.png"],
  ["omwana", "OMWANA", "Make the Luganda word for ‘child’.", "It means a young person.", "It starts with O.", "learning/lg/stage-2/omwana.png"],
  ["ennyumba", "ENNYUMBA", "Make the Luganda word for ‘house’.", "People can live in it.", "It starts with E.", "learning/lg/stage-2/ennyumba.png"],
  ["amazzi", "AMAZZI", "Make the Luganda word for ‘water’.", "You can drink it.", "It starts with A.", "learning/lg/stage-2/amazzi.png"],
  ["ekitabo", "EKITABO", "Make the Luganda word for ‘book’.", "It has pages.", "It starts with E.", "learning/lg/stage-2/ekitabo.png"],
  ["awaka", "AWAKA", "Make the Luganda word for ‘at home’.", "You hear it in the home story.", "It starts with A.", "learning/lg/stage-2/story-home-1.png"],
  ["abaana", "ABAANA", "Make the Luganda word for ‘children’.", "Count the children in the picture.", "It starts with A.", "learning/lg/counting/children.png"],
].map(([conceptId, targetText, question, hint, subHint, imageKey], index) => ({
  id: `lg-word-game-${conceptId}-v1`,
  order: index + 1,
  targetText,
  question,
  hint,
  subHint,
  image: imageKey,
}));

const countingGame = {
  title: "Okubala: Count 1 to 5",
  metadata: {
    curriculumScope: "Optional reinforcement alongside Stages 1–2",
    linguisticCaveat: "Standalone number labels are provided; noun-class agreement must be reviewed before expanding to counted Luganda noun phrases.",
    reviewStatus: "Native-language and audio review required",
  },
  stages: [
    {
      id: 1,
      order: 1,
      title: "Okubala 1–3: Count 1–3",
      description: "Start by counting 1, 2, and 3.",
      numbersRange: { min: 1, max: 3 },
      levels: 3,
      useBunches: false,
      usesCurrency: false,
      prompt: "Bala ebintu. Count the pictures.",
    },
    {
      id: 2,
      order: 2,
      title: "Okubala 1–5: Count 1–5",
      description: "Now count all the way to 5.",
      numbersRange: { min: 1, max: 5 },
      levels: 5,
      useBunches: false,
      usesCurrency: false,
      prompt: "Bala ebintu. Count the pictures.",
    },
  ],
  numbers: [
    [1, "Emu", "lg.counting.emu"],
    [2, "Bbiri", "lg.counting.bbiri"],
    [3, "Ssatu", "lg.counting.ssatu"],
    [4, "Nnya", "lg.counting.nnya"],
    [5, "Ttaano", "lg.counting.ttaano"],
  ].map(([number, targetText, audioKey], index) => ({
    number,
    order: index + 1,
    targetText,
    audio: audioByKey[audioKey].reference,
  })),
  culturalItems: [
    ["counting-item-children", "abaana (children)", "learning/lg/counting/children.png"],
    ["counting-item-books", "ebitabo (books)", "learning/lg/counting/books.png"],
    ["counting-item-cups", "cups", "learning/lg/counting/cups.png"],
    ["counting-item-houses", "ennyumba (houses)", "learning/lg/counting/houses.png"],
    ["counting-item-water-cups", "cups of amazzi (water)", "learning/lg/counting/water-cups.png"],
  ].map(([id, name, imageKey], index) => ({ id, order: index + 1, name, image: imageKey })),
  currency: [],
};

const cardGame = {
  title: "Stage 1–2 Luganda Matching Cards",
  metadata: {
    curriculumScope: "The ten introduced Stage 1–2 concepts",
    evidenceBoundary: "Memory matching is optional reinforcement, not mastery evidence.",
  },
  items: [...greetingConcepts, ...homeConcepts].map((concept, index) => ({
    id: `card-lg-concept-${concept.id}-v1`,
    order: index + 1,
    value: concept.localText.replace(/\.$/, ""),
    info: concept.englishText,
    imageSymbol: ["👋", "🙂", "🤝", "🙏", "👩", "👨", "🧒", "🏠", "💧", "📘"][index],
  })),
};

const puzzleGame = {
  title: "Luganda Picture Puzzles",
  metadata: {
    curriculumScope: "Greeting and home settings from Stages 1–2",
    evidenceBoundary: "Puzzle completion is visual/spatial play, not language evidence.",
  },
  puzzles: [
    { id: 1, order: 1, name: "Oli otya?", description: "Put the hello picture together.", image: "learning/lg/puzzles/greeting.png" },
    { id: 2, order: 2, name: "Maama, Taata n'Omwana", description: "Put the family picture together.", image: "learning/lg/puzzles/family-home.png" },
    { id: 3, order: 3, name: "Ennyumba, Amazzi n'Ekitabo", description: "Find the house, water, and book.", image: "learning/lg/puzzles/book-and-water.png" },
    { id: 4, order: 4, name: "Maama", description: "Put the Maama picture together.", image: "learning/lg/stage-2/maama.png" },
    { id: 5, order: 5, name: "Ekitabo", description: "Put the book picture together.", image: "learning/lg/stage-2/ekitabo.png" },
  ],
};

const storyMetadata = {
  status: "placeholder",
  notes: "Curriculum-linked draft. Empty images and native-language, educator, cultural, and accessibility review are required before production.",
  sources: [
    {
      label: "Peace Corps Uganda, Introductory Luganda Lessons (2008)",
      url: "https://files.peacecorps.gov/multimedia/audio/languagelessons/uganda/UG_Luganda_Language_Lessons.PDF",
    },
    {
      label: "Baby Steps curriculum guide",
      url: "curriculum_guide/learning-hub-curriculum-analysis.md",
    },
  ],
};

const stories = [
  {
    id: "greetings-at-work",
    title: "Oli otya?: A Greeting",
    summary: "Kato says hello and answers a greeting.",
    metadata: storyMetadata,
    pages: greetingStoryPages.map(({ id, localText, bodyText, imageKey }) => ({
      id,
      text: localText,
      translation: bodyText,
      image: imageKey,
      altText: `Draft illustration for: ${bodyText}`,
    })),
    questions: [
      {
        id: "greeting-story-q1",
        question: "Tap the words for ‘How are you?’",
        options: ["Oli otya?", "Gyendi.", "Webale."],
        correctAnswer: 0,
      },
      {
        id: "greeting-story-q2",
        question: "Tap the words for ‘I am fine.’",
        options: ["Gyebale ko.", "Gyendi.", "Oli otya?"],
        correctAnswer: 1,
      },
    ],
  },
  {
    id: "family-at-home",
    title: "Awaka: At Home",
    summary: "A family shares a book and water at home.",
    metadata: storyMetadata,
    pages: homeStoryPages.map(({ id, localText, bodyText, imageKey }) => ({
      id,
      text: localText,
      translation: bodyText,
      image: imageKey,
      altText: `Draft illustration for: ${bodyText}`,
    })),
    questions: [
      {
        id: "home-story-q1",
        question: "Tap the Luganda word for ‘child’.",
        options: ["Maama", "Omwana", "Taata"],
        correctAnswer: 1,
      },
      {
        id: "home-story-q2",
        question: "Tap the Luganda word for ‘book’.",
        options: ["Amazzi", "Ennyumba", "Ekitabo"],
        correctAnswer: 2,
      },
      {
        id: "home-story-q3",
        question: "Tap the Luganda word for ‘water’.",
        options: ["Amazzi", "Maama", "Omwana"],
        correctAnswer: 0,
      },
    ],
  },
];

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
  bundle("child_menu", "games", "Stage 1–2 Luganda Games", 10, { cards: menuCards.games }),
  bundle("child_menu", "stories", "Stage 1–2 Luganda Stories", 11, { cards: menuCards.stories }),
  bundle("child_menu", "coloring", "Stage 1–2 Luganda Coloring", 12, { cards: menuCards.coloring }),
  bundle("learning_hub", "curriculum", "Luganda Curriculum: Stages 1–2", 20, learningHub),
  bundle("learning_game", "starter", "Stage 1–2 Learning Practice", 30, learningGame),
  bundle("word_game", "levels", "Stage 1–2 Word Practice", 40, {
    title: "Ebigambo: Luganda Words",
    metadata: { ageSupport: "optional-early-reader", scope: "Eight core words plus two contextual review words", evidenceBoundary: "guided construction, not independent recall" },
    levels: wordGameWords,
  }),
  bundle("counting_game", "stages", "Count 1–5 in Luganda", 50, countingGame),
  bundle("card_game", "cards", "Stage 1–2 Matching Cards", 55, cardGame),
  bundle("puzzle_game", "puzzles", "Stage 1–2 Scene Puzzles", 56, puzzleGame),
  ...stories.map((story, index) => bundle("story", story.id, story.title, 100 + index, story)),
];

const manifest = {
  schemaVersion: 1,
  generatedAt,
  languageCode: "lg",
  contentVersion,
  curriculumGuide: "curriculum_guide/learning-hub-curriculum-analysis.md",
  scope: "Luganda stages 1 and 2 plus directly related optional reinforcement",
  publicationBoundary: "Development seed only. Empty media placeholders and named review gates prevent a production-readiness claim.",
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
    preserves: ["child progress", "activity history", "achievements", "auth users", "child profiles"],
  },
  media: { images, audio: audioFiles },
  bundles,
};

const sqlQuote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const jsonLiteral = (value) => `$content$${JSON.stringify(value)}$content$::jsonb`;

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
-- Development seed for the reviewed structure of Luganda stages 1 and 2.
-- Media files are intentionally empty placeholders. Do not use this seed to
-- claim production linguistic, educational, cultural, or asset readiness.

BEGIN;

-- Purge obsolete Luganda runtime content only. Learner progress, history,
-- achievements, auth records, and child profiles are intentionally preserved.
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

for (const mediaEntry of [...images, ...audioFiles]) {
  const absolutePath = join(repositoryRoot, mediaEntry.path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  if (!existsSync(absolutePath)) {
    writeFileSync(absolutePath, Buffer.alloc(0));
  }
}

console.log(`Generated ${bundles.length} content rows.`);
console.log(`Created or retained ${images.length} image placeholders and ${audioFiles.length} audio placeholders.`);
