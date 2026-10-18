module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  setupFiles: ['<rootDir>/jest.setup.js'],
  // Jest 30 also matches .mjs; the SQL tests run in plain Node via `npm run test:db`.
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/supabase/'],
};
