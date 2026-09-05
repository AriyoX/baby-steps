import {
  getAdultFormLayout,
  getLearningActivityLayout,
  getLearningReadingLayout,
  getParentDashboardLayout,
  getParentGateLayout,
  getParentScreenLayout,
  getResponsiveViewport,
} from "../responsiveLayout";

describe("responsive layout primitives", () => {
  it.each([
    ["small landscape phone", 640, 360, false, true],
    ["typical landscape phone", 844, 390, false, true],
    ["small tablet", 1024, 600, true, false],
    ["large landscape tablet", 1366, 768, true, false],
  ])(
    "classifies a %s using both dimensions",
    (_name, width, height, isTablet, isShort) => {
      expect(getResponsiveViewport(width, height)).toMatchObject({
        isLandscape: true,
        isShort,
        isTablet,
      });
    },
  );

  it("uses a single row for three choices when a landscape phone supports it", () => {
    const smallPhone = getLearningActivityLayout(640, 360, 3);
    const typicalPhone = getLearningActivityLayout(844, 390, 4);
    const typicalPhoneWithThreeChoices = getLearningActivityLayout(844, 390, 3);

    expect(smallPhone.choiceColumns).toBe(3);
    expect(smallPhone.choiceHeight).toBeGreaterThanOrEqual(124);
    expect(typicalPhone.choiceColumns).toBe(4);
    expect(typicalPhoneWithThreeChoices.choiceColumns).toBe(3);
    expect(typicalPhoneWithThreeChoices.choiceHeight).toBeGreaterThanOrEqual(96);
    expect(typicalPhone.cardWidth).toBeLessThan(844);
  });

  it("keeps a three-answer board inside the short-screen game canvas", () => {
    for (const [width, height, canvasHeight] of [
      [640, 360, 232],
      [844, 390, 260],
    ]) {
      const headerHeight = 46;
      const layout = getLearningActivityLayout(width, height, 3, {
        width: width - 32,
        height: canvasHeight,
        headerHeight,
      });
      const rowCount = Math.ceil(3 / layout.choiceColumns);
      const estimatedBoardHeight =
        layout.cardPadding * 2 +
        headerHeight +
        layout.choiceGap +
        rowCount * layout.choiceHeight +
        (rowCount - 1) * layout.choiceGap;

      expect(estimatedBoardHeight).toBeLessThanOrEqual(canvasHeight + 4);
    }
  });

  it("uses three balanced tiles for three answers when a tablet supports them", () => {
    const smallTablet = getLearningActivityLayout(1024, 600, 3);
    const largeTablet = getLearningActivityLayout(1366, 768, 3);
    const fourAnswerTablet = getLearningActivityLayout(1366, 768, 4);

    expect(smallTablet.choiceColumns).toBe(3);
    expect(largeTablet.choiceColumns).toBe(3);
    expect(fourAnswerTablet.choiceColumns).toBe(4);
    expect(largeTablet.choiceWidth).toBeGreaterThan(smallTablet.choiceWidth);
  });

  it.each([
    [816, 366, 784, 3],
    [844, 390, 760.5, 4],
    [1024, 600, 960, 3],
    [1280, 720, 1216, 3],
    [1366, 768, 1280, 4],
    [768, 1024, 704, 3],
  ])(
    "keeps answer rows within the measured panel at %i × %i",
    (width, height, panelWidth, optionCount) => {
      const layout = getLearningActivityLayout(width, height, optionCount, {
        width: panelWidth,
        height: height - 180,
        headerHeight: 60,
      });
      const rowWidth =
        layout.choiceWidth * layout.choiceColumns +
        layout.choiceGap * (layout.choiceColumns - 1);

      expect(rowWidth + layout.cardPadding * 2).toBeLessThanOrEqual(panelWidth);
      expect(layout.choiceWidth).toBeGreaterThanOrEqual(160);
    },
  );

  it.each([
    [640, 360, 568, 184],
    [800, 360, 768, 116],
    [844, 390, 760, 220],
    [1024, 600, 960, 420],
    [1366, 768, 1280, 530],
    [768, 1024, 704, 820],
    [390, 844, 358, 640],
  ])("keeps illustrated lessons within the measured panel at %i × %i", (width, height, panelWidth, panelHeight) => {
    const layout = getLearningReadingLayout(width, height, {
      width: panelWidth,
      height: panelHeight,
    });
    const contentWidth = layout.isSplit
      ? layout.imageWidth + layout.gap + layout.textWidth
      : Math.max(layout.imageWidth, layout.textWidth);

    const frameInsets = (layout.contentPadding + layout.cardPadding + 2) * 2;
    expect(contentWidth + frameInsets).toBeLessThanOrEqual(panelWidth);
    expect(layout.imageHeight + frameInsets).toBeLessThanOrEqual(panelHeight);
    expect(layout.textWidth).toBeGreaterThanOrEqual(240);
    expect(layout.imageHeight).toBeGreaterThan(0);
    expect(layout.imageHeight).toBeLessThanOrEqual(420);
  });

  it("uses large tablet illustrations and stacks content in a narrow panel", () => {
    const tablet = getLearningReadingLayout(1366, 768, {
      width: 1280, height: 530,
    });
    const narrowPanel = getLearningReadingLayout(1024, 768, {
      width: 500, height: 530,
    });

    expect(tablet.isSplit).toBe(true);
    expect(tablet.imageWidth).toBeGreaterThan(500);
    expect(tablet.imageHeight).toBeGreaterThan(300);
    expect(narrowPanel.isSplit).toBe(false);
    expect(narrowPanel.imageWidth).toBe(narrowPanel.textWidth);
  });

  it("keeps parent portrait centered and recomposes parent landscape into columns", () => {
    const tabletPortrait = getParentDashboardLayout(768, 1024);
    const tabletLandscape = getParentDashboardLayout(1366, 768);

    expect(tabletPortrait).toMatchObject({
      isTablet: true,
      isTwoColumn: false,
      contentMaxWidth: 920,
    });
    expect(tabletLandscape).toMatchObject({
      isTablet: true,
      isTwoColumn: true,
      contentMaxWidth: 1280,
    });
  });

  it("grows the PIN keypad on tablets and tightens it on short phones", () => {
    const shortPhone = getParentGateLayout(640, 360);
    const tablet = getParentGateLayout(1366, 768);

    expect(shortPhone.keypadButtonHeight).toBe(44);
    expect(shortPhone.keypadWidth).toBeLessThan(300);
    expect(tablet.keypadButtonHeight).toBe(64);
    expect(tablet.keypadWidth).toBeGreaterThan(shortPhone.keypadWidth);
  });

  it("keeps auth forms readable and splits the hero only on wide tablets", () => {
    const phone = getAdultFormLayout(390, 844);
    const tabletPortrait = getAdultFormLayout(768, 1024);
    const tabletLandscape = getAdultFormLayout(1366, 768);

    expect(phone.isSplit).toBe(false);
    expect(tabletPortrait).toMatchObject({ isSplit: false, formMaxWidth: 640 });
    expect(tabletLandscape).toMatchObject({
      contentMaxWidth: 1160,
      isSplit: true,
      formMaxWidth: 560,
    });
  });

  it("adds collection columns without stretching readable parent forms", () => {
    expect(getParentScreenLayout(390, 844)).toMatchObject({
      collectionColumns: 1,
      isTwoColumn: false,
    });
    expect(getParentScreenLayout(768, 1024)).toMatchObject({
      collectionColumns: 2,
      readableMaxWidth: 760,
    });
    expect(getParentScreenLayout(1366, 768)).toMatchObject({
      collectionColumns: 3,
      contentMaxWidth: 1180,
      isTwoColumn: true,
    });
    expect(getParentScreenLayout(960, 500)).toMatchObject({
      contentMaxWidth: 1180,
      isTablet: false,
      isTwoColumn: true,
    });
  });
});
