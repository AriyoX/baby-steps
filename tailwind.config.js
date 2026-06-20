/** @type {import('tailwindcss').Config} */
const brandColors = {
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
};

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F8F6F1",
        foreground: "#474F5E",
        card: "#FFFFFF",
        "card-foreground": "#474F5E",
        popover: "#FFFFFF",
        "popover-foreground": "#474F5E",

        // Primary: Victoria Blue
        primary: {
          DEFAULT: brandColors.blue[500],
          ...brandColors.blue,
        },
        "primary-foreground": "#FFFFFF",

        // Secondary: Shana Orange
        secondary: {
          DEFAULT: brandColors.orange[500],
          ...brandColors.orange,
        },
        "secondary-foreground": "#FFFFFF",

        // Muted: Baby Steps warm neutrals
        muted: {
          DEFAULT: brandColors.neutral[100],
          ...brandColors.neutral,
        },
        "muted-foreground": brandColors.neutral[600],

        // Accent: Equatorial Gold
        accent: {
          DEFAULT: brandColors.gold[500],
          ...brandColors.gold,
        },
        "accent-foreground": brandColors.neutral[800],

        // Success green for positive feedback
        success: {
          DEFAULT: "#22C55E",
          50: "#F0FDF4",
          100: "#DCFCE7",
          200: "#BBF7D0",
          300: "#86EFAC",
          400: "#4ADE80",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
          800: "#166534",
          900: "#14532D",
        },

        // Friendlier destructive (less harsh red)
        destructive: {
          DEFAULT: "#EF4444",
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        "destructive-foreground": "#FFFFFF",

        border: brandColors.neutral[200],
        input: brandColors.neutral[100],
        ring: brandColors.blue[500],
        backdrop: "rgba(35, 41, 53, 0.6)",

        "chart-1": brandColors.blue[500],
        "chart-2": brandColors.orange[500],
        "chart-3": brandColors.gold[500],
        "chart-4": "#22C55E",
        "chart-5": "#EF4444",
        "chart-6": brandColors.blue[300],
      },
      fontFamily: {
        sans: ["Quicksand-Regular"],
        heading: ["Quicksand-Bold"],
        display: ["SuperChips"],
      },
      borderRadius: {
        DEFAULT: "1rem",
        'sm': '0.625rem',
        'md': '0.875rem',
        'lg': '1.125rem',
        'xl': '1.5rem',
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
};
