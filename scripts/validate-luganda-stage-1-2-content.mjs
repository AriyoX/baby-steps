import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = join(
  repositoryRoot,
  "content/curriculum/lg-stage-1-2.json",
);
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

const expectedStage1ConceptIds = [
  "lg-greet-how-are-you",
  "lg-greet-im-fine",
  "lg-greet-morning",
  "lg-greet-day",
  "lg-courtesy-thanks",
  "lg-courtesy-forgive",
  "lg-farewell-goodbye",
  "lg-intro-i-am-amina",
  "lg-intro-who-are-you",
];

const expectedStage2ConceptIds = [
  "lg-body-head",
  "lg-body-eyes",
  "lg-body-ears",
  "lg-body-nose",
  "lg-body-mouth",
  "lg-body-hand-arm",
  "lg-body-leg",
  "lg-body-foot",
  "lg-feeling-happy",
  "lg-feeling-sad",
  "lg-feeling-tired",
  "lg-feeling-afraid",
];

const expectedLessonIds = [
  "lg-s1-l1-meet-greetings",
  "lg-s1-l2-listen-greet",
  "lg-s1-l3-courtesy",
  "lg-s1-l4-names-responses",
  "lg-s1-l5-morning-story",
  "lg-s1-l6-friendly-review",
  "lg-s2-l1-my-body",
  "lg-s2-l2-listen-point",
  "lg-s2-l3-how-i-feel",
  "lg-s2-l4-body-word-check",
  "lg-s2-l5-kato-ball-story",
  "lg-s2-l6-body-feelings-review",
];

const expectedHubItemIds = [
  "lg-s1-l1-i01",
  "lg-s1-l1-i02",
  "lg-s1-l1-i03",
  "lg-s1-l1-i04",
  "lg-s1-l2-i01",
  "lg-s1-l2-i02",
  "lg-s1-l2-i03",
  "lg-s1-l2-i04",
  "lg-s1-l3-i01",
  "lg-s1-l3-i02",
  "lg-s1-l3-i03",
  "lg-s1-l4-i01",
  "lg-s1-l4-i02",
  "lg-s1-l5-story",
  "lg-s1-l6-quiz",
  "lg-s2-l1-i01",
  "lg-s2-l1-i02",
  "lg-s2-l1-i03",
  "lg-s2-l1-i04",
  "lg-s2-l1-i05",
  "lg-s2-l1-i06",
  "lg-s2-l1-i07",
  "lg-s2-l1-i08",
  "lg-s2-l2-i01",
  "lg-s2-l2-i02",
  "lg-s2-l2-i03",
  "lg-s2-l2-i04",
  "lg-s2-l3-i01",
  "lg-s2-l3-i02",
  "lg-s2-l3-i03",
  "lg-s2-l3-i04",
  "lg-s2-l4-i01",
  "lg-s2-l4-i02",
  "lg-s2-l4-i03",
  "lg-s2-l4-i04",
  "lg-s2-l5-story",
  "lg-s2-l6-quiz",
];

check(manifest.schemaVersion === 2, "Manifest schema version must be 2.");
check(
  manifest.languageCode === "lg",
  "Manifest language must be exact-language code lg.",
);
check(manifest.contentVersion === 4, "Content version must be 4.");
check(
  manifest.bundles.length === 11,
  "Expected 11 exact-language content rows.",
);

check(
  manifest.curriculumInventory?.stageCount === 2,
  "Inventory must report two initial stages.",
);
check(
  manifest.curriculumInventory?.lessonCount === 12,
  "Inventory must report twelve Learning Hub lessons.",
);
check(
  manifest.curriculumInventory?.lessonItemCount === 37,
  "Inventory must report all 37 exact lesson items.",
);
check(
  manifest.curriculumInventory?.conceptCount === 21,
  "Inventory must report all 21 tracked concepts.",
);
check(
  manifest.curriculumInventory?.learningGameLevelCount === 16,
  "Inventory must report sixteen Learning Game levels.",
);

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
      `${bundle.contentType}/${bundle.slug} must declare progress revision 4.`,
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
  "lg:story:morning-greeting",
  "lg:story:kato-and-the-ball",
];
check(
  JSON.stringify(bundleKeys) === JSON.stringify(requiredBundleKeys),
  "Bundle order or identity differs from the initial Stage 1-2 contract.",
);

const hub = manifest.bundles.find(
  (bundle) => bundle.contentType === "learning_hub",
)?.payload;
check(Boolean(hub), "Learning Hub bundle is missing.");
check(
  JSON.stringify(hub?.stages?.map((stage) => stage.id)) ===
    JSON.stringify([
      "lg-stage-01-greetings",
      "lg-stage-02-body-feelings",
    ]),
  "Learning Hub must contain only the two tracked initial stages.",
);
check(
  JSON.stringify(hub?.stages?.[0]?.metadata?.conceptIds) ===
    JSON.stringify(expectedStage1ConceptIds),
  "Stage 1 concept IDs drifted from the curriculum tracker.",
);
check(
  JSON.stringify(hub?.stages?.[1]?.metadata?.conceptIds) ===
    JSON.stringify(expectedStage2ConceptIds),
  "Stage 2 concept IDs drifted from the curriculum tracker.",
);

const allowedMechanics = new Set([
  "tap_to_learn",
  "listen_and_choose",
  "choose_correct_word",
  "mini_quiz",
  "story_bite",
]);

const lessonIds = [];
const hubItemIds = [];
const conceptIdsUsedByLessons = new Set();
let storyPageCount = 0;
let quizQuestionCount = 0;

for (const stage of hub?.stages ?? []) {
  check(
    stage.lessonCount === stage.lessons.length,
    `${stage.id} lessonCount is stale.`,
  );
  check(
    stage.lessons.length === 6,
    `${stage.id} must have the exact six connected lessons from the guide.`,
  );
  check(
    stage.isLocked === false,
    `${stage.id} should be available in the initial seed.`,
  );
  check(
    stage.readiness === "placeholder",
    `${stage.id} must preserve placeholder readiness until review.`,
  );

  for (const [lessonIndex, lesson] of stage.lessons.entries()) {
    lessonIds.push(lesson.id);
    check(
      lesson.order === lessonIndex + 1,
      `${lesson.id} has a non-contiguous order.`,
    );
    check(
      allowedMechanics.has(lesson.mechanic),
      `${lesson.id} uses an unsupported mechanic.`,
    );
    check(
      lesson.isStartable === true && lesson.isLocked === false,
      `${lesson.id} should be startable in the technical seed.`,
    );
    check(
      lesson.readiness === "placeholder",
      `${lesson.id} must preserve placeholder readiness until review.`,
    );
    check(
      Array.isArray(lesson.items) && lesson.items.length > 0,
      `${lesson.id} has no items.`,
    );
    check(
      duplicateValues(lesson.items.map((item) => item.id)).length === 0,
      `${lesson.id} has duplicate item IDs.`,
    );

    for (const [itemIndex, item] of lesson.items.entries()) {
      hubItemIds.push(item.id);
      if (typeof item.metadata?.conceptId === "string") {
        conceptIdsUsedByLessons.add(item.metadata.conceptId);
      }
      check(
        item.order === itemIndex + 1,
        `${lesson.id}/${item.id} has a non-contiguous order.`,
      );
      check(
        item.mechanic === lesson.mechanic,
        `${lesson.id}/${item.id} mechanic does not match its lesson.`,
      );
      check(
        item.readiness === "placeholder",
        `${lesson.id}/${item.id} must not claim reviewed or production readiness.`,
      );

      if (
        ["listen_and_choose", "choose_correct_word"].includes(item.mechanic)
      ) {
        check(
          item.options.length >= 2 && item.options.length <= 4,
          `${lesson.id}/${item.id} must have 2-4 options.`,
        );
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
        quizQuestionCount += item.questions.length;
        check(
          item.questions.length === 5,
          `${lesson.id}/${item.id} must contain the guide's five questions.`,
        );
        for (const question of item.questions) {
          check(
            question.options.length >= 2 && question.options.length <= 4,
            `${question.id} must have 2-4 options.`,
          );
          check(
            question.options.some(
              (option) => option.id === question.correctOptionId,
            ),
            `${question.id} correctOptionId is missing from options.`,
          );
          check(
            duplicateValues(question.options.map((option) => option.id))
              .length === 0,
            `${question.id} has duplicate option IDs.`,
          );
        }
      }

      if (item.mechanic === "story_bite") {
        storyPageCount += item.pages.length;
        check(
          item.pages.length === 4,
          `${lesson.id}/${item.id} must contain the guide's four story pages.`,
        );
        check(
          duplicateValues(item.pages.map((page) => page.id)).length === 0,
          `${lesson.id}/${item.id} has duplicate story page IDs.`,
        );
      }
    }
  }
}

check(
  JSON.stringify(lessonIds) === JSON.stringify(expectedLessonIds),
  "Learning Hub lesson IDs or order drifted from the initial-stage build.",
);
check(
  JSON.stringify(hubItemIds) === JSON.stringify(expectedHubItemIds),
  "Learning Hub item IDs or order drifted from the exact lesson build.",
);
check(
  duplicateValues(lessonIds).length === 0,
  "Learning Hub lesson IDs must be globally unique.",
);
check(
  hubItemIds.length === 37,
  "Learning Hub must contain all 37 exact lesson items.",
);
check(storyPageCount === 8, "Learning Hub must contain eight story pages.");
check(
  quizQuestionCount === 10,
  "Learning Hub must contain ten review questions.",
);
check(
  JSON.stringify([...conceptIdsUsedByLessons].sort()) ===
    JSON.stringify(
      [...expectedStage1ConceptIds, ...expectedStage2ConceptIds].sort(),
    ),
  "The Hub lessons do not exercise all 21 tracked concepts.",
);

const learningGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "learning_game",
)?.payload;
check(
  JSON.stringify(learningGame?.stages?.map((stage) => stage.id)) ===
    JSON.stringify([1, 2]),
  "Learning Game must expose only curriculum-linked stages 1 and 2.",
);
check(
  learningGame?.stages?.every((stage) => stage.isLocked === false),
  "Learning Game source stages must remain available before progress hydration.",
);
check(
  JSON.stringify(
    learningGame?.stages?.map((stage) => stage.levels.length),
  ) === JSON.stringify([8, 8]),
  "Learning Game must provide eight reinforcement levels in each stage.",
);

const learningLevels =
  learningGame?.stages?.flatMap((stage) => stage.levels) ?? [];
check(
  JSON.stringify(learningLevels.map((level) => level.id)) ===
    JSON.stringify(Array.from({ length: 16 }, (_, index) => index + 1)),
  "Learning Game level IDs must be the stable global sequence 1-16.",
);
check(
  learningGame?.stages?.every((stage) =>
    stage.levels.every(
      (level, index) =>
        level.order === index + 1 &&
        level.words.length >= 2 &&
        duplicateValues(level.words.map((word) => word.id)).length === 0,
    ),
  ),
  "Learning Game levels must be ordered, unique, and contain at least two concepts.",
);

const expectedConceptText = [
  "Oli otya?",
  "Gyendi.",
  "Wasuze otya nno?",
  "Osiibye otya nno?",
  "Weebale.",
  "Nsonyiwa.",
  "Weeraba.",
  "Nze Amina.",
  "Ggwe ani?",
  "Omutwe",
  "Amaaso",
  "Amatu",
  "Ennyindo",
  "Akamwa",
  "Omukono",
  "Okugulu",
  "Ekigere",
  "Ndi musanyufu.",
  "Ndi munakuwavu.",
  "Nkooye.",
  "Ntya.",
];
check(
  JSON.stringify(
    [
      ...new Set(
        learningLevels.flatMap((level) =>
          level.words.map((word) => word.targetText),
        ),
      ),
    ].sort(),
  ) === JSON.stringify([...expectedConceptText].sort()),
  "Learning Game must reuse exactly the 21 tracked concepts.",
);

const wordGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "word_game",
)?.payload;
check(
  wordGame?.levels?.length === 14,
  "Word Game should contain the 14 safe single-word targets.",
);
check(
  duplicateValues(wordGame?.levels?.map((level) => level.id) ?? []).length ===
    0,
  "Word Game IDs must be stable and unique.",
);
check(
  wordGame?.levels?.every((level) => /^[A-Za-z]+$/.test(level.targetText)),
  "Word Game must not flatten phrases, punctuation, or spaces into fake words.",
);

const countingGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "counting_game",
)?.payload;
check(
  JSON.stringify(
    countingGame?.stages?.map((stage) => ({
      id: stage.id,
      min: stage.numbersRange.min,
      max: stage.numbersRange.max,
      levels: stage.levels,
    })),
  ) ===
    JSON.stringify([
      { id: 1, min: 1, max: 2, levels: 2 },
      { id: 2, min: 1, max: 3, levels: 3 },
      { id: 3, min: 1, max: 5, levels: 5 },
    ]),
  "Counting Game must progress from 1-2 to 1-3 to 1-5.",
);
check(
  JSON.stringify(
    countingGame?.numbers?.map((entry) => entry.number),
  ) === JSON.stringify([1, 2, 3, 4, 5]),
  "Counting Game numbers must be exactly 1-5.",
);
check(
  countingGame?.currency?.length === 0,
  "Advanced currency content must stay outside the initial seed.",
);

const cardGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "card_game",
)?.payload;
check(
  cardGame?.items?.length === 21,
  "Card Game must contain all 21 introduced concepts.",
);
check(
  duplicateValues(cardGame?.items?.map((item) => item.value) ?? []).length ===
    0,
  "Card Game values must be unique.",
);

const puzzleGame = manifest.bundles.find(
  (bundle) => bundle.contentType === "puzzle_game",
)?.payload;
check(
  puzzleGame?.puzzles?.length === 10,
  "Puzzle Game must contain ten initial-stage pictures.",
);

for (const legacyCopy of [
  '"first-words"',
  '"family-home"',
  "greetings-at-work",
  "family-at-home",
  "Gyebale ko",
  "Maama",
  "Taata",
  "Ennyumba",
  "Ekitabo",
  "Ugandan Currency",
]) {
  check(
    !seedSql.includes(legacyCopy),
    `Outdated Stage 1-2 runtime content remains in the seed: ${legacyCopy}`,
  );
}

check(
  /DELETE FROM public\.content_items[\s\S]*language_code = 'lg'[\s\S]*content_type IN/.test(
    seedSql,
  ),
  "Seed must explicitly replace obsolete Luganda runtime rows.",
);
check(
  !/DELETE FROM public\.(?:child_|achievements|activity|auth|children)/i.test(
    seedSql,
  ),
  "Seed must not delete learner, progress, achievement, auth, or child-profile data.",
);

const sqlPayloads = [
  ...seedSql.matchAll(/\$content\$([\s\S]*?)\$content\$::jsonb/g),
].map((match) => JSON.parse(match[1]));
check(
  sqlPayloads.length === manifest.bundles.length,
  "Seed payload count does not match the manifest.",
);
sqlPayloads.forEach((payload, index) => {
  check(
    JSON.stringify(payload) ===
      JSON.stringify(manifest.bundles[index].payload),
    `Seed payload ${index + 1} drifted from the manifest.`,
  );
});

const imageEntries = manifest.media?.images ?? [];
const imageReferences = imageEntries.map((entry) => entry.reference);
check(
  duplicateValues(imageReferences).length === 0,
  "Image manifest references must be unique.",
);
check(
  imageEntries.every(
    (entry) =>
      !("path" in entry) &&
      ["temporary-bundled-placeholder", "existing-bundled-asset"].includes(
        entry.status,
      ),
  ),
  "Image manifest must point to registered bundled assets, never empty tracking files.",
);

const placeholderSetSource =
  assetMap.match(
    /const PLACEHOLDER_IMAGE_ASSET_KEYS = new Set\(\[([\s\S]*?)\]\);/,
  )?.[1] ?? "";
for (const imageReference of imageReferences) {
  check(
    assetMap.includes(`"${imageReference}"`),
    `Image reference is missing from content/assets.ts: ${imageReference}`,
  );
  check(
    !placeholderSetSource.includes(`"${imageReference}"`),
    `Seed still points at a legacy zero-file placeholder key: ${imageReference}`,
  );
}

const usedImageReferences = new Set();
const usedAudioKeys = new Set();
const collectMediaReferences = (value) => {
  if (Array.isArray(value)) {
    value.forEach(collectMediaReferences);
    return;
  }
  if (!value || typeof value !== "object") return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      (key === "image" || key === "imageKey") &&
      typeof nestedValue === "string"
    ) {
      usedImageReferences.add(nestedValue);
    }
    if (key === "audioKey" && typeof nestedValue === "string") {
      usedAudioKeys.add(nestedValue);
    }
    collectMediaReferences(nestedValue);
  }
};
manifest.bundles.forEach((entry) => collectMediaReferences(entry.payload));

for (const usedImageReference of usedImageReferences) {
  check(
    imageReferences.includes(usedImageReference),
    `Used image is missing from the generated media manifest: ${usedImageReference}`,
  );
}

const audioEntries = manifest.media?.audio ?? [];
const audioKeys = audioEntries.map((entry) => entry.key);
check(
  audioEntries.length === 29,
  "Audio manifest must contain 21 concept clips and eight story-page clips.",
);
check(
  duplicateValues(audioKeys).length === 0,
  "Audio manifest keys must be unique.",
);
check(
  audioEntries.every(
    (entry) =>
      entry.runtimeAsset === "placeholder_learning_cue" &&
      entry.status === "registered-placeholder-cue" &&
      !("path" in entry),
  ),
  "Audio entries must resolve through the registered shared cue, not empty files.",
);
for (const audioKey of usedAudioKeys) {
  check(
    audioKeys.includes(audioKey),
    `Used audio key is missing from the generated media manifest: ${audioKey}`,
  );
  check(
    learningAudioMap.includes(`"${audioKey}"`),
    `Learning audio key is missing from lib/audioAssets.ts: ${audioKey}`,
  );
}

if (failures.length > 0) {
  console.error(
    `Stage 1-2 content validation failed with ${failures.length} issue(s):`,
  );
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log("Stage 1-2 content validation passed.");
  console.log(
    `Validated ${manifest.bundles.length} seed rows, 12 Hub lessons, 16 Learning Game levels, 21 concepts, ${imageEntries.length} bundled image references, and ${audioEntries.length} stable audio keys.`,
  );
}
