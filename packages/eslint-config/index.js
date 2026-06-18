import prettier from 'eslint-config-prettier/flat';

import baseConfig from './base.js';
import typescriptConfig from './typescript.js';

const defaultSharedConfig = [...baseConfig, ...typescriptConfig, prettier];

export default defaultSharedConfig;
