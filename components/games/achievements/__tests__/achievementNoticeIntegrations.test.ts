import fs from "fs";
import path from "path";

const standaloneGameFiles = [
  "LearningGameComponent.tsx",
  "CountingGameComponent.tsx",
  "WordGameComponent.tsx",
  "CardsMatchingComponent.tsx",
  "PuzzleGameComponent.tsx",
];

const readProjectFile = (...segments: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...segments), "utf8");

describe.each(standaloneGameFiles)("%s achievement notice integration", (fileName) => {
  const source = readProjectFile("components", "games", fileName);

  it("uses the child-level notice queue", () => {
    expect(source).toContain('from "@/context/ChildNoticeContext"');
    expect(source).toContain("useChildNotice()");
    expect(source).toContain("enqueueAchievementUnlocked(ach)");
  });

  it("does not retain game-local unlock presentation state", () => {
    expect(source).not.toContain("newlyEarnedAchievement");
    expect(source).not.toMatch(/renderAchievement(?:Unlocked)?/);
    expect(source).not.toContain("bg-black/60");
    expect(source).not.toContain("rgba(0,0,0,0.6)");
  });
});

describe("Learning Hub achievement notice integration", () => {
  const source = readProjectFile(
    "app",
    "child",
    "learning",
    "[stageId]",
    "lesson",
    "[lessonId].tsx",
  );

  it("passes the entire newly-awarded batch to the child notice queue", () => {
    expect(source).toContain("enqueueAchievementUnlocks(");
    expect(source).toContain("completionResult.newlyEarnedAchievements");
    expect(source).not.toMatch(/renderAchievement(?:Unlocked)?/);
  });
});

describe("child-mode notice mounting", () => {
  const source = readProjectFile("app", "child", "_layout.tsx");

  it("mounts one child-keyed provider around the child route stack", () => {
    expect(source).toContain("<ChildNoticeProvider key={activeChild.id}");
    expect(source).toContain("<Stack");
    expect(source).toContain("</ChildNoticeProvider>");
  });
});
