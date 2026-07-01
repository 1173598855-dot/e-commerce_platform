module.exports = {
  root: true,
  extends: ['@react-native-community'],
  ignorePatterns: [
    'android/',
    'tools/legacy-fixes/',
    'node_modules/',
  ],
  rules: {
    'prettier/prettier': 'off',
    'comma-dangle': 'off',
    curly: 'off',
    'eol-last': 'off',
    'no-trailing-spaces': 'off',
    quotes: 'off',
    semi: 'off',
    'space-infix-ops': 'off',
    'react-hooks/exhaustive-deps': 'warn',
    'react/self-closing-comp': 'off',
    'react/no-unstable-nested-components': 'off',
    'react-native/no-inline-styles': 'off',
  },
};
