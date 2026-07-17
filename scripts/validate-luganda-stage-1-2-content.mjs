import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(repositoryRoot, "content/curriculum/lg-stage-1-2.json");
const seedPath = join(repositoryRoot, "supabase/seed.sql");
const assetMapPath = join(repositoryRoot, "content/assets.ts");
const learningAudioMapPath = join(repositoryRoot, "lib/audioAssets.ts");

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const seedSql = readFileSync(seedPath, "utf8");
const assetMap = readFileSync(assetMapPath, "utf8");
const learningAudioMap = readFileSync(learningAudioMapPath, "utf8");
const failures = [];

const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const duplicateValues = (values) =>
  [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];

check(manifest.languageCode === "lg", "Manifest language must be exact-language code lg.");
check(manifest.contentVersion === 2, "Content version must be 2.");
check(manifest.bundles.length === 11, "Expected 11 exact-language content rows.");

const bundleKeys = manifest.bundles.map(
  (bundle) => `${bundle.languageCode}:${bundle.contentType}:${bundle.slug}`,
);
check(duplicateValues(bundleKeys).length === 0, "Bundle keys must be unique.");

const progressBearingTypes = new Set([
  "learning_hub",
  "learning_game",
  "word_game",
  "counting_game",
  "card_game",
  "puzzle_game",
  "story",
]);
manifest.bundles
  .filter((bundle) => progressBearingTypes.has(bundle.contentType))
  .forEach((bundle) => {
    check(
      bundle.payload?.progressRevision === manifest.contentVersion,
      `${bundle.contentType}/${bundle.slug} must declare the current progress revision.`,
    );
  });

const requiredBundleKeys = [
  "lg:child_menu:games",
  "lg:child_menu:stories",
  "lg:child_menu:coloring",
  "lg:learning_hub:curriculum",
  "lg:learning_game:starter",
  "lg:word_game:levels",
  "lg:counting_game:stages",
  "lg:card_game:cards",
  "lg:puzzle_game:puzzles",
  "lg:story:greetings-at-work",
  "lg:story:family-at-home",
];
check(
  JSON.stringify(bundleKeys) === JSON.stringify(requiredBundleKeys),
  "Bundle order or identity differs from the Stage 1–2 contract.",
);

const hub = manifest.bundles.find(
  (bundle) => bundle.contentType === "learning_hub",
)?.payload;
check(Boolean(hub), "Learning Hub bundle is missing.");
check(
  JSON.stringify(hub?.stages?.map((stage) => stage.id)) ===
    JSON.stringify(["first-words", "family-home"]),
  "Learning Hub must contain only stages first-words and family-home.",
);

const allowedMechanics = new Set([
  "tap_to_learn",
  "listen_and_choose",
  "choose_correct_word",
  "match_word_picture",
  "mini_quiz",
  "cultural_card",
  "story_bite",
]);

for (const stage of hub?.stages ?? []) {
  check(stage.lessonCount === stage.lessons.length, `${stage.id} lessonCount is stale.`);
  check(stage.lessons.length === 6, `${stage.id} must have six connected lessons.`);
  check(stage.isLocked === false, `${stage.id} should be available in the two-stage seed.`);
  check(stage.readiness !== "production", `${stage.id} must not claim production readiness.`);
  check(
    duplicateValues(stage.lessons.map((lesson) => lesson.id)).length === 0,
    `${stage.id} has duplicate lesson IDs.`,
  );

  stage.lessons.forEach((lesson, lessonIndex) => {
    check(lesson.order === lessonIndex + 1, `${lesson.id} has a non-contiguous order.`);
    check(allowedMechanics.has(lesson.mechanic), `${lesson.id} uses an unsupported mechanic.`);
    check(lesson.isStartable === true, `${lesson.id} should be startable in the seed.`);
    check(Array.isArray(lesson.items) && lesson.items.length > 0, `${lesson.id} has no items.`);
    check(
      duplicateValues(lesson.items.map((item) => item.id)).length === 0,
      `${lesson.id} has duplicate item IDs.`,
    );

    lesson.items.forEach((item, itemIndex) => {
      check(item.order === itemIndex + 1, `${lesson.id}/${item.id} has a non-contiguous order.`);
      check(item.mechanic === lesson.mechanic, `${lesson.id}/${item.id} mechanic does not match its lesson.`);
      check(item.readiness !== "production", `${lesson.id}/${item.id} must not claim production readiness.`);

      if (["listen_and_choose", "choose_correct_word", "match_word_picture"].includes(item.mechanic)) {
        check(item.options.length >= 2 && item.options.length <= 4, `${lesson.id}/${item.id} must have 2–4 options.`);
        check(
          item.options.some((option) => option.id === item.correctOptionId),
          `${lesson.id}/${item.id} correctOptionId is missing from options.`,
        );
        check(
          duplicateValues(item.options.map((option) => option.id)).length === 0,
          `${lesson.id}/${item.id} has duplicate option IDs.`,
        );
      }

      if (item.mechanic === "mini_quiz") {
        check(item.questions.length >= 1 && item.questions.length <= 5, `${lesson.id}/${item.id} has an invalid question count.`);
        for (const question of item.questions) {
          check(question.options.length >= 2 && question.options.length <= 4, `${question.id} must have 2–4 options.`);
          check(
            question.options.some((option) => option.id === question.correctOptionId),
            `${question.id} correctOptionId is missing from options.`,
          );
        }
      }

      if (item.mechanic === "story_bite") {
        check(item.pages.length >= 1 && item.pages.length <= 5, `${lesson.id}/${item.id} has an invalid page count.`);
        check(
          duplicateValues(item.pages.map((page) => page.id)).length === 0,
          `${lesson.id}/${item.id} has duplicate story page IDs.`,
        );
      }
    });
  });
}

const learningGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "learning_game",
)?.payload;
check(
  JSON.stringify(learningGame?.stages?.map((stage) => stage.id)) === JSON.stringify([1, 2]),
  "Learning Game must expose only curriculum-linked stages 1 and 2.",
);
check(
  learningGame?.stages?.every((stage) => stage.isLocked === false),
  "Supplementary Learning Game stages must remain free-play unlocked.",
);

const wordGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "word_game",
)?.payload;
check(wordGame?.levels?.length === 8, "Word Game should contain the eight single-word Stage 1–2 concepts.");
check(
  duplicateValues(wordGame?.levels?.map((level) => level.id) ?? []).length === 0,
  "Word Game IDs must be stable and unique.",
);

const countingGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "counting_game",
)?.payload;
check(countingGame?.stages?.length === 1, "Counting Game should contain only the 1–5 starter stage.");
check(
  JSON.stringify(countingGame?.numbers?.map((entry) => entry.number)) === JSON.stringify([1, 2, 3, 4, 5]),
  "Counting Game numbers must be exactly 1–5.",
);
check(countingGame?.currency?.length === 0, "Advanced currency content must be purged from the Stage 1–2 seed.");

const cardGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "card_game",
)?.payload;
check(cardGame?.items?.length === 10, "Card Game must contain the ten introduced concepts.");
check(
  duplicateValues(cardGame?.items?.map((item) => item.value) ?? []).length === 0,
  "Card Game values must be unique.",
);

const puzzleGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "puzzle_game",
)?.payload;
check(puzzleGame?.puzzles?.length === 3, "Puzzle Game must contain three Stage 1–2 scenes.");

const forbiddenLegacyCopy = [
  "Intermediate",
  "Advanced",
  "Expert",
  "Ugandan Currency",
  "Kasubi Tombs",
  "Buganda Royal Drums",
  "Lubiri Palace",
  "Ssaabasajja",
];
for (const legacyCopy of forbiddenLegacyCopy) {
  check(!seedSql.includes(legacyCopy), `Legacy runtime content remains in seed: ${legacyCopy}`);
}

check(
  /DELETE FROM public\.content_items[\s\S]*language_code = 'lg'[\s\S]*content_type IN/.test(seedSql),
  "Seed must explicitly purge obsolete Luganda runtime rows.",
);
check(
  !/DELETE FROM public\.(?:child_|achievements|activity|auth|children)/i.test(seedSql),
  "Seed must not delete learner, progress, achievement, auth, or child-profile data.",
);

const sqlPayloads = [...seedSql.matchAll(/\$content\$([\s\S]*?)\$content\$::jsonb/g)].map(
  (match) => JSON.parse(match[1]),
);
check(sqlPayloads.length === manifest.bundles.length, "Seed payload count does not match the manifest.");
sqlPayloads.forEach((payload, index) => {
  check(
    JSON.stringify(payload) === JSON.stringify(manifest.bundles[index].payload),
    `Seed payload ${index + 1} drifted from the manifest.`,
  );
});

for (const mediaEntry of [...manifest.media.images, ...manifest.media.audio]) {
  const mediaPath = join(repositoryRoot, mediaEntry.path);
  const size = statSync(mediaPath).size;
  check(size === 0, `${mediaEntry.path} must remain an empty placeholder (found ${size} bytes).`);
}

for (const imageEntry of manifest.media.images) {
  check(
    assetMap.includes(`"${imageEntry.reference}"`),
    `Image reference is missing from content/assets.ts: ${imageEntry.reference}`,
  );
}

const hubAudioKeys = new Set();
const collectAudioKeys = (value) => {
  if (Array.isArray(value)) {
    value.forEach(collectAudioKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.audioKey === "string") hubAudioKeys.add(value.audioKey);
  Object.values(value).forEach(collectAudioKeys);
};
collectAudioKeys(hub);
for (const audioKey of hubAudioKeys) {
  check(
    learningAudioMap.includes(`"${audioKey}"`),
    `Learning Hub audio key is missing from lib/audioAssets.ts: ${audioKey}`,
  );
}

if (failures.length > 0) {
  console.error(`Stage 1–2 content validation failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Stage 1–2 content validation passed.");
  console.log(`Validated ${manifest.bundles.length} seed rows, ${manifest.media.images.length} empty image files, and ${manifest.media.audio.length} empty audio files.`);
}
