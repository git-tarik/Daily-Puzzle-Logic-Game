module.exports = {
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src'],
    setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.js'],
    transform: {
        '^.+\\.[jt]sx?$': 'babel-jest',
    },
    moduleNameMapper: {
        '\\.(css|less|scss|sass)$': '<rootDir>/src/test/styleMock.js',
    },
    collectCoverageFrom: [
        'src/engine/generatePuzzle.js',
        'src/features/auth/authSlice.js',
        'src/features/user/userSlice.js',
        'src/lib/apiClient.js',
        'src/lib/batchSync.js',
        'src/lib/compression.js',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 85,
            lines: 90,
            statements: 90,
        },
    },
};
