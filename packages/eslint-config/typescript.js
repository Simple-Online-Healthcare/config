import tseslint from 'typescript-eslint';

const utilityTypeSelector = [
  "TSTypeReference[typeName.name='Awaited']",
  "TSTypeReference[typeName.name='InstanceType']",
  "TSTypeReference[typeName.name='Omit']",
  "TSTypeReference[typeName.name='Parameters']",
  "TSTypeReference[typeName.name='Partial']",
  "TSTypeReference[typeName.name='Pick']",
  "TSTypeReference[typeName.name='Readonly']",
  "TSTypeReference[typeName.name='Required']",
  "TSTypeReference[typeName.name='ReturnType']",
].join(', ');

const typescriptConfig = tseslint.config(
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
  },
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{ts,tsx,cts,mts}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'never' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          fixStyle: 'separate-type-imports',
          prefer: 'type-imports',
        },
      ],
      '@typescript-eslint/no-confusing-void-expression': [
        'error',
        { ignoreArrowShorthand: true },
      ],
      '@typescript-eslint/no-deprecated': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/only-throw-error': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSIndexedAccessType',
          message: 'Indexed access types are not allowed.',
        },
        {
          selector:
            'TSConditionalType:not(TSTypeAliasDeclaration > TSConditionalType)',
          message: 'Conditional types must be declared as named type aliases.',
        },
        {
          selector: 'TSMappedType:not(TSTypeAliasDeclaration > TSMappedType)',
          message: 'Mapped types must be declared as named type aliases.',
        },
        {
          selector: 'TSTypeQuery:not(TSTypeAliasDeclaration > TSTypeQuery)',
          message: 'Type queries must be declared as named type aliases.',
        },
        {
          selector: `:matches(${utilityTypeSelector}) :matches(${utilityTypeSelector})`,
          message: 'Nested utility types are not allowed.',
        },
      ],
    },
  },
);

export default typescriptConfig;
