import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  {
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        performance: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        ResizeObserver: "readonly",
      },
    },
  },
];
