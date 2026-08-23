import { Asset } from "expo-asset";
import { Image, type ImageSourcePropType } from "react-native";
import {
  isRemoteImageUri,
  resolveImageSource,
} from "./assets";
import type {
  ChildMenuCard,
  ContentBundle,
  CountingGameContent,
  LearningGameStage,
  WordGameLevel,
} from "./contentRepository";
import type { LocalStory } from "./types";

export interface ImagePreloadSummary {
  attempted: number;
  fulfilled: number;
  rejected: number;
}

const getImageReferenceKey = (image: unknown): string | undefined => {
  if (!image) {
    return undefined;
  }

  if (typeof image === "string" || typeof image === "number") {
    return `${image}`;
  }

  if (typeof image === "object" && "uri" in image) {
    return String((image as { uri?: string }).uri ?? JSON.stringify(image));
  }

  return JSON.stringify(image);
};

const uniqueImageReferences = (images: unknown[]): unknown[] => {
  const seen = new Set<string>();
  const unique: unknown[] = [];

  for (const image of images) {
    const key = getImageReferenceKey(image);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    unique.push(image);
  }

  return unique;
};

export const getResolvedImageUri = (source: ImageSourcePropType): string | undefined => {
  if (typeof source === "number") {
    return Image.resolveAssetSource(source)?.uri;
  }

  if (Array.isArray(source)) {
    return source
      .map((item) => getResolvedImageUri(item))
      .find((uri): uri is string => Boolean(uri));
  }

  if (source && typeof source === "object" && "uri" in source) {
    return source.uri;
  }

  return undefined;
};

export const preloadImageReference = async (
  image: unknown,
  fallbackImage = "learning-beginner.jpg",
): Promise<boolean> => {
  const source = resolveImageSource(image, fallbackImage);

  if (typeof source === "number") {
    await Asset.fromModule(source).downloadAsync();
    return true;
  }

  const uri = getResolvedImageUri(source);
  if (uri && isRemoteImageUri(uri)) {
    return Image.prefetch(uri);
  }

  return false;
};

export const preloadImageReferences = async (
  images: unknown[],
): Promise<ImagePreloadSummary> => {
  const unique = uniqueImageReferences(images);
  const results = await Promise.allSettled(
    unique.map((image) => preloadImageReference(image)),
  );

  const fulfilled = results.filter((result) => result.status === "fulfilled").length;

  return {
    attempted: unique.length,
    fulfilled,
    rejected: results.filter((result) => result.status === "rejected").length,
  };
};

export const collectMenuCardImages = (cards: ChildMenuCard[] = []): unknown[] =>
  cards.map((card) => card.image).filter(Boolean);

export const collectStoryPageImages = (story?: LocalStory): unknown[] =>
  story?.pages.map((page) => page.image).filter(Boolean) ?? [];

export const collectLearningGameImages = (
  stages: LearningGameStage[] = [],
): unknown[] => {
  const images: unknown[] = [];

  for (const stage of stages) {
    images.push(stage.image);
    for (const level of stage.levels) {
      for (const word of level.words) {
        images.push(word.image);
      }
    }
  }

  return images.filter(Boolean);
};

export const collectWordGameImages = (levels: WordGameLevel[] = []): unknown[] =>
  levels.map((level) => level.image).filter(Boolean);

export const collectCountingGameImages = (
  countingGame?: CountingGameContent,
): unknown[] => {
  if (!countingGame) {
    return [];
  }

  return [
    ...countingGame.culturalItems.map((item) => item.image),
    ...countingGame.currency.map((item) => item.image),
  ].filter(Boolean);
};

export const collectContentBundleImageReferences = (
  bundle?: ContentBundle,
): unknown[] => {
  if (!bundle) {
    return [];
  }

  return [
    ...Object.values(bundle.menuCardsByTab).flatMap((cards) =>
      collectMenuCardImages(cards),
    ),
    ...collectLearningGameImages(bundle.learningGame.stages),
    ...collectWordGameImages(bundle.wordGame.levels),
    ...collectCountingGameImages(bundle.countingGame),
    ...bundle.stories.flatMap((story) => collectStoryPageImages(story)),
  ].filter(Boolean);
};

export const preloadContentBundleImages = async (
  bundle?: ContentBundle,
): Promise<ImagePreloadSummary> => {
  try {
    return preloadImageReferences(collectContentBundleImageReferences(bundle));
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("Content image preloading failed.", error);
    }

    return { attempted: 0, fulfilled: 0, rejected: 0 };
  }
};

export const preloadStoryImages = async (
  story?: LocalStory,
): Promise<ImagePreloadSummary> => {
  try {
    return preloadImageReferences(collectStoryPageImages(story));
  } catch (error) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn("Story image preloading failed.", error);
    }

    return { attempted: 0, fulfilled: 0, rejected: 0 };
  }
};
