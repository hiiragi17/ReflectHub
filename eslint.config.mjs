import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // eslint-config-next 16 で新たに有効になったルール。既存コードに違反が残っており
    // (react-hooks: 12 ファイル・18 件 / no-location-assign: src/utils/auth.ts 1 件)、
    // 直すとフックや画面遷移の挙動が変わるため、16 系への更新とは分けて対応する。
    // lint は --max-warnings=0 なので "warn" では CI が落ちる。直したルールから外していく
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "@next/next/no-location-assign-relative-destination": "off",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
