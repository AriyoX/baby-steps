export const brandAssets = {
  logo: {
    main: {
      name: "Baby Steps full-color logo",
      type: "logo",
      source: require("@/assets/SVG/Logo Main.svg"),
    },
    blue: {
      name: "Baby Steps blue logo",
      type: "logo",
      source: require("@/assets/SVG/Logo Blue.svg"),
    },
    orange: {
      name: "Baby Steps Shana orange logo",
      type: "logo",
      source: require("@/assets/SVG/Logo Tangarine.svg"),
    },
    gold: {
      name: "Baby Steps gold logo",
      type: "logo",
      source: require("@/assets/SVG/Logo Yellow.svg"),
    },
    mono: {
      name: "Baby Steps black and white logo",
      type: "logo",
      source: require("@/assets/SVG/Logo b&w.svg"),
    },
  },
  wordmark: {
    main: {
      name: "Baby Steps full-color wordmark",
      type: "wordmark",
      source: require("@/assets/SVG/Wordmark Main.svg"),
    },
    blue: {
      name: "Baby Steps blue wordmark",
      type: "wordmark",
      source: require("@/assets/SVG/Wordmark Blue.svg"),
    },
    orange: {
      name: "Baby Steps Shana orange wordmark",
      type: "wordmark",
      source: require("@/assets/SVG/Wordmark Tangarine.svg"),
    },
    gold: {
      name: "Baby Steps gold wordmark",
      type: "wordmark",
      source: require("@/assets/SVG/Wordmark Yellow.svg"),
    },
    mono: {
      name: "Baby Steps black and white wordmark",
      type: "wordmark",
      source: require("@/assets/SVG/Wordmark B&w.svg"),
    },
  },
  mascot: {
    shana: {
      name: "Shana mascot",
      type: "mascot",
      source: require("@/assets/SVG/Mascot.svg"),
    },
  },
  icon: {
    profile: {
      name: "Baby Steps profile icon",
      type: "icon",
      format: "raster",
      source: require("@/assets/logo/profile-pic-2.png"),
    },
  },
  pattern: {
    one: {
      name: "Baby Steps brand pattern 01",
      type: "pattern",
      source: require("@/assets/SVG/Pattern 01.svg"),
    },
    two: {
      name: "Baby Steps brand pattern 02",
      type: "pattern",
      source: require("@/assets/SVG/Pattern 02.svg"),
    },
    three: {
      name: "Baby Steps brand pattern 03",
      type: "pattern",
      source: require("@/assets/SVG/Pattern 03.svg"),
    },
    four: {
      name: "Baby Steps brand pattern 04",
      type: "pattern",
      source: require("@/assets/SVG/Pattern 04.svg"),
    },
  },
} as const;

export const brandAssetAudit = [
  { file: "Logo Main.svg", role: "primary full-color app logo" },
  { file: "Logo Blue.svg", role: "single-color Victoria Blue logo" },
  { file: "Logo Tangarine.svg", role: "single-color Shana Orange logo" },
  { file: "Logo Yellow.svg", role: "single-color Equatorial Gold logo" },
  { file: "Logo b&w.svg", role: "mono logo" },
  { file: "Wordmark Main.svg", role: "primary full-color wordmark" },
  { file: "Wordmark Blue.svg", role: "single-color Victoria Blue wordmark" },
  { file: "Wordmark Tangarine.svg", role: "single-color Shana Orange wordmark" },
  { file: "Wordmark Yellow.svg", role: "single-color Equatorial Gold wordmark" },
  { file: "Wordmark B&w.svg", role: "mono wordmark" },
  { file: "Mascot.svg", role: "Shana mascot" },
  { file: "profile-pic-2.png", role: "in-app profile brand mark for Settings" },
  { file: "Profile-pic.png", role: "native and custom launch image plus app icon" },
  { file: "Profile-pic.jpg", role: "legacy raster profile image" },
  { file: "Profile pic copy 3.svg", role: "legacy SVG profile brand mark" },
  { file: "Pattern 01.svg", role: "brand pattern" },
  { file: "Pattern 02.svg", role: "brand pattern" },
  { file: "Pattern 03.svg", role: "brand pattern" },
  { file: "Pattern 04.svg", role: "brand pattern" },
] as const;
