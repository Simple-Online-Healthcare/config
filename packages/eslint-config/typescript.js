import tseslint from 'typescript-eslint';

const typescriptConfig = tseslint.config(
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
);

export default typescriptConfig;
