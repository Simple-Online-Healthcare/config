import testingLibrary from 'eslint-plugin-testing-library';
import vitest from 'eslint-plugin-vitest';

const defaultTestFiles = ['**/__tests__/**/*.[jt]s?(x)', '**/*.test.[jt]s?(x)'];

const createTestingConfig = (options = {}) => {
  const {
    files = defaultTestFiles,
  } = options;

  return [
    {
      ...testingLibrary.configs['flat/react'],
      files,
      plugins: {
        ...testingLibrary.configs['flat/react'].plugins,
        vitest,
      },
      languageOptions: {
        ...testingLibrary.configs['flat/react'].languageOptions,
        globals: {
          ...vitest.environments.env.globals,
        },
      },
      rules: {
        ...testingLibrary.configs['flat/react'].rules,
      },
    },
  ];
};

const sharedTestingConfig = createTestingConfig();

export { createTestingConfig };
export default sharedTestingConfig;
