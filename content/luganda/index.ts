import {
  COUNTING_GAME_STAGES,
  lugandaNumbers100To1000,
  lugandaNumbers1To10,
  lugandaNumbers20To50,
  lugandaNumbers50To100,
  ugandanCurrency,
} from "@/content/games/countingGameStages";
import { LUGANDA_STAGES } from "@/content/games/lugandawords";
import { gameLevels } from "@/content/games/wordgamewords";
import type {
  LocalCountingNumber,
  LocalLanguageContent,
  LocalLearningStage,
  LocalWordGameLevel,
} from "@/content/types";

const mapLugandaLearningStages = (): LocalLearningStage[] => {
  return LUGANDA_STAGES.map((stage) => ({
    id: `lg-learning-stage-${stage.id}`,
    numericId: stage.id,
    title: stage.title,
    description: stage.description,
    isLocked: stage.isLocked,
    requiredScore: stage.requiredScore,
    image: stage.image,
    color: stage.color,
    levels: stage.levels.map((level) => ({
      id: `lg-learning-stage-${stage.id}-level-${level.id}`,
      numericId: level.id,
      title: level.title,
      isLocked: level.isLocked,
      words: level.words.map((word, index) => ({
        id: `lg-learning-stage-${stage.id}-level-${level.id}-word-${index + 1}`,
        targetText: word.luganda,
        english: word.english,
        example: word.example,
        exampleTranslation: word.exampleTranslation,
        audio: word.audio,
        image: word.image,
      })),
    })),
  }));
};

const mapLugandaWordGameLevels = (): LocalWordGameLevel[] => {
  return gameLevels.map((level, index) => ({
    id: `lg-word-game-level-${index + 1}`,
    targetText: level.word,
    question: level.question,
    hint: level.hint,
    subHint: level.subHint,
    firstLetter: level.firstLetter,
    image: level.image,
  }));
};

const mapLugandaCountingNumbers = (): LocalCountingNumber[] => {
  const numberItems = [
    ...lugandaNumbers1To10,
    ...lugandaNumbers20To50,
    ...lugandaNumbers50To100,
    ...lugandaNumbers100To1000,
  ];

  const uniqueNumbers = new Map<number, LocalCountingNumber>();

  for (const item of numberItems) {
    if (!uniqueNumbers.has(item.number)) {
      uniqueNumbers.set(item.number, {
        number: item.number,
        targetText: item.luganda,
        audio: item.audio,
      });
    }
  }

  for (const item of ugandanCurrency) {
    uniqueNumbers.set(item.value, {
      number: item.value,
      targetText: item.luganda,
    });
  }

  return [...uniqueNumbers.values()].sort((a, b) => a.number - b.number);
};

export const lugandaContent: LocalLanguageContent = {
  languageCode: "lg",
  metadata: {
    status: "existing-prototype",
    notes:
      "This registry adapts existing Luganda prototype game content. Story and museum content still live in their current screen components.",
  },
  stories: [],
  lessons: {
    stages: mapLugandaLearningStages(),
  },
  games: {
    wordGameLevels: mapLugandaWordGameLevels(),
    counting: {
      stages: COUNTING_GAME_STAGES.map((stage) => ({
        id: `lg-counting-stage-${stage.id}`,
        numericId: stage.id,
        title: stage.title,
        description: stage.description,
        numbersRange: stage.numbersRange,
        levels: stage.levels,
        useBunches: stage.useBunches,
        itemsPerBunch: stage.itemsPerBunch,
        usesCurrency: stage.usesCurrency,
      })),
      numbers: mapLugandaCountingNumbers(),
    },
  },
};
