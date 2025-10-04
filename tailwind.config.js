/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "hsl(210, 60%, 98%)", // Soft blue background
        foreground: "hsl(210, 70%, 20%)", // Friendly dark blue
        card: "hsl(0, 0%, 100%)", // White
        "card-foreground": "hsl(210, 70%, 20%)", // Friendly dark blue
        popover: "hsl(0, 0%, 100%)", // White
        "popover-foreground": "hsl(210, 70%, 20%)", // Friendly dark blue
        
        // Primary: Cheerful sky blue - more vibrant than navy
        primary: {
          DEFAULT: "hsl(210, 100%, 55%)", // Bright sky blue (#3399ff)
          50: "hsl(210, 100%, 95%)",
          100: "hsl(210, 100%, 90%)",
          200: "hsl(210, 100%, 80%)",
          300: "hsl(210, 100%, 70%)",
          400: "hsl(210, 100%, 60%)",
          500: "hsl(210, 100%, 55%)",
          600: "hsl(210, 100%, 45%)",
          700: "hsl(210, 100%, 35%)",
          800: "hsl(210, 100%, 25%)",
          900: "hsl(210, 100%, 20%)",
        },
        "primary-foreground": "hsl(0, 0%, 100%)", // White
        
        // Secondary: Playful orange for warmth
        secondary: {
          DEFAULT: "hsl(35, 100%, 60%)", // Warm orange (#ffb347)
          50: "hsl(35, 100%, 95%)",
          100: "hsl(35, 100%, 90%)",
          200: "hsl(35, 100%, 80%)",
          300: "hsl(35, 100%, 70%)",
          400: "hsl(35, 100%, 65%)",
          500: "hsl(35, 100%, 60%)",
          600: "hsl(35, 100%, 50%)",
          700: "hsl(35, 100%, 40%)",
          800: "hsl(35, 100%, 30%)",
          900: "hsl(35, 100%, 20%)",
        },
        "secondary-foreground": "hsl(0, 0%, 100%)", // White
        
        // Muted: Softer blues
        muted: {
          DEFAULT: "hsl(210, 40%, 96%)",
          50: "hsl(210, 40%, 99%)",
          100: "hsl(210, 40%, 96%)",
          200: "hsl(210, 40%, 92%)",
          300: "hsl(210, 40%, 88%)",
          400: "hsl(210, 40%, 80%)",
          500: "hsl(210, 40%, 70%)",
          600: "hsl(210, 40%, 60%)",
          700: "hsl(210, 40%, 50%)",
          800: "hsl(210, 40%, 40%)",
          900: "hsl(210, 40%, 30%)",
        },
        "muted-foreground": "hsl(210, 30%, 40%)",
        
        // Accent: Playful purple instead of very bright pink
        accent: {
          DEFAULT: "hsl(280, 70%, 60%)", // Bright purple (#b559e6)
          50: "hsl(280, 70%, 95%)",
          100: "hsl(280, 70%, 90%)",
          200: "hsl(280, 70%, 80%)",
          300: "hsl(280, 70%, 70%)",
          400: "hsl(280, 70%, 65%)",
          500: "hsl(280, 70%, 60%)",
          600: "hsl(280, 70%, 50%)",
          700: "hsl(280, 70%, 40%)",
          800: "hsl(280, 70%, 30%)",
          900: "hsl(280, 70%, 20%)",
        },
        "accent-foreground": "hsl(0, 0%, 100%)", // White
        
        // Success green for positive feedback
        success: {
          DEFAULT: "hsl(140, 70%, 50%)", // Bright green (#1ee668)
          50: "hsl(140, 70%, 95%)",
          100: "hsl(140, 70%, 90%)",
          200: "hsl(140, 70%, 80%)",
          300: "hsl(140, 70%, 70%)",
          400: "hsl(140, 70%, 60%)",
          500: "hsl(140, 70%, 50%)",
          600: "hsl(140, 70%, 40%)",
          700: "hsl(140, 70%, 30%)",
          800: "hsl(140, 70%, 25%)",
          900: "hsl(140, 70%, 20%)",
        },
        
        // Friendlier destructive (less harsh red)
        destructive: {
          DEFAULT: "hsl(355, 90%, 65%)", // Softer red (#ff5a73)
          50: "hsl(355, 90%, 95%)",
          100: "hsl(355, 90%, 90%)",
          200: "hsl(355, 90%, 80%)",
          300: "hsl(355, 90%, 70%)",
          400: "hsl(355, 90%, 65%)",
          500: "hsl(355, 90%, 60%)",
          600: "hsl(355, 90%, 50%)",
          700: "hsl(355, 90%, 40%)",
          800: "hsl(355, 90%, 30%)",
          900: "hsl(355, 90%, 20%)",
        },
        "destructive-foreground": "hsl(0, 0%, 100%)", // White
        
        border: "hsl(210, 30%, 90%)",
        input: "hsl(210, 30%, 90%)",
        ring: "hsl(210, 100%, 55%)",
        backdrop: "hsla(210, 40%, 10%, 0.6)", // Semi-transparent
        
        // Fun chart colors
        "chart-1": "hsl(210, 100%, 55%)", // Sky blue
        "chart-2": "hsl(35, 100%, 60%)", // Orange
        "chart-3": "hsl(280, 70%, 60%)", // Purple
        "chart-4": "hsl(140, 70%, 50%)", // Green
        "chart-5": "hsl(355, 90%, 65%)", // Soft red
        "chart-6": "hsl(190, 90%, 50%)", // Turquoise
      },
      borderRadius: {
        DEFAULT: "1rem", // Rounder corners for child-friendliness
        'sm': '0.75rem',
        'md': '1rem',
        'lg': '1.5rem',
        'xl': '2rem',
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