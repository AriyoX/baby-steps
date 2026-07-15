import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedAt = "2026-07-15T21:00:00+03:00";
const publishedAt = "2026-07-15 18:00:00+00";
const contentVersion = 2;

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
  promptText: "Listen, then choose the matching phrase.",
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
  pathTitle: "Ekkubo ly'Okuyiga Oluganda — Luganda Learning Path",
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
      title: "Okulamusa n'Okwebaza — Greetings & Thanks",
      description: "Meet four everyday Luganda greeting and gratitude phrases, recognize them, use them in a tiny dialogue, and review them.",
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
          title: "Wuliriza era Olabe — Meet the Phrases",
          description: "Look, listen, and optionally repeat four everyday phrases.",
          mechanic: "tap_to_learn",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.exposure", ageSupport: "audio-and-image-first" },
          items: tapItems(greetingConcepts),
        },
        {
          id: "listen-greetings-1",
          order: 2,
          title: "Wuliriza Olonde — Listen and Choose",
          description: "Hear a placeholder clip and select the matching supported phrase.",
          mechanic: "listen_and_choose",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.audio-recognition", requiresReviewedAudio: true },
          items: listenItems,
        },
        {
          id: "first-words-picture-match",
          order: 3,
          title: "Gatta Ekifaananyi — Match the Scene",
          description: "Match two familiar greeting phrases to their scenes.",
          mechanic: "match_word_picture",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.image-recognition" },
          items: [greetingConcepts[0], greetingConcepts[2]].map((concept, index) => ({
            id: index === 0 ? "match-how-are-you-picture" : "match-work-greeting-picture",
            mechanic: "match_word_picture",
            order: index + 1,
            promptText: "Choose the picture that matches the phrase.",
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
          title: "Londa Ekigambo — Supported Word Check",
          description: "Optional early-reader practice with two already introduced phrases.",
          mechanic: "choose_correct_word",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.print-recognition", ageSupport: "optional-early-reader" },
          items: [greetingConcepts[3], greetingConcepts[1]].map((concept, index) => ({
            id: index === 0 ? "choose-thank-you" : "choose-i-am-fine",
            mechanic: "choose_correct_word",
            order: index + 1,
            promptText: `Which reviewed phrase means “${concept.englishText.replace(/\.$/, "")}”?`,
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
          title: "Olugero Olutono — A Tiny Greeting Story",
          description: "Meet the four phrases in a short, caregiver-supported dialogue.",
          mechanic: "story_bite",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.context", source: "Adapted from Peace Corps Uganda Lesson 3 dialogue" },
          items: [{
            id: "first-words-greeting-story-pages",
            mechanic: "story_bite",
            order: 1,
            title: "Oli otya?",
            instructions: "Listen or read together. Point to each speaker and repeat only if the child wants to.",
            pages: greetingStoryPages,
            reflectionPrompt: "Which phrase would you use to ask how someone is?",
            readiness: "placeholder",
            metadata: itemReview("lg.s1.story.greeting", "Adapted from Peace Corps Uganda, Lesson 3"),
          }],
        },
        {
          id: "first-words-quick-review",
          order: 6,
          title: "Okwejjukanya — Friendly Review",
          description: "Revisit the four phrases in a short supplied-choice review.",
          mechanic: "mini_quiz",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s1.review", evidenceBoundary: "eventual-choice-only" },
          items: [{
            id: "first-words-review-questions",
            mechanic: "mini_quiz",
            order: 1,
            title: "Stage 1 Review",
            instructions: "Choose the best answer. You can try again.",
            questions: greetingConcepts.map((concept, index) => ({
              id: `stage-1-review-${concept.id}`,
              promptText: `Which Luganda phrase means “${concept.englishText.replace(/\.$/, "")}”?`,
              promptEnglishText: concept.englishText,
              correctOptionId: concept.id,
              options: orderedOptions(greetingConcepts, index).map(({ id, localText, englishText }) => ({
                id,
                text: localText,
                englishText,
              })),
              explanationText: `${concept.localText} — ${concept.englishText}`,
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
      title: "Ab'omu Maka — Family & Home",
      description: "Meet six concrete family and home words, recognize them in pictures and print, see them in a tiny home story, and review them.",
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
          title: "Ab'omu Maka — Meet Family & Home Words",
          description: "Look, listen, and optionally repeat six concrete words.",
          mechanic: "tap_to_learn",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.exposure", ageSupport: "audio-and-image-first" },
          items: tapItems(homeConcepts),
        },
        {
          id: "home-things-1",
          order: 2,
          title: "Gatta Ekifaananyi — Match Words & Pictures",
          description: "Match three reviewed words to their pictures.",
          mechanic: "match_word_picture",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.image-recognition" },
          items: [homeConcepts[0], homeConcepts[3], homeConcepts[5]].map((concept, index) => ({
            id: ["match-home-mother", "match-home-house", "match-home-book"][index],
            mechanic: "match_word_picture",
            order: index + 1,
            promptText: "Choose the picture that matches the word.",
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
          title: "Londa Ekigambo — Supported Word Check",
          description: "Optional early-reader practice with three already introduced words.",
          mechanic: "choose_correct_word",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.print-recognition", ageSupport: "optional-early-reader" },
          items: [homeConcepts[1], homeConcepts[2], homeConcepts[4]].map((concept, index) => ({
            id: ["choose-family-father", "choose-family-child", "choose-home-water"][index],
            mechanic: "choose_correct_word",
            order: index + 1,
            promptText: `Which reviewed word means “${concept.englishText}”?`,
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
          title: "Okulamusa Awaka — Greeting at Home",
          description: "A short shared prompt about greeting and thanking people at home.",
          mechanic: "cultural_card",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.context", cultureScope: "everyday Luganda-speaking home; review required" },
          items: [{
            id: "morning-greeting-home",
            mechanic: "cultural_card",
            order: 1,
            title: "Kind words at home",
            localTitle: "Okulamusa Awaka",
            localText: "Oli otya? Gyendi. Webale.",
            bodyText: "Greetings and thanks can be part of caring everyday talk. Practice the reviewed phrases with a willing family member.",
            imageKey: "learning/lg/stage-2/story-home-1.png",
            reflectionPrompt: "Who could you greet or thank today?",
            funFact: "The app records that this card was viewed; it does not score spoken practice.",
            readiness: "placeholder",
            metadata: itemReview("lg.s2.context.greeting-home", "Stage 1 greeting set in a Stage 2 home context"),
          }],
        },
        {
          id: "thank-you-at-home-story",
          order: 5,
          title: "Awaka — A Tiny Home Story",
          description: "Meet family and home words in four short pages.",
          mechanic: "story_bite",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.context", languageReview: "sentence-level native review required" },
          items: [{
            id: "thank-you-at-home-pages",
            mechanic: "story_bite",
            order: 1,
            title: "Awaka — At Home",
            instructions: "Listen or read together. Point to the people and things in each picture.",
            pages: homeStoryPages,
            reflectionPrompt: "Can you point to Maama, Taata, Omwana, Ekitabo, and Amazzi?",
            readiness: "placeholder",
            metadata: itemReview("lg.s2.story.home", "Drafted from the reviewed Stage 2 word set; sentence review required"),
          }],
        },
        {
          id: "family-mini-quiz",
          order: 6,
          title: "Okwejjukanya — Friendly Review",
          description: "Revisit all six family and home words in a short supplied-choice review.",
          mechanic: "mini_quiz",
          isStartable: true,
          readiness: "placeholder",
          metadata: { objectiveId: "lg.s2.review", evidenceBoundary: "eventual-choice-only" },
          items: [homeConcepts.slice(0, 3), homeConcepts.slice(3)].map(
            (conceptGroup, itemIndex) => ({
              id: itemIndex === 0 ? "family-words-review" : "home-words-review",
              mechanic: "mini_quiz",
              order: itemIndex + 1,
              title: itemIndex === 0 ? "Family Words Review" : "Home Words Review",
              instructions: "Choose the best answer. You can try again.",
              questions: conceptGroup.map((concept) => {
                const conceptIndex = homeConcepts.findIndex(
                  (candidate) => candidate.id === concept.id,
                );
                return {
                  id: `stage-2-review-${concept.id}`,
                  promptText: `Which Luganda word means “${concept.englishText}”?`,
                  promptEnglishText: concept.englishText,
                  correctOptionId: concept.id,
                  options: orderedOptions(homeConcepts, conceptIndex)
                    .slice(0, 4)
                    .map(({ id, localText, englishText }) => ({
                      id,
                      text: localText,
                      englishText,
                    })),
                  explanationText: `${concept.localText} — ${concept.englishText}`,
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
    ["words", "Ebigambo — Words", "Build reviewed Stage 1–2 words; best for emerging readers.", "learning/lg/menus/words.png", "child/games/wordgame"],
    ["logic", "Ebifaananyi — Puzzles", "Explore greeting and home scenes; puzzle completion is not language mastery.", "learning/lg/menus/puzzles.png", "child/games/puzzlegame"],
    ["cards", "Okugatta Kaadi — Match Cards", "Match the ten phrases and words introduced in Stages 1–2.", "learning/lg/menus/cards.png", "child/games/cardgame"],
    ["learning", "Okuyiga — Learning Practice", "Replay Stage 1–2 words with pictures, meanings, and audio placeholders.", "learning/lg/menus/learning.png", "child/games/learninggame"],
    ["numbers", "Okubala 1–5 — Counting", "Optional number-word practice from one to five with familiar home objects.", "learning/lg/menus/numbers.png", "child/games/lugandacountinggame"],
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
      title: "Oli otya? — A Greeting",
      description: "A three-page Stage 1 dialogue using Oli otya, Gyendi, and Gyebale ko.",
      image: "learning/lg/stage-1/story-greeting-1.png",
      targetPage: "child/stories/greetings-at-work",
    },
    {
      id: "family-at-home",
      order: 2,
      title: "Awaka — At Home",
      description: "A four-page Stage 2 story about family, a book, and water at home.",
      image: "learning/lg/stage-2/story-home-1.png",
      targetPage: "child/stories/family-at-home",
    },
  ],
  coloring: [
    ["greeting", "Oli otya?", "Color a greeting scene and say the phrase together if you wish.", "learning/lg/coloring/greeting.png", "child/games/coloring/greeting"],
    ["maama", "Maama", "Color the Maama picture; this is optional fine-motor play.", "learning/lg/coloring/maama.png", "child/games/coloring/mother"],
    ["taata", "Taata", "Color the Taata picture; this is optional fine-motor play.", "learning/lg/coloring/taata.png", "child/games/coloring/father"],
    ["omwana", "Omwana", "Color the Omwana picture; coloring does not prove word knowledge.", "learning/lg/coloring/omwana.png", "child/games/coloring/child"],
    ["ennyumba", "Ennyumba", "Color the Ennyumba picture and point to parts of the home.", "learning/lg/coloring/ennyumba.png", "child/games/coloring/house"],
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
  title: "Okuyiga Oluganda — Stages 1–2 Practice",
  metadata: {
    curriculumScope: "Stages 1–2 optional reinforcement",
    evidenceBoundary: "Game completion is not curriculum mastery.",
    reviewStatus: "Empty media and native-language review required",
  },
  stages: [
    {
      id: 1,
      order: 1,
      title: "Stage 1: Okulamusa n'Okwebaza",
      description: "Practice the four greeting and gratitude phrases from Stage 1.",
      isLocked: false,
      requiredScore: 0,
      image: "learning/lg/stage-1/stage-card.png",
      color: "#0274BB",
      levels: [{
        id: 1,
        order: 1,
        title: "Greetings & Thanks",
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
          notes: "Curriculum-linked optional practice; recording is an empty placeholder.",
        })),
      }],
    },
    {
      id: 2,
      order: 2,
      title: "Stage 2: Ab'omu Maka",
      description: "Practice the six family and home words from Stage 2.",
      isLocked: false,
      requiredScore: 0,
      image: "learning/lg/stage-2/stage-card.png",
      color: "#2E7D32",
      levels: [{
        id: 2,
        order: 1,
        title: "Family & Home",
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
          notes: "Curriculum-linked optional practice; recording is an empty placeholder.",
        })),
      }],
    },
  ],
};

const wordGameWords = [
  ["webale", "WEBALE", "Which Stage 1 word means ‘thank you’?", "It is used to show gratitude.", "This is the reviewed Stage 1 gratitude word.", "learning/lg/stage-1/thanks-webale.png"],
  ["gyendi", "GYENDI", "Which Stage 1 reply means ‘I am fine’?", "It answers Oli otya?", "This is the reviewed Stage 1 reply.", "learning/lg/stage-1/reply-gyendi.png"],
  ["maama", "MAAMA", "Which Stage 2 word means ‘mother’?", "It names a parent.", "This is a reviewed family word.", "learning/lg/stage-2/maama.png"],
  ["taata", "TAATA", "Which Stage 2 word means ‘father’?", "It names a parent.", "This is a reviewed family word.", "learning/lg/stage-2/taata.png"],
  ["omwana", "OMWANA", "Which Stage 2 word means ‘child’?", "It names a young person.", "This is a reviewed family word.", "learning/lg/stage-2/omwana.png"],
  ["ennyumba", "ENNYUMBA", "Which Stage 2 word means ‘house’?", "People can live in it.", "This is a reviewed home word.", "learning/lg/stage-2/ennyumba.png"],
  ["amazzi", "AMAZZI", "Which Stage 2 word means ‘water’?", "People drink it.", "This is a reviewed home word.", "learning/lg/stage-2/amazzi.png"],
  ["ekitabo", "EKITABO", "Which Stage 2 word means ‘book’?", "It has pages to read or look at.", "This is a reviewed home word.", "learning/lg/stage-2/ekitabo.png"],
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
  title: "Okubala 1–5 — Count One to Five",
  metadata: {
    curriculumScope: "Optional reinforcement alongside Stages 1–2",
    linguisticCaveat: "Standalone number labels are provided; noun-class agreement must be reviewed before expanding to counted Luganda noun phrases.",
    reviewStatus: "Native-language and audio review required",
  },
  stages: [{
    id: 1,
    order: 1,
    title: "Okubala 1–5 — Count 1–5",
    description: "Count familiar home objects from one to five and see the standalone Luganda number label.",
    numbersRange: { min: 1, max: 5 },
    levels: 5,
    useBunches: false,
    usesCurrency: false,
    prompt: "Bala ebintu. — Count the objects.",
  }],
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
    ["counting-item-children", "children / abaana", "learning/lg/counting/children.png"],
    ["counting-item-books", "books / ebitabo", "learning/lg/counting/books.png"],
    ["counting-item-cups", "cups", "learning/lg/counting/cups.png"],
    ["counting-item-houses", "houses / ennyumba", "learning/lg/counting/houses.png"],
    ["counting-item-water-cups", "cups of water / amazzi", "learning/lg/counting/water-cups.png"],
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
    info: `${concept.englishText} Curriculum-linked optional practice; pronunciation and usage still require native review.`,
    imageSymbol: ["👋", "🙂", "🤝", "🙏", "👩", "👨", "🧒", "🏠", "💧", "📘"][index],
  })),
};

const puzzleGame = {
  title: "Stage 1–2 Scene Puzzles",
  metadata: {
    curriculumScope: "Greeting and home settings from Stages 1–2",
    evidenceBoundary: "Puzzle completion is visual/spatial play, not language evidence.",
  },
  puzzles: [
    { id: 1, order: 1, name: "Oli otya?", description: "A greeting scene from Stage 1", image: "learning/lg/puzzles/greeting.png" },
    { id: 2, order: 2, name: "Maama, Taata n'Omwana", description: "A family-at-home scene from Stage 2", image: "learning/lg/puzzles/family-home.png" },
    { id: 3, order: 3, name: "Ennyumba, Amazzi n'Ekitabo", description: "A house, water, and book scene from Stage 2", image: "learning/lg/puzzles/book-and-water.png" },
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
    title: "Oli otya? — A Greeting",
    summary: "A short Stage 1 greeting dialogue.",
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
        question: "Which phrase asks ‘How are you?’",
        options: ["Oli otya?", "Gyendi.", "Webale."],
        correctAnswer: 0,
      },
      {
        id: "greeting-story-q2",
        question: "Which reply means ‘I am fine’ ?",
        options: ["Gyebale ko.", "Gyendi.", "Oli otya?"],
        correctAnswer: 1,
      },
    ],
  },
  {
    id: "family-at-home",
    title: "Awaka — At Home",
    summary: "A short Stage 2 family-and-home story.",
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
        question: "Which Luganda word in the story means ‘child’?",
        options: ["Maama", "Omwana", "Taata"],
        correctAnswer: 1,
      },
      {
        id: "home-story-q2",
        question: "Which Luganda word means ‘book’?",
        options: ["Amazzi", "Ennyumba", "Ekitabo"],
        correctAnswer: 2,
      },
      {
        id: "home-story-q3",
        question: "Which Luganda word means ‘water’?",
        options: ["Amazzi", "Maama", "Omwana"],
        correctAnswer: 0,
      },
    ],
  },
];

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
  payload,
});

const bundles = [
  bundle("child_menu", "games", "Stage 1–2 Luganda Games", 10, { cards: menuCards.games }),
  bundle("child_menu", "stories", "Stage 1–2 Luganda Stories", 11, { cards: menuCards.stories }),
  bundle("child_menu", "coloring", "Stage 1–2 Luganda Coloring", 12, { cards: menuCards.coloring }),
  bundle("learning_hub", "curriculum", "Luganda Curriculum — Stages 1–2", 20, learningHub),
  bundle("learning_game", "starter", "Stage 1–2 Learning Practice", 30, learningGame),
  bundle("word_game", "levels", "Stage 1–2 Word Practice", 40, {
    title: "Ebigambo — Stage 1–2 Words",
    metadata: { ageSupport: "optional-early-reader", evidenceBoundary: "guided construction, not independent recall" },
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
