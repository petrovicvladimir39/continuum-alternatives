import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/.next/**", "**/dist/**", "**/next-env.d.ts"] },
  ...tseslint.configs.recommended,
);
