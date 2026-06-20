import type { LocalLanguageContent } from "@/content/types";

const sampleImage = require("@/assets/images/learning-beginner.jpg");

export const runyankoleContent: LocalLanguageContent = {
  languageCode: "nyn",
  metadata: {
    status: "placeholder",
    notes:
      "Testing-only Runyankole sample content. Use it to validate language switching; replace it with curriculum-reviewed content before release.",
    sources: [
      {
        label: "Omniglot Nkore phrases",
        url: "https://omniglot.com/language/phrases/nkore.htm",
      },
      {
        label: "Nkore Kiga Academy counting sample",
        url: "https://nkorekigaacademy.com/lessons/beginner/counting-numbers",
      },
      {
        label: "Uganda Ministry of Education Runyankore-Rukiga sample PDF",
        url: "https://www.education.go.ug/wp-content/uploads/2020/05/Runyankore-Rukiga-1-Copy.pdf",
      },
    ],
  },
  stories: [
    {
      id: "nyn-sample-morning-greeting",
      title: "Agandi Omuka",
      summary:
        "Placeholder story shell using simple Runyankole greetings for language-switching tests.",
      languageCode: "nyn",
      metadata: {
        status: "placeholder",
        notes:
          "Not final story curriculum. Keep short until reviewed by a Runyankole language specialist.",
      },
      pages: [
        {
          id: "nyn-sample-morning-greeting-page-1",
          text: "Agandi? Nimarungi. A learner greets the family at home before starting the day.",
          translation:
            "How are you? I am fine. A learner greets the family at home before starting the day.",
          image: "learning-beginner.jpg",
          altText: "A learner greeting family at home",
        },
        {
          id: "nyn-sample-morning-greeting-page-2",
          text: "Webare, Mama. The learner thanks Mama and helps count cups of water.",
          translation:
            "Thank you, Mama. The learner thanks Mama and helps count cups of water.",
          image: "learning-beginner.jpg",
          altText: "A learner helping at home",
        },
      ],
      questions: [
        {
          id: "nyn-sample-morning-greeting-question-1",
          question: "Which greeting appears in the sample story?",
          options: ["Agandi", "Oli otya", "Kkumi", "Kabaka"],
          correctAnswer: 0,
        },
      ],
    },
  ],
  lessons: {
    stages: [
      {
        id: "nyn-learning-stage-1",
        numericId: 1,
        title: "Runyankole Starter Samples",
        description:
          "Placeholder greetings and home words for testing language-specific lessons.",
        isLocked: false,
        requiredScore: 0,
        image: sampleImage,
        color: "#0F766E",
        levels: [
          {
            id: "nyn-learning-stage-1-level-1",
            numericId: 1,
            title: "Greetings",
            isLocked: false,
            words: [
              {
                id: "nyn-word-agandi",
                targetText: "Agandi",
                english: "How are you? / Other news?",
                example: "Agandi?",
                exampleTranslation: "How are you?",
                audio: "correct.mp3",
                image: sampleImage,
                notes: "Placeholder spelling and phrasing; review before release.",
              },
              {
                id: "nyn-word-nimarungi",
                targetText: "Nimarungi",
                english: "Good news / I am fine",
                example: "Nimarungi.",
                exampleTranslation: "I am fine.",
                audio: "correct.mp3",
                image: sampleImage,
                notes: "Placeholder spelling and phrasing; review before release.",
              },
              {
                id: "nyn-word-webare",
                targetText: "Webare",
                english: "Thank you",
                example: "Webare munonga.",
                exampleTranslation: "Thank you very much.",
                audio: "correct.mp3",
                image: sampleImage,
                notes: "Placeholder spelling and phrasing; review before release.",
              },
            ],
          },
          {
            id: "nyn-learning-stage-1-level-2",
            numericId: 2,
            title: "Home Words",
            isLocked: false,
            words: [
              {
                id: "nyn-word-amazzi",
                targetText: "Amazzi",
                english: "Water",
                example: "Amazzi gari omuka.",
                exampleTranslation: "There is water at home.",
                audio: "correct.mp3",
                image: sampleImage,
                notes: "Placeholder example; review before release.",
              },
            ],
          },
        ],
      },
    ],
  },
  games: {
    wordGameLevels: [
      {
        id: "nyn-word-game-agandi",
        targetText: "AGANDI",
        question: "A simple Runyankole greeting",
        hint: "Use this when greeting someone.",
        subHint: "It can mean 'How are you?' or 'Any news?'",
        image: "learning-beginner.jpg",
      },
      {
        id: "nyn-word-game-webare",
        targetText: "WEBARE",
        question: "A polite word used to show thanks",
        hint: "Say this after someone helps you.",
        subHint: "In English, it means 'thank you'.",
        image: "learning-beginner.jpg",
      },
      {
        id: "nyn-word-game-AMAZZI",
        targetText: "AMAZZI",
        question: "A word for water",
        hint: "You drink this every day.",
        subHint: "This sample word also appears in nearby Bantu languages.",
        image: "learning-beginner.jpg",
      },
    ],
    counting: {
      stages: [
        {
          id: "nyn-counting-stage-1",
          numericId: 1,
          title: "Basic Counting Samples (1-5)",
          description:
            "Placeholder Runyankole counting labels for language-switching tests.",
          numbersRange: { min: 1, max: 5 },
          levels: 5,
          useBunches: false,
          usesCurrency: false,
        },
      ],
      numbers: [
        { number: 1, targetText: "Emwe", audio: "correct.mp3" },
        { number: 2, targetText: "Ibiri", audio: "correct.mp3" },
        { number: 3, targetText: "Ishatu", audio: "correct.mp3" },
        { number: 4, targetText: "Ina", audio: "correct.mp3" },
        { number: 5, targetText: "Itaano", audio: "correct.mp3" },
      ],
    },
  },
};
