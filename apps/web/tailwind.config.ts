import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Тёмно-сине-белая палитра портала
        navy: {
          50: "#eef3fb",
          100: "#d8e3f4",
          200: "#b4c8e8",
          300: "#84a3d6",
          400: "#527ec0",
          500: "#2f5da5",
          600: "#1f4587",
          700: "#183a6f",
          800: "#122d57",
          900: "#0c2345",
          950: "#081a35",
        },
        brand: {
          DEFAULT: "#2563eb",
          dark: "#1d4ed8",
          light: "#3b82f6",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(12 35 69 / 0.04), 0 1px 3px 0 rgb(12 35 69 / 0.06)",
        lift: "0 4px 6px -1px rgb(12 35 69 / 0.06), 0 10px 15px -3px rgb(12 35 69 / 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
