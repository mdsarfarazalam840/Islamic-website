import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scripts/**/*.js",
    // Generated / vendored output that is not ours to lint.
    "**/target/**", // rust + tauri build artifacts (incl. tauri-codegen-assets)
    "public/pagefind/**", // pagefind search index + its prebuilt UI bundles
    "apps/mobile/www/**", // capacitor web copy of out/
    "apps/mobile/android/**",
    "apps/mobile/ios/**",
  ]),
  {
    rules: {
      // Allow deliberately-unused bindings prefixed with `_`, e.g. the omitted
      // key of a rest-destructure.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
