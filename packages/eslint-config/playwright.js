import { compat, withFiles } from './utils.js';

const playwrightFiles = ['e2e/**/*.ts'];

const playwrightTestingConfig = [
  ...withFiles(compat.extends('plugin:playwright/recommended'), playwrightFiles),
  {
    files: playwrightFiles,
  },
];

export default playwrightTestingConfig;
