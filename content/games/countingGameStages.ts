// Counting Game Stages
// Defines the various stages and levels for the Luganda counting game

// Interfaces
export interface LugandaNumber {
    number: number;
    luganda: string;
    audio: string;
  }
  
  export interface CulturalItem {
    name: string;
    image: string;
  }
  
  export interface CurrencyItem {
    value: number;
    name: string;
    image: string;
    luganda: string;
  }
  
  export interface CountingGameStage {
    id: number;
    title: string;
    description: string;
    numbersRange: { min: number; max: number };
    levels: number;
    useBunches: boolean;
    itemsPerBunch?: number;
    usesCurrency: boolean;
  }
  
  // Luganda numbers with their pronunciations for stage 1 (1-10)
  export const lugandaNumbers1To10: LugandaNumber[] = [
    { number: 1, luganda: 'Emu', audio: 'correct.mp3' },
    { number: 2, luganda: 'Bbiri', audio: 'correct.mp3' },
    { number: 3, luganda: 'Ssatu', audio: 'correct.mp3' },
    { number: 4, luganda: 'Nnya', audio: 'correct.mp3' },
    { number: 5, luganda: 'Ttaano', audio: 'correct.mp3' },
    { number: 6, luganda: 'Mukaaga', audio: 'correct.mp3' },
    { number: 7, luganda: 'Musanvu', audio: 'correct.mp3' },
    { number: 8, luganda: 'Munaana', audio: 'correct.mp3' },
    { number: 9, luganda: 'Mwenda', audio: 'correct.mp3' },
    { number: 10, luganda: 'Kkumi', audio: 'correct.mp3' },
  ];
  
  // Luganda numbers 20-50
  export const lugandaNumbers20To50: LugandaNumber[] = [
    { number: 20, luganda: 'Abiri', audio: 'correct.mp3' },
    { number: 21, luganda: 'Abiri mu emu', audio: 'correct.mp3' },
    { number: 22, luganda: 'Abiri mu bbiri', audio: 'correct.mp3' },
    { number: 25, luganda: 'Abiri mu ttaano', audio: 'correct.mp3' },
    { number: 30, luganda: 'Asatu', audio: 'correct.mp3' },
    { number: 33, luganda: 'Asatu mu ssatu', audio: 'correct.mp3' },
    { number: 40, luganda: 'Ana', audio: 'correct.mp3' },
    { number: 44, luganda: 'Ana mu nnya', audio: 'correct.mp3' },
    { number: 50, luganda: 'Ataano', audio: 'correct.mp3' },
  ];
  
  // Luganda numbers 50-100
  export const lugandaNumbers50To100: LugandaNumber[] = [
    { number: 50, luganda: 'Ataano', audio: 'correct.mp3' },
    { number: 60, luganda: 'Nkaaga', audio: 'correct.mp3' },
    { number: 70, luganda: 'Nsanvu', audio: 'correct.mp3' },
    { number: 75, luganda: 'Nsanvu mu ttaano', audio: 'correct.mp3' },
    { number: 80, luganda: 'Kinaana', audio: 'correct.mp3' },
    { number: 90, luganda: 'Kyenda', audio: 'correct.mp3' },
    { number: 99, luganda: 'Kyenda mu mwenda', audio: 'correct.mp3' },
    { number: 100, luganda: 'Kikumi', audio: 'correct.mp3' },
  ];
  
  // Luganda numbers 100-1000
  export const lugandaNumbers100To1000: LugandaNumber[] = [
    { number: 100, luganda: 'Kikumi', audio: 'correct.mp3' },
    { number: 200, luganda: 'Bibiri', audio: 'correct.mp3' },
    { number: 300, luganda: 'Bisatu', audio: 'correct.mp3' },
    { number: 400, luganda: 'Bina', audio: 'correct.mp3' },
    { number: 500, luganda: 'Bitaano', audio: 'correct.mp3' },
    { number: 600, luganda: 'Lukaaga', audio: 'correct.mp3' },
    { number: 700, luganda: 'Lusanvu', audio: 'correct.mp3' },
    { number: 800, luganda: 'Lunaana', audio: 'correct.mp3' },
    { number: 900, luganda: 'Lwenda', audio: 'correct.mp3' },
    { number: 1000, luganda: 'Lukumi', audio: 'correct.mp3' },
  ];
  
  // Ugandan currency values
  export const ugandanCurrency: CurrencyItem[] = [
    { value: 500, name: 'Shs 500 coin', image: '500.png', luganda: 'Bitaano' },
    { value: 1000, name: 'Shs 1,000 note', image: '1000.jpeg', luganda: 'Lukumi' },
    { value: 2000, name: 'Shs 2,000 note', image: '2000.jpeg', luganda: 'Enkumi Bbiri' },
    { value: 5000, name: 'Shs 5,000 note', image: '5000.jpeg', luganda: 'Enkumi Ttaano' },
    { value: 10000, name: 'Shs 10,000 note', image: '10000.jpeg', luganda: 'Enkumi Kkumi' },
    { value: 20000, name: 'Shs 20,000 note', image: '20000.jpeg', luganda: 'Enkumi Abiri' },
    { value: 50000, name: 'Shs 50,000 note', image: '50000.jpeg', luganda: 'Enkumi Ataano' }
  ];
  
  // Cultural items for counting exercises
  export const culturalItems: CulturalItem[] = [
    { name: 'matoke', image: 'matooke.png' },
    { name: 'mangoes', image: 'mango.png' },
    { name: 'goats', image: 'goat.png' },
    { name: 'baskets', image: 'basket.png' },
    { name: 'drums', image: 'drum.png' },
    { name: 'bananas', image: 'banana.png' },
    { name: 'beans', image: 'bean.png' },
    { name: 'children', image: 'child.png' }
  ];
  
  // Game stages configuration
  export const COUNTING_GAME_STAGES: CountingGameStage[] = [
    {
      id: 1,
      title: "Basic Counting (1-10)",
      description: "Learn to count individual items from 1 to 10 in Luganda",
      numbersRange: { min: 1, max: 10 },
      levels: 5,
      useBunches: false,
      usesCurrency: false
    },
    {
      id: 2,
      title: "Counting in Groups (10-50)",
      description: "Learn to count items in groups from 10 to 50",
      numbersRange: { min: 10, max: 50 },
      levels: 4,
      useBunches: true,
      itemsPerBunch: 10,
      usesCurrency: false
    },
    {
      id: 3,
      title: "Advanced Counting (50-100)",
      description: "Learn to count larger numbers from 50 to 100",
      numbersRange: { min: 50, max: 100 },
      levels: 4,
      useBunches: true,
      itemsPerBunch: 25,
      usesCurrency: false
    },
    {
      id: 4,
      title: "Ugandan Currency",
      description: "Learn to identify and count Ugandan Shillings",
      numbersRange: { min: 500, max: 50000 },
      levels: 5,
      useBunches: false,
      usesCurrency: true
    }
  ];
  
  /**
   * Get a Luganda word for a number based on the current stage
   * @param number The number to convert to a Luganda word
   * @param stageId The current game stage ID
   * @returns The Luganda word for the number
   */
  export const getLugandaWord = (number: number, stageId: number): string => {
    // For currency stage
    if (stageId === 4) {
      const currencyItem = ugandanCurrency.find(item => item.value === number);
      if (currencyItem) {
        return currencyItem.luganda;
      }
    }
    
    // Check if the number exists in appropriate array based on its value
    if (number <= 10) {
      const match = lugandaNumbers1To10.find(item => item.number === number);
      if (match) return match.luganda;
    } else if (number <= 50) {
      const match = lugandaNumbers20To50.find(item => item.number === number);
      if (match) return match.luganda;
    } else if (number <= 100) {
      const match = lugandaNumbers50To100.find(item => item.number === number);
      if (match) return match.luganda;
    } else if (number <= 1000) {
      const match = lugandaNumbers100To1000.find(item => item.number === number);
      if (match) return match.luganda;
    }
    
    // If no specific match is found, construct a compound number
    // This is a simplified approach for demo purposes
    if (number > 10 && number < 20) {
      const ones = number - 10;
      const onesWord = getLugandaWord(ones, stageId);
      return `Kkumi na ${onesWord.toLowerCase()}`;
    }
    
    // Default fallback
    return `${number}`;
  };
  
  /**
   * Generate a set of random numbers for a given stage
   * @param stageId The stage ID to generate numbers for
   * @returns Array of random numbers within the stage's range
   */
  export const getRandomNumbersForStage = (stageId: number): number[] => {
    const stage = COUNTING_GAME_STAGES.find(s => s.id === stageId);
    if (!stage) return [1, 2, 3, 4, 5]; // Default fallback
    
    const { min, max } = stage.numbersRange;
    const levelsCount = stage.levels;
    const result: number[] = [];
    
    // For currency stage, use predefined currency values
    if (stage.usesCurrency) {
      const availableValues = ugandanCurrency.map(item => item.value);
      // Shuffle and take needed amount
      const shuffled = [...availableValues].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, levelsCount);
    }
    
    // For stages with bunches, ensure numbers are multiples of the bunch size
    if (stage.useBunches && stage.itemsPerBunch) {
      const possibleNumbers: number[] = [];
      for (let i = min; i <= max; i += stage.itemsPerBunch) {
        possibleNumbers.push(i);
      }
      
      // Shuffle and pick random numbers
      const shuffled = [...possibleNumbers].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, levelsCount);
    }
    
    // For basic counting, generate unique random numbers
    const usedNumbers = new Set<number>();
    while (usedNumbers.size < levelsCount) {
      const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
      usedNumbers.add(randomNum);
    }
    
    return Array.from(usedNumbers);
  };