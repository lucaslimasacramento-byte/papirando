import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist/**',
    '.vercel/**',
    '**/.vercel/**',
    '.claude/**',
    '**/.claude/**',
    '.claude/worktrees/**',
    '**/.claude/worktrees/**',
    '.tmp.driveupload/**',
    '.tmp-previews/**',
    '.tmp.drivedownload/**',
    'node_modules/**',
    'scripts/**',
    '*.log',
    '*.png',
    '*.pdf',
    '*.txt',
    'coverage/**',
  ]),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      react,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: {
        version: '19.0',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'react/jsx-uses-vars': 'error',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['vite.config.js', 'ai-server.mjs', 'api/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])
