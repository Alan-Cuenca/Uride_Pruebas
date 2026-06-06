module.exports = {
    testEnvironment: 'jest-environment-jsdom', // Simula el navegador
    setupFilesAfterEnv: ['<rootDir>/src/tests/setupTests.js'], // Carga RTL antes de cada prueba
    moduleNameMapper: {
        // Si importas CSS, Jest lo ignorará amablemente usando identity-obj-proxy
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        // Si usas alias en Vite como import x from '@/components', debes mapearlos aquí. Ej:
        // '^@/(.*)$': '<rootDir>/src/$1',
    },
};
