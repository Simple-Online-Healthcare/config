import { globalIgnores } from 'eslint/config';

import prettier from 'eslint-config-prettier/flat';

import baseConfig from './base.js';
import nextFrameworkConfig from './next.js';
import playwrightTestingConfig from './playwright.js';
import { createTestingConfig } from './testing.js';
import typescriptConfig from './typescript.js';

const defaultNextAppIgnores = [
  '.next/**',
  'out/**',
  'build/**',
  'coverage/**',
  'next-env.d.ts',
  'node_modules/**',
];

const createNextAppConfig = (options = {}) => {
  const {
    assertFunctionNames,
    extraIgnores = [],
  } = options;

  return [
    ...baseConfig,
    ...typescriptConfig,
    ...nextFrameworkConfig,
    ...playwrightTestingConfig,
    ...createTestingConfig({ assertFunctionNames }),
    {
      files: ['**/*.js'],
    },
    prettier,
    globalIgnores([...defaultNextAppIgnores, ...extraIgnores]),
  ];
};

const nextAppPreset = createNextAppConfig();

export { createNextAppConfig };
export default nextAppPreset;
