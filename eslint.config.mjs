import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/next-env.d.ts",
      // Purchased Aceternity reference template — not part of the monorepo.
      "manuarora700-startup-landing-simple-aceternity-*/**",
    ],
  },
  ...tseslint.configs.recommended,
);
