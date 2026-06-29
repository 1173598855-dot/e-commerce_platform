module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
    'module-resolver',
    {
      root: ['./src'],
      alias: {
        '@components': './src/components',
        '@screens': './src/screens',
        '@api': './src/api',
        '@store': './src/store',
        '@theme': './src/theme',
        '@navigation': './src/navigation',
      },
    },
  ],
};
