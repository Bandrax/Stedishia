module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|uuid|date-fns)',
  ],
  moduleNameMapper: {
    '^../services/database$': '<rootDir>/src/__tests__/__mocks__/database.ts',
    '^expo-sqlite$': '<rootDir>/src/__tests__/__mocks__/expoSqlite.ts',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
