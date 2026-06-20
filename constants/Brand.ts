export const brandColors = {
  victoriaBlue: "#0274BB",
  shanaOrange: "#FF7B6C",
  equatorialGold: "#F8C23E",
  babyStepsWhite: "#F8F6F1",
  charcoalBlack: "#474F5E",
  white: "#FFFFFF",
  black: "#111827",
  success: "#22C55E",
  danger: "#EF4444",
  blue: {
    50: "#EAF6FC",
    100: "#D4EDF8",
    200: "#A9DBF1",
    300: "#77C3E6",
    400: "#37A2D6",
    500: "#0274BB",
    600: "#0267A6",
    700: "#075685",
    800: "#0B4568",
    900: "#0D3855",
  },
  orange: {
    50: "#FFF0EE",
    100: "#FFE1DD",
    200: "#FFC7BF",
    300: "#FFA79B",
    400: "#FF8D7F",
    500: "#FF7B6C",
    600: "#E85F50",
    700: "#C94C3F",
    800: "#A73F36",
    900: "#84352F",
  },
  gold: {
    50: "#FFF8E1",
    100: "#FDECB7",
    200: "#FBE08B",
    300: "#F9D35F",
    400: "#F8C94A",
    500: "#F8C23E",
    600: "#D99D19",
    700: "#B37E12",
    800: "#8F640F",
    900: "#755111",
  },
  neutral: {
    50: "#F8F6F1",
    100: "#EFECE4",
    200: "#DED9CE",
    300: "#C8C0B2",
    400: "#A59D91",
    500: "#7D7A73",
    600: "#62666A",
    700: "#474F5E",
    800: "#353B47",
    900: "#232935",
  },
} as const;

export const brandFonts = {
  body: "Quicksand-Regular",
  heading: "Quicksand-Bold",
  medium: "Quicksand-Medium",
  semibold: "Quicksand-SemiBold",
  light: "Quicksand-Light",
  display: "SuperChips",
} as const;

export const brandTypography = {
  fontFamily: brandFonts,
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const brandSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 40,
} as const;

export const brandRadius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const brandAnimation = {
  pressMs: 140,
  fastMs: 180,
  normalMs: 240,
  slowMs: 420,
  gentleScale: 0.97,
} as const;

export const brandShadows = {
  soft: {
    shadowColor: brandColors.charcoalBlack,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  lifted: {
    shadowColor: brandColors.charcoalBlack,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const brandTheme = {
  colors: brandColors,
  fonts: brandFonts,
  typography: brandTypography,
  spacing: brandSpacing,
  radius: brandRadius,
  animation: brandAnimation,
  shadows: brandShadows,
} as const;
