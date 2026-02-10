module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  },
  rules: {
    // General rules
    'no-console': 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'prefer-const': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  settings: {
    react: {
      version: 'detect'
    }
  },
  overrides: [
    // TypeScript files - use type-aware linting
    {
      files: ['*.ts', '*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 12,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
        ecmaFeatures: {
          jsx: true
        }
      },
      extends: [
        'plugin:@typescript-eslint/recommended',
      ],
      plugins: ['@typescript-eslint'],
      rules: {
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        'no-unused-vars': 'off', // Use TS version instead
      }
    },
    // Legacy JS files - simpler rules
    {
      files: ['*.js', '*.jsx'],
      rules: {
        'no-var': 'off', // Legacy code uses var
      }
    },
    {
      files: ['main.js', 'src/js/**/*.js'],
      env: {
        node: true,
        browser: false
      }
    },
  ]
};
