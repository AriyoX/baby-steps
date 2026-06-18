import {
  COUNTING_GAME_STAGES,
  getLugandaWord,
  getRandomNumbersForStage,
  ugandanCurrency,
} from "../countingGameStages";

describe("counting game content helpers", () => {
  it("returns Luganda labels for direct number and currency matches", () => {
    expect(getLugandaWord(7, 1)).toBe("Musanvu");
    expect(getLugandaWord(5000, 4)).toBe("Enkumi Ttaano");
  });

  it("constructs a readable fallback for teen numbers", () => {
    expect(getLugandaWord(13, 1)).toBe("Kkumi na ssatu");
  });

  it("generates the configured number of values inside each counting range", () => {
    const basicStage = COUNTING_GAME_STAGES.find((stage) => stage.id === 1)!;
    const values = getRandomNumbersForStage(basicStage.id);

    expect(values).toHaveLength(basicStage.levels);
    expect(new Set(values).size).toBe(values.length);
    expect(values.every((value) => value >= basicStage.numbersRange.min && value <= basicStage.numbersRange.max)).toBe(true);
  });

  it("generates grouped-stage values that align to the configured bunch size", () => {
    const groupedStage = COUNTING_GAME_STAGES.find((stage) => stage.id === 2)!;
    const values = getRandomNumbersForStage(groupedStage.id);

    expect(values).toHaveLength(groupedStage.levels);
    expect(values.every((value) => value % groupedStage.itemsPerBunch! === 0)).toBe(true);
  });

  it("uses defined currency values for the currency stage", () => {
    const currencyStage = COUNTING_GAME_STAGES.find((stage) => stage.id === 4)!;
    const allowedValues = new Set(ugandanCurrency.map((item) => item.value));
    const values = getRandomNumbersForStage(currencyStage.id);

    expect(values).toHaveLength(currencyStage.levels);
    expect(values.every((value) => allowedValues.has(value))).toBe(true);
  });

  it("falls back to the first five numbers for an unknown stage", () => {
    expect(getRandomNumbersForStage(999)).toEqual([1, 2, 3, 4, 5]);
  });
});
