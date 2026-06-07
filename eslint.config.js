/**
 * @file eslint.config.js
 * @description ESLint v9 flat config. Replaces the legacy .eslintrc.json
 *              and removes the deprecated transitive dependency chain
 *              (inflight, old glob, old rimraf, @humanwhocodes/*) that
 *              ESLint v8 dragged in.
 *
 *              Two file groups:
 *                - src/, tests/, scripts/, root .js → Node.js CommonJS
 *                - public/js/                        → Browser
 *
 * @see https://eslint.org/docs/latest/use/configure/configuration-files
 */

'use strict';

const js = require('@eslint/js');
const globals = require('globals');

const sharedRules = {
  'no-console': 'off',
  'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  'prefer-const': 'error',
  'no-var': 'error',
};

module.exports = [
  js.configs.recommended,

  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: sharedRules,
  },

  {
    files: ['public/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
      },
    },
    rules: sharedRules,
  },

  {
    ignores: [
      'node_modules/**',
      'coverage/**',
      'dist/**',
      'build/**',
      '.venv/**',
    ],
  },
];
