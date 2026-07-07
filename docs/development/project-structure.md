# Project Structure

## Overview

Baby Steps uses Expo Router, so most user-facing screens are file routes under `app/`. Shared game, story, context, utility, and content code lives outside `app/`.

## Folder Guide

| Path | Purpose |
| --- | --- |
| `app/` | Expo Router routes and layouts. |
| `app/_layout.tsx` | Root app setup: fonts, splash, session, onboarding routing, background music, child provider. |
| `app/index.tsx` | First-run app onboarding. |
| `app/login.tsx`, `app/signup.tsx`, `app/forgot-password.tsx`, `app/reset-password.tsx` | Auth routes. |
| `app/parent/` | Parent dashboard, settings, activities, child detail, achievements, add-child flow. |
| `app/child/` | Child mode layout, tabs, parent gate, games, stories, learning, archived museum, coloring. |
| `components/` | Shared UI, game components, story components, achievement logic. |
| `components/games/` | Large prototype game components. |
| `components/games/utils/` | Game-specific progress/audio managers. |
| `components/games/achievements/` | Supabase achievement definitions, earned achievements, and awarding logic. |
| `components/stories/` | Eight hardcoded story components and `StoryProgress`. |
| `components/child/` | Child dashboard/card interface and older coloring prototype. |
| `content/games/` | Structured hardcoded content for counting, Luganda lessons, and word game. |
| `context/` | React contexts for active child, add-child flow, and language setting. |
| `lib/` | Supabase client, activity helpers, translations, and Sunbird prototype helpers. |
| `utils/` | Generic AsyncStorage helpers for progress, activities, sessions, and weekly stats. |
| `assets/` | Fonts, app icons, images, story media, puzzle images, audio, and sounds. |
| `docs/` | Current documentation. |
| `schema.sql` | Context-only database schema snapshot. |

## Routing Notes

- Routes are file based through Expo Router.
- Child tabs are under `app/child/(tabs)/`.
- The Stories tab route file is uppercase: `app/child/(tabs)/Stories.tsx`.
- Game routes are under `app/child/games/`.
- Story routes are under `app/child/stories/`.
- Museum routes are archived under `app/child/games/museum/` and hidden from the current child tab bar.
- Coloring routes are under `app/child/games/coloring/`.

## Naming Conventions

No strict naming convention is enforced across the prototype yet. Current patterns:

- Route files use screen names or feature names.
- Story route wrappers use lowercase route filenames and import PascalCase story components.
- Game route wrappers import larger components from `components/games/`.
- Some route component names are stale, such as `WordGame` exported from learning/counting route wrappers.

## What Belongs Where

- New screen route: `app/`.
- Reusable game UI/logic: `components/games/`.
- Pure structured content: `content/`.
- Shared data helpers: `lib/` or a future service layer.
- Child/parent shared state: `context/`.
- Bundled media: `assets/`.
- Documentation: `docs/`.

## Current Technical Debt In Structure

- Story components duplicate the same reader/quiz structure.
- Game components mix content, UI, state, scoring, persistence, audio, and achievements.
- Some content remains embedded in components instead of `content/`.
- `types.ts` contains generic early prototype types and may not represent current app data models.
- `components/child/AfricanColoringGame.tsx` is commented prototype code while active coloring lives under routes.

## Contributor Notes

- Prefer moving reusable hardcoded content into `content/` only when it reduces real duplication.
- Do not move story/game content into a database without typed contracts and fallback behavior.
- Keep route names stable unless you update every card/link target.
- Avoid adding new settings links without actual routes or placeholders.
