import {
  LUGANDA_STAGES,
  getAllWords,
  getLevelsForStage,
  getWordsForLevel,
  isStageCompleted,
  unlockNextLevel,
  unlockNextStage,
} from "../lugandawords";

describe("Luganda lesson content helpers", () => {
  it("returns every word from every configured level", () => {
    const expectedWordCount = LUGANDA_STAGES.reduce(
      (stageTotal, stage) => stageTotal + stage.levels.reduce((levelTotal, level) => levelTotal + level.words.length, 0),
      0,
    );

    expect(getAllWords()).toHaveLength(expectedWordCount);
  });

  it("selects words and levels by their configured ids", () => {
    expect(getWordsForLevel(1, 1)[0]).toMatchObject({
      luganda: "Oli otya",
      english: "How are you",
    });
    expect(getLevelsForStage(1).map((level) => level.title)).toEqual(["Greetings", "People"]);
  });

  it("returns empty collections for unknown lesson ids", () => {
    expect(getWordsForLevel(999, 1)).toEqual([]);
    expect(getLevelsForStage(999)).toEqual([]);
  });

  it("checks whether all levels in a stage are complete", () => {
    expect(isStageCompleted(1, [1, 2])).toBe(true);
    expect(isStageCompleted(1, [1])).toBe(false);
    expect(isStageCompleted(999, [1, 2])).toBe(false);
  });

  it("unlocks the next stage without mutating the source content", () => {
    const updatedStages = unlockNextStage(1, LUGANDA_STAGES);

    expect(updatedStages[1].isLocked).toBe(false);
    expect(updatedStages[1].levels[0].isLocked).toBe(false);
    expect(LUGANDA_STAGES[1].isLocked).toBe(true);
    expect(updatedStages[1]).not.toBe(LUGANDA_STAGES[1]);
  });

  it("unlocks the next level without mutating the source content", () => {
    const updatedStages = unlockNextLevel(2, 3, LUGANDA_STAGES);
    const elementaryStage = updatedStages.find((stage) => stage.id === 2)!;

    expect(elementaryStage.levels.find((level) => level.id === 4)?.isLocked).toBe(false);
    expect(LUGANDA_STAGES[1].levels.find((level) => level.id === 4)?.isLocked).toBe(true);
  });
});
