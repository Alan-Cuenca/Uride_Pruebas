module.exports = {
    // Utiliza el preset preconfigurado de Expo para Jest
    preset: 'jest-expo',

    // Permite que Jest transforme archivos JS/TS/JSX/TSX que usualmente ignora dentro de node_modules
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|nativewind|tailwindcss)/',
    ],

    // Limpia los mocks automáticamente entre pruebas
    clearMocks: true,
};
