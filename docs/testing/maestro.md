# Maestro UI Tests

## Install Maestro

Install Maestro from the official installer:

```sh
curl -Ls "https://get.maestro.mobile.dev" | bash
maestro --version
```

On Windows, run Maestro from WSL, Git Bash, or another shell where the installed `maestro` command is available.

## Test App Assumptions

- Default Android app id: `com.babysteps.babysteps_prototype`
- The YAML flows use `appId: ${APP_ID}` so Android and iOS can share the same files.
- Child-mode flows require a signed-in parent account with at least one child profile.
- If the login screen appears, set `PARENT_EMAIL` and `PARENT_PASSWORD`.
- Expo child mode locks landscape, so run game flows on an emulator/simulator that can rotate.

Example environment:

```sh
export APP_ID=com.babysteps.babysteps_prototype
export PARENT_EMAIL=parent@example.com
export PARENT_PASSWORD=your-test-password
```

For iOS, set `APP_ID` to the installed bundle identifier used by the simulator build.

## Run Expo For Testing

Start the app in the mode that matches your test device:

```sh
npm install
npm run start
```

For an Android development build:

```sh
npm run android
```

For an iOS development build:

```sh
npm run ios
```

Keep Metro running while Maestro executes the flows.

## Run Flows

Run all flows:

```sh
npm run test:maestro
```

Run focused flows:

```sh
npm run test:maestro:smoke
npm run test:maestro:child
npm run test:maestro:coloring
maestro test -e APP_ID=$APP_ID .maestro/learning-game.yaml
maestro test -e APP_ID=$APP_ID .maestro/word-game.yaml
maestro test -e APP_ID=$APP_ID .maestro/counting-game.yaml
maestro test -e APP_ID=$APP_ID .maestro/stories.yaml
maestro test -e APP_ID=$APP_ID .maestro/parent-flow.yaml
maestro test -e APP_ID=$APP_ID .maestro/games
```

If login is needed:

```sh
maestro test \
  -e APP_ID=$APP_ID \
  -e PARENT_EMAIL=$PARENT_EMAIL \
  -e PARENT_PASSWORD=$PARENT_PASSWORD \
  .maestro/smoke.yaml
```

## Known Limitations

- Flows do not create a parent account or child profile. Seed a test parent and child before running child-mode tests.
- Coloring save/share controls are asserted but not tapped because they can trigger OS permission prompts.
- Canvas drawing uses a selector tap on `coloring-drawing-area`; it avoids coordinate-only gestures.
- Legacy Luganda story screens expose `story-page` plus accessibility labels for page controls. The DB-backed generic story renderer has explicit story button IDs.
- `ball-trail` is not tested because it is not currently linked from MVP child navigation.
- DB-backed content may change card order or availability. The tests prefer IDs and use bundled fallback IDs where possible.

## Adding A Test For A New Child Activity

1. Add a stable selector to the child menu card: `child-menu-[activity-name]`.
2. Add a screen root selector: `[activity-name]-screen`.
3. Add one safe primary action selector: `[activity-name]-primary-action`.
4. Create `.maestro/games/[activity-name].yaml`.
5. Follow the existing pattern: launch app, enter child mode, open the card, wait for the screen, tap one safe action, assert the screen remains valid, then go back.
6. Update `docs/testing/maestro-core-ui-audit.md` with the route, selectors, and any limitations.
