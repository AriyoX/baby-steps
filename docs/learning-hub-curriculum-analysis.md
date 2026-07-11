# Baby Steps Learning Hub curriculum analysis

**Status:** planning and documentation only

**Repository snapshot:** `main` at `4dda9e0`, inspected 2026-07-10

**Intended audience:** Baby Steps product, curriculum, language, cultural-review, content-production, design, engineering and QA stakeholders

## 1. Executive summary

**Repository finding:** Baby Steps has a coherent local Learning Hub runtime: bundled JSON is normalized by a repository, rendered through three routes, dispatched through a mechanic registry and persisted through child- and language-scoped progress. The declared mechanic union contains eight identifiers. Seven have registered renderers: `tap_to_learn`, `listen_and_choose`, `choose_correct_word`, `match_word_picture`, `mini_quiz`, `cultural_card` and `story_bite`. `practice_mix` is declared and present in content, but is locked, not startable and has no renderer. The current bundled Learning Hub contains one language bundle (`lg`), five stages, 18 lessons and 33 raw items. Fourteen lessons containing 29 items are startable. An explicit `nyn` selection has no Learning Hub bundle and correctly displays the unavailable-language state; it does not silently receive Luganda content.

**Repository finding:** The Learning Hub is mainly an exposure and recognition system. Audio playback, word/meaning choice, word-picture choice, short non-graded cultural cards and page-by-page story presentation exist. Graded mechanics allow unlimited retries and only complete after a correct selection, so a completed lesson normally produces an apparently perfect score even if the child first answered incorrectly. Non-graded items are also counted as “correct” by the completion calculation because only `correct === false` is excluded. Technical completion therefore means that every item emitted its completion event; it is not evidence of independent recall, spoken production, pronunciation quality or durable mastery.

**Repository finding:** The Luganda Games menu exposes five games: Words (the Word Game), Logic (the Puzzle Game), Cards Matching, Learning (the Learning Game) and Numbers (the Counting Game). The bundled Runyankole menu exposes only Words, Learning and Numbers. Other routes under `app/child/games/` support the separate Coloring and Museum tabs and a ball-trail experience; they are not additional cards in the current language Games menu. The five audited games do not share curriculum vocabulary IDs with the Learning Hub. Learning Game most directly duplicates Hub exposure and multiple-choice recognition; Counting and Word Game may reinforce specific domains; Cards Matching can provide optional memory/cultural replay; Puzzle Game is a cultural visual/spatial activity rather than language evidence.

**Research finding:** Uganda's current Ministry of Education and Sports ECCE package was approved by Cabinet in May 2024 and includes May 2025 implementation standards and guidelines. It covers ages 0–6, requires communication in a familiar language in classroom and play-based learning, and assigns government responsibility for appropriate curricula, methods, materials, inclusion and competency assessment. The older NCDC ECD Learning Framework remains relevant guidance for ages 3–6, and the P1 Thematic Curriculum remains relevant to early primary, but neither should be treated as the entire current policy position. These documents support familiar-language, thematic, play-oriented, culturally grounded and observational approaches; they do not certify this app or this proposed model as compliant. [MoES ECCE Policy, Standards and Guidelines](https://www.education.go.ug/wp-content/uploads/2026/05/ECCE-POLICY-2025-with-signatures-final.pdf), [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf), [NCDC P1 Thematic Curriculum](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf)

**Recommendation:** Use the Learning Hub as the required, authored curriculum path and treat games, stories, animations and coloring as optional reinforcement or caregiver-supported extension. Organize each thematic unit as a short loop—meaningful exposure, recognition, supported retrieval, contextual use and delayed review—rather than seven universal lockstep “levels.” Learner profile and age band should change the expected evidence: a home-language-speaking early reader, a heritage learner with receptive knowledge, a beginner and a pre-reader should not be evaluated against the same behavior.

**Recommendation:** Before producing real curriculum, add a small authoring manifest around the current runtime schema. The minimum missing concepts are stable curriculum/vocabulary identity, age/profile intent, objective and skill domain, prerequisites, introduced/reviewed vocabulary, review and publication state, provenance, review approvals, content version and replacement/retirement relationships. Do not build a large CMS or adaptive algorithm first. Resolve the shared `activity_type = "language"` summary-row collision between the Learning Hub and the standalone Learning Game before a production curriculum cutover.

**Validation required:** Native Luganda and Runyankole/Runyankore language professionals, early-childhood educators, cultural reviewers and representative families must validate naming, orthography, variants, vocabulary sequence, distractors, images, stories, audio, age expectations and whether proposed observations are meaningful. No developer-only review can make target-language or educational content production-ready.

## 2. Scope and non-goals

This report audits the current implementation and proposes a future curriculum/content architecture. It does not implement that architecture.

**In scope**

- Current Learning Hub routing, content loading, normalization, mechanics, completion, progress, achievement and language behavior.
- The five language Games-menu implementations and their possible curriculum roles.
- Uganda-specific policy/framework evidence and carefully bounded international research.
- Learner profiles, age bands, curriculum structure, content workflow, minimum schema implications, future database transition, identity and progress migration.
- A placeholder stage and non-executable JSON example using deliberately unverified target-language tokens.

**Out of scope**

- Changes to application code, UI, navigation, mechanics, scoring, progress, achievements, migrations, translations or production content.
- Unlocking or designing the `practice_mix` algorithm.
- Claims that Baby Steps complies with a Ugandan curriculum.
- Automatic speaking/pronunciation claims, adaptive recommendations or new child tracking.
- Choosing a final Luganda or Runyankole curriculum, dialect/variant policy or universal mastery threshold.

**Repository finding:** The worktree was clean at the start of this audit. The branch was `main`; `git status --short` and `git diff --stat` had no output. Recent accepted history included cross-language fallback prevention (`ba8a2ec`), Learning Hub progress/achievements (`67086ab`) and the initial story/quiz/mechanic work (`83a3567`, `87bb0dd`). No applicable `AGENTS.md` or handover was present. Existing documentation is under `docs/`, so the requested path follows the repository convention.

## 3. Evidence and terminology conventions

The document uses these labels deliberately:

| Label | Meaning |
|---|---|
| **Repository finding** | Directly verified in current routes, components, data, types, migrations, tests or git state. |
| **Research finding** | Supported by a cited source, with its population, scope and transfer limits stated. |
| **Recommendation** | A proposed product, curriculum, workflow or technical direction; not current behavior. |
| **Validation required** | A decision or claim that needs educator, linguistic, cultural, family, accessibility, legal/policy or technical confirmation. |

Additional terms:

- **Technical completion:** the current application has reached an item's or lesson's implemented completion event.
- **Correct response:** the current component accepted a configured option. This can occur after retries.
- **Mastery:** sufficiently stable and transferable knowledge demonstrated under an agreed evidence rule. Current Baby Steps completion must not be used as a synonym.
- **Recognition:** selecting a heard, written or pictured target from supplied options.
- **Recall:** producing/retrieving an answer without seeing the complete answer among choices. The current Hub does not reliably measure this.
- **Production:** speaking, writing or constructing language. An instruction to repeat is an opportunity, not app-observed evidence.
- **Home/first-language learner:** a child regularly exposed to and using the language at home; this is a profile, not a guarantee of literacy.
- **Heritage learner:** a child connected to the language through family/community who may understand more than they speak.
- **Beginner/additional-language learner:** a child with little exposure or learning a language not currently dominant in their daily life.

## 4. Repository audit methodology

**Repository finding:** The audit read implementation files rather than relying on feature documentation. It traced:

1. `content/learningHubContent.json` into `content/learningHubRepository.ts` and `content/learningHubTypes.ts`.
2. `app/child/(tabs)/learning.tsx` into the stage and lesson routes.
3. `components/learning/mechanics/mechanicRegistry.tsx` into every registered mechanic component and test.
4. Asset lookup through `content/assets.ts`, `lib/audioAssets.ts` and the image/audio consumers.
5. Completion through `ItemResult`, the lesson route, `lib/learningProgressRepository.ts`, the shared progress repository, migrations and achievement evaluation.
6. The Games menu in `content/contentRepository.ts`, route wrappers under `app/child/games/`, all five primary components, their bundled content/progress managers and relevant tests.
7. Language normalization in `content/languages.ts` and explicit unavailable-language handling at all Learning routes.

Counts were calculated from the current JSON, then cross-checked against repository normalization/startability rules. Search also covered the candidate capabilities listed in the task—audio, discrimination, matching, sequencing, tracing, voice/speech, recall, story comprehension, sentences, culture, rhythm/rhyme/song—and did not infer features merely from documentation or planned labels.

**Limitation:** This is a static repository audit. It did not run the full app, inspect production database rows or judge target-language correctness. Component tests and route tests were inspected; no full test suite was necessary for a documentation-only change.

## 5. Current Learning Hub architecture

### 5.1 Runtime flow

```text
content/learningHubContent.json
  -> content/learningHubRepository.ts
  -> app/child/(tabs)/learning.tsx
  -> app/child/learning/[stageId].tsx
  -> app/child/learning/[stageId]/lesson/[lessonId].tsx
  -> components/learning/mechanics/mechanicRegistry.tsx
  -> seven mechanic components
  -> ItemResult[]
  -> local LearningProgressSummary
  -> shared progress queue / Supabase sync
  -> achievement evaluation and non-blocking notice
```

**Repository finding:** `content/learningHubRepository.ts:123` loads the JSON synchronously. `getLearningLanguageContent` at approximately lines 1124–1131 resolves an explicit language code and returns only that bundle. It does not use the JSON `defaultLanguage` as a fallback for a different selected language. The three route layers show `components/learning/LearningLanguageUnavailableState.tsx` if the selected language has no bundle.

### 5.2 Schema, normalization and invalid content

**Repository finding:** `content/learningHubTypes.ts:22-30` declares the eight mechanic identifiers and `:99-106` defines the generic item result. The repository normalizes strings, booleans, order, readiness, stages, lessons, items, options, quiz questions and story pages. Options are deduplicated to stable IDs and ordered. Choice mechanics require 2–4 options and a `correctOptionId` that points to one of them; mini quizzes require 1–5 valid questions; story bites require 1–5 valid pages; tap, cultural and other items have mechanic-specific text requirements.

**Repository finding:** Invalid items for a registered mechanic are filtered. A lesson that loses all valid items becomes `empty`. A recognized but unimplemented mechanic remains representable but is not startable. An unrecognized mechanic value is normalized to `practice_mix`, the unstartable fallback. This avoids a crash but can hide an authoring typo as “coming soon”; strict pre-publication validation should catch it earlier.

**Repository finding:** Missing IDs can be generated from position: `stage-{index}`, `{stageId}-lesson-{index}` and `{lessonId}-item-{index}` (`learningHubRepository.ts:930-979`), with analogous `page-{index}` story-page fallbacks. These are convenient for malformed draft input but unsafe as durable progress identities because reordering can change them.

### 5.3 Visibility, locking and startability

**Repository finding:** The Learning tab renders all stages in the selected bundle, including locked stages. The stage route renders all lessons. `getLessonStatus` (`learningHubRepository.ts:1032-1060`) returns, in effect: `locked` for a locked stage/lesson; `unsupported` for an invalid mechanic; `coming_soon` for an unimplemented or explicitly non-startable lesson; `empty` for missing/invalid items; otherwise `startable`. Only `startable` lessons open. A completed lesson remains open and is labelled for review; completing a stage does not automatically unlock another stage.

### 5.4 Item progression, results and completion

**Repository finding:** The lesson route orders items, renders one at a time and accumulates `ItemResult` values. When an item calls `onComplete`, the route advances or, on the final item, shows the completion UI and asynchronously saves the lesson. The generic result can contain `itemId`, `mechanic`, `completedAt`, `correct`, `attempts` and `hintUsed`, but not every mechanic meaningfully supplies every field.

**Repository finding:** On lesson completion, `correctItems` counts every result whose `correct` value is not explicitly `false` (`app/child/learning/[stageId]/lesson/[lessonId].tsx:215-245`). Non-graded tap, story and cultural results therefore count as correct. Graded mechanics only emit completion after the configured correct answer. The displayed score is consequently usually 100%, even after wrong attempts. Lesson-level `attempts` counts completed runs of the lesson; item-level `attempts` counts answer taps or other mechanic-specific interactions.

**Conclusion:** Current lesson completion means **finishing all valid lesson items under their UI rules**. For tap/culture/story it may mean viewing and continuing; for choice mechanics it means eventually selecting the correct option; for a quiz it means eventually answering every question correctly. It does not require a score threshold, delayed retention, unprompted recall, observable speech or transfer to a new context.

### 5.5 Progress, synchronization and achievements

**Repository finding:** `lib/learningProgressRepository.ts` stores a child- and language-isolated local summary under `@BabySteps:LearningProgress:v1:summary:{child}:{language}:language`. The fallback child ID is `local-demo-child`; it remains local and is not sent as a database UUID. Saving a lesson first preserves the local summary, then writes an activity feed entry and queues normalized `child_activity_progress` and `child_stage_progress` records. Shared progress sync is best-effort and queued for later; the append-only activity feed and achievement awards are immediate live writes and are not queued.

**Repository finding:** A stage is considered complete when all lessons currently classified as startable have completion rows. Remote hydration is language/activity scoped, uses an approximately 20-minute cooldown and merges only Learning Hub payloads marked `source: "learning_hub"`; newer local completion wins. Payloads retain stage/lesson IDs and titles, order/number, mechanic types, item results, totals, content version and completion metadata.

**Repository finding:** Five stable Learning Hub achievements are seeded: first lesson, three lessons, First Words stage, a mini-quiz lesson and a story-bite lesson. Awards are child-scoped, not language-specific. Failure to write an achievement does not block completion, and notices are shown through the existing non-blocking FIFO child-notice context with session deduplication.

**Technical risk:** Both the Learning Hub and standalone Learning Game use `activity_type = "language"`. The database constraint allows one `child_activity_progress` aggregate per child/language/activity type. Each can therefore overwrite the other's aggregate payload even though their local managers differ and detailed stage IDs use different conventions. A cutover must first separate the activity namespace or define a compatible aggregate.

### 5.6 Language, cache and assets

**Repository finding:** `content/languages.ts` canonicalizes `luganda`/`oluganda` to `lg` and `runyankole`/`runyankore` to `nyn`. The registry displays `lg` as Luganda/Oluganda and `nyn` as Runyankole/Runyankole. The naming is recorded, not corrected here. Only `lg` exists in `learningHubContent.json`; an explicit `nyn` choice receives the unavailable state.

**Repository finding:** Learning Hub content itself is bundled and has no Supabase fetch or content cache. It is available offline with the app bundle. `content/assets.ts` resolves known bundled image keys and can also pass through remote URIs; the current `CachedImage` use does not constitute a versioned offline asset-download system. `lib/audioAssets.ts` contains a placeholder cue and a small static set (`amazzi`, `bulungi`, `oli-otya`, `omwana`, `webale`). Unknown audio keys fall back to a placeholder cue. At least the current `listen-gyebale-ko` item uses placeholder audio; audio playback must therefore not be interpreted as verified target pronunciation.

**Recommendation:** A future remote Learning Hub should preserve the current no-cross-language behavior, validate a whole bundle before activation and retain a last-known-good language-specific bundle plus its required asset manifest.

## 6. Current content inventory and verified counts

### 6.1 Bundle and stage counts

**Repository finding:** The bundled file reports content version `1.1`, default language `lg`, and one actual language bundle (`lg`). Raw and startable counts are:

| Stage ID | Status / lock | Lessons | Raw items | Startable lessons | Items in startable lessons |
|---|---:|---:|---:|---:|---:|
| `first-words` | `preview`, unlocked | 5 | 12 | 5 | 12 |
| `family-home` | `preview`, unlocked | 6 | 10 | 6 | 10 |
| `everyday-things` | `preview`, unlocked | 3 | 7 | 3 | 7 |
| `culture-stories` | `preview`, stage unlocked | 3 | 3 | 0 | 0 |
| `practice-mix` | `locked`, locked | 1 | 1 | 0 | 0 |
| **Total** |  | **18** | **33** | **14** | **29** |

The unlocked `culture-stories` stage contains only lessons explicitly marked non-startable; stage visibility must not be confused with lesson reachability.

**Repository finding:** The 33 figure is the raw JSON count. Runtime normalization retains 30 items: the 29 valid items in startable lessons plus the unimplemented `practice_mix` item. The three raw items in `culture-stories` do not satisfy the current `story_bite`, `cultural_card` and `mini_quiz` shapes and are filtered, leaving empty normalized item arrays in lessons already marked non-startable. They are inventory evidence of intended mechanic use, not renderable lesson content.

### 6.2 Mechanic usage counts

| Mechanic | All raw items | Startable items | Current reachability |
|---|---:|---:|---|
| `tap_to_learn` | 8 | 8 | Rendered and startable |
| `listen_and_choose` | 2 | 2 | Rendered and startable; audio readiness is partial |
| `choose_correct_word` | 7 | 7 | Rendered and startable |
| `match_word_picture` | 7 | 7 | Rendered and startable |
| `mini_quiz` | 4 | 3 | Rendered; one non-startable raw culture item is invalid and filtered |
| `cultural_card` | 2 | 1 | Rendered; one non-startable raw culture item is invalid and filtered |
| `story_bite` | 2 | 1 | Rendered; one non-startable raw culture item is invalid and filtered |
| `practice_mix` | 1 | 0 | Declared, locked, non-startable, no renderer |

**Repository finding:** IDs are stable strings when supplied, but some item IDs such as `father` and `mother` recur in different lessons. Current progress is safe because the lesson context contains the item result; a future global vocabulary model cannot treat the item ID alone as a lexeme ID.

Exact raw current use, expressed as `lessonId/itemId`, is:

| Mechanic | Startable item IDs | Non-startable item IDs |
|---|---|---|
| `tap_to_learn` | `greetings-1/well-done`, `greetings-1/thank-you`, `greetings-1/mother`, `greetings-1/father`, `greetings-1/water`, `family-names-1/child`, `family-names-1/father`, `family-names-1/mother` | None |
| `listen_and_choose` | `listen-greetings-1/listen-gyebale-ko`, `listen-greetings-1/listen-webale` | None |
| `choose_correct_word` | `first-words-word-check/choose-thank-you`, `first-words-word-check/choose-water`, `family-pick-word/choose-family-child`, `family-pick-word/choose-family-mother`, `food-objects-1/choose-banana-word`, `food-objects-1/choose-drum-word`, `food-objects-1/choose-food-word` | None |
| `match_word_picture` | `first-words-picture-match/match-mother-picture`, `first-words-picture-match/match-water-picture`, `home-things-1/match-home-house`, `home-things-1/match-home-water`, `animals-objects-1/match-cow-picture`, `animals-objects-1/match-drum-picture`, `animals-objects-1/match-goat-picture` | None |
| `mini_quiz` | `first-words-quick-review/first-words-review-questions`, `family-mini-quiz/family-words-review`, `daily-review-1/daily-words-review` | `story-check-1/story-question` |
| `cultural_card` | `home-greeting-card/morning-greeting-home` | `culture-card-drum/drum-card` |
| `story_bite` | `thank-you-at-home-story/thank-you-at-home-pages` | `story-bite-kintu/kintu` |
| `practice_mix` | None | `review-first-words/first-words-review` |

### 6.3 Capability classification

| Candidate capability | State | Repository-grounded interpretation |
|---|---|---|
| Audio exposure / playback | Implemented | Bundled audio or placeholder cue can play; coverage and linguistic review are incomplete. |
| Audio discrimination | Partially implemented | `listen_and_choose` selects after audio, but current placeholder/fallback audio weakens the actual discrimination task. |
| Word-picture association | Implemented | `match_word_picture`, some listening options and game imagery. |
| Multiple choice | Implemented | Three Hub mechanics and several games use supplied options. |
| Matching | Implemented | Hub word-picture selection and Cards Matching; these are different task forms. |
| Ordering / sequencing | Partially implemented | Story pages have a fixed sequence, but the child does not arrange them. |
| Tracing / handwriting | Absent | Coloring is not letter/word tracing. |
| Voice recording | Absent | No captured child audio. |
| Speech recognition | Absent | No speech-to-text or speech scoring. |
| Pronunciation playback | Partially implemented | Some target audio exists; coverage/review are incomplete and some game “number sound” behavior is only a generic effect. |
| Pronunciation assessment | Absent | No observable mechanism evaluates child speech. |
| Story comprehension | Partially implemented | Generic Stories has a final quiz; Hub Story Bite only displays pages/reflection, while the raw culture quiz is non-startable, invalid and filtered. |
| Free recall | Absent | No unprompted answer capture. |
| Guided recall | Partially implemented | Word Game supplies a first letter, but invalid distractor letters are disabled and hint use is not recorded correctly. |
| Sentence construction | Absent | Example sentences can be displayed; children do not construct one. |
| Cultural explanation | Implemented | Cultural Card and Cards Matching information panels. Accuracy still needs review. |
| Rhythm, rhyme or song interaction | Absent | No structured interaction or result model for these forms. |

## 7. Learning mechanic inventory

### 7.1 Summary

| Identifier / display label | Registry / component | Current startable items | Primary observable interaction | Current evidence |
|---|---|---:|---|---|
| `tap_to_learn` / Tap to learn | Registry lines 224; `TapToLearnCard.tsx` | 8 | View card, hear/replay, continue | Viewed/continued; replay count |
| `listen_and_choose` / Listen and choose | Registry line 225; `ListenAndChooseCard.tsx` | 2 | Hear cue and select an option | Eventually correct option; answer taps |
| `choose_correct_word` / Choose the correct word | Registry line 226; `ChooseCorrectWordCard.tsx` | 7 | Select written answer | Eventually correct option; answer taps |
| `match_word_picture` / Match word to picture | Registry line 227; `MatchWordPictureCard.tsx` | 7 | Select image for target text | Eventually correct image; answer taps |
| `mini_quiz` / Mini quiz | Registry line 228; `MiniQuizCard.tsx` | 3 of 4 | Answer 1–5 multiple-choice questions | Eventually all correct; total answer taps |
| `cultural_card` / Cultural card | Registry line 229; `CulturalCard.tsx` | 1 of 2 | Read/view and continue | Viewed/continued |
| `story_bite` / Story bite | Registry line 230; `StoryBiteCard.tsx` | 1 of 2 | Progress through pages | Finished pages; page count |
| `practice_mix` / Practice mix | No registry entry | 0 of 1 | “Coming soon” fallback only | None |

**Repository finding:** All completed mechanic results are embedded in the containing lesson's progress payload. Any completed lesson can contribute to the generic first-lesson/three-lesson achievements and to its stage completion. In addition, completing a lesson whose mechanic list contains `mini_quiz` or `story_bite` can satisfy the corresponding mechanic-specific achievement. Tap, Listen, Choose, Match and Cultural Card have no separate item-specific achievement; `practice_mix` cannot complete. Achievement failure never changes the mechanic result or local lesson completion.

### 7.2 `tap_to_learn`

**Repository finding:** Current startable items are `well-done`, `thank-you`, `mother`, `father`, `water`, and the separate family lesson's `child`, `father`, `mother`. The child sees local and English text, an image or fallback visual, and an audio control. Audio may auto-play and may be replayed. Pressing Next/Finish completes the item without proving that audio was heard or the word was repeated.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Normalized `localText` and `englishText`; raw compatibility aliases `word` and `translation`; stable ID, order, mechanic, readiness. |
| Optional content | Image key/asset, audio key/asset, phonetic text, example sentence, metadata. |
| Assets | Image optional; audio optional and may fall back to the generic cue. |
| Scoring / retry / hints | Non-graded; replay is available; no wrong answer, retry or hint. |
| Feedback / completion | Audio playback and Next/Finish; result has no `correct`, with `attempts` equal to manual replays. |
| Progress / achievements | Item result is embedded in the lesson completion; completing the containing lesson may contribute to generic lesson/stage achievements. |
| Likely skills | Listening exposure, vocabulary, word recognition and word-picture association; possible caregiver-supported speaking. |
| Ages 3–5 | Strongest when short, image-led, audio-first and shared with an adult. Text should not be necessary to succeed. |
| Ages 6–8 | Can include meaningful written forms/example context, but merely viewing remains weak evidence. |
| Accessibility | Auto-audio needs replay and visual/text alternatives; the fallback image/text must not carry false cultural meaning. |
| Offline | Bundled content/assets work offline; remote images would not be reliably offline without a future asset cache. |

**Recommendation:** Use for first meaningful exposure inside a theme, not as a mastery check. A prompt to repeat can be included as a caregiver-supported practice opportunity, but the app must continue to report only exposure/continuation.

### 7.3 `listen_and_choose`

**Repository finding:** Current items are `listen-gyebale-ko` and `listen-webale`. The child hears/replays a cue and selects among 2–4 text or image choices. A wrong choice shows feedback and allows unlimited retry; progression is blocked until the configured correct option is tapped. Audio replay is not counted as an attempt; option taps are. The result emits `correct: true` and the total option-tap count.

| Dimension | Current behavior / implication |
|---|---|
| Required content | `correctOptionId`, 2–4 uniquely identified valid options; stable item fields. |
| Optional content | Prompt, local/English text, option image fields, audio key/asset, metadata. |
| Assets | The task is educationally dependent on reviewed target audio even though code can proceed without it. Images are optional. |
| Scoring / retry / hints | No item score; unlimited retry; no hint; completion only after correct. |
| Feedback | Immediate correct/wrong feedback and replay. |
| Progress | Eventually-correct flag plus number of option taps; no identity of wrong options or replay count. |
| Likely skills | Listening discrimination and receptive vocabulary if the audio is valid; otherwise written/image recognition after a generic cue. |
| Ages 3–5 | Prefer two or three visually distinct, familiar options and very short audio. Avoid requiring reading. |
| Ages 6–8 | Can progress toward closer semantic/phonological distractors after validation. |
| Accessibility | Visual-only alternatives do not assess listening; hearing access and non-audio pathways need an explicit product decision. |
| Offline | Works with bundled audio; fallback cue keeps UI usable but invalidates a listening inference. |

**Validation required:** A native speaker must verify speaker, word, dialect/variant, recording, prompt and distractors. The current placeholder on `listen-gyebale-ko` means that item should not be reported as verified sound discrimination.

### 7.4 `choose_correct_word`

**Repository finding:** Seven startable items choose a written target for meanings such as thank you, water, family words and everyday objects. The child sees a prompt/question and 2–4 written choices, retries wrong answers indefinitely and advances only on correct. Result evidence is eventually-correct plus answer taps.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Prompt, `correctOptionId`, 2–4 options with IDs and local text. |
| Optional content | Question text, English option text, item/option image, metadata. |
| Assets | No audio required; images optional. |
| Scoring / retry / hints | No penalty or threshold; unlimited retry; no hint. |
| Feedback / completion | Immediate correct/wrong; completes only after configured correct answer. |
| Likely skills | Written-word recognition and meaning association; not spelling, speech or independent recall. |
| Ages 3–5 | Reading-dependent form is generally unsuitable as a required path for pre-readers unless an adult/audio carries the prompt. |
| Ages 6–8 | Appropriate after the written forms have been taught and orthography reviewed. |
| Accessibility | Text size, contrast and audio-read prompt may matter; color alone must not signal correctness. |
| Offline | Fully offline with bundled text/images. |

**Recommendation:** Treat the first-attempt response separately from eventual correction in future evidence design. Increase distractor similarity only after the learner has a stable meaning connection and after linguistic review.

### 7.5 `match_word_picture`

**Repository finding:** Seven startable items ask the child to select a picture for a displayed target word. Options can resolve image keys/assets or fall back to emoji/text. Wrong selections are retryable; completion requires the correct option and records answer taps.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Prompt, target text, `correctOptionId`, 2–4 uniquely identified options with local text. |
| Optional content | Target English text, option English text, image key/asset, emoji, metadata. |
| Assets | Educational quality usually depends on unambiguous, culturally appropriate images. |
| Scoring / retry / hints | Eventually correct; unlimited retry; no hint or penalty. |
| Feedback / completion | Immediate selection feedback; completes after correct. |
| Likely skills | Vocabulary, word recognition and word-picture association; motor selection. |
| Ages 3–5 | Suitable if audio can carry the target and images are concrete/unambiguous; current text-only target may require support. |
| Ages 6–8 | Can gradually reduce English/image support and use closer-category distractors. |
| Accessibility | Images need meaningful alternatives; avoid small or culturally obscure details and visually similar options for low-vision users. |
| Offline | Bundled images work offline; remote URI availability is not guaranteed. |

**Recommendation:** Use an independently reviewed picture set. An image match should not stand in for cultural knowledge or word production.

### 7.6 `mini_quiz`

**Repository finding:** Four raw item records exist; three are valid and startable (`first-words-review-questions`, `family-words-review`, `daily-words-review`). The raw `story-question` record is non-startable and lacks the required quiz shape, so normalization filters it. A valid quiz item contains 1–5 ordered multiple-choice questions with 2–4 options. The child retries each question until correct, then advances; an optional explanation appears after correctness. One aggregate result emits `correct: true` and all option taps, not per-question results.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Title and 1–5 valid questions; every question needs ID, prompt, `correctOptionId` and 2–4 text options. |
| Optional content | Instructions, prompt English, option English, explanation, base asset fields and metadata. |
| Assets | No audio/image task contract in quiz options. |
| Scoring / retry / hints | Unlimited retry; no hint; no retained first-attempt/per-question correctness. |
| Feedback / completion | Immediate feedback/explanation; all questions must eventually be correct. |
| Likely skills | Mixed recognition and simple comprehension depending on question design. |
| Ages 3–5 | Keep questions few, spoken/shared and image-based where possible; current text-only option type constrains this. |
| Ages 6–8 | Useful as low-stakes formative review, not a high-stakes test. |
| Accessibility | Text load and lack of option images/audio can exclude pre-readers and some disabilities. |
| Offline | Bundled text works offline. |

**Recommendation:** In future schema/runtime work, preserve question-level first response and objective/vocabulary IDs. Do not use the current 100%-after-retry score as a mastery threshold.

### 7.7 `cultural_card`

**Repository finding:** `morning-greeting-home` is valid and startable. The raw `drum-card` record is non-startable and lacks the required cultural-card shape, so normalization filters it. A valid card can show title/body, local text, image/emoji, fun fact and a reflection prompt. The child continues once; the reflection is not captured. The result has `attempts: 1` and no correctness.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Title and body text plus stable base fields. |
| Optional content | Local title/text, image key/asset, emoji, fun fact, reflection prompt, metadata. |
| Assets | Optional image; no required audio. |
| Scoring / retry / hints | Non-graded; no retry or hint. |
| Feedback / completion | Continue/Finish; viewing is completion. |
| Likely skills | Culture, contextual vocabulary, caregiver discussion and reflection opportunity. |
| Ages 3–5 | Needs very short read-aloud text and adult interaction; screen text alone is not age-accessible. |
| Ages 6–8 | Can support comparison and discussion, but not assessment without an observable response. |
| Accessibility | Narration and simplified text may be required; images must avoid stereotypes. |
| Offline | Bundled content/assets work offline. |

**Validation required:** Cultural statements, images, roles and customs need reviewers connected to the represented community. A Buganda example must be labelled as such, not generalized to all Uganda.

### 7.8 `story_bite`

**Repository finding:** `thank-you-at-home-pages` is valid and startable. The raw `kintu` record is non-startable and lacks the required story-page shape, so normalization filters it. A valid story contains 1–5 pages with body text and optional local text/title, image/emoji and audio. The child moves in the authored order and taps “I finished” at the end. Result attempts equal pages viewed; there is no question, retell, ordering response or captured reflection.

| Dimension | Current behavior / implication |
|---|---|
| Required content | Title and 1–5 pages; each page needs ID and body text. |
| Optional content | Instructions, reflection, local page text/title, image/emoji, audio, metadata. |
| Assets | Images/audio optional in code but important for pre-reader access. |
| Scoring / retry / hints | Non-graded; linear navigation; no hint. |
| Feedback / completion | Page progress and final completion; no comprehension feedback. |
| Likely skills | Contextual input, story exposure, narrative sequence viewing, culture and caregiver conversation. |
| Ages 3–5 | Shared, narrated, image-led stories with interaction are preferable to text-heavy solo reading. |
| Ages 6–8 | Can support prediction, retell and questions, but current component does not observe them. |
| Accessibility | Needs optional narration, captions/text, clear pacing and image descriptions; autoplay should not be required. |
| Offline | Only bundled/resolved assets are dependable offline. |

**Research finding:** A 2018 meta-analysis of 38 shared-storybook studies (2,455 children, roughly ages 2–10/preliterate samples) found word learning from shared reading and identified dialogic interaction and the number of target-word exposures as moderators. It was not Uganda- or Luganda-specific, and the authors noted limits around repetition evidence. This supports interactive caregiver prompts as a design direction, not a claim that page completion teaches a word. [Flack, Field & Horst (2018)](https://pubmed.ncbi.nlm.nih.gov/29595311/)

### 7.9 `practice_mix`

**Repository finding:** `practice_mix` is in the type union, display-name map and current JSON, but is excluded from `IMPLEMENTED_MECHANICS`, has no registry renderer and is inside the locked Practice Mix stage. It resolves to the generic “Coming soon” frame and produces no learning evidence.

**Recommendation:** Do not unlock it until the curriculum has stable vocabulary/objective identities, explicit review rules, trustworthy first-response evidence, content-version safeguards, a reviewed UI/content contract and tests. Its future dependencies include a definition of what is eligible for review, how prerequisites and language/version boundaries work, how non-graded items are treated, and how practice affects—but does not fabricate—mastery. This report intentionally does not propose its selection algorithm.

## 8. Games-section inventory

### 8.1 Menu and data layer

**Repository finding:** `app/child/(tabs)/index.tsx` renders `AfricanThemeGameInterface`, which reads `menuCardsByTab.games` from the selected-language `ContentBundle`. The bundled Luganda menu at `content/contentRepository.ts:481-517` has five cards; the Runyankole bundle at `:646-668` has three. The generic content repository can retrieve same-language active rows from Supabase `content_items` for supported content types, cache them in language-specific memory and AsyncStorage for six hours, serve stale data while revalidating and fall back to same-language bundled data. It does not cross-fallback languages. Validation is mostly top-level array validation, not curriculum-semantic validation.

**Repository finding:** For Luganda, database payloads may be merged with legacy bundled sets only when the database dataset is at least as complete; Runyankole does not use this partial merge. `is_active` is the only publication-like database filter. The Games data path is therefore more remote-ready than the Learning Hub but not a production curriculum workflow.

### 8.2 Learning Game (“Learning”)

| Property | Verified behavior |
|---|---|
| Route / component | `/child/games/learninggame`; `components/games/LearningGameComponent.tsx` |
| Content | Generic repository or `content/games/lugandawords.ts`; Luganda has 5 stages, 10 levels, 40 word entries (4 per level). A small Runyankole dataset also exists. |
| Loop | Stage -> level -> image/text/audio learning cards -> four-choice English-meaning quiz for each target word. |
| Difficulty | Required stage scores 0, 50, 90, 130, 170; authored stages/levels. |
| Score / retry | Correct selection adds 10; wrong selections can retry. Because every word must eventually be answered correctly, a completed level reaches its full score regardless of earlier errors. Derived `wrongAnswers` consequently reaches zero. |
| Completion / progress | Local child+language stage/level progress; queued shared `language` progress, live activity/achievement writes. |
| Assets | Images plus an audio manager. The audio manager hardcodes a small Luganda map and ignores the generic word's audio field; an unknown target, including Runyankole examples, can play a generic success sound rather than pronunciation. |
| Language / age | Selected-language content is supported, but audio is effectively Luganda-coupled. Ages 3–5 need shared/audio/image-led use because the quiz asks for English meanings; ages 6–8 may use it more independently if they can read the support language. |
| Coupling | Moderate: content is adapted outside the component, but the learn-then-four-choice loop, scoring and stage model are fixed in it. |
| Offline | Bundled content/local progress are offline; normalized progress queues, while feed/achievement writes do not. |

**Repository finding:** Skills exercised are word exposure, picture/meaning association and supplied-option recognition. No answer-attempt history, speaking or durable recall is observed. The “perfect/no wrong” interpretation is unreliable under the current scoring. Content overlaps Hub `tap_to_learn` plus `choose_correct_word`, but uses separate word objects and no shared lexeme IDs.

**Recommendation:** Use as optional guided practice/retrieval-like recognition after the same vocabulary has been introduced, provided it later consumes curriculum IDs and reviewed audio. The smallest conceptual change is a curriculum-driven level contract containing stable lexeme/objective IDs, language, prompt/meaning/image/audio references and review eligibility; scoring/evidence semantics would also need correction before it contributes to mastery.

### 8.3 Counting Game (“Numbers”)

| Property | Verified behavior |
|---|---|
| Route / component | `/child/games/lugandacountinggame`; `components/games/CountingGameComponent.tsx` |
| Content | Generic repository or `content/games/countingGameStages.ts`. Luganda has 4 stages and 18 generated rounds; Runyankole has a small one-stage sample. |
| Loop | Count pictured objects/groups/currency and select one of three numbers, each accompanied by a target-language label. |
| Difficulty | Basic 1–10, groups 10–50, 50–100 and currency; some values are randomly chosen. |
| Score / retry | Correct +10, wrong retry, stage-completion bonus +10; wrong attempts are not retained. |
| Completion / progress | Local child+language progress, queued shared `counting` activity/stage progress, live activity/achievement writes. |
| Assets/audio | Object/group/currency visuals. “Number sound” logs the label but plays a generic `correct.mp3`, so it is not verified number pronunciation. |
| Language / age | Selected-language labels are data-driven. Small concrete quantities can suit shared ages 3–5; larger groups and currency are more plausible for 6–8 after educator review. |
| Coupling | Moderate: stages/labels are adapted data, while round generation, three-choice play, scoring and stage bonus are component rules. |
| Offline | Bundled rounds and local/queued progress work offline; feed/achievement writes do not. |

**Recommendation:** Keep as optional numeracy plus number-word reinforcement. It should not be a blocker in a general language path. A future contract should reference stable number-concept and language-form IDs and reviewed audio; mastery contribution, if any, should be limited to the specific objective and first-response evidence.

### 8.4 Word Game (“Words”)

| Property | Verified behavior |
|---|---|
| Route / component | `/child/games/wordgame`; `components/games/WordGameComponent.tsx` |
| Content | Generic repository or 51 ordered entries in `content/games/wordgamewords.ts`; Runyankole has three sample entries. IDs are generated from list position. |
| Loop | See an English clue/image and first target-language letter, then tap letters to fill the remaining word. Hints/subhints are available. |
| Difficulty | Comments group broad difficulty, but the runtime schema has no explicit difficulty; level order is the model. |
| Score / retry | Completion reports 100%. Distractor letters that are not in the answer are disabled, so the child cannot select an invalid letter. Repeated valid letters fill occurrences. |
| Hint evidence | `hintUsedCurrentLevel` is initialized/reset false but is not set true by the hint flow, making no-hint achievement evidence unreliable. |
| Completion / progress | Sequential unlock; child+language local state, shared `words` progress, live activities/achievements. |
| Assets/audio | Images and feedback sounds; no target-word pronunciation playback. |
| Language / age | Selected-language levels are supported by the generic repository, but the interaction assumes target-language print plus English clues. It is not suitable as a required pre-reader task; consider only a reviewed 6–8 early-reader path. |
| Coupling | Moderate: entries are external data, but positional levels, letter generation/disable rules, hints, completion and progress semantics are component-specific. |

**Repository finding:** This looks like guided word construction but currently supplies the first letter and prevents invalid selections. It therefore demonstrates task completion, not independent spelling. Positional IDs make reordered content progress-fragile. It has no shared vocabulary identity with the Hub.

**Recommendation:** Consider only for older early readers after language-specific orthography and spelling progression are reviewed. The smallest conceptual change is a stable word/lexeme ID, explicit difficulty/support fields and curriculum-set selection; however, input/error and hint evidence would need redesign before formative use.

### 8.5 Cards Matching

| Property | Verified behavior |
|---|---|
| Route / component | `/child/games/cardgame`; `components/games/CardsMatchingComponent.tsx` |
| Content | 47 Buganda-themed entries hardcoded in the component; 8 random pairs (16 cards) per game. |
| Loop | Turn over cards, match identical values and open an information panel after a match. |
| Difficulty | One random 8-pair format; no authored levels. |
| Score / retry | Tracks moves and duration and calculates an efficiency measure; mismatches turn back. |
| Completion / progress | Child-scoped (not language-scoped) saved game and aggregate stats; live `cultural` activity and achievement writes; no normalized shared progress. |
| Assets/audio | Text/emoji/information; no target-language audio. Some source emoji/text appears encoding-damaged and needs QA. |
| Language / age | Not selected-language aware; content is hardcoded Buganda. Eight pairs may be demanding for some ages 3–5; shared/fewer-pair variants would need design. The current format is more plausible for 6–8 or supported younger children. |
| Coupling | High: the cultural array, random deck construction, matching/info UI and progress semantics are in/near the component. |
| Offline | Game state works offline; feed/achievement writes can fail and are not queued. |

**Repository finding:** The game exercises visual memory and exposes cultural/vocabulary labels. It is tightly coupled because data, random selection and rendering live in the component. It does not reinforce a known Hub item by identity.

**Recommendation:** Optional reward/replay or culture reinforcement only. A small future content contract could supply language, culture scope, stable concept/lexeme ID, front/back content, image/audio/info and review status. It should stay freely playable and should not contribute to core mastery merely because a pair was found.

### 8.6 Puzzle Game (“Logic”)

| Property | Verified behavior |
|---|---|
| Route / component | `/child/games/puzzlegame`; `components/games/PuzzleGameComponent.tsx` |
| Content | Three hardcoded Buganda images: Kasubi Tombs, Buganda Royal Drums and Lubiri Palace. |
| Loop | Shuffle and solve a 3x3 sliding puzzle, with preview and move counting. |
| Difficulty | Fixed 3x3 format; no levels or language adaptation. |
| Completion / progress | Local child-only completed image IDs/games played; live `cultural` activity and achievement writes; no normalized shared progress. |
| Assets/audio | Bundled images; no language audio. |
| Language / age | Not selected-language aware; all three images are Buganda-specific. A shuffled 3x3 sliding puzzle is more plausible for 6–8 or supported younger children than as a general ages 3–5 language task. |
| Coupling | High: puzzle data, fixed grid/game rules, labels and progress meaning are coupled to the component. |
| Offline | Puzzle/progress work offline; feed/achievement writes do not. |

**Repository finding:** The observable skills are visual-spatial problem solving, motor selection and exposure to a labelled cultural image. It is not a language assessment and has no curriculum/shared IDs. Data is coupled to the component.

**Recommendation:** Keep as optional reward/cultural exploration. The smallest curriculum-aware contract would attach a reviewed cultural concept, language-specific caption and provenance to each image. Do not require completion or use moves as language evidence.

### 8.7 Game reachability discrepancy

**Repository finding:** All five route/component implementations exist. In the current bundled Luganda Games menu all five are visible. In the Runyankole menu only Words, Learning and Numbers are visible; Puzzle and Cards remain directly routable implementations but are not selected-language menu cards. Coloring and Museum have their own child tabs and nested routes, so they are supporting areas rather than additional language Games-menu entries. `ball-trail.tsx` is a separate route and is not one of the five configured language menu cards.

**Repository finding:** The inspected migration seeds the same five Luganda and three Runyankole cards, but the generic repository can consume active Supabase menu rows. This static audit did not inspect a deployed database, so “visible” here means the current bundled/seeded repository state, not a guarantee about a separately changed live dataset.

## 9. Learning Hub and Games overlap analysis

| Capability | Learning Hub | Games | Overlap / gap |
|---|---|---|---|
| First word exposure | Tap to Learn | Learning Game cards | Strong duplication; no shared lexeme IDs or guaranteed matching assets/audio. |
| Spoken-word recognition | Listen and Choose | None reliably | Hub only, and current audio coverage is partial. |
| Written meaning recognition | Choose Correct Word, Mini Quiz | Learning Game quiz | Strong duplication; both complete after retries and overstate score. |
| Word-picture recognition | Match Word Picture | Learning Game; some Word/Counting imagery | Complementary but uncoordinated content. |
| Guided spelling/recall | None | Word Game | Potential older-child extension, but current disabled distractors make evidence weak. |
| Number vocabulary | General Hub items only | Counting Game | Domain-specific optional reinforcement. |
| Visual memory | Simple choice | Cards Matching | Cards can provide optional repeated exposure, not core evidence. |
| Story/context | Story Bite, Cultural Card | No audited game; Generic Stories is separate | Hub can provide context but does not observe comprehension/retell. |
| Culture | Culture/Story items | Cards and Puzzle | Valuable extension if community scope/provenance are explicit. |
| Independent production | None | None | Major gap. |
| Pronunciation assessment | None | None | Must not be claimed. |
| Mixed/delayed review | Locked Practice Mix | Random/replay behavior | No curriculum-scheduled, identity-based review exists. |

**Recommendation:** The Hub should own sequence, prerequisites, objectives and review eligibility. Games should consume published curriculum references for optional practice rather than maintain parallel word lists. A game completion may add engagement/practice evidence, but core progression should never require unrelated motor, memory or numeracy success.

**Recommendation:** Preserve free play. Curriculum-aware unlocking can highlight a game set after relevant words are introduced, but should not remove safe existing games or force game completion. Where a game duplicates a Hub mechanic, use it for varied practice or replay, not another nominal “lesson” with the same evidence weakness.

## 10. Research methodology

Research was conducted after the repository audit so recommendations could be limited to what the product can actually render and observe. Source priority was Uganda MoES/NCDC, then UNESCO/UNICEF, intergovernmental or government research guidance, then peer-reviewed systematic reviews/meta-analyses. Commercial app claims and general blogs were excluded.

### 10.1 Source classification and transfer discipline

| Source | Date and type | Population / subject | Directness to Baby Steps | Important limitation |
|---|---|---|---|---|
| [Uganda MoES ECCE Policy, Standards and Guidelines](https://www.education.go.ug/wp-content/uploads/2026/05/ECCE-POLICY-2025-with-signatures-final.pdf) | Policy approved May 2024; standards/guidelines dated May 2025 | Uganda ECCE; policy focuses ages 0–6 | Highest current policy relevance | It governs ECCE provision broadly; it is not a screen-level digital curriculum or app certification. |
| [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf) | Learning framework, first printed 2005; current official-hosted copy | Uganda children mainly ages 3–6; ECD discussed to age 8 | Direct curriculum-design context for younger band | Older framework; its current operational relationship to the 2024/2025 package requires NCDC/MoES confirmation. |
| [NCDC P1 Thematic Curriculum](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf) | Formal Primary 1 curriculum; 2006 foreword, 2016 reprint | Uganda Primary 1 | Direct context for older early readers/formal schooling | Not an ECCE curriculum and not a ready-made scope for an app or children below P1. |
| [NCDC Caregiver's Guide](https://ncdc.go.ug/wp-content/uploads/2024/02/Debbies_caregivers_guide_FINAL_4_1.pdf) | Caregiver guide, 2013 | Uganda ECD, ages 3–6 | Direct for adult mediation and observation | Browser text extraction was unreliable; this report limits claims to the guide's documented role and cross-confirmed principles. |
| [NCDC Curriculum Development Conference Proceedings](https://ncdc.go.ug/wp-content/uploads/2025/01/conference_compressed-compressed.pdf) | 2023 research/review proceedings, hosted 2025 | Includes a 2022 field study of ECD Framework implementation for ages 3–6 (377 respondents reported) | Useful implementation evidence | Proceedings/research, not policy; results do not validate this product. |
| [NCDC Translation Guidelines](https://ncdc.go.ug/wp-content/uploads/2025/06/FINAL-NCDC-TRANSLATION-GUIDELINES-JULY-2024_Web-file.pdf) | Official translation guidelines, July 2024 | Ugandan curriculum/material translation | Direct workflow relevance | Not a curriculum sequence; does not approve particular Baby Steps translations. |
| [NCDC Terminology Development Handbook](https://ncdc.go.ug/wp-content/uploads/2025/05/Terminology-Development-Handbook-Jan-2025_BOOK-WEB-FILE-1.pdf) | Official terminology handbook; document copyright/title date 2023 despite later URL | Ugandan local-language terminology | Direct terminology/governance relevance | Not an early-language scope-and-sequence; source counts of Ugandan languages differ, so this report avoids a definitive count. |
| [UNESCO Languages Matter](https://unesdoc.unesco.org/ark:/48223/pf0000392477) | Global policy guidance, 2025 | Multilingual education systems | Strong principle-level relevance | Global, not Uganda curriculum and not specific to ages 3–8 or mobile apps. |
| [UNESCO Mother Tongue and ECCE](https://unesdoc.unesco.org/ark:/48223/pf0000374419) | Global synthesis/report, 2020 | Mother tongue, cultural identity and ECCE | Relevant to belonging/access | Broad and not an effect estimate for Luganda/Runyankole app lessons. |
| [UNESCO/UNICEF multilingual classroom assessment guidance](https://www.unesco.org/en/articles/guidance-classroom-based-assessment-multilingual-learners-assessing-languages-literacies-and) | Guidance, 2024 | Multilingual learners; Asia-Pacific classroom focus | Useful assessment distinctions | Regional classroom guidance, not validated Baby Steps thresholds. |
| [UNESCO early-years family/pre-primary thematic report](https://www.unesco.org/en/articles/language-acquisition-early-years-childhood-role-family-and-pre-primary-education-thematic-report) | Global thematic report, 2023 | Family interaction and pre-primary language acquisition | Relevant to caregiver design | Broad synthesis; not Uganda- or app-specific. |
| [Council of Europe CEFR level descriptions](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions) | International reference framework/web resource | Foreign/additional-language proficiency, broad ages | Limited use for positive “can-do” wording and skill separation | A1–C2 must not be imposed on Ugandan children aged 3–8 or presented as Uganda's standard. |
| [What Works Clearinghouse foundational reading guide](https://ies.ed.gov/ncee/wwc/practiceguide/21) | US practice guide, 2016; revised 2019 | English literacy, kindergarten–grade 3 | Indirect for general literacy design | English grapheme/phoneme recommendations cannot be copied to Luganda or Runyankole orthographies. |
| [AERO spacing and retrieval guide](https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication) | Evidence synthesis/practice guide, 2021; updated 2024 | General memory and school learning, primary–secondary | Indirect support for delayed low-stakes review | Not preschool, Uganda or language-specific; no universal spacing interval follows. |
| [Thieme et al., foreign-language ECEC systematic review](https://pure.uva.nl/ws/files/88585903/The_effects_of_foreign_language_programmes_in_early_childhood_education_and_care_a_systematic_review.pdf) | Peer-reviewed systematic review, 2022; 32 articles | Ages 0–4, sometimes 5–7; mostly English as a foreign language | Relevant mainly to beginner/additional-language profiles | 27 of 32 studies concerned English; not home/heritage language and limited African evidence. |
| [Flack, Field & Horst shared-storybook meta-analysis](https://pubmed.ncbi.nlm.nih.gov/29595311/) | Peer-reviewed meta-analysis, 2018; 38 studies, 2,455 children | Preliterate/young children, roughly ages 2–10 | Moderate support for repeated, interactive story exposure | Not Uganda/language-specific; story reading alone is not proof of retained or productive vocabulary. |
| [Jago et al. oral language and early reading meta-analysis](https://doi.org/10.1016/j.edurev.2025.100680) | Peer-reviewed systematic review/meta-analysis, 2025; 72 longitudinal studies, 23,387 children | Preschool vocabulary/grammar predicting reading at formal-school entry | Supports early oral-language foundation | Predictive associations do not prescribe a Baby Steps sequence; sample languages/settings are not a direct validation for Uganda. |

### 10.2 Interpretation rules

- Uganda policy/framework statements are used for local direction, not a claim of product approval.
- “Mother tongue” is not assumed to match the app selection. A child may select a family, heritage, school or new language.
- Foreign-language ECEC findings apply most directly to beginners and least directly to home-language literacy development.
- English foundational-reading evidence informs questions to ask, not Luganda/Runyankole sound-letter content. Native-speaking linguists and early-literacy specialists must define that content.
- General retrieval/spacing evidence supports revisiting material after some delay, not an exact schedule, item count or mastery threshold for ages 3–8.
- CEFR contributes skill distinctions and child-friendly “can-do” phrasing only. The proposed architecture has no A1–C2 labels.

## 11. Research findings

### 11.1 Familiar language, multilingualism and cultural belonging

**Research finding:** Uganda's current ECCE policy says providers should communicate effectively with children in a familiar language during classroom learning, play-based learning and other ECCE provision. It also calls for appropriate curricula, methods, materials, special-needs provision and competency assessment. The policy applies to ages 0–6 and is broader than a digital language course. [MoES ECCE Policy, Standards and Guidelines](https://www.education.go.ug/wp-content/uploads/2026/05/ECCE-POLICY-2025-with-signatures-final.pdf)

**Research finding:** The NCDC ECD framework for ages 3–6 emphasizes relevance to children's language, customs and familiar environment; doing/play, repeated stories/songs and short activity periods are part of its child-centered design. The P1 Thematic Curriculum continues the familiar-theme approach and uses local language as the medium of instruction where practicable in lower primary. These are different documents for different stages and dates. [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf), [NCDC P1 Thematic Curriculum](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf)

**Research finding:** UNESCO's global multilingual guidance recommends learning in a language learners understand and coordinated engagement with families, communities, educators and language stakeholders. Its global scope means it supports the principle of language choice/understanding, not a specific Baby Steps language sequence. [UNESCO Languages Matter](https://unesdoc.unesco.org/ark:/48223/pf0000392477)

**Research finding:** UNESCO's 2020 mother-tongue/ECCE synthesis links familiar language with cultural identity and access in early childhood. It is global synthesis rather than a Luganda/Runyankole intervention study, so it supports belonging and participation as design goals, not an app effect claim. [UNESCO Mother Tongue and ECCE](https://unesdoc.unesco.org/ark:/48223/pf0000374419)

**Recommendation:** Ask at onboarding or parent settings—not during every child lesson—how the selected language relates to the child: home language, understood heritage language, beginner language or one of several daily languages. This profile should tune support and expectations, not limit access or silently switch content.

### 11.2 Oral language before and alongside literacy

**Research finding:** Jago et al.'s 2025 meta-analysis of 72 longitudinal studies (23,387 children) found moderate predictive relationships between preschool vocabulary/grammar and later reading comprehension, word reading and pseudoword reading. This supports investing in oral vocabulary and meaningful phrases before or alongside print. It does not prove that a tap card causes reading gains, and it does not define a Luganda/Runyankole teaching order. [Jago et al. (2025)](https://doi.org/10.1016/j.edurev.2025.100680)

**Research finding:** The foreign-language ECEC systematic review found additional-language gains without evidence of general harm to first language in the reviewed programmes; receptive outcomes were often stronger than productive outcomes, and sustained input plus flexible/play-based approaches were important themes. Most studies involved English and children 0–4 (sometimes 5–7), so the result is relevant to Baby Steps beginners but not direct evidence for Ugandan home-language literacy. [Thieme et al. (2022)](https://pure.uva.nl/ws/files/88585903/The_effects_of_foreign_language_programmes_in_early_childhood_education_and_care_a_systematic_review.pdf)

**Recommendation:** For pre-readers, make audio, image, gesture/caregiver action and meaning sufficient; print may be visible but should not be the gate. For early readers, explicitly connect a previously known spoken form to reviewed print. Listening, speaking opportunity, word recognition and reading should remain separate objective labels.

### 11.3 Listening, phonological awareness and pronunciation

**Research finding:** The US What Works Clearinghouse guide supports teaching children to notice/manipulate sound segments and connect them to letters as part of English K–3 foundational literacy. Its population and orthography make it indirect evidence only. [WWC Foundational Skills Guide](https://ies.ed.gov/ncee/wwc/practiceguide/21)

**Validation required:** Luganda and Runyankole/Runyankore phoneme inventories, syllable patterns, orthographic conventions, meaningful sound contrasts, letter order and appropriate child prompts must be defined by specialists in each language. Do not translate an English phonics sequence or invent minimal-pair distractors.

**Recommendation:** Separate four claims in content and analytics: “audio was available/played,” “the child selected an answer after audio,” “a caregiver invited the child to repeat,” and “speech was recorded/evaluated.” Only the first two currently exist, and only the selection is observed. Even that selection is not a valid listening measure when placeholder audio is used.

### 11.4 Vocabulary, context, repetition and stories

**Research finding:** The ECD framework and P1 thematic curriculum place learning within familiar, child-centered themes and active experiences. The shared-storybook meta-analysis supports target-word exposure within stories and dialogic interaction with young children. Together they favor small, coherent everyday themes, varied re-encounters and caregiver talk over isolated translation lists. The sources do not establish a universal new-word count. [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf), [NCDC P1 Thematic Curriculum](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf), [Flack et al. (2018)](https://pubmed.ncbi.nlm.nih.gov/29595311/)

**Recommendation:** Introduce a testably small set of words/phrases in a meaningful setting; repeat them through audio, picture/meaning recognition and a short contextual story; then revisit them in a later lesson with some supports reduced. Exact set size, repetition and spacing are field-test variables by age/profile, not standards asserted here.

**Recommendation:** Stories should prompt prediction, pointing, acting, retelling or a simple question. The app may record a multiple-choice response where supported; caregiver-observed retelling should be reported as optional practice unless a deliberately minimal caregiver confirmation is later approved.

### 11.5 Retrieval, spacing and mixed review

**Research finding:** AERO's synthesis supports low-stakes retrieval and spacing learning across lessons, with useful feedback and revisiting knowledge after time. Its primary/secondary general-memory evidence does not prescribe an interval or prove an effect for preschool local-language learning. [AERO Spacing and Retrieval](https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication)

**Recommendation:** Distinguish immediate recognition, same-session correction and delayed review. A correct choice after two wrong taps is valuable guided learning but is weaker evidence than a first-attempt response after time. Mixed review should begin with authored review lessons; automated `practice_mix` should wait for stable identities and trustworthy evidence.

**Recommendation:** Interleave only skills/content already taught, and introduce the smallest useful discrimination. Randomly mixing arbitrary items is not curriculum design. There is not enough direct evidence here to dictate an interleaving ratio for Baby Steps.

### 11.6 Play, motivation, assessment and caregiver participation

**Research finding:** The Uganda ECD framework and current ECCE package emphasize child-centered/play-based learning, familiar communication, safe/supportive environments and adult/community roles. The P1 curriculum describes observation/listening/work during normal activity rather than a separate early high-stakes exam. [MoES ECCE package](https://www.education.go.ug/wp-content/uploads/2026/05/ECCE-POLICY-2025-with-signatures-final.pdf), [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf), [NCDC P1 Thematic Curriculum](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf)

**Research finding:** UNESCO/UNICEF multilingual assessment guidance recommends distinguishing language modalities and using assessment formatively and in an assets-oriented way. Its Asia-Pacific classroom context means Baby Steps should borrow the distinctions, not its local instruments or thresholds. [UNESCO/UNICEF multilingual assessment guidance](https://www.unesco.org/en/articles/guidance-classroom-based-assessment-multilingual-learners-assessing-languages-literacies-and)

**Research finding:** UNESCO's 2023 early-years thematic report emphasizes language interactions in families and pre-primary settings. This global report supports designing feasible caregiver talk around app content; it does not show that every household can or should supervise every lesson. [UNESCO family/pre-primary thematic report](https://www.unesco.org/en/articles/language-acquisition-early-years-childhood-role-family-and-pre-primary-education-thematic-report)

**Research finding:** The NCDC conference proceedings report an ECD Framework implementation study using 2022 field data and 377 respondents, with implementation gaps and needs around support, practical training, materials and ICT. This is a conference research/review document, not a binding standard; it supports field testing and caregiver/educator support rather than any particular mechanic or score. [NCDC Curriculum Development Conference Proceedings](https://ncdc.go.ug/wp-content/uploads/2025/01/conference_compressed-compressed.pdf)

**Recommendation:** Use warm, specific, low-stakes feedback; preserve review after completion; never remove a safe activity as punishment. Parent history should state observable facts—“finished,” “selected on first try,” “needed three selections,” “viewed a story”—rather than “knows,” “speaks” or “mastered” without evidence.

**Recommendation:** For ages 3–5, aim for short activity units that can stop cleanly after one or a few interactions, reflecting the ECD framework's concern for short attention. The framework mentions roughly 15-minute attention in context; that is an upper contextual observation, not a required app session length. Field testing should find shorter usable slices.

### 11.7 Songs, rhythm, rhyme and movement

**Research finding:** NCDC's ECD framework uses songs, rhyme, rhythm, action, stories and play as repeated learning modes for ages 3–6. [NCDC ECD Learning Framework](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf)

**Repository finding:** Baby Steps currently has no Learning Hub mechanic that models a song/rhyme sequence, captures tapping to rhythm or observes singing. Audio playback can host exposure, but should not be relabelled an interactive song mechanic.

**Recommendation:** Treat a future song/rhyme as optional, reviewed audio plus caregiver movement/repetition first. Avoid scoring singing or rhythmic accuracy without a separately justified, privacy-safe observable mechanism.

## 12. Uganda-specific considerations

### 12.1 Language and learner context

**Repository finding:** The actual canonical codes are `lg` and `nyn`; the UI currently labels them Luganda/Oluganda and Runyankole/Runyankole, with aliases for Runyankole and Runyankore. The Learning Hub has only `lg`; the generic Games repository has smaller `nyn` samples. These facts do not resolve whether future public naming should be Runyankole, Runyankore, Runyankore-Rukiga or another convention.

**Research finding:** NCDC's translation and terminology guidance treats translation/terminology as multidisciplinary work involving native speakers, linguists, subject specialists and users, with cultural, phonological and social-acceptability testing. The sources themselves illustrate why a simple language count or one centrally invented term is unsafe. [NCDC Translation Guidelines](https://ncdc.go.ug/wp-content/uploads/2025/06/FINAL-NCDC-TRANSLATION-GUIDELINES-JULY-2024_Web-file.pdf), [NCDC Terminology Handbook](https://ncdc.go.ug/wp-content/uploads/2025/05/Terminology-Development-Handbook-Jan-2025_BOOK-WEB-FILE-1.pdf)

**Recommendation:** Store a canonical application code separately from display name, endonym, supported variants and audio/text variant. Do not share word forms, sound rules or progression between `lg` and `nyn`. A translation can share a conceptual objective while using language-specific wording, distractors, ordering and examples.

**Repository finding:** Luganda and Runyankole are already separate content branches with different coverage: the Hub has only `lg`, while generic `nyn` games use small sample datasets and a smaller menu. The repository does not contain reviewed linguistic documentation from which this audit could state their grammatical, phonological or orthographic differences safely.

**Validation required:** Representative speakers must decide the displayed language name, orthography standard, acceptable regional/dialect forms, how variants are taught, and whether audio/text combinations match. Corrections should preserve source and reviewer history.

### 12.2 Home, community and selected language

A selected language may be:

- the child's dominant home language;
- understood from grandparents/community but rarely spoken;
- one of several urban family languages;
- used in the community or school but not at home;
- new to the child.

**Recommendation:** Do not infer profile from geography, parent identity or language selection. Let the parent optionally describe exposure, and allow later correction. For a receptive heritage learner, recognize comprehension progress while offering unmeasured speaking prompts. For a beginner, use more meaning support and audio repetition. For a home-language speaker, do not force basic spoken vocabulary as if the language is foreign; connect oral knowledge to stories, concepts and age-appropriate literacy.

### 12.3 Culture and representation

**Repository finding:** Cards and Puzzle are explicitly Buganda-coupled, while product framing is Ugandan. The current content also contains cultural stories/objects whose production readiness is not established.

**Recommendation:** Every cultural object/story/image should carry community scope (for example, Buganda rather than “Uganda” where applicable), provenance, reviewer, permissions and variant notes. Include everyday contemporary contexts alongside heritage material. Avoid one “traditional” image for clothing, homes, food, gender roles or family structure.

**Validation required:** Review stories, customs, songs, clothing, food, roles, practices, sacred/restricted material and image/audio permissions with people from the represented community. Children/families should be able to recognize themselves without the app presenting one group as the country-wide norm.

### 12.4 Offline, devices, audio and accessibility

**Repository finding:** Bundled Hub JSON and assets are strong for offline use; progress saves locally before sync. Future remote content and URI images lack a complete versioned offline-asset lifecycle. Native-speaker audio coverage is currently small and fallback cues can conceal missing pronunciation.

**Recommendation:** Publish an atomic language bundle with an asset manifest; preflight disk/network, download resumably, verify checksum/type/duration, activate only when the bundle and required assets are complete, and retain the prior version. Offer explicit download sizes and Wi-Fi choices to parents. Text and images must remain usable when audio fails, but listening items must be marked unavailable rather than pretending a generic cue is target audio.

**Validation required:** Test with lower-cost Android devices, intermittent connectivity, shared devices, low storage and representative assistive needs. Include large touch targets, non-color feedback, audio replay, captions/text, image descriptions where meaningful, reduced motion, readable contrast, simple language and a caregiver route for children who cannot use a mechanic. Disability access must be reviewed with users; no single fallback covers hearing, vision, motor, cognitive and language needs.

## 13. Learner profiles and age bands

| Profile | Likely starting strengths | Needed support | Evidence expectation that differs |
|---|---|---|---|
| Home-language speaker developing literacy | Spoken vocabulary/context may be rich | Reviewed print, sound awareness, story/literacy connection | Do not treat basic recognition as new oral-language mastery. |
| Heritage learner: understands some, speaks little | Receptive familiarity, family context | Safe production invitations, repeated audio, caregiver dialogue | Track comprehension separately; speaking remains unobserved today. |
| Beginner with minimal exposure | Few established forms | High-context image/action, slower/repeated audio, few distinct choices | Early success is supported recognition, not recall. |
| Bilingual/multilingual child | Flexible language resources; uneven domain vocabulary | Clear language boundaries plus permission to connect meanings | Avoid deficit labels and wrong-language fallback. |
| Younger pre-reader, approximately 3–5 | Oral, visual, play/action learning | Audio/image/gesture, short shared activities, minimal reading demand | Completion should reflect participation/selection, not literacy. |
| Older early reader, approximately 6–8 | Growing print/attention and metalinguistic awareness | Spoken-to-print link, reviewed orthography, contextual reading | Can add written recognition/guided construction; still no adult CEFR levels. |

**Repository finding:** The current app stores child and language but no learner profile or age-band intent in Learning Hub content/progress. Current lessons therefore silently use one support level.

**Recommendation:** Make profile/age a curriculum/product decision before content production. Initially, publish separately labelled “pre-reader/shared” and “early-reader” pathways or support variants rather than a complex adaptive engine. A parent should be able to choose/revise the suitable path; children should not be permanently classified by early errors.

## 14. Proposed curriculum model

### 14.1 Architecture

```text
Language bundle
  -> learner-support pathway (pre-reader/shared or early-reader)
    -> thematic stage/unit
      -> 4–6 short connected lessons
        -> authored items with objective + vocabulary references
      -> authored review lesson
    -> later mixed review across completed units
  -> optional curriculum-linked games/stories/animations/coloring
```

**Recommendation:** A **stage** should be a coherent everyday/cultural theme with explicit objectives and prerequisites, not a claim of global proficiency. A **lesson** should have one main observable objective and a short sequence. An **item** should be a presentation or response opportunity tied to stable curriculum identities. **Review lessons** should be authored first; future rule-based practice may select only reviewed, version-compatible items.

### 14.2 Evaluation of the seven-step proposal

| Proposed step | Evaluation | Current suitable mechanics | Evidence possible today | Key caveat |
|---|---|---|---|---|
| 1. Exposure | Keep as a lesson function | Tap to Learn, Cultural Card, Story Bite | Viewed/continued, audio replay | Exposure is not acquisition. |
| 2. Recognition | Keep and distinguish audio/image/print | Listen and Choose, Match Word Picture, Choose Correct Word | Eventually correct + attempts | First response is not separately stored in all useful detail. |
| 3. Guided recall | Use selectively, mainly older readers | Word Game is nearest; Mini Quiz remains recognition | Weak task completion | Current Hub has no true recall input; Word distractors are disabled. |
| 4. Independent recall | Treat as future/caregiver-observed, not a required digital level now | None | None | Do not fabricate evidence. |
| 5. Contextual use | Keep as story/everyday application | Story Bite, Cultural Card; Generic Story quiz | Viewing; supplied-choice answer elsewhere | Retell/spoken use is unobserved. |
| 6. Mixed review | Keep as authored review first | Mini Quiz and varied choice items | Eventually-correct results/attempts | `practice_mix` is not implemented; random mixing is insufficient. |
| 7. Mastery/application | Replace with evidence summary, not a universal final screen | No current mechanic fully supports it | Technical completion only | Requires agreed multi-source/delayed evidence and/or caregiver/educator observation. |

**Recommendation:** Use the sequence as a **set of learning functions**, not seven mandatory levels for every word. A pre-reader beginner may cycle exposure -> audio/image recognition -> contextual story -> delayed recognition. A home-language early reader may begin from known oral meaning -> reviewed print -> guided construction -> contextual reading. Independent speech may be invited throughout without being automatically scored.

### 14.3 A practical unit loop

1. **Connect and expose:** familiar setting, two or more senses where accessible, meaning made clear.
2. **Discriminate and recognize:** select heard or written forms from initially distinct alternatives.
3. **Retrieve with support:** reduce image/English support or use a prompt, but label current supplied-choice evidence honestly.
4. **Use in context:** short story, phrase, action, cultural/everyday scenario and caregiver talk.
5. **Review after time:** revisit taught material with varied order and some old/new mixing.

**Recommendation:** This five-function loop is operationally closer to the current renderer set. It allows missing production evidence to remain explicit and lets ages/profiles skip inappropriate print demands.

**Recommendation:** Write objectives as positive, observable “can-do” statements—such as “can select the pictured object after hearing the reviewed word”—while keeping listening, spoken opportunity, recognition and reading distinct. This borrows the CEFR's useful descriptor style only; it does not assign A1–C2 levels or import an adult/additional-language standard into Uganda ECCE. [Council of Europe CEFR descriptions](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions)

### 14.4 Difficulty and progression rules

**Recommendation:** Difficulty should be authored across several dimensions, not represented only by stage order:

- move from concrete/familiar meanings toward less imageable meanings;
- move from two very distinct options toward more plausible same-domain distractors;
- progress from image + audio + translation toward fewer supports where appropriate;
- connect known spoken forms to print only in a reviewed literacy pathway;
- move from one item/objective per screen toward short mixed review;
- revisit older vocabulary in new everyday/story contexts;
- use first-response and delayed evidence separately from eventual correction.

Exact new-word counts, old/new ratios, lesson lengths and mastery thresholds should be documented as testable hypotheses during curriculum specification and field testing. They should vary with age, profile, task and language; this evidence review does not justify a universal number.

**Recommendation:** Incorrect answers should trigger neutral feedback, replay/re-presentation and another try. Repeated errors should recommend a prerequisite/review opportunity later, not lock the child in an endless loop or erase completion. Completed lessons should remain reviewable, as they are today.

### 14.5 Evidence model

| Evidence statement | Can current app support it? | Safe wording today |
|---|---|---|
| Item viewed / pages finished | Yes | “Viewed” / “finished the story pages.” |
| Eventually selected configured answer | Yes | “Completed after N selections.” |
| Selected correctly first time | Derivable only when attempts is consistently meaningful | “Selected on first try” for a validated response item. |
| Recognized after a delay | Not reliably; no review scheduling/interval identity | Future evidence. |
| Recalled without answer choices | No | Do not claim. |
| Spoke/repeated a word | No | “Invitation to repeat was shown,” at most. |
| Pronounced accurately | No | Do not claim. |
| Used language spontaneously/contextually | No | Caregiver/educator observation only. |
| Mastered an objective | No agreed rule | Do not equate with completion or score. |

### 14.6 Role of supporting areas

| Area | Required core path | Optional reinforcement / reward | Caregiver-supported use | Future possibility and boundary |
|---|---|---|---|---|
| Games | No audited game should be universally required | Varied recognition, number words, guided print, memory or cultural replay as appropriate | Adult may name objects/count/talk during play | Curriculum-linked decks after stable IDs; game completion is not automatically mastery |
| Stories | A short Hub story may be an authored contextual lesson | Separate Stories can extend exposure and enjoyment | Prediction, pointing, acting and retelling | Link reviewed story/objective IDs and questions; distinguish page completion from comprehension |
| Animations | Not required under current evidence | Meaningful audio/visual context and reward | Pause, imitate actions, discuss | Reviewed captions/audio/objectives; watching remains exposure unless a response is observed |
| Coloring | Not required | Calm replay, fine-motor engagement and image familiarity | Adult names/discusses the item | Optional curriculum tag/caption; coloring completion is not word knowledge |
| Achievements | May celebrate core participation but cannot define it | Motivation, milestones and replay invitations | Adults can celebrate effort | Use evidence-honest copy; never award “speaker/mastery” from technical completion |
| Parent activity history | Not a child curriculum blocker | Shows what was finished/retried/reviewed | Enables a simple offline follow-up conversation | Objective/evidence summaries after schema work; avoid rankings and diagnostic language |
| Future parent recommendations | None today | Suggest a relevant story/game/review | Offer specific, feasible shared prompts | Transparent rule-based suggestions after stable identities; no opaque AI profile or unnecessary child data |

**Recommendation:** Required curriculum success must remain achievable without completing an unrelated game, animation or coloring activity and without a parent being online. Supporting areas can deepen context and repetition, but their progress should retain the evidence meaning of the actual interaction.

## 15. Objective-to-mechanic mapping

| Curriculum objective | Learner action | Suitable Hub mechanic | Suitable game/support | Evidence captured today | Evidence not captured | Age considerations | Validation needed |
|---|---|---|---|---|---|---|---|
| First exposure to a word | Look, listen, optionally repeat | `tap_to_learn` | Learning Game card | Continue; replay count | Attention, understanding, repetition | 3–5 audio/image first; 6–8 add reviewed print | Word, image, audio, meaning |
| Recognize a spoken word | Hear and choose meaning/image/form | `listen_and_choose` | None reliably | Eventually correct; option taps | First wrong identity, durable listening | 3–5 few visual choices; 6–8 closer distractors | Native audio and distractors |
| Recognize a written word | Choose known written form | `choose_correct_word` | Learning Game quiz | Eventually correct; taps | Reading strategy, independent recall | Mainly reviewed early-reader path | Orthography and prompt language |
| Match word, sound and image | Hear/see target and select image | `listen_and_choose` or `match_word_picture` | Learning Game | Eventually correct | Three-way integration unless audio actually present | Pre-readers need audio; older can reduce translation | Unambiguous images/audio |
| Recall vocabulary with support | Respond to clue with partial support | No true Hub recall; closest is choices | Word Game | Task completion | Invalid choices, answer production | Mainly 6–8 | Language-specific spelling design |
| Recall vocabulary with reduced support | Produce without full answer shown | None | Future revised Word Game | None | Recall itself | 6–8 or caregiver shared | Input method, orthography, accessibility |
| Understand a simple phrase | Hear/read phrase and choose meaning/action | Future content using `listen_and_choose` / quiz | Acting with caregiver | Supplied-choice completion if authored | Natural comprehension/transfer | Action/image for 3–5; print optional 6–8 | Natural phrase, context, audio |
| Follow an everyday instruction | Perform/choose requested action | Closest: `listen_and_choose` | Caregiver activity | Option selection only | Actual performed action | Strong shared-play fit for 3–5 | Safety and culturally natural wording |
| Sequence a short story | Arrange events | None; `story_bite` only presents order | None | Pages finished | Child-created sequence | 3–5 use 2–3 pictures; 6–8 more text | New mechanic/product decision |
| Answer a story question | Choose after story | `mini_quiz` (locked example) | Generic Stories quiz | Eventually correct aggregate | First response by question in Hub; explanation/retell | Spoken/image questions for 3–5 | Question validity and story dependency |
| Retell a story | Tell adult what happened | `story_bite` prompt only | Caregiver-supported | Nothing | Words, sequence, comprehension | Developmentally variable | Educator rubric; privacy-minimal observation |
| Notice sounds or syllables | Identify/repeat/segment reviewed forms | No dedicated mechanic; possible future listening choices | Rhythm/song future | At most option selection | Actual segmentation/production | Oral/playful before print | Language-specific linguistic design |
| Attempt oral production | Repeat/name/respond aloud | Tap/Story/Cultural prompt | Caregiver-supported | Nothing about speech | Whether spoken and quality | Safe, non-punitive all ages | Native model; do not auto-assess |
| Recognize a number word | Count and select numeric concept | Possible Hub choice items | Counting Game | Correct selection after retries | Spoken number recognition if generic sound | Concrete objects for 3–5 | Number forms/audio/currency relevance |
| Use language in cultural/everyday context | Discuss, point, act or choose | `cultural_card`, `story_bite`, quiz | Cards; Puzzle as visual context | Viewing/choice only | Discussion, cultural understanding | Adult mediation especially 3–5 | Community scope/accuracy/permissions |
| Learn through song/rhyme | Listen, move, repeat | No dedicated mechanic | Future animation/audio | Playback only if repurposed | Rhythm/singing/learning | Strong 3–5 potential | Song rights, language/culture, accessibility |
| Mixed review | Answer varied previously taught items | Authored varied lessons; `mini_quiz` | Learning/Counting/Cards selectively | Eventually-correct/taps | Scheduled interval, stable objective aggregation | Keep short; support by profile | Review set and evidence rules |
| Formative check | Respond without new teaching cue | Choice/quiz with validated items | Curriculum-linked game only if evidence fixed | Completion and attempts | Reliable first response per question, recall | Low stakes for all | Educator-defined interpretation |
| Mastery/application | Use knowledge later and in new context | No single current mechanic | Not safely delegated to a game | Technical completions only | Durable, independent, transferable use | Multi-source evidence | Educator/curriculum rule and field evidence |

## 16. Learning Hub-to-Games mapping

| Game | Hub knowledge it could reinforce | Useful point | Unlock or free play? | Future content contract | Mastery contribution | Duplication risk | Recommended role |
|---|---|---|---|---|---|---|---|
| Learning Game | Introduced words, images, meanings and audio | After first exposure; later recognition review | Keep free; optionally highlight curriculum set after introduction | Stable lexeme/objective IDs, language/variant, prompt/meaning, reviewed image/audio, introduced/review status | Not today; later only objective-specific first/delayed response evidence | High: duplicates Tap, Choose and some Match | Optional guided practice and varied recognition |
| Counting Game | Number words, quantities and relevant currency concepts | In a number-themed unit after forms are introduced | Keep free; no general-language gate | Stable number concept + language-form IDs, reviewed labels/audio/images, level/support | Only number objective if evidence is corrected | Medium: could duplicate Hub number choices | Optional domain reinforcement / numeracy |
| Word Game | Known word forms and spelling/orthographic patterns | Older early readers after oral meaning and print introduction | Keep free; curriculum set should be age/profile filtered | Stable lexeme ID, grapheme units, support/difficulty, allowed errors/hints, reviewed clue/image/audio | Not in current form; future guided-construction evidence only | Medium: overlaps future recall/print work | Optional older-reader guided practice |
| Cards Matching | Taught concepts, cultural objects or word-image pairs | After exposure, for replay | Remain freely playable | Pair concept/lexeme ID, language, sides/assets/audio/info, culture scope/provenance/status | No; matching/memory should not prove language mastery | Medium: overlaps Match Word Picture but changes memory demand | Optional reward, memory and cultural reinforcement |
| Puzzle Game | A reviewed cultural setting used in a story/unit | Any time as cultural exploration | Remain free; optional contextual link | Cultural concept ID, language caption/audio, image provenance/permission/reviewer | No | Low language duplication; high risk of irrelevant required task | Optional reward/replay and cultural visual exploration |

**Recommendation:** Curriculum progress may surface “Try this game” links or a relevant game deck, but should not make game completion compulsory. The games should remain useful to children outside a currently selected unit and must never silently import Luganda data into `nyn` sessions.

## 17. Placeholder curriculum stage

This example is **not production content**. All target-language tokens, translations, audio and cultural wording are unverified placeholders. It demonstrates how current mechanics could form one connected stage without asserting a real Luganda or Runyankole sequence.

**Assumptions (design hypothesis):** pre-reader/shared pathway, approximately ages 3–5; beginner or receptive heritage learner; one familiar “Things we use at home” micro-theme; three concrete vocabulary concepts. A home-language speaker would need a different objective, likely richer phrases/story rather than basic word exposure.

**Objectives:** connect three spoken forms with meanings/images; recognize them after audio and from print only as an optional exposure; encounter a reviewed simple phrase in context; revisit the set in mixed supplied-choice review. No speaking mastery or independent recall is claimed.

| Lesson | Vocabulary / context | Item mechanics | Child experience | Required assets | Result/completion expected today | Optional reinforcement | Validation required |
|---|---|---|---|---|---|---|---|
| 1. Meet three home words | Introduce `CONCEPT_HOME_01..03` | Three `tap_to_learn` items | See, hear, optionally point/repeat, continue | 3 reviewed images, 3 native audio clips | Three non-graded results; replays only | Coloring of one safe object; Learning Game later | Concepts, forms, meaning, images, speaker/audio |
| 2. Listen and find | Review all three | Two `listen_and_choose` items | Hear one word, choose picture/text among three | Reviewed audio and same image identities | Eventually correct + option-tap count | Caregiver hides/points to household-safe examples | Audio/option equivalence and distractors |
| 3. Match word and picture | Review all three | Two `match_word_picture` items | Select image for displayed target | Images; optional audio is not in current match task | Eventually correct + option taps | Cards deck if curriculum-driven | Pre-reader text dependency, image ambiguity |
| 4. Meaning check with support | Review all; reduce image support | Two `choose_correct_word` items | Select written form for a meaning | Reviewed text; no required image/audio | Eventually correct + option taps | Learning Game recognition set | Whether print task belongs in this age/profile path |
| 5. Words in a tiny home story | Review all; one simple phrase placeholder | One `story_bite` with 3 pages | Listen/view, point or act with caregiver, finish | 3 images and page audio strongly recommended | Non-graded page completion; no observed retell | Animation or caregiver retell | Natural phrase/story, family/culture portrayal, permissions |
| 6. Friendly review | Review all in varied order | One `mini_quiz` with 3 questions | Answer short recognition questions, feedback/retry | Current quiz is text-only; shared reading required | One eventually-correct aggregate + total taps | Counting only if a number objective was actually introduced; Cards optional; Puzzle unsuitable here | Question/option accessibility and formative interpretation |

**Progress connection:** the current system would store six lesson completions, item results and a stage-complete row once all six are startable/finished. That means “finished the placeholder Home Words stage,” not “mastered three words.” A future evidence summary could distinguish exposure, first-response recognition and delayed review by stable concept/objective ID.

**Achievement connection:** existing generic first/three-lesson achievements could trigger. No new achievement is proposed. If a stage achievement were later added, it should celebrate participation/completion rather than language mastery.

**Five-game fit:** Learning Game is a plausible optional recognition set after Lesson 1; Cards could later match the three reviewed concepts but should not be required; Word Game is inappropriate for this pre-reader assumption; Counting is unrelated unless the stage explicitly teaches number concepts; Puzzle is unrelated to these word objectives and should remain free cultural play rather than be forced into the stage.

**Other optional reinforcement:** A reviewed short animation could place the same three concepts in the approved home scenario, and a coloring page could reuse one approved object image with a caregiver naming prompt. Neither should be required or counted as recognition/recall; the current repository has no shared concept IDs connecting those areas to this example.

## 18. Current-schema JSON example

The following is a documentation-only example inside this report. It is not application content and must not be copied into the live bundle until the curriculum, language, culture and assets have completed review. It uses only current top-level, stage, lesson, item and `metadata` fields. `TARGET_LANGUAGE_*`, `TARGET_IMAGE_*` and `TRANSLATION_REVIEW_REQUIRED` are intentionally invalid production values.

```json
{
  "version": "EXAMPLE_ONLY_NOT_FOR_RUNTIME",
  "defaultLanguage": "lg",
  "languages": {
    "lg": {
      "languageCode": "lg",
      "displayName": "Luganda",
      "localName": "Oluganda",
      "pathTitle": "DOCUMENTATION_ONLY_PATH_TITLE",
      "stages": [
        {
          "id": "example-home-words-v1",
          "order": 1,
          "stageNumber": 1,
          "title": "Example: Things we use at home",
          "description": "Documentation-only structural example with unverified target-language placeholders.",
          "imageKey": "TARGET_IMAGE_STAGE",
          "status": "preview",
          "readiness": "placeholder",
          "estimatedMinutes": 12,
          "lessonCount": 6,
          "isPractice": false,
          "isLocked": false,
          "mechanics": [
            "tap_to_learn",
            "listen_and_choose",
            "match_word_picture",
            "choose_correct_word",
            "story_bite",
            "mini_quiz"
          ],
          "learningGoals": [
            "EXAMPLE_ONLY: encounter three reviewed home-word concepts",
            "EXAMPLE_ONLY: recognize two words after reviewed audio",
            "EXAMPLE_ONLY: revisit the words in a short context"
          ],
          "placeholderMessage": "All target-language values and assets require review.",
          "metadata": {
            "documentationOnly": true,
            "ageBandHypothesis": "3-5 shared/pre-reader",
            "learnerProfileHypothesis": "beginner or receptive heritage learner"
          },
          "lessons": [
            {
              "id": "example-home-exposure-v1",
              "title": "Meet three home words",
              "description": "Documentation-only exposure lesson.",
              "mechanic": "tap_to_learn",
              "order": 1,
              "isStartable": true,
              "readiness": "placeholder",
              "metadata": {
                "validation": "linguist, native speaker, educator, cultural and asset review required"
              },
              "items": [
                {
                  "id": "example-home-word-01-exposure",
                  "mechanic": "tap_to_learn",
                  "order": 1,
                  "word": "TARGET_LANGUAGE_WORD_01",
                  "localText": "TARGET_LANGUAGE_WORD_01",
                  "translation": "TRANSLATION_REVIEW_REQUIRED_01",
                  "englishText": "TRANSLATION_REVIEW_REQUIRED_01",
                  "imageKey": "TARGET_IMAGE_KEY_01",
                  "audioKey": "TARGET_LANGUAGE_AUDIO_KEY_01",
                  "audioAsset": "TARGET_LANGUAGE_AUDIO_01",
                  "readiness": "placeholder"
                },
                {
                  "id": "example-home-word-02-exposure",
                  "mechanic": "tap_to_learn",
                  "order": 2,
                  "word": "TARGET_LANGUAGE_WORD_02",
                  "localText": "TARGET_LANGUAGE_WORD_02",
                  "translation": "TRANSLATION_REVIEW_REQUIRED_02",
                  "englishText": "TRANSLATION_REVIEW_REQUIRED_02",
                  "imageKey": "TARGET_IMAGE_KEY_02",
                  "audioKey": "TARGET_LANGUAGE_AUDIO_KEY_02",
                  "audioAsset": "TARGET_LANGUAGE_AUDIO_02",
                  "readiness": "placeholder"
                },
                {
                  "id": "example-home-word-03-exposure",
                  "mechanic": "tap_to_learn",
                  "order": 3,
                  "word": "TARGET_LANGUAGE_WORD_03",
                  "localText": "TARGET_LANGUAGE_WORD_03",
                  "translation": "TRANSLATION_REVIEW_REQUIRED_03",
                  "englishText": "TRANSLATION_REVIEW_REQUIRED_03",
                  "imageKey": "TARGET_IMAGE_KEY_03",
                  "audioKey": "TARGET_LANGUAGE_AUDIO_KEY_03",
                  "audioAsset": "TARGET_LANGUAGE_AUDIO_03",
                  "readiness": "placeholder"
                }
              ]
            },
            {
              "id": "example-home-listen-v1",
              "title": "Listen and find",
              "description": "Documentation-only spoken-word recognition lesson.",
              "mechanic": "listen_and_choose",
              "order": 2,
              "isStartable": true,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "example-home-word-01-listen",
                  "mechanic": "listen_and_choose",
                  "order": 1,
                  "promptText": "PROMPT_REVIEW_REQUIRED_LISTEN_AND_FIND",
                  "audioKey": "TARGET_LANGUAGE_AUDIO_KEY_01",
                  "audioAsset": "TARGET_LANGUAGE_AUDIO_01",
                  "correctOptionId": "home-concept-01",
                  "options": [
                    {
                      "id": "home-concept-01",
                      "order": 1,
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01",
                      "imageKey": "TARGET_IMAGE_KEY_01"
                    },
                    {
                      "id": "home-concept-02",
                      "order": 2,
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02",
                      "imageKey": "TARGET_IMAGE_KEY_02"
                    },
                    {
                      "id": "home-concept-03",
                      "order": 3,
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03",
                      "imageKey": "TARGET_IMAGE_KEY_03"
                    }
                  ],
                  "readiness": "placeholder"
                },
                {
                  "id": "example-home-word-02-listen",
                  "mechanic": "listen_and_choose",
                  "order": 2,
                  "promptText": "PROMPT_REVIEW_REQUIRED_LISTEN_AND_FIND",
                  "audioKey": "TARGET_LANGUAGE_AUDIO_KEY_02",
                  "audioAsset": "TARGET_LANGUAGE_AUDIO_02",
                  "correctOptionId": "home-concept-02",
                  "options": [
                    {
                      "id": "home-concept-01",
                      "order": 1,
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01",
                      "imageKey": "TARGET_IMAGE_KEY_01"
                    },
                    {
                      "id": "home-concept-02",
                      "order": 2,
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02",
                      "imageKey": "TARGET_IMAGE_KEY_02"
                    },
                    {
                      "id": "home-concept-03",
                      "order": 3,
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03",
                      "imageKey": "TARGET_IMAGE_KEY_03"
                    }
                  ],
                  "readiness": "placeholder"
                }
              ]
            },
            {
              "id": "example-home-picture-match-v1",
              "title": "Match words and pictures",
              "description": "Documentation-only association lesson.",
              "mechanic": "match_word_picture",
              "order": 3,
              "isStartable": true,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "example-home-word-01-picture-match",
                  "mechanic": "match_word_picture",
                  "order": 1,
                  "promptText": "PROMPT_REVIEW_REQUIRED_MATCH",
                  "targetText": "TARGET_LANGUAGE_WORD_01",
                  "targetEnglishText": "TRANSLATION_REVIEW_REQUIRED_01",
                  "correctOptionId": "home-image-01",
                  "options": [
                    {
                      "id": "home-image-01",
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01",
                      "imageKey": "TARGET_IMAGE_KEY_01"
                    },
                    {
                      "id": "home-image-02",
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02",
                      "imageKey": "TARGET_IMAGE_KEY_02"
                    },
                    {
                      "id": "home-image-03",
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03",
                      "imageKey": "TARGET_IMAGE_KEY_03"
                    }
                  ],
                  "readiness": "placeholder"
                },
                {
                  "id": "example-home-word-03-picture-match",
                  "mechanic": "match_word_picture",
                  "order": 2,
                  "promptText": "PROMPT_REVIEW_REQUIRED_MATCH",
                  "targetText": "TARGET_LANGUAGE_WORD_03",
                  "targetEnglishText": "TRANSLATION_REVIEW_REQUIRED_03",
                  "correctOptionId": "home-image-03",
                  "options": [
                    {
                      "id": "home-image-01",
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01",
                      "imageKey": "TARGET_IMAGE_KEY_01"
                    },
                    {
                      "id": "home-image-02",
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02",
                      "imageKey": "TARGET_IMAGE_KEY_02"
                    },
                    {
                      "id": "home-image-03",
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03",
                      "imageKey": "TARGET_IMAGE_KEY_03"
                    }
                  ],
                  "readiness": "placeholder"
                }
              ]
            },
            {
              "id": "example-home-word-check-v1",
              "title": "Meaning check with support",
              "description": "Documentation-only supplied-choice print lesson.",
              "mechanic": "choose_correct_word",
              "order": 4,
              "isStartable": true,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "example-home-word-01-check",
                  "mechanic": "choose_correct_word",
                  "order": 1,
                  "promptText": "Which reviewed word matches TRANSLATION_REVIEW_REQUIRED_01?",
                  "questionText": "TRANSLATION_REVIEW_REQUIRED_01",
                  "correctOptionId": "home-word-01",
                  "options": [
                    {
                      "id": "home-word-01",
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01"
                    },
                    {
                      "id": "home-word-02",
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02"
                    },
                    {
                      "id": "home-word-03",
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03"
                    }
                  ],
                  "readiness": "placeholder"
                },
                {
                  "id": "example-home-word-02-check",
                  "mechanic": "choose_correct_word",
                  "order": 2,
                  "promptText": "Which reviewed word matches TRANSLATION_REVIEW_REQUIRED_02?",
                  "questionText": "TRANSLATION_REVIEW_REQUIRED_02",
                  "correctOptionId": "home-word-02",
                  "options": [
                    {
                      "id": "home-word-01",
                      "localText": "TARGET_LANGUAGE_WORD_01",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_01"
                    },
                    {
                      "id": "home-word-02",
                      "localText": "TARGET_LANGUAGE_WORD_02",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_02"
                    },
                    {
                      "id": "home-word-03",
                      "localText": "TARGET_LANGUAGE_WORD_03",
                      "englishText": "TRANSLATION_REVIEW_REQUIRED_03"
                    }
                  ],
                  "readiness": "placeholder"
                }
              ]
            },
            {
              "id": "example-home-story-v1",
              "title": "Words in a tiny home story",
              "description": "Documentation-only contextual story.",
              "mechanic": "story_bite",
              "order": 5,
              "isStartable": true,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "example-home-story-pages",
                  "mechanic": "story_bite",
                  "order": 1,
                  "title": "EXAMPLE_STORY_TITLE_REVIEW_REQUIRED",
                  "instructions": "Listen or read together. Point, act, and talk about the pictures.",
                  "pages": [
                    {
                      "id": "example-home-story-page-01",
                      "bodyText": "TRANSLATION_REVIEW_REQUIRED_STORY_PAGE_01",
                      "localText": "TARGET_LANGUAGE_STORY_PAGE_01",
                      "imageKey": "TARGET_STORY_IMAGE_KEY_01",
                      "audioKey": "TARGET_STORY_AUDIO_KEY_01",
                      "audioAsset": "TARGET_STORY_AUDIO_01"
                    },
                    {
                      "id": "example-home-story-page-02",
                      "bodyText": "TRANSLATION_REVIEW_REQUIRED_STORY_PAGE_02",
                      "localText": "TARGET_LANGUAGE_STORY_PAGE_02",
                      "imageKey": "TARGET_STORY_IMAGE_KEY_02",
                      "audioKey": "TARGET_STORY_AUDIO_KEY_02",
                      "audioAsset": "TARGET_STORY_AUDIO_02"
                    },
                    {
                      "id": "example-home-story-page-03",
                      "bodyText": "TRANSLATION_REVIEW_REQUIRED_STORY_PAGE_03",
                      "localText": "TARGET_LANGUAGE_STORY_PAGE_03",
                      "imageKey": "TARGET_STORY_IMAGE_KEY_03",
                      "audioKey": "TARGET_STORY_AUDIO_KEY_03",
                      "audioAsset": "TARGET_STORY_AUDIO_03"
                    }
                  ],
                  "reflectionPrompt": "CAREGIVER_PROMPT_REVIEW_REQUIRED",
                  "readiness": "placeholder"
                }
              ]
            },
            {
              "id": "example-home-review-v1",
              "title": "Friendly review",
              "description": "Documentation-only supplied-choice review.",
              "mechanic": "mini_quiz",
              "order": 6,
              "isStartable": true,
              "readiness": "placeholder",
              "items": [
                {
                  "id": "example-home-review-questions",
                  "mechanic": "mini_quiz",
                  "order": 1,
                  "title": "EXAMPLE_ONLY_REVIEW",
                  "instructions": "Review together. All target-language values remain unverified.",
                  "questions": [
                    {
                      "id": "example-home-review-q01",
                      "promptText": "PROMPT_REVIEW_REQUIRED_01",
                      "promptEnglishText": "TRANSLATION_REVIEW_REQUIRED_01",
                      "correctOptionId": "review-word-01",
                      "options": [
                        { "id": "review-word-01", "text": "TARGET_LANGUAGE_WORD_01", "englishText": "TRANSLATION_REVIEW_REQUIRED_01" },
                        { "id": "review-word-02", "text": "TARGET_LANGUAGE_WORD_02", "englishText": "TRANSLATION_REVIEW_REQUIRED_02" },
                        { "id": "review-word-03", "text": "TARGET_LANGUAGE_WORD_03", "englishText": "TRANSLATION_REVIEW_REQUIRED_03" }
                      ],
                      "explanationText": "EXPLANATION_REVIEW_REQUIRED_01"
                    },
                    {
                      "id": "example-home-review-q02",
                      "promptText": "PROMPT_REVIEW_REQUIRED_02",
                      "promptEnglishText": "TRANSLATION_REVIEW_REQUIRED_02",
                      "correctOptionId": "review-word-02",
                      "options": [
                        { "id": "review-word-03", "text": "TARGET_LANGUAGE_WORD_03", "englishText": "TRANSLATION_REVIEW_REQUIRED_03" },
                        { "id": "review-word-01", "text": "TARGET_LANGUAGE_WORD_01", "englishText": "TRANSLATION_REVIEW_REQUIRED_01" },
                        { "id": "review-word-02", "text": "TARGET_LANGUAGE_WORD_02", "englishText": "TRANSLATION_REVIEW_REQUIRED_02" }
                      ],
                      "explanationText": "EXPLANATION_REVIEW_REQUIRED_02"
                    },
                    {
                      "id": "example-home-review-q03",
                      "promptText": "PROMPT_REVIEW_REQUIRED_03",
                      "promptEnglishText": "TRANSLATION_REVIEW_REQUIRED_03",
                      "correctOptionId": "review-word-03",
                      "options": [
                        { "id": "review-word-02", "text": "TARGET_LANGUAGE_WORD_02", "englishText": "TRANSLATION_REVIEW_REQUIRED_02" },
                        { "id": "review-word-03", "text": "TARGET_LANGUAGE_WORD_03", "englishText": "TRANSLATION_REVIEW_REQUIRED_03" },
                        { "id": "review-word-01", "text": "TARGET_LANGUAGE_WORD_01", "englishText": "TRANSLATION_REVIEW_REQUIRED_01" }
                      ],
                      "explanationText": "EXPLANATION_REVIEW_REQUIRED_03"
                    }
                  ],
                  "readiness": "placeholder"
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

**Schema note:** The current normalizer calculates lesson `status` and normalized `isLocked`; raw content need not author those derived values. The example deliberately includes no proposed first-class curriculum fields because they do not exist today. `metadata` can carry temporary documentation/authoring notes, but it should not become an unvalidated substitute for a curriculum schema.

## 19. Content production and approval workflow

### 19.1 Roles and separation of responsibility

| Role | Primary responsibility | Cannot approve alone |
|---|---|---|
| Curriculum designer | Scope/sequence, objective, prerequisites, review design, evidence interpretation | Target-language correctness or community representation |
| Native-language speaker | Naturalness, meaning, usage, variant and audio performance | Formal orthography/linguistics or child pedagogy unless qualified |
| Linguist/translator | Orthography, grammar, phonology, translation equivalence, terminology/variant record | Age suitability or culture alone |
| Early-childhood educator | Developmental fit, play/shared interaction, cognitive/text load, assessment wording | Language/culture accuracy alone |
| Cultural reviewer/community representative | Scope, context, representation, sensitivity, permissions | Language form or educational progression alone |
| Audio speaker | Approved script performance in declared variety | Their own final recording QA alone |
| Audio editor | Noise, level, clipping, trimming, format, asset identity | Word accuracy/variant alone |
| Developer/content integrator | Schema validity, stable IDs, asset resolution, app behavior | Linguistic, cultural or educational production readiness |
| QA tester | Device/offline/accessibility paths, wrong/missing assets, regression | Curriculum approval alone |
| Parent/caregiver tester | Comprehension, usability, shared-use reality, acceptability | Formal linguistic/curriculum approval alone |

**Research finding:** NCDC translation and terminology guidance supports multidisciplinary review, native-speaker/user involvement, cultural/phonological care and testing rather than machine or developer-only decisions. [NCDC Translation Guidelines](https://ncdc.go.ug/wp-content/uploads/2025/06/FINAL-NCDC-TRANSLATION-GUIDELINES-JULY-2024_Web-file.pdf), [NCDC Terminology Handbook](https://ncdc.go.ug/wp-content/uploads/2025/05/Terminology-Development-Handbook-Jan-2025_BOOK-WEB-FILE-1.pdf)

### 19.2 Lifecycle

| State | Meaning | Required approver/evidence | MVP? |
|---|---|---|---|
| `draft` | Editable concept/script; not child-visible | Author + owner | Yes |
| `linguistically_reviewed` | Text/meaning/orthography/variant approved | Named linguist plus native speaker | Yes |
| `culturally_reviewed` | Scope/representation/context/permissions approved | Named relevant cultural reviewer | Yes for cultural/everyday content |
| `educator_reviewed` | Objective, sequence, load and evidence wording approved | Qualified early-childhood/language educator | Yes |
| `assets_complete` | Approved images/illustrations attached with rights/provenance | Content owner + asset QA | Combine with asset checklist in MVP |
| `audio_complete` | Approved script recorded/edited/matched to variety | Native-language reviewer + audio QA | Yes for listening/audio-dependent items |
| `technical_qa_complete` | Strict schema, IDs, assets, route, offline and accessibility checks pass | QA/integrator | Yes |
| `field_tested` | Observed with representative children/caregivers under consent/safeguards; issues recorded | Research/education lead | Pilot requirement; may precede broad release |
| `production_ready` | All required gates complete for a named version/language/path | Designated content release owner, based on approvals | Yes |
| `retired` | Not assigned to new learners; replacement/reason retained | Curriculum/content owner | Yes once revisions begin |

**Recommendation:** For MVP, these may be checkboxes/records in a version-controlled authoring manifest rather than database workflow software. Keep separate linguistic, cultural, educator, audio and technical approvals; combining them into a single `reviewed` flag loses essential accountability. `field_tested` may be a controlled pilot gate before wide publication, not a reason to expose drafts publicly.

### 19.3 Correction and variant handling

1. Open a correction record referencing language, bundle version, stable content ID, current value, proposed value, reason and reporter.
2. Classify impact: typographic/non-semantic, linguistic meaning, cultural, asset/audio, objective/evidence or breaking curriculum change.
3. Route to the same specialist approvals affected by the change.
4. Record text variant, audio speaker variety, reviewer names/roles, dates, source/provenance and decision notes.
5. Publish a new immutable bundle version; never mutate the meaning of an already-issued ID silently.
6. For dialect/regional alternatives, store one reviewed default per declared audience and explicit allowed/display/audio variants. Do not mix a text variant and mismatched audio.
7. Retain permissions/licence/source records for stories, songs, images, voices and culturally controlled material.

**Recommendation:** Field testing should use informed parental consent, minimal child data, no public child recordings, observation notes focused on the content/task and clear withdrawal/deletion processes. Test comprehension, engagement, confusion, adult assistance, cultural acceptability, accessibility and offline behavior—not only whether a child can finish.

## 20. Content schema recommendations

### 20.1 Current expressiveness

| Need | Current model | Gap / consequence |
|---|---|---|
| Stable stage/lesson/item IDs | Yes when authored; positional fallbacks otherwise | Fallback and duplicate item IDs are unsafe for global curriculum evidence. |
| Language | Bundle-level code | Good bundle boundary; no per-asset speaker/variant. |
| Age band | No first-class field | One lesson silently targets all children. |
| Learner profile | No | Home-language, heritage, beginner and reader support cannot be authored explicitly. |
| Skill domain / objective | Free-text stage goals only | Cannot aggregate evidence or drive validated review. |
| Difficulty | Order/status only | Cannot distinguish support, distractor, text or concept complexity. |
| Prerequisites | No | Locks are static, not curriculum-dependency aware. |
| Introduced/reviewed vocabulary | No stable lexeme/concept references | Hub/games cannot coordinate; repeated item IDs do not solve it. |
| Content/reviewer status | Four broad readiness values plus active flags elsewhere | No separate linguistic/cultural/educator/audio/technical gates. |
| Review schedule | No | `practice_mix` has no eligibility/timing basis. |
| Mastery evidence | Generic results only | No objective rules or delayed/first-response aggregation. |
| Asset references | Image/audio key/asset fields | No manifest, checksum, rights, speaker or offline completeness. |
| Culture/provenance | Generic metadata only | No consistent scope/source/permission/reviewer contract. |
| Versioning | Whole-file `version`; result stores content version | No per-entity revision/replacement/retirement rules. |

### 20.2 Must have before real curriculum

**Recommendation:** Keep this as a small, strictly validated authoring model:

- immutable stable IDs for language bundle, pathway, stage, lesson, item, objective, concept/lexeme and assets;
- canonical language plus text/audio variant declarations;
- intended age band and learner-profile/support pathway;
- objective and skill-domain references with a safe evidence description;
- prerequisites and explicit introduced/reviewed concept references;
- authored difficulty/support dimensions sufficient to explain ordering;
- separate review/approval records for linguistic, cultural, educator, audio/asset and technical gates;
- publication state (`draft`, `published`, `retired`), immutable bundle version and replacement/retirement link;
- asset manifest with type, version/checksum, rights/provenance, speaker/variety for audio and required/optional status;
- source/provenance and reviewer trail;
- strict validation that every reference, correct answer, asset and language boundary is internally consistent.

### 20.3 Useful later

- authored review windows/eligibility, once delayed review is piloted;
- curriculum-to-game deck references;
- accessible alternate asset/prompt variants;
- richer dialect/region availability rules;
- item-level field-test metrics and retirement reason taxonomy;
- validated objective-level mastery/evidence rules;
- parent recommendation copy and educator observation prompts.

### 20.4 Do not add yet

- AI-generated translations, lessons, distractors or personalized pathways;
- continuous speech/pronunciation scoring;
- a large normalized CMS with one table per item subtype before workflow is proven;
- opaque adaptive difficulty or inferred learner-profile labels;
- universal mastery percentage/new-word quota/spacing interval;
- raw interaction event exhaust, child voice recordings, precise behavioral telemetry or location data without a necessary, reviewed purpose;
- cross-language content fallback.

## 21. Database, offline and asset implications

### 21.1 Atomic language-bundle recommendation

**Repository finding:** The current Hub is one normalized language bundle in local JSON. The generic content repository already demonstrates language-specific caching, stale-while-revalidate and same-language fallback, but only shallow payload validation and `is_active` publication filtering.

**Recommendation:** Start the Learning Hub database transition with one immutable, atomic **published language/pathway bundle row per version**, plus a compact asset manifest and approval metadata. This matches the current repository boundary and makes all-or-nothing validation, offline activation and rollback understandable.

| Option | Advantages | Costs / risks | Recommendation now |
|---|---|---|---|
| Atomic bundle row | Prevents partial units; easy strict validation/version/cache/rollback; few network round trips | Larger updates; concurrent author editing/analytics are less granular | Preferred first production foundation |
| Normalized stage/lesson/item rows | Granular editing/query/reuse | Partial/wrong-version joins, complex publication transactions, more cache invalidation | Defer until authoring scale proves the need |
| Hybrid authored records -> compiled bundle | Rich workflow plus safe runtime artifact | Requires compiler/build publication pipeline | Strong later option; runtime should still consume atomic artifact |

### 21.2 Safe fetch and activation contract

1. Query by exact canonical language, pathway and `published` state; never substitute default language.
2. Download candidate bundle with immutable version/etag/hash.
3. Strictly validate schema, IDs, reference uniqueness, mechanic support, option counts/correct answers, stage/lesson counts, approvals and asset manifest.
4. Reject empty, partial, wrong-language, unsupported or internally inconsistent responses without overwriting cache.
5. Download all required offline assets, verify checksum/type/duration and available storage.
6. Activate bundle and asset set atomically; retain last-known-good and prior progress compatibility information.
7. Use stale-while-revalidate only for a fully validated previously published same-language bundle.
8. Allow server-side rollback by repointing “current published” to an older immutable version; client activation remains validation-gated.

**Recommendation:** `is_active` alone is insufficient. Separate draft/review/production state from publication; a row should become queryable by children only when an approved immutable version is published. Empty database results should display unavailable content or continue last-known-good, never merge in another language.

### 21.3 Asset lifecycle

**Recommendation:** Each published bundle should state which assets are required to start offline. Audio records should include stable asset ID, language/variety, speaker pseudonymous production ID, script version, file version/hash, duration, licence/consent and review approval. Images need equivalent identity, provenance/rights and cultural/accessibility review. Cache paths should be content-addressed or versioned; garbage collection should retain assets referenced by active and rollback bundles.

**Repository finding:** Current remote URI support is rendering capability, not reliable offline caching. Until a verified asset set exists, an audio-dependent lesson must not activate merely because the JSON validates.

## 22. Stable-ID and progress-migration implications

### 22.1 Current identity

**Repository finding:** Authored stage/lesson/item/mechanic IDs flow into completion payloads; stage and lesson IDs drive local lookup and shared progress. Mechanic identifiers are stable union values. Achievement IDs are stable seed keys. However, missing stage/lesson/item/page IDs can be position-derived, and item IDs can repeat across lessons. Whole-file `contentVersion` is saved, but no migration policy interprets it.

### 22.2 Change rules

| Change | Identity rule | Progress treatment |
|---|---|---|
| Fix punctuation, typo or asset without changing meaning/objective | Keep ID; increment bundle version; record correction | Preserve completion; optionally refresh asset/cache. |
| Reorder stages/lessons/items | Keep authored IDs; change order only | Preserve progress. Never rely on generated positional IDs. |
| Improve audio with same approved word/variant | Keep content/concept ID; new asset version | Preserve completion; optionally make new audio available for review. |
| Change meaning, correct answer, objective, language variant or task evidence materially | New item/lesson revision or replacement ID | Preserve historical completion against old version; do not silently count it for new evidence. |
| Add an item to an existing lesson | Decide whether optional review or a new lesson revision | Do not retroactively revoke a completed badge; future mastery may require new evidence under a versioned rule. |
| Remove unsafe/incorrect item | Retire ID with reason/replacement | Keep historical record but exclude from active calculations; never expose unsafe content. |
| Move lesson between stages | Prefer stable lesson ID plus versioned membership | Preserve lesson completion; recompute stage summaries transparently, without erasing history. |
| Replace lesson | New lesson ID; `replaces` old ID | Historical completion remains; define whether replacement is recommended/required. |
| Rename title/label only | Keep ID | Preserve progress. |
| Major curriculum revision | New pathway/bundle major version and explicit mapping | Migrate only compatible evidence; show completed history even when new path has new requirements. |
| Change mechanic identifier | Treat identifier as API; add/transition deliberately | Do not rewrite historical results without a versioned migration. |

**Recommendation:** Remove positional ID fallbacks from the production publication gate (normalization may retain them for drafts/tests). Define item identity as at least `language + lessonId + itemId + contentVersion`; define concepts/lexemes separately so multiple items and games can reference the same taught knowledge without reusing item IDs.

**Recommendation:** Cache invalidation should follow immutable bundle/asset versions, not titles or timestamps alone. A new current bundle must not delete a child's last-known-good cache until activation succeeds.

### 22.3 Preserving learner history

**Recommendation:** Store append-preserving completion history or versioned evidence sufficient to explain what was completed, while keeping a derived current summary for UI speed. When the curriculum changes, retain “Completed in version X” and separately show any new recommended lesson. Do not reset visible work because an author reordered JSON or corrected a title.

**Technical prerequisite:** Resolve the Learning Hub/Learning Game `activity_type = "language"` aggregate collision before migration. Otherwise each area can overwrite the other's summary and make a curriculum migration appear to lose or distort progress.

## 23. Future practice/recommendation considerations

### 23.1 Data available today

The current Hub can provide, with mechanic-specific interpretation:

- completed child, language, stage and lesson IDs;
- content version and mechanic types;
- item completion time;
- generic `correct` (often eventually-correct or absent);
- item attempts (answer taps, replays or pages depending on mechanic);
- generic `hintUsed`, though Hub mechanics do not currently use hints;
- lesson completion-run count and timestamps;
- startable stage completion;
- local/remote source and progress update time.

### 23.2 Missing or unreliable data

- stable concept/lexeme and objective IDs across lessons/games;
- consistent first-response correctness and wrong-option identity;
- question-level mini-quiz evidence;
- audio actually heard versus merely available, and valid target audio versus placeholder;
- meaningful hint evidence;
- reliable elapsed engaged time (screen-open time is not learning time);
- delayed-review interval and review-set identity;
- independent recall, speech, pronunciation, retell or contextual use;
- learner profile/support pathway and prerequisite graph;
- evidence compatibility across content versions.

### 23.3 A bounded future rule model

**Recommendation:** If the prerequisites above exist, a later deterministic practice recommender could prioritize:

1. incomplete prerequisites explicitly selected by the authored curriculum;
2. recently introduced concepts with incorrect first responses or several attempts;
3. previously recognized concepts not reviewed within an educator-approved window;
4. a small amount of older, already taught material for mixed review;
5. varied valid mechanics, avoiding an inaccessible or age-inappropriate task.

It should explain the rule (“Reviewing words from Home because two needed another try”), respect language/pathway/version boundaries, cap repetition, let children/parents dismiss it and never infer a clinical/developmental condition. It should not treat non-graded viewing or eventual 100% scores as mastery.

**Recommendation:** Do not collect raw audio, video, precise location, contacts, background microphone, continuous touch streams or unnecessary identifiers to improve practice. Child voice capture would be a separate high-sensitivity product decision requiring a clear necessity, consent, retention/deletion and on-device/processor assessment. Rule-based review does not require it.

## 24. Risks and unresolved questions

| Risk / unresolved issue | Evidence and impact | Mitigation / decision owner |
|---|---|---|
| Completion is mistaken for mastery | Current scores are usually 100% after unlimited retry and non-graded items count correct | Rename/report evidence precisely; educator defines later rules |
| Placeholder or generic audio is interpreted as pronunciation | Resolver falls back; games sometimes play a success sound | Audio-required publication gate; native-speaker/audio QA |
| Wrong-language or incomplete remote content | Hub currently avoids fallback; future DB could reintroduce it | Exact-language atomic bundle, strict validation, last-known-good |
| Learning Hub/Learning Game progress collision | Both write the unique `language` activity aggregate | Engineering decision before curriculum cutover |
| Positional IDs reset/misassign progress | Normalizer and Word Game can derive IDs from order | Require stable authored IDs; versioned migrations |
| One learner model excludes children | Current content has no age/profile pathway | Stakeholder-approved pathways and adjustable parent choice |
| English literacy design is transferred to local languages | External phonics source is English K–3 | Separate language-specific linguistic/educator design |
| One culture stands for all Uganda | Several games are hardcoded Buganda while product scope is Ugandan | Explicit community tags, provenance and diverse review |
| Translations/variants are developer-approved | Current readiness is broad and sample content is draft/placeholder | Multi-role approval records and immutable releases |
| Games become compulsory engagement gates | Games test motor/memory/numeracy as well as language | Keep free/optional; never require unrelated completion |
| Remote assets undermine offline promises | URI rendering exists without versioned bundle downloads | Manifest, checksum, atomic asset activation and rollback |
| Accessibility is added after content | Text-heavy choices and audio-dependent tasks have limited alternatives | Accessibility criteria at specification, asset and field-test gates |
| Child data collection expands for adaptation | Useful practice needs may encourage unnecessary telemetry | Data-minimization review; deterministic rules from existing evidence |
| Policy status is oversimplified | Older NCDC framework coexists with 2024/2025 ECCE package | Obtain NCDC/MoES interpretation before compliance language |
| Current target-language content is assumed approved | JSON contains `draft`/`placeholder` values and known placeholder audio | No production claim; run full language/cultural/educator workflow |

**Unresolved product decisions:** Which learner profiles ship first? Is Baby Steps a home-language literacy aid, heritage-language bridge, beginner course, or separate pathways? Which ages are in the required core? Should parent-confirmed shared activities be recorded at all? What evidence is useful without creating pressure or false precision? These choices precede final scope and sequence.

## 25. Questions for teachers, parents, linguists and cultural reviewers

### Teachers and early-childhood educators

- For ages 3–5 and 6–8, what should a child be able to do after each unit, and which behavior can a phone validly observe?
- Which activities require an adult, which should be independently accessible, and how long can each short activity remain engaging?
- When should print be introduced for a child who already speaks the language versus a beginner or heritage learner?
- Which recognition errors signal normal learning, confusing media, an invalid distractor or a prerequisite gap?
- What would count as useful formative evidence without turning play into a test?
- Which inclusion alternatives are needed for hearing, vision, motor, language or cognitive differences?

### Parents and caregivers

- How does the selected language relate to the child's home, family, community and school life?
- When and why would adults join a lesson? Are the prompts understandable and feasible in a busy household?
- Which images, stories, words and family situations feel familiar, unfamiliar, sensitive or inaccurate?
- What offline/download/storage constraints are common on the family's device?
- What progress wording is motivating and understandable? Which wording feels judgmental or overclaims ability?
- Would an optional “we practised together” confirmation be useful, or burdensome/unreliable?

### Linguists, translators and native-language reviewers

- What public name/endonym and code/variant relationship should be used for `lg` and `nyn`?
- Which orthography standard, regional variants and pronunciation models are appropriate for the intended audience?
- Which vocabulary and phrase forms are natural for children's everyday use rather than literal translations?
- What sound contrasts, syllable/rhyme activities and print sequence are valid for each language and age/profile?
- Are distractors linguistically plausible without being ambiguous or unfair?
- How should text and audio variants be paired, labelled and versioned?

### Cultural reviewers and community representatives

- Which community does each story, object, song, image, role or custom represent, and how must that scope be named?
- What provenance, consent, attribution, licence or cultural permission is required?
- Are contemporary and rural/urban experiences represented without stereotype?
- Are sacred, restricted or contested stories/objects inappropriate for gameplay?
- Do gender, disability, household, clothing, work and family depictions reflect acceptable diversity?

### Technical/product reviewers

- How will the `activity_type = "language"` collision be resolved without losing Learning Game or Hub history?
- What is the immutable bundle/version/rollback contract, and which schema validator is authoritative?
- How are required assets downloaded, checked and activated atomically on low-storage devices?
- What exact evidence can parent history display for each mechanic?
- Which corrections are non-breaking, and who approves migration mappings for breaking revisions?
- What is the minimum useful authoring manifest before choosing database tooling?

## 26. Recommended phased implementation plan

All phases are future planning. Each has an exit decision; none is implemented by this report.

| Phase | Purpose and principal work | Exit evidence before next phase |
|---|---|---|
| 1. Stakeholder validation | Confirm product purpose, initial learner profiles/ages/languages; convene NCDC/MoES-informed education, language and cultural advisers; test family assumptions | Signed decision record on audience, policy interpretation, terminology and review roles |
| 2. Curriculum specification | Define thematic units, objectives, prerequisites, introduced/reviewed concepts, age/profile variants, evidence wording and authored review approach | Reviewed scope-and-sequence with no unverified target language |
| 3. Schema preparation | Specify stable identities, minimal authoring manifest, approval states, version/replacement rules, strict validation and current-runtime mapping | Versioned schema/validator design and migration plan; no runtime cutover yet |
| 4. Content production | Draft a small pilot unit in one language/profile; run linguistic, educator and cultural review; record provenance/permissions | Approved scripts/items/distractors and review records |
| 5. Asset/audio production | Produce images and native-speaker audio from approved scripts; edit, review, match variants, prepare accessible alternatives and manifests | Asset-complete, audio-complete, rights-complete pilot bundle |
| 6. Database foundation | Decide atomic runtime bundle representation; implement draft/publish separation, exact-language fetch, validation, versioning, last-known-good and asset download/rollback | Technical QA in a non-production path, including empty/partial/wrong-language/offline failures |
| 7. Runtime cutover | Map the approved bundle into existing routes/mechanics without silently changing progress semantics; retain unavailable state | Pilot feature flag/cutover plan with rollback and no cross-language fallback |
| 8. Progress verification | Resolve the shared `language` progress collision; test stable IDs, old completions, version change, correction, add/remove/move/retire and achievements | Approved migration matrix; restored history and no accidental resets |
| 9. Field testing | With consent, observe representative children/caregivers across ages/profiles/devices/access needs; revise task, content and support | Documented findings, corrections and educator/language/culture re-approval; readiness decision |
| 10. Limited production release | Release one validated pathway/bundle; monitor content errors, availability, progress restoration and support—not high-stakes child performance | Stable operations and stakeholder review of evidence wording |
| 11. Later game linkage | Let games consume stable curriculum concept/deck contracts; retain free play and correct evidence bugs before formative use | Each linkage reviewed for age, duplication, language, offline and mastery limits |
| 12. Later practice/recommendation | Pilot authored delayed review, then transparent rule-based suggestions using minimal data | Educator-approved rules, explainability, privacy review and version-safe evaluation |

**Recommendation:** Do not begin broad translation, audio recording or database normalization before phases 1–3. Early stakeholder changes to audience, variant or objective would otherwise make expensive assets and progress identities obsolete.

## 27. Sources and references

This analysis uses **17 principal external sources**: seven Uganda government/NCDC policy, curriculum, framework, guide or review/standards documents; four UNESCO or UNESCO/UNICEF global/regional guidance sources; three other intergovernmental/government research frameworks/guides; and three peer-reviewed systematic reviews/meta-analyses.

### Uganda government and NCDC

1. Uganda Ministry of Education and Sports. *Early Childhood Care and Education Policy; Policy Implementation Standards; Policy Implementation Guidelines*. Policy approved May 2024; standards/guidelines May 2025. [Official PDF](https://www.education.go.ug/wp-content/uploads/2026/05/ECCE-POLICY-2025-with-signatures-final.pdf).
2. National Curriculum Development Centre. *Learning Framework for Early Childhood Development*. First printed 2005; official-hosted copy. [PDF](https://ncdc.go.ug/wp-content/uploads/2024/02/ECD_FRamework.pdf).
3. National Curriculum Development Centre. *The Uganda Primary School Curriculum for Primary One*. 2006 foreword; 2016 reprint. [PDF](https://ncdc.go.ug/wp-content/uploads/2024/02/P1-Curriculum.pdf).
4. National Curriculum Development Centre. *Caregiver's Guide to the Learning Framework for Early Childhood Development*. 2013. [PDF](https://ncdc.go.ug/wp-content/uploads/2024/02/Debbies_caregivers_guide_FINAL_4_1.pdf).
5. National Curriculum Development Centre. *First International Conference on Curriculum Development Proceedings*. 2023 conference; hosted 2025. [PDF](https://ncdc.go.ug/wp-content/uploads/2025/01/conference_compressed-compressed.pdf).
6. National Curriculum Development Centre. *Translation Guidelines*. July 2024. [PDF](https://ncdc.go.ug/wp-content/uploads/2025/06/FINAL-NCDC-TRANSLATION-GUIDELINES-JULY-2024_Web-file.pdf).
7. National Curriculum Development Centre. *Terminology Development Handbook*. Document dated 2023; later official-hosted path. [PDF](https://ncdc.go.ug/wp-content/uploads/2025/05/Terminology-Development-Handbook-Jan-2025_BOOK-WEB-FILE-1.pdf).

### Multilingual education and assessment

8. UNESCO. *Languages Matter: Global Guidance on Multilingual Education*. 2025. [Official document](https://unesdoc.unesco.org/ark:/48223/pf0000392477).
9. UNESCO. *Mother Tongue and Early Childhood Care and Education: Synergies and Challenges*. 2020. [Official document](https://unesdoc.unesco.org/ark:/48223/pf0000374419).
10. UNESCO/UNICEF. *Guidance for Classroom-Based Assessment of Multilingual Learners*. 2024. [Overview](https://www.unesco.org/en/articles/guidance-classroom-based-assessment-multilingual-learners-assessing-languages-literacies-and).
11. UNESCO. *Language Acquisition in the Early Years of Childhood: The Role of Family and Pre-primary Education*. 2023. [Overview](https://www.unesco.org/en/articles/language-acquisition-early-years-childhood-role-family-and-pre-primary-education-thematic-report).

### Curriculum and learning evidence

12. Council of Europe. *CEFR Level Descriptions*. Current web reference. [Official page](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions).
13. What Works Clearinghouse. *Foundational Skills to Support Reading for Understanding in Kindergarten Through 3rd Grade*. 2016, revised 2019. [Practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/21).
14. Australian Education Research Organisation. *Spacing and Retrieval Practice Guide*. 2021, updated 2024. [Practice guide](https://www.edresearch.edu.au/guides-resources/practice-guides/spacing-and-retrieval-practice-guide-full-publication).
15. Thieme, A.-M. M. et al. *The effects of foreign language programmes in early childhood education and care: a systematic review*. 2022. [Open PDF](https://pure.uva.nl/ws/files/88585903/The_effects_of_foreign_language_programmes_in_early_childhood_education_and_care_a_systematic_review.pdf).
16. Flack, Z. M., Field, A. P., & Horst, J. S. *The effects of shared storybook reading on word learning: A meta-analysis*. 2018. [PubMed](https://pubmed.ncbi.nlm.nih.gov/29595311/).
17. Jago, L., Monaghan, P., Alcock, K., & Cain, K. *The effect of preschool vocabulary and grammar on early reading comprehension and word reading: A systematic review and meta-analysis*. 2025. [DOI](https://doi.org/10.1016/j.edurev.2025.100680).

**Research limitations:** Direct browser extraction of the 2013 Caregiver's Guide was unreliable, so this report does not attribute fine-grained standalone claims to uninspected passages. The policy PDF is published at a URL containing `2026/05`, while its internal policy approval and standards/guidelines dates are 2024/2025; dates above follow the document text. Many international sources are global, English-literacy, additional-language or non-African evidence. No reviewed source establishes an exact Baby Steps lesson length, word count, spacing interval, distractor progression or mastery threshold for young Luganda/Runyankole learners. Research cannot replace native-language, education, cultural, accessibility and family field validation.

## 28. Repository file inventory appendix

All paths existed at audit time. Line references are approximate anchors in the inspected snapshot and may move with later edits.

### Learning Hub content, language and assets

| Path | Audit role |
|---|---|
| `content/learningHubContent.json` | Official bundled Hub content; version/language/stage/lesson/item counts and current examples |
| `content/learningHubTypes.ts` | Language/readiness/status/mechanic/item/result TypeScript contracts (`MechanicType` at lines 22–30) |
| `content/learningHubRepository.ts` | JSON load (line 123), mechanic maps/implemented set (125–155), normalization/validation, fallbacks (930–979), lesson status (1032–1060), exact-language bundle lookup (1124–1137) |
| `content/languages.ts` | Canonical `lg`/`nyn` registry and aliases |
| `content/assets.ts` | Bundled image manifest and URI/key resolution |
| `lib/audioAssets.ts` | Bundled audio manifest and placeholder fallback resolution |
| `components/common/CachedImage.tsx` | Image rendering/fallback behavior; not a versioned offline download cache |

### Learning routes and mechanics

| Path | Audit role |
|---|---|
| `app/child/(tabs)/learning.tsx` | Selected child/language, language bundle and stage cards/unavailable state |
| `app/child/learning/[stageId].tsx` | Exact stage lookup, startability, restored completions/review and hydration |
| `app/child/learning/[stageId]/lesson/[lessonId].tsx` | Item progression, result accumulation, score/completion payload and save |
| `components/learning/LearningLanguageUnavailableState.tsx` | Explicit missing-language state |
| `components/learning/mechanics/mechanicRegistry.tsx` | Seven registered renderers (lines 224–230) and generic coming-soon fallback |
| `components/learning/mechanics/MechanicScreenFrame.tsx` | Shared mechanic screen structure |
| `components/learning/mechanics/TapToLearnCard.tsx` | Exposure/replay/continue behavior |
| `components/learning/mechanics/ListenAndChooseCard.tsx` | Audio choice/retry/result behavior |
| `components/learning/mechanics/ChooseCorrectWordCard.tsx` | Written-option choice/retry/result behavior |
| `components/learning/mechanics/MatchWordPictureCard.tsx` | Target-to-image choice/retry/result behavior |
| `components/learning/mechanics/MiniQuizCard.tsx` | Sequential question/retry/aggregate result behavior |
| `components/learning/mechanics/CulturalCard.tsx` | Non-graded cultural view/reflection prompt behavior |
| `components/learning/mechanics/StoryBiteCard.tsx` | Ordered page viewing/audio/final completion behavior |

### Learning progress, achievements and database

| Path | Audit role |
|---|---|
| `lib/learningProgressTypes.ts` | Completion and summary fields aligned to shared progress |
| `lib/learningProgressRepository.ts` | Local-first child/language storage, Hub source filtering, shared queue/sync and hydration |
| `lib/progressRepository.ts` | Shared `child_activity_progress` / `child_stage_progress` persistence, queue and hydration cooldown |
| `lib/learningAchievements.ts` | Hub completion event evaluation/award integration |
| `context/ChildNoticeContext.tsx` | Non-blocking FIFO achievement notices and session behavior |
| `supabase/migrations/20260629000000_add_child_progress.sql` | Shared progress tables and unique keys |
| `supabase/migrations/20260709225210_seed_learning_hub_achievements.sql` | Five Learning Hub achievement definitions |

### Games menu, generic content and stories

| Path | Audit role |
|---|---|
| `app/child/(tabs)/index.tsx` | Current Games-tab entry |
| `components/child/AfricanThemeGameInterface.tsx` | Selected-language Games-menu card rendering/navigation |
| `content/contentRepository.ts` | Luganda five-card menu, Runyankole three-card menu, same-language DB/local/cache behavior and game/story adapters |
| `supabase/migrations/20260619001000_add_mvp_content_items.sql` | Seeded generic `content_items`, including language Games-menu rows |
| `components/stories/GenericStoryRenderer.tsx` | Separate Stories renderer with read-aloud and final quiz; not Hub Story Bite |

### Five audited games

| Route | Primary implementation | Content/progress dependencies |
|---|---|---|
| `app/child/games/learninggame.tsx` | `components/games/LearningGameComponent.tsx` | `content/games/lugandawords.ts`, `components/games/utils/audioManager.ts`, `progressManagerLugandaLearning.ts` |
| `app/child/games/lugandacountinggame.tsx` | `components/games/CountingGameComponent.tsx` | `content/games/countingGameStages.ts`, `progressManagerCountingGame.ts` |
| `app/child/games/wordgame.tsx` | `components/games/WordGameComponent.tsx` | `content/games/wordgamewords.ts`, `progressManagerWordGame.ts` |
| `app/child/games/cardgame.tsx` | `components/games/CardsMatchingComponent.tsx` | Hardcoded card data, `progressManagerCardGame.ts` |
| `app/child/games/puzzlegame.tsx` | `components/games/PuzzleGameComponent.tsx` | Hardcoded puzzle data, `progressManagerPuzzleGame.ts` |

Supporting but not additional configured language Games-menu entries include `app/child/(tabs)/coloring.tsx`, `app/child/(tabs)/museum.tsx`, nested `app/child/games/coloring/`, nested `app/child/games/museum/` and `app/child/games/ball-trail.tsx`.

### Tests and existing documentation inspected

- `content/__tests__/learningHubRepository.test.ts`
- `app/child/(tabs)/__tests__/learning.test.tsx`
- `app/child/learning/__tests__/stagePath.test.tsx`
- `app/child/learning/__tests__/lessonCompletion.test.tsx`
- all seven files under `components/learning/mechanics/__tests__/`
- `lib/__tests__/learningProgressRepository.test.ts`
- `lib/__tests__/learningAchievements.test.ts`
- `lib/__tests__/audioAssets.test.ts`
- `content/__tests__/contentRepository.test.ts`
- game content/progress/achievement tests under `content/games/__tests__/`, `components/games/__tests__/` and `components/games/achievements/__tests__/`
- `supabase/migrations/__tests__/progressMigration.test.ts`
- `supabase/migrations/__tests__/learningHubAchievementsSeed.test.ts`
- `docs/features/learning-hub.md`
- `docs/features/progress-achievements.md`
- `docs/features/games.md`
- `docs/features/database-content.md`
- `docs/development/content-authoring-and-new-games.md`
- `docs/development/content-management.md`
- `docs/development/progress-content-cache-audit.md`
- `docs/language-content-mvp-audit.md`
- `docs/language-support-plan.md`

---

**Final planning boundary:** Nothing in this document authorizes a curriculum, translation, game, schema, migration, tracking, scoring or runtime change. The next action is stakeholder validation, not implementation.
