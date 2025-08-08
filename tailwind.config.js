
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html","./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(220 14% 25%)",
        input: "hsl(220 14% 25%)",
        ring: "hsl(222.2 84% 4.9%)",
        background: "hsl(222.2 84% 4.9%)",
        foreground: "hsl(210 40% 98%)",
        primary: { DEFAULT: "hsl(217 91% 60%)", foreground: "hsl(210 40% 98%)" },
        secondary: { DEFAULT: "hsl(217 33% 18%)", foreground: "hsl(210 40% 96%)" },
        muted: { DEFAULT: "hsl(217 33% 18%)", foreground: "hsl(215 20.2% 65.1%)" },
        accent: { DEFAULT: "hsl(217 33% 18%)", foreground: "hsl(210 40% 96%)" },
        destructive: { DEFAULT: "hsl(0 84.2% 60.2%)", foreground: "hsl(210 40% 98%)" },
        card: { DEFAULT: "hsl(222.2 84% 5.9%)", foreground: "hsl(210 40% 98%)" }
      },
      borderRadius: { lg: "0.5rem", md: "0.375rem", sm: "0.25rem" }
    }
  },
  plugins: []
}
