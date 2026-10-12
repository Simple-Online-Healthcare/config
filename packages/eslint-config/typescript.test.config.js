import typescriptConfig from './typescript.js';

const typescriptTestConfig = [
  ...typescriptConfig,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['example.ts'],
        },
      },
    },
  },
];

export default typescriptTestConfig;
