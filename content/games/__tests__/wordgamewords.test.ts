import { gameLevels } from "../wordgamewords";

describe("word game content", () => {
  it("has unique uppercase target words", () => {
    const words = gameLevels.map((level) => level.word);

    expect(new Set(words).size).toBe(words.length);
    expect(words.every((word) => word === word.toUpperCase())).toBe(true);
  });

  it("has complete prompt, hint, and media metadata for each level", () => {
    for (const level of gameLevels) {
      expect(level.word).toBeTruthy();
      expect(level.question).toBeTruthy();
      expect(level.hint).toBeTruthy();
      expect(level.subHint).toBeTruthy();
      expect(level.image).toBeTruthy();
    }
  });

  it("uses valid optional first-letter hints when provided", () => {
    for (const level of gameLevels) {
      if (level.firstLetter) {
        expect(level.firstLetter).toBe(level.word[0]);
      }
    }
  });
});
