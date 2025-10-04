// lugandaData.ts
import { ImageSourcePropType } from 'react-native';

// Interfaces for our data structures
export interface WordItem {
  luganda: string;
  english: string;
  audio: string;
  example: string;
  exampleTranslation: string;
  image: ImageSourcePropType;
}

export interface Level {
  id: number;
  title: string;
  words: WordItem[];
  isLocked: boolean;
}

export interface Stage {
  id: number;
  title: string;
  description: string;
  levels: Level[];
  isLocked: boolean;
  image: ImageSourcePropType;
  color: string;
  requiredScore: number; // Minimum score to unlock next stage
}

// Helper function to create placeholders for word items
const createWordItem = (
  luganda: string,
  english: string,
  example: string,
  exampleTranslation: string
): WordItem => {
  return {
    luganda,
    english,
    audio: 'correct.mp3', // Default audio file
    example,
    exampleTranslation,
    image: require('@/assets/images/learning-beginner.jpg'), // Default image
  };
};

// Stages data with levels and words
export const LUGANDA_STAGES: Stage[] = [
  {
    id: 1,
    title: "Beginner",
    description: "Learn basic Luganda words and phrases",
    image: require('@/assets/images/coin.png'),
    color: "#4F85E6",
    isLocked: false,
    requiredScore: 0,
    levels: [
      {
        id: 1,
        title: "Greetings",
        isLocked: false,
        words: [
          createWordItem(
            'Oli otya', 
            'How are you', 
            'Oli otya leero?', 
            'How are you today?'
          ),
          createWordItem(
            'Bulungi', 
            'Good/Fine', 
            'Ndi bulungi, webale.', 
            "I'm fine, thank you."
          ),
          createWordItem(
            'Webale', 
            'Thank you', 
            'Webale nnyo!', 
            'Thank you very much!'
          ),
          createWordItem(
            'Ssebo', 
            'Sir', 
            'Ssebo, nnyamba.', 
            'Sir, help me.'
          )
        ]
      },
      {
        id: 2,
        title: "People",
        isLocked: false,
        words: [
          createWordItem(
            'Omukazi', 
            'Woman', 
            'Omukazi oyo mulungi nnyo.', 
            'That woman is very beautiful.'
          ),
          createWordItem(
            'Omusajja', 
            'Man', 
            'Omusajja oyo mugumikiriza.', 
            'That man is patient.'
          ),
          createWordItem(
            'Omwana', 
            'Child', 
            'Omwana oyo musanyufu nnyo.', 
            'That child is very happy.'
          ),
          createWordItem(
            'Abawala', 
            'Girls', 
            'Abawala bali basoma.', 
            'Those girls are studying.'
          )
        ]
      }
    ]
  },
  
  {
    id: 2,
    title: "Elementary",
    description: "Basic objects and everyday items",
    image: require('@/assets/images/coin.png'),
    color: "#6C5CE7",
    isLocked: true,
    requiredScore: 50,
    levels: [
      {
        id: 3,
        title: "Objects",
        isLocked: true,
        words: [
          createWordItem(
            'Amazzi', 
            'Water', 
            'Amazzi gano mangi.', 
            'This water is a lot.'
          ),
          createWordItem(
            'Emmere', 
            'Food', 
            'Emmere eno nnungi.', 
            'This food is delicious.'
          ),
          createWordItem(
            'Ennyumba', 
            'House', 
            'Ennyumba yange nnungi.', 
            'My house is beautiful.'
          ),
          createWordItem(
            'Ekitabo', 
            'Book', 
            'Ekitabo kino kirungi.', 
            'This book is good.'
          )
        ]
      },
      {
        id: 4,
        title: "Places",
        isLocked: true,
        words: [
          createWordItem(
            'Ekibuga', 
            'City', 
            'Ekibuga kya Kampala kinene.', 
            'Kampala city is big.'
          ),
          createWordItem(
            'Ekyalo', 
            'Village', 
            'Ekyalo kyange kirungi.', 
            'My village is beautiful.'
          ),
          createWordItem(
            'Essomero', 
            'School', 
            'Essomero lino linene.', 
            'This school is big.'
          ),
          createWordItem(
            'Eddwaliro', 
            'Hospital', 
            'Eddwaliro lisangibwa ku kasozi.', 
            'The hospital is located on the hill.'
          )
        ]
      }
    ]
  },
  
  {
    id: 3,
    title: "Intermediate",
    description: "Actions and descriptions",
    image: require('@/assets/images/coin.png'),
    color: "#00B894",
    isLocked: true,
    requiredScore: 90,
    levels: [
      {
        id: 5,
        title: "Verbs",
        isLocked: true,
        words: [
          createWordItem(
            'Okukyala', 
            'To visit', 
            'Njagala okukyala mu kyalo kyange.', 
            'I want to visit my village.'
          ),
          createWordItem(
            'Okuyiga', 
            'To learn', 
            'Njagala okuyiga Oluganda.', 
            'I want to learn Luganda.'
          ),
          createWordItem(
            'Okulya', 
            'To eat', 
            'Tujja kulya emmere.', 
            'We will eat food.'
          ),
          createWordItem(
            'Okunywa', 
            'To drink', 
            'Njagala okunywa amazzi.', 
            'I want to drink water.'
          )
        ]
      },
      {
        id: 6,
        title: "Adjectives",
        isLocked: true,
        words: [
          createWordItem(
            'Bulungi', 
            'Good', 
            'Kirungi nnyo.', 
            'It is very good.'
          ),
          createWordItem(
            'Bubi', 
            'Bad', 
            'Embeera mbi.', 
            'The situation is bad.'
          ),
          createWordItem(
            'Kinene', 
            'Big', 
            'Ennyumba nnene.', 
            'The house is big.'
          ),
          createWordItem(
            'Kitono', 
            'Small', 
            'Akatunda katono.', 
            'The fruit is small.'
          )
        ]
      }
    ]
  },
  
  {
    id: 4,
    title: "Advanced",
    description: "Nature and environment",
    image: require('@/assets/images/coin.png'),
    color: "#FF7675",
    isLocked: true,
    requiredScore: 130,
    levels: [
      {
        id: 7,
        title: "Nature",
        isLocked: true,
        words: [
          createWordItem(
            'Eggulu', 
            'Sky', 
            'Eggulu lino bbululu.', 
            'The sky is blue.'
          ),
          createWordItem(
            'Emmunyeenye', 
            'Star', 
            'Emmunyeenye nyingi ziri mu ggulu.', 
            'There are many stars in the sky.'
          ),
          createWordItem(
            'Omusana', 
            'Sun', 
            'Omusana gwaka nnyo leero.', 
            'The sun is very hot today.'
          ),
          createWordItem(
            'Omwezi', 
            'Moon', 
            'Omwezi gwaka ekiro.', 
            'The moon shines at night.'
          )
        ]
      },
      {
        id: 8,
        title: "Environment",
        isLocked: true,
        words: [
          createWordItem(
            'Olukalu', 
            'Land', 
            'Olukalu luno lugimu.', 
            'This land is fertile.'
          ),
          createWordItem(
            'Ekibira', 
            'Forest', 
            'Ekibira kino kinene.', 
            'This forest is big.'
          ),
          createWordItem(
            'Enyanja', 
            'Lake', 
            'Enyanja Victoria nnene.', 
            'Lake Victoria is big.'
          ),
          createWordItem(
            'Olusozi', 
            'Mountain', 
            'Olusozi luno luwanvu.', 
            'This mountain is tall.'
          )
        ]
      }
    ]
  },
  
  {
    id: 5,
    title: "Expert",
    description: "Complex concepts and expressions",
    image: require('@/assets/images/coin.png'),
    color: "#A29BFE",
    isLocked: true,
    requiredScore: 170,
    levels: [
      {
        id: 9,
        title: "Time Expressions",
        isLocked: true,
        words: [
          createWordItem(
            'Leero', 
            'Today', 
            'Leero nnagenda mu kibuga.', 
            'Today I went to the city.'
          ),
          createWordItem(
            'Enkya', 
            'Tomorrow', 
            'Enkya tugenda mu ssomero.', 
            'Tomorrow we go to school.'
          ),
          createWordItem(
            'Jjo', 
            'Yesterday', 
            'Jjo twalabye film.', 
            'Yesterday we watched a film.'
          ),
          createWordItem(
            'Essawa', 
            'Hour/Time', 
            'Essawa mmeka?', 
            'What time is it?'
          )
        ]
      },
      {
        id: 10,
        title: "Expressions",
        isLocked: true,
        words: [
          createWordItem(
            'Nsanyuse okukulaba', 
            'Nice to meet you', 
            'Nsanyuse okukulaba nate.', 
            'Nice to meet you again.'
          ),
          createWordItem(
            'Tewali mutawaana', 
            'No problem', 
            'Tewali mutawaana, nsobola okukuyamba.', 
            'No problem, I can help you.'
          ),
          createWordItem(
            'Nkwagala', 
            'I love you', 
            'Nkwagala nnyo.', 
            'I love you very much.'
          ),
          createWordItem(
            'Simanyi', 
            "I don't know", 
            'Simanyi luganda lungi.', 
            "I don't know good Luganda."
          )
        ]
      }
    ]
  }
];

// Helper function to get all words from all stages
export const getAllWords = (): WordItem[] => {
  const allWords: WordItem[] = []

  LUGANDA_STAGES.forEach((stage) => {
    stage.levels.forEach((level) => {
      allWords.push(...level.words)
    })
  })

  return allWords
}

// Helper function to get words for a specific level
export const getWordsForLevel = (stageId: number, levelId: number): WordItem[] => {
  const stage = LUGANDA_STAGES.find((s) => s.id === stageId)
  if (!stage) return []

  const level = stage.levels.find((l) => l.id === levelId)
  return level ? level.words : []
}

// Helper function to get all levels for a specific stage
export const getLevelsForStage = (stageId: number): Level[] => {
  const stage = LUGANDA_STAGES.find((s) => s.id === stageId)
  return stage ? stage.levels : []
}

// Helper to check if all levels in a stage are completed
export const isStageCompleted = (stageId: number, completedLevels: number[]): boolean => {
  const stage = LUGANDA_STAGES.find((s) => s.id === stageId)
  if (!stage) return false
  return stage.levels.every((level) => completedLevels.includes(level.id))
}

// Helper to unlock the next stage
export const unlockNextStage = (currentStageId: number, stages: Stage[]): Stage[] => {
  // Create a deep copy of the stages array to avoid direct mutation
  const updatedStages = stages.map((stage) => ({
    ...stage,
    levels: stage.levels.map((level) => ({ ...level })),
  }))

  const nextStageIndex = updatedStages.findIndex((stage) => stage.id === currentStageId + 1)

  if (nextStageIndex !== -1) {
    const nextStageToUnlock = updatedStages[nextStageIndex]
    nextStageToUnlock.isLocked = false

    // Also unlock first level of that stage, if it exists
    if (nextStageToUnlock.levels.length > 0) {
      nextStageToUnlock.levels[0].isLocked = false
    }
  }
  return updatedStages // Return the new, modified array
}

// Helper to unlock the next level within a stage
export const unlockNextLevel = (currentStageId: number, currentLevelId: number, stages: Stage[]): Stage[] => {
  // Create a deep copy of the stages array
  const updatedStages = stages.map((stage) => ({
    ...stage,
    levels: stage.levels.map((level) => ({ ...level })),
  }))

  const stageIndex = updatedStages.findIndex((s) => s.id === currentStageId)
  if (stageIndex === -1) return updatedStages

  const stageToUpdate = updatedStages[stageIndex]
  const currentLevelIndex = stageToUpdate.levels.findIndex((l) => l.id === currentLevelId)

  if (currentLevelIndex !== -1 && currentLevelIndex < stageToUpdate.levels.length - 1) {
    // Unlock the next level in the copied structure
    stageToUpdate.levels[currentLevelIndex + 1].isLocked = false
  }
  return updatedStages // Return the new, modified array
}
