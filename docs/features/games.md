# Games

Games are supplementary child-facing practice. Learning Hub remains the main curriculum.

## Dynamic Content

The exact-language Games menu comes from `content_items` `child_menu/games`. A game route starts only after `loadContentBundle(activeLanguage)` returns its required validated content or an exact-language cached copy.

| Game | Route | Database payload | Stable identity |
| --- | --- | --- | --- |
| Word | `/child/games/wordgame` | `word_game/levels` | Level ID and preserved order |
| Card Matching | `/child/games/cardgame` | `card_game/cards` | Item ID and exact `value` |
| Puzzle | `/child/games/puzzlegame` | `puzzle_game/puzzles` | Numeric puzzle ID |
| Standalone Learning | `/child/games/learninggame` | `learning_game/starter` | Numeric stage/level IDs and word IDs |
| Counting | `/child/games/lugandacountinggame` | `counting_game/stages` | Numeric stage ID plus item/currency IDs |

The legacy Counting route name is preserved to avoid route and progress churn. Ball Trail remains an unlinked mechanics-only prototype route and has no language-content bundle.

The published Luganda seed preserves all previous game IDs, order, locks, labels, and content configuration. Known Runyankole samples remain draft/non-startable. Cards or Puzzle must not appear for `nyn` merely because the Luganda menu and payloads exist.

## Code-Owned Mechanics

Components under `components/games/` still own rendering, interaction, scoring, randomization, animation, audio behavior, progress, activity writes, achievements, and completion notices. Static image and audio maps stay bundled for React Native. Database payloads contain data and media keys only; they never contain executable logic.

Each game keeps its existing progress identity and local-first synchronization behavior. A content fetch failure shows the shared retry/coming-soon state and does not clear progress or achievement caches. Retired published records disappear from current play/completion totals after refresh, while historic progress IDs remain stored.

Payload examples and update rules are in [Content Authoring And New Games](../development/content-authoring-and-new-games.md#migrated-menu-game-and-story-payloads). Cache behavior is in [Content Cache And Asset Loading](../development/content-cache-and-images.md).

## API Or Database Usage

Routes read published/startable records through the shared exact-language Supabase repository/cache. Child clients do not write curriculum records. Existing progress, activity, and achievement paths are unchanged and remain separate from content authoring.

## Tests

Focused suites cover exact-language hydration, missing-content states, Cards and Puzzle completion, preserved progress identities, and progress hydration managers. Full touch, animation, sound, and installed-device flows still require manual QA.

## Manual QA

- Launch every card exposed by the exact-language Games menu.
- Verify no game starts before its content is loaded.
- Confirm stable stage/level/puzzle/card progress restores after reopening.
- Complete one meaningful unit and verify existing activity and new-award-only achievement behavior.
- Reopen after a successful load while offline and confirm exact-language cache use.
- Select a language with no published game payload and confirm the unavailable state, with no Luganda substitution.
