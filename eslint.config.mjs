import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Firestore `Timestamp` fields are routinely stripped before crossing
      // the Server/Client boundary via `const { createdAt, ...rest } = doc`
      // — the omitted binding is deliberately unused, not a mistake.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { ignoreRestSiblings: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // functions/ is a separate npm package with its own eslint config and
    // compiled output (functions/lib/) — not part of this lint run.
    "functions/**",
  ]),
])

export default eslintConfig
