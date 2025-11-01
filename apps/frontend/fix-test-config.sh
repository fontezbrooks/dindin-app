#!/bin/bash

# Script to fix Jest/Babel configuration for React Native testing

echo "🔧 Fixing Jest/Babel configuration for React Native testing..."

# Update babel.config.js with proper React Native configuration
cat > babel.config.js << 'EOF'
module.exports = function (api) {
  api.cache(true);

  const isTest = api.env('test');

  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: isTest ? 'react' : undefined }],
      isTest ? '@babel/preset-typescript' : null,
    ].filter(Boolean),
    plugins: [
      // Add any necessary plugins here
    ],
  };
};
EOF

# Update jest.config.js with better transform patterns
cat > jest.config.js << 'EOF'
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['babel-preset-expo', { jsxImportSource: 'react' }],
        '@babel/preset-typescript'
      ]
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@clerk/clerk-expo|@sentry/react-native|pressto|zustand|@shopify/.*|loglayer)',
  ],
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/expo-env.d.ts',
    '!**/.expo/**',
    '!**/assets/**',
    '!**/Design-Inspiration/**',
    '!**/app.json',
    '!**/eas.json',
    '!**/flow.yaml',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  moduleDirectories: ['node_modules', '<rootDir>'],
  testMatch: ['**/__tests__/**/*.(ts|tsx|js)', '**/*.(test|spec).(ts|tsx|js)'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@assets/(.*)$': '<rootDir>/assets/$1',
    '^@components/(.*)$': '<rootDir>/components/$1',
    '^@constants/(.*)$': '<rootDir>/constants/$1',
    '^@hooks/(.*)$': '<rootDir>/hooks/$1',
    '^@services/(.*)$': '<rootDir>/services/$1',
    '^@types/(.*)$': '<rootDir>/types/$1',
    '^@app/(.*)$': '<rootDir>/app/$1',
  },
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 10000,
};
EOF

echo "✅ Configuration files updated!"
echo ""
echo "🧪 Testing the configuration..."

# Test if Jest can parse a simple JSX file
echo "import React from 'react'; export default () => <div>test</div>;" > test-jsx.tsx

# Try to run Jest on the test file
if NODE_ENV=test npx jest test-jsx.tsx --no-cache --passWithNoTests 2>/dev/null; then
    echo "✅ JSX parsing works!"
else
    echo "❌ JSX parsing still has issues"
    echo "💡 You may need to install additional dependencies:"
    echo "   bun add -D @babel/core @babel/preset-env @babel/preset-react @babel/preset-typescript"
fi

# Clean up test file
rm -f test-jsx.tsx

echo ""
echo "🚀 Try running the tests now with:"
echo "   bun run test"
echo ""
echo "📋 If tests still fail, check:"
echo "   1. All Babel presets are installed"
echo "   2. No conflicting Babel configurations"
echo "   3. Jest cache is cleared: npx jest --clearCache"