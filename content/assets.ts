import type { ImageSourcePropType } from "react-native";

const LEARNING_IMAGE_PLACEHOLDER = require("@/assets/images/learning-beginner.jpg");

const IMAGE_ASSETS: Record<string, ImageSourcePropType> = {
  "learning/lg/coloring/ennyumba.png": require("@/assets/images/learning/lg/coloring/ennyumba-v2.png"),
  "learning/lg/coloring/greeting.png": require("@/assets/images/learning/lg/coloring/greeting-v2.png"),
  "learning/lg/coloring/maama.png": require("@/assets/images/learning/lg/coloring/maama-v2.png"),
  "learning/lg/coloring/omwana.png": require("@/assets/images/learning/lg/coloring/omwana-v2.png"),
  "learning/lg/coloring/taata.png": require("@/assets/images/learning/lg/coloring/taata-v2.png"),
  // These curriculum files are intentionally still placeholders on disk. Keep their
  // stable content keys, but never require a zero-byte asset because Metro rejects it.
  "learning/lg/counting/books.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/counting/children.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/counting/cups.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/counting/houses.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/counting/water-cups.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/menus/cards.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/menus/learning.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/menus/numbers.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/menus/puzzles.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/menus/words.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/puzzles/book-and-water.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/puzzles/family-home.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/puzzles/greeting.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/greeting-oli-otya.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/reply-gyendi.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/stage-card.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/story-greeting-1.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/story-greeting-2.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/story-greeting-3.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/thanks-webale.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-1/work-greeting-gyebale-ko.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/amazzi.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/ekitabo.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/ennyumba.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/maama.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/omwana.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/stage-card.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/story-home-1.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/story-home-2.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/story-home-3.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/story-home-4.png": LEARNING_IMAGE_PLACEHOLDER,
  "learning/lg/stage-2/taata.png": LEARNING_IMAGE_PLACEHOLDER,
  "10000.jpeg": require("@/assets/images/10000.jpeg"),
  "1000.jpeg": require("@/assets/images/1000.jpeg"),
  "20000.jpeg": require("@/assets/images/20000.jpeg"),
  "2000.jpeg": require("@/assets/images/2000.jpeg"),
  "500.png": require("@/assets/images/500.png"),
  "5000.jpeg": require("@/assets/images/5000.jpeg"),
  "50000.jpeg": require("@/assets/images/50000.jpeg"),
  "african-focus.png": require("@/assets/images/african-focus.png"),
  "african-logic.png": require("@/assets/images/african-logic.png"),
  "african-patterns.png": require("@/assets/images/african-patterns.png"),
  "art.jpg": require("@/assets/images/art.jpg"),
  "artifacts.jpg": require("@/assets/images/artifacts.jpg"),
  "banana.png": require("@/assets/images/banana.png"),
  "basket.png": require("@/assets/images/basket.png"),
  "bean.png": require("@/assets/images/bean.png"),
  "black-kid.jpg": require("@/assets/images/black-kid.jpg"),
  "buganda-kingdom.jpg": require("@/assets/images/buganda-kingdom.jpg"),
  "cards-matching.png": require("@/assets/images/cards-matching.png"),
  "chicken.jpg": require("@/assets/images/chicken.jpg"),
  "child.png": require("@/assets/images/child.png"),
  "coin.jpg": require("@/assets/images/coin.png"),
  "coin.png": require("@/assets/images/coin.png"),
  "culture.jpg": require("@/assets/images/culture.jpg"),
  "cow.png": require("@/assets/images/coloring-cow-v2.png"),
  "dog.jpg": require("@/assets/images/dog.jpg"),
  "drum.png": require("@/assets/images/drum.png"),
  "drums.jpg": require("@/assets/images/drums.jpg"),
  "emblem.png": require("@/assets/images/coloring-emblem-v2.png"),
  "gameBackground.jpg": require("@/assets/images/gameBackground.jpg"),
  "goat.jpg": require("@/assets/images/goat.png"),
  "goat.png": require("@/assets/images/goat.png"),
  "kabaka-trail.jpg": require("@/assets/images/kabaka-trail.jpg"),
  "kasubi.jpg": require("@/assets/images/kasubi.jpg"),
  "king.jpg": require("@/assets/images/coloring-royal-leader-v2.png"),
  "kintu.jpg": require("@/assets/images/kintu.jpg"),
  "learning-beginner.jpg": require("@/assets/images/learning-beginner.jpg"),
  "mango.png": require("@/assets/images/mango.png"),
  "mask.png": require("@/assets/images/coloring-pattern-mask-v2.png"),
  "matooke.png": require("@/assets/images/matooke.png"),
  "meat.jpg": require("@/assets/images/meat.jpg"),
  "mwanga.jpg": require("@/assets/images/mwanga.jpg"),
  "numbers.png": require("@/assets/images/numbers.png"),
  "rain.jpg": require("@/assets/images/rain.jpg"),
  "rainforest.jpg": require("@/assets/images/rainforest.jpg"),
  "ring.jpeg": require("@/assets/images/ring.jpeg"),
  "river-kids.jpg": require("@/assets/images/river-kids.jpg"),
  "shapes.jpg": require("@/assets/images/coloring-shapes-v2.png"),
  "puzzles/buganda-drums.jpg": require("@/assets/puzzles/buganda-drums.jpg"),
  "puzzles/kasubi-tombs.jpg": require("@/assets/puzzles/kasubi-tombs.jpg"),
  "puzzles/lubiri-palace.jpg": require("@/assets/puzzles/lubiri-palace.jpg"),
  "story/kintu/death-follows.jpeg": require("@/assets/story/kintu/death-follows.jpeg"),
  "story/kintu/gulu-tests.jpeg": require("@/assets/story/kintu/gulu-tests.jpeg"),
  "story/kintu/kintu-cow-search.jpeg": require("@/assets/story/kintu/kintu-cow-search.jpeg"),
  "story/kintu/kintu-cow.jpeg": require("@/assets/story/kintu/kintu-cow.jpeg"),
  "story/kintu/kintu-family.jpeg": require("@/assets/story/kintu/kintu-family.jpeg"),
  "story/kintu/kintu-food.jpeg": require("@/assets/story/kintu/kintu-food.jpeg"),
  "story/kintu/kintu-nambi.jpeg": require("@/assets/story/kintu/kintu-nambi.jpeg"),
  "story/kintu/nambi.jpeg": require("@/assets/story/kintu/nambi.jpeg"),
  "story/mwanga/mwanga1.jpg": require("@/assets/story/mwanga/mwanga1.jpg"),
  "story/mwanga/mwanga2.jpg": require("@/assets/story/mwanga/mwanga2.jpg"),
  "story/mwanga/mwanga3.jpg": require("@/assets/story/mwanga/mwanga3.jpg"),
  "story/mwanga/mwanga4.jpg": require("@/assets/story/mwanga/mwanga4.jpg"),
  "story/mwanga/mwanga5.jpg": require("@/assets/story/mwanga/mwanga5.jpg"),
  "story/mwanga/mwanga6.jpg": require("@/assets/story/mwanga/mwanga6.jpg"),
  "story/mwanga/mwanga7.jpg": require("@/assets/story/mwanga/mwanga7.jpg"),
  "story/mwanga/mwanga8.jpg": require("@/assets/story/mwanga/mwanga8.jpg"),
  "textile.jpg": require("@/assets/images/textile.jpg"),
  "wildlife.jpg": require("@/assets/images/wildlife.jpg"),
};

export const isRemoteImageUri = (uri: string): boolean =>
  /^https?:\/\//i.test(uri.trim());

export const isUriImageReference = (image: string): boolean =>
  /^(https?:\/\/|file:\/\/|data:image\/)/i.test(image.trim());

export const resolveImageSource = (
  image: unknown,
  fallbackImage = "learning-beginner.jpg",
): ImageSourcePropType => {
  if (typeof image !== "string") {
    return (
      (image as ImageSourcePropType | undefined) ??
      IMAGE_ASSETS[fallbackImage] ??
      IMAGE_ASSETS["coin.png"]
    );
  }

  if (isUriImageReference(image)) {
    return { uri: image };
  }

  return IMAGE_ASSETS[image] ?? IMAGE_ASSETS[fallbackImage] ?? IMAGE_ASSETS["coin.png"];
};
