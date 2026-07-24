# Luganda initial-stage seed

This document is the practical handoff for the generated Luganda development
seed. The curriculum source is the Stage 1-2 material in `curriculum_guide/`;
the app implementation source is
`scripts/build-luganda-stage-1-2-content.mjs`.

The seed is playable so that development can continue, but the Luganda text,
distractors, parent guidance, cultural framing and final media still require
the reviews named in the curriculum guide.

## Current revision-4 inventory

| Area | Seeded content |
| --- | --- |
| Learning Hub | 2 initial stages, 6 lessons per stage, 37 lesson items |
| Stage 1 | 9 concepts covering greetings, names and courtesy language |
| Stage 2 | 12 concepts covering body parts and feelings |
| Learning Game | 16 levels, 8 per stage |
| Word Game | 14 single-word levels |
| Counting Game | 3 steps and 10 rounds in total: 1-2, 1-3 and 1-5 |
| Cards Matching | All 21 tracked concepts; each round samples from the bank |
| Puzzles | 10 scene puzzles |
| Stories | The two curriculum stories, 4 pages each |
| Coloring | The existing greeting and child activities |

The Hub owns the curriculum sequence. Standalone games repeat its concept bank
for optional practice; repeated levels do not introduce a third curriculum
stage or prove speaking or mastery.

## Source and generated files

Edit:

- `scripts/build-luganda-stage-1-2-content.mjs`
- `lib/audioAssets.ts` when a real recording replaces a placeholder
- `content/assets.ts` when a new bundled image key is introduced
- the curriculum tracker when the content lead approves a deliverable

Do not hand-edit:

- `content/curriculum/lg-stage-1-2.json`
- `supabase/seed.sql`

Those two files are generated together so the review manifest and SQL payloads
cannot drift.

## Updating words, lessons or game levels

1. Find the concept in `stage1Concepts` or `stage2Concepts`.
2. For a reviewed wording correction, update `localText`, `englishText` and any
   matching story or quiz copy. Keep the stable concept ID.
3. Update the Hub lesson arrays when adding or reordering an item. Keep every
   shipped stage, lesson, item, page, question, option and game-level ID stable.
4. Add optional Learning Game practice through `learningLevel(...)`, reusing
   concept IDs already introduced by the Hub.
5. Add a Word Game level only when the target is one continuous word. Do not
   remove spaces from a real phrase to make it fit that mechanic.
6. Cards Matching is generated from `allConcepts`, so a new approved concept is
   included automatically. Puzzles, stories, menus and Counting are explicit
   arrays and must be updated deliberately.
7. Update the `curriculumInventory` values if the intended counts change.
8. Regenerate and validate:

   ```text
   npm run content:build:lg-stage-1-2
   npm run content:validate:lg-stage-1-2
   npm test -- --runInBand content/__tests__/lugandaStage12Curriculum.test.ts
   ```

The validator checks the curriculum IDs/counts, runtime payload shape, seed and
manifest equality, game progression, exact media registration and the safe
Luganda-only delete boundary.

## Content version and progress revision

`contentVersion` controls cache freshness. Increase it for every published
payload, order or startability change.

`progressRevision` controls whether previous completion can unlock the current
content. The generator currently copies `contentVersion` into
`progressRevision` for every progress-bearing row.

- Keep the same `progressRevision` for compatible spelling, translation,
  display-copy, image or audio corrections.
- Bump `progressRevision` when the playable curriculum is deliberately replaced
  and old completion must not unlock it.
- Never delete progress just to create a new curriculum start. Revision 4 leaves
  historic progress stored but excludes revision-3 completion from revision-4
  unlock and completion calculations.

If a later editorial update should preserve revision-4 progress while still
using content version 5, change the generator so the progress-bearing payloads
use an explicit progress revision of `4` instead of copying
`contentVersion`. Do this consistently for the affected content types and
update the validator expectation.

## Replacing placeholder images

The revision-4 seed does not reference zero-byte tracking files. Missing
curriculum art points directly to registered, non-empty images already bundled
with the app. Every temporary use is declared in `imageCatalog` with
`temporary-bundled-placeholder`.

To add final artwork:

1. Put the non-empty image under `assets/images/`.
2. Register a stable key in `content/assets.ts`.
3. Change the relevant concept, story, menu or puzzle `imageKey`/`image` in the
   generator to that key.
4. Add the key to `imageCatalog` and use status
   `existing-bundled-asset` only after rights and content review are complete.
5. Regenerate and validate.

Do not point JSON at an arbitrary local path. The runtime can only resolve
registered bundled keys or approved remote image URLs.

## Replacing placeholder audio

The manifest contains the exact 29 stable audio keys from the tracker: 21
concept clips and 8 story-page clips. They currently resolve to
`placeholder_learning_cue`, so the app has a harmless sound but does not yet
play the displayed pronunciation.

For each approved recording:

1. Keep the existing key, for example `lg-s1-weebale`.
2. Add the non-empty, reviewed audio file under `assets/audio/`.
3. In `lib/audioAssets.ts`, replace that key's
   `PLACEHOLDER_LEARNING_ENTRY` value with:

   ```ts
   {
     source: require("@/assets/audio/lg-s1-weebale.m4a"),
   }
   ```

4. Do not change the generated lesson payload; it already refers to the stable
   key.
5. Regenerate, validate and perform the content lead's final listen.

Interface sounds, the shared temporary cue and Counting Game tap sounds must
not be described as Luganda pronunciation.

## Applying the reset seed

`supabase/seed.sql` is a development reset. Inside one transaction it deletes
only Luganda runtime `content_items` rows, then inserts the 11 generated rows.
It preserves other languages, children, auth users, progress, activity history
and achievements.

Use it only with a local or explicitly disposable development database. Do not
run the reset seed against a linked production project. The repository's fresh
local reset still depends on the baseline-schema caveat documented in
`docs/development/database.md`.

For a deployed environment, create a later idempotent content migration from
the reviewed generated payloads:

1. Inspect the installed CLI command first with
   `npx supabase migration new --help`.
2. Create a new migration with a descriptive name.
3. Upsert the reviewed rows on
   `(language_code, content_type, slug)` and explicitly set publication fields.
4. Retire replaced Luganda rows deliberately; do not edit an applied migration.
5. Validate on a safe target before the normal migration deployment workflow.

The broader row contracts and deployment rules are in
`docs/development/content-authoring-and-new-games.md`.
