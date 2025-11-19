// eslint.config.js
const eslint = require('@eslint/js');
const jestPlugin = require('eslint-plugin-jest');
const nodePlugin = require('eslint-plugin-node');

module.exports = [
  {
    ignores: ['node_modules', 'coverage', 'dist', '.env'],
  },
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'commonjs',
      globals: {
        ...require('globals').node,
        ...require('globals').jest,
      },
    },
    plugins: {
      node: nodePlugin,
      jest: jestPlugin,
    },
    rules: {
      // General project rules
      'no-unused-vars': 'off', // Allow unused vars in tests
      'no-console': 'off',
      'node/no-unsupported-features/es-syntax': 'off',
    },
  },
  // Special config for test files
  {
    files: ['**/*.test.js', '**/*.spec.js', 'tests/**/*'],
    rules: {
      'no-unused-vars': 'off', // Allow unused vars in tests
      'jest/expect-expect': 'off', // Optional: disable expect-expect if you have tests without expects
    },
  },
];
