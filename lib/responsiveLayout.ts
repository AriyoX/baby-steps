const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

export type ResponsiveViewport = {
  height: number;
  isLandscape: boolean;
  isShort: boolean;
  isTablet: boolean;
  width: number;
};

export const getResponsiveViewport = (
  width: number,
  height: number,
): ResponsiveViewport => {
  const shortestSide = Math.min(width, height);

  return {
    height,
    isLandscape: width > height,
    isShort: height < 430,
    isTablet: shortestSide >= 600,
    width,
  };
};

export type AdultFormLayout = ResponsiveViewport & {
  contentGap: number;
  contentMaxWidth: number;
  contentPadding: number;
  formMaxWidth: number;
  heroMaxWidth: number;
  isSplit: boolean;
};

export const getAdultFormLayout = (
  width: number,
  height: number,
): AdultFormLayout => {
  const viewport = getResponsiveViewport(width, height);
  const isSplit = viewport.isTablet && viewport.isLandscape && width >= 960;

  return {
    ...viewport,
    contentGap: isSplit ? clamp(width * 0.045, 40, 64) : 0,
    contentMaxWidth: isSplit ? 1160 : viewport.isTablet ? 720 : 620,
    contentPadding: viewport.isTablet ? clamp(width * 0.035, 24, 40) : 20,
    formMaxWidth: isSplit ? 560 : viewport.isTablet ? 640 : 580,
    heroMaxWidth: isSplit ? 430 : 640,
    isSplit,
  };
};

export type ParentScreenLayout = ResponsiveViewport & {
  collectionColumns: number;
  contentGap: number;
  contentMaxWidth: number;
  contentPadding: number;
  isTwoColumn: boolean;
  readableMaxWidth: number;
};

export const getParentScreenLayout = (
  width: number,
  height: number,
): ParentScreenLayout => {
  const viewport = getResponsiveViewport(width, height);
  const isTwoColumn = width >= 900;
  const collectionColumns = width >= 1180 ? 3 : width >= 700 ? 2 : 1;

  return {
    ...viewport,
    collectionColumns,
    contentGap: viewport.isTablet ? 20 : 14,
    contentMaxWidth: isTwoColumn ? 1180 : viewport.isTablet ? 920 : 720,
    contentPadding:
      isTwoColumn || viewport.isTablet ? clamp(width * 0.035, 24, 44) : 16,
    isTwoColumn,
    readableMaxWidth: isTwoColumn || viewport.isTablet ? 760 : 680,
  };
};

export type LearningActivityLayout = ResponsiveViewport & {
  cardPadding: number;
  cardWidth: number;
  choiceColumns: number;
  choiceGap: number;
  choiceHeight: number;
  choiceImageHeight: number;
  choiceWidth: number;
  imageSize: number;
};

export const getLearningActivityLayout = (
  width: number,
  height: number,
  optionCount: number,
  contentBounds?: { width: number; height: number; headerHeight: number },
): LearningActivityLayout => {
  const viewport = getResponsiveViewport(width, height);
  const horizontalInset = width < 620 ? 32 : viewport.isTablet ? 72 : 48;
  const cardWidth = Math.min(
    viewport.isTablet ? 1280 : 920,
    contentBounds && contentBounds.width > 0
      ? contentBounds.width
      : Math.max(240, width - horizontalInset),
  );
  const cardPadding = viewport.isShort ? 12 : viewport.isTablet ? 24 : 16;
  const choiceGap = viewport.isShort ? 10 : viewport.isTablet ? 20 : 14;
  const gridWidth = Math.max(0, cardWidth - cardPadding * 2);
  const minimumChoiceWidth = viewport.isShort ? 160 : 220;
  const columnCapacity = Math.max(
    1,
    Math.min(4, Math.floor((gridWidth + choiceGap) / (minimumChoiceWidth + choiceGap))),
  );
  const choiceColumns = optionCount === 4 && columnCapacity === 3
    ? 2
    : Math.min(Math.max(1, optionCount), columnCapacity);
  // Round down so a fractional pixel cannot wrap the last tile onto another row.
  const choiceWidth = Math.max(
    0,
    Math.floor((gridWidth - choiceGap * (choiceColumns - 1)) / choiceColumns),
  );
  const rowCount = Math.max(1, Math.ceil(optionCount / choiceColumns));
  const availableContentHeight = contentBounds && contentBounds.height > 0
    ? contentBounds.height
    : height - (viewport.isShort ? 142 : 206);
  const headerHeight = contentBounds?.headerHeight || (viewport.isShort ? 46 : 76);
  const availableRowHeight = (
    availableContentHeight - cardPadding * 2 - headerHeight - choiceGap * rowCount
  ) / rowCount;
  const minimumChoiceHeight = viewport.isShort ? 124 : 208;
  const preferredChoiceHeight = viewport.isShort
    ? clamp(height * 0.42, 124, 174)
    : viewport.isTablet
      ? clamp(height * 0.52, 260, 420)
      : clamp(height * 0.4, 208, 300);
  // Retain readable cards when space is tight; the frame scrolls the overflow.
  const choiceHeight = Math.floor(Math.max(
    minimumChoiceHeight,
    Math.min(preferredChoiceHeight, availableRowHeight),
  ));

  return {
    ...viewport,
    cardPadding,
    cardWidth,
    choiceColumns,
    choiceGap,
    choiceHeight,
    choiceImageHeight: Math.round(choiceHeight * (viewport.isShort ? 0.55 : 0.6)),
    choiceWidth,
    imageSize: viewport.isShort
      ? clamp(choiceHeight * 0.5, 46, 58)
      : viewport.isTablet
        ? clamp(choiceHeight * 0.34, 72, 108)
        : clamp(choiceHeight * 0.4, 54, 82),
  };
};

export type LearningReadingLayout = ResponsiveViewport & {
  cardPadding: number;
  contentPadding: number;
  gap: number;
  imageHeight: number;
  imageWidth: number;
  isSplit: boolean;
  textPadding: number;
  textWidth: number;
};

export const getLearningReadingLayout = (
  width: number,
  height: number,
  contentBounds?: { width: number; height: number },
): LearningReadingLayout => {
  const viewport = getResponsiveViewport(width, height);
  const cardPadding = viewport.isShort ? 6 : 8;
  const contentPadding = viewport.isShort ? 10 : viewport.isTablet ? 24 : 16;
  const gap = viewport.isShort ? 10 : viewport.isTablet ? 24 : 18;
  const panelWidth = Math.min(
    1280,
    contentBounds && contentBounds.width > 0 ? contentBounds.width : width - 48,
  );
  // Account for the card's padding and two-point border on both sides.
  const cardInset = cardPadding + 2;
  const innerWidth = Math.max(0, panelWidth - (contentPadding + cardInset) * 2);
  const isSplit = innerWidth >= (viewport.isLandscape ? 480 : 560);
  const imageWidth = Math.floor(isSplit
    ? (innerWidth - gap) * (viewport.isShort ? 0.4 : 0.52)
    : innerWidth);
  const availableHeight = contentBounds && contentBounds.height > 0
    ? contentBounds.height
    : height - (viewport.isShort ? 140 : 196);
  const preferredImageHeight = clamp(
    imageWidth * (isSplit ? 0.78 : 0.62),
    viewport.isShort ? 96 : 180,
    viewport.isTablet ? 420 : 320,
  );
  const imageHeight = Math.floor(Math.max(0, Math.min(
    preferredImageHeight,
    availableHeight - (contentPadding + cardInset) * 2,
  )));

  return {
    ...viewport,
    cardPadding,
    contentPadding,
    gap,
    imageHeight,
    imageWidth,
    isSplit,
    textPadding: viewport.isShort ? 6 : viewport.isTablet ? 18 : 12,
    textWidth: isSplit ? innerWidth - imageWidth - gap : innerWidth,
  };
};

export type ParentDashboardLayout = ResponsiveViewport & {
  contentGap: number;
  contentMaxWidth: number;
  contentPadding: number;
  isTwoColumn: boolean;
};

export const getParentDashboardLayout = (
  width: number,
  height: number,
): ParentDashboardLayout => {
  const viewport = getResponsiveViewport(width, height);
  const isTwoColumn = width >= 900 && width > height;

  return {
    ...viewport,
    contentGap: viewport.isTablet ? 24 : 16,
    contentMaxWidth: isTwoColumn ? 1280 : viewport.isTablet ? 920 : 680,
    contentPadding: viewport.isTablet ? clamp(width * 0.035, 24, 44) : 16,
    isTwoColumn,
  };
};

export type ParentGateLayout = ResponsiveViewport & {
  columnGap: number;
  contentMaxWidth: number;
  contentPadding: number;
  keypadButtonHeight: number;
  keypadGap: number;
  keypadPadding: number;
  keypadWidth: number;
};

export const getParentGateLayout = (
  width: number,
  height: number,
): ParentGateLayout => {
  const viewport = getResponsiveViewport(width, height);
  const contentPadding = viewport.isShort ? 16 : viewport.isTablet ? 40 : 28;

  return {
    ...viewport,
    columnGap: viewport.isShort ? 14 : viewport.isTablet ? 64 : 28,
    contentMaxWidth: Math.min(1180, Math.max(520, width - contentPadding * 2)),
    contentPadding,
    keypadButtonHeight: viewport.isShort ? 44 : viewport.isTablet ? 64 : 52,
    keypadGap: viewport.isShort ? 6 : viewport.isTablet ? 14 : 12,
    keypadPadding: viewport.isShort ? 10 : viewport.isTablet ? 20 : 16,
    keypadWidth: viewport.isShort
      ? clamp(width * 0.46, 260, 286)
      : viewport.isTablet
        ? clamp(width * 0.31, 340, 400)
        : clamp(width * 0.4, 300, 340),
  };
};
