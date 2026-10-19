// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/', 'dev-dist/', 'coverage/', 'android/', 'reports/', 'node_modules/'],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['eslint.config.js'],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Convention du projet : fonctions fléchées plutôt que `function`.
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    // SPEC §9 : le core est pur et déterministe. Ni Phaser, ni DOM, ni hasard global.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['phaser', 'phaser/*'], message: 'src/core ne doit jamais importer Phaser.' },
            { group: ['**/render/**', '**/audio/**', '**/save/**'], message: 'src/core est pur.' },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'Pas de DOM dans src/core.' },
        { name: 'document', message: 'Pas de DOM dans src/core.' },
        { name: 'performance', message: 'Le temps vient de la boucle à pas fixe.' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'Utiliser le RNG à seed (src/core/rng.ts).',
        },
        { object: 'Date', property: 'now', message: 'Le temps vient de la boucle à pas fixe.' },
      ],
    },
  },
  {
    files: ['eslint.config.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
);
