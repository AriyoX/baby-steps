const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

const normalizedWords = (value: string): string[] =>
  value.match(WORD_PATTERN)?.map((word) => word.toLocaleLowerCase()) ?? [];

const LEARNING_HUB_CARD_DESCRIPTIONS: Record<string, string> = {
  "culture-stories": "Stories and cultural cards",
  "everyday-things": "Foods, animals, and objects",
  "family-home": "Family and home words",
  "first-words": "Greetings, names, and kind words",
  "lg-stage-01-greetings": "Greetings, names, and kind words",
  "lg-stage-02-body-feelings": "Body parts and feelings",
  "practice-mix": "Review completed words",
};

/**
 * Retains only short, useful menu-card copy. Longer curriculum descriptions
 * remain in their source records but are not repeated beneath child-mode cards.
 */
export const getConciseChildCardDescription = (
  title: string,
  description?: string | null,
): string | undefined => {
  const trimmed = description?.trim().replace(/\s+/g, " ");
  if (!trimmed) return undefined;

  const descriptionWords = normalizedWords(trimmed);
  if (descriptionWords.length < 2 || descriptionWords.length > 5) return undefined;

  const titleWords = normalizedWords(title);
  const repeatsTitle = titleWords.length > 0 && descriptionWords.some(
    (_, startIndex) =>
      titleWords.every(
        (word, titleIndex) => descriptionWords[startIndex + titleIndex] === word,
      ),
  );

  return repeatsTitle ? undefined : trimmed.replace(/[.!?]+$/, "");
};

/**
 * Uses short, purpose-written labels for the current Learning Hub stages while
 * leaving their fuller educational descriptions intact in curriculum content.
 */
export const getConciseLearningHubCardDescription = (
  stageId: string,
  title: string,
  description?: string | null,
): string | undefined =>
  LEARNING_HUB_CARD_DESCRIPTIONS[stageId] ??
  getConciseChildCardDescription(title, description);
