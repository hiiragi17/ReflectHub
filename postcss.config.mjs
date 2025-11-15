// Disable PostCSS in test environment to avoid conflicts with Vitest
const config = process.env.VITEST
  ? {
      plugins: [],
    }
  : {
      plugins: ["@tailwindcss/postcss"],
    };

export default config;
