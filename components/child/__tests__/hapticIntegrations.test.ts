import { readFileSync } from "fs";
import path from "path";

const root = path.join(__dirname, "..", "..", "..");
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("child-mode haptic integrations", () => {
  it.each([
    ["tab navigation", "app/child/(tabs)/_layout.tsx"],
    ["learning lessons", "app/child/learning/[stageId]/lesson/[lessonId].tsx"],
    ["learning stage paths", "app/child/learning/[stageId].tsx"],
    ["tap-to-learn cards", "components/learning/mechanics/TapToLearnCard.tsx"],
    ["listen-and-choose audio", "components/learning/mechanics/ListenAndChooseCard.tsx"],
    ["story-bite pages", "components/learning/mechanics/StoryBiteCard.tsx"],
    ["unavailable-language actions", "components/learning/LearningLanguageUnavailableState.tsx"],
    ["child activity cards", "components/child/AfricanThemeGameInterface.tsx"],
    ["counting game", "components/games/CountingGameComponent.tsx"],
    ["learning game", "components/games/LearningGameComponent.tsx"],
    ["word game", "components/games/WordGameComponent.tsx"],
    ["matching game", "components/games/CardsMatchingComponent.tsx"],
    ["puzzle game", "components/games/PuzzleGameComponent.tsx"],
    ["ball trail", "app/child/games/ball-trail.tsx"],
    ["museum artifacts", "app/child/games/museum/ArtifactsScreen.tsx"],
    ["museum art", "app/child/games/museum/ArtScreen.tsx"],
    ["museum instruments", "app/child/games/museum/InstrumentsScreen.tsx"],
    ["museum textiles", "app/child/games/museum/TextilesScreen.tsx"],
    ["stories", "components/stories/GenericStoryRenderer.tsx"],
    ["coloring", "components/coloring/ColoringGameScreen.tsx"],
    ["coloring gallery", "components/coloring/ColoringGallery.tsx"],
    ["achievement notices", "context/ChildNoticeContext.tsx"],
    ["daily celebration", "components/child/StreakCelebrationHost.tsx"],
    ["coming-soon actions", "components/child/ComingSoonState.tsx"],
  ])("wires feedback into %s", (_label, relativePath) => {
    expect(read(relativePath)).toContain("childHaptics");
  });

  it("includes the Expo native haptics module", () => {
    expect(read("package.json")).toContain('"expo-haptics": "~15.0.8"');
  });
});
