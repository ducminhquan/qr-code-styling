import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default tseslint.config(
  { ignores: ["lib/**", "site/**", "coverage/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierRecommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: { "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }] }
  },
  {
    files: ["**/*.test.{js,ts}", "test/**/*.js", "*.config*.js", "scripts/**"],
    languageOptions: { globals: { ...globals.vitest } },
    rules: { "@typescript-eslint/no-require-imports": "off" }
  }
);
